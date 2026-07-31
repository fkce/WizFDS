# ADR-0009: Historia zmian to patch elementu; jeden gest to jeden wpis

- **Data:** 2026-07-30
- **Status:** zaakceptowana
- **Dotyczy:** `projects/wizfds/src/app/services/fds-object`, `projects/wizfds/src/app/app.component.ts`, `projects/web-smokeview-lib`

## Kontekst

ADR-0004 rozstrzyga, że `Fds` jest źródłem prawdy, a biblioteka emituje komendy edycji. Nie mówi jednak, jak zmiana ma być zapamiętana, żeby dała się cofnąć — a bez cofania edycja geometrii w 3D jest nieużywalna: pomyłka jednym pociągnięciem myszy niszczy model, którego odtworzenie zajmuje kwadrans.

Punkt wyjścia jest surowy:

- **Undo/redo nie istnieje w aplikacji w ogóle.** W całym `projects/wizfds/src/app` nie ma ani jednego wystąpienia słowa „undo".
- **Zmiany z formularzy nie mają punktu przechwycenia.** Formularze wiążą się przez `[(ngModel)]` wprost z polami klas modelu (np. `obstruction.component.ts`), więc nie istnieje miejsce, w którym dałoby się zauważyć „użytkownik zmienił `xb.x1`". Kanał komend z ADR-0004 jest jedynym przepływem, który da się objąć historią.
- **Wykrywanie zmian jest dziś ekstremalnie drogie.** Autosave siedzi w `ngDoCheck` komponentu głównego (`app.component.ts:149`) i na **każdym cyklu detekcji zmian** wykonuje `isEqual` całego `fdsObject`, a przy różnicy `cloneDeep`. Pętla renderowania Babylona chodzi poza zoną Angulara (`babylon.service.ts:351`), ale `pointerdown` i `pointermove` w `SmokeviewComponent` to `@HostListener`-y — czyli każdy ruch myszy nad kanwą wywołuje `tick()`, a wraz z nim głębokie porównanie scenariusza. Przy dziesięciu tysiącach obstów, dla których modu­ł jest budowany, gest przeciągania nie ma szans zmieścić się w budżecie klatki. Ten koszt jest płacony już dziś, przy zwykłym hover·owaniu z ctrl.

## Decyzja

**Zastosowanie komendy jest jedną operacją: stosuj bezwarunkowo, zapisz patch, oznacz scenariusz jako zmieniony.**

### Patch na poziomie elementu

Każda zastosowana komenda odkłada na stos wpis:

```
{ uuid, kolekcja, before, after }
```

gdzie `before` i `after` to `toJSON()` samego elementu albo `null`. Undo podmienia element na `before`, redo na `after`. Utworzenie to `before: null`, usunięcie to `after: null`.

Jeden mechanizm obsługuje każdy typ komendy — żaden nie musi implementować własnej odwrotności — a koszt pamięciowy to jeden element, nie cały scenariusz.

### Jeden gest to jeden wpis

Gest dotykający stu elementów (przesunięcie wielokrotnego zaznaczenia, szyk) tworzy **jedną** transakcję. Undo cofa całą operację, nie jeden element na raz.

### Zasięg historii

Stos żyje w serwisie aplikacji, per scenariusz, i jest czyszczony przy zmianie scenariusza albo projektu — inaczej Ctrl+Z edytowałby scenariusz, którego użytkownik już nie widzi. Głębokość ograniczona do około 50 wpisów.

Ctrl+Z i Ctrl+Y działają, gdy fokus jest w widoku 3D, plus przyciski w Quick Access Toolbar. W formularzu Ctrl+Z pozostaje natywnym cofnięciem tekstu w polu — **zmiany z formularzy nie są w tej historii** i ta granica jest świadoma, nie przypadkowa.

### Walidacja ostrzega, nigdy nie blokuje

Komenda trafia do `Fds` bezwarunkowo. Naruszenia reguł FDS — element poza wszystkimi siatkami, `XB` niewyrównany do granic komórek swojego `&MESH`, zerowa grubość, `&VENT` nieleżący na żadnej powierzchni — pojawiają się jako ostrzeżenia w palecie właściwości i licznik w status barze.

FDS sam dosuwa niewyrównany `&OBST` do najbliższych granic komórek i liczy dalej, nakładające się obsty są legalne, a scenariusz w trakcie edycji ma prawo być przejściowo niepoprawny — dokładnie tak, jak dziś w formularzach.

### Autosave na flagę, nie na porównanie

Zastosowana komenda ustawia flagę „zmienione" wprost. Dla zmian z formularzy `isEqual` przenosi się z `ngDoCheck` na interwał (rzędu 2 s), co w pełni wystarcza mechanizmowi zapisującemu i tak z dwudziestosekundowym opóźnieniem.

## Konsekwencje

**Pozytywne**
- Cofanie działa jednakowo dla przesunięcia, zmiany rozmiaru, utworzenia i usunięcia — bez kodu per typ komendy.
- Gest przeciągania przestaje płacić za głębokie porównanie scenariusza; odblokowuje to również dzisiejsze hover·owanie.
- Historia jest czytelna w debugowaniu: każdy wpis to nazwany element i dwa jego stany.
- Walidacja w jednym miejscu obowiązuje tak samo dla edycji z 3D, z palety i z importu.

**Negatywne / do obsłużenia**
- Cofanie nie obejmuje zmian z formularzy. Interfejs musi być w tym uczciwy — przycisk undo opisuje ostatnią operację z widoku 3D, a nie „ostatnią zmianę".
- Patch szyku tworzącego sto elementów waży tyle, ile te sto elementów. Limit głębokości to ogranicza, ale jest to przypadek wart zmierzenia.
- Usunięcie elementu, do którego odwołują się inne (`devc_id`, `ctrl_id`), wymaga, by `before` zawierał dość danych do pełnego odtworzenia powiązania.
- Przeniesienie `isEqual` na interwał oznacza, że zmiana z formularza może być zauważona z opóźnieniem do 2 s. Dla autosave nieistotne, dla wskaźnika „niezapisane zmiany" — widoczne.

## Rozważone alternatywy

- **Odwrotne komendy.** Każdy typ komendy implementuje własną odwrotność (przesuń A→B odwraca się na B→A). Najmniej danych na stosie i czytelna intencja w historii, ale każdy nowy typ komendy to nowa odwrotność do napisania i przetestowania, a usunięcie elementu z referencjami łatwo odwraca się niekompletnie.
- **Snapshot całego `Fds`.** Pełny `toJSON()` scenariusza przed każdą zmianą. Odporne na wszystko i objęłoby także zmiany z formularzy, ale scenariusz z dziesięcioma tysiącami obstów to megabajty na krok historii — nie do utrzymania przy skali, dla której ten moduł jest budowany.
- **Niezmienny stan ze współdzieleniem struktury.** Najczystsze teoretycznie, ale klasy w `services/fds-object` są mutowane w miejscu przez całą aplikację i przez `JsonFdsService`; to przepisanie modelu, nie dodanie historii.
- **Blokowanie niepoprawnych komend.** Gwarantowałoby, że `Fds` jest zawsze poprawny, ale użytkownik walczyłby z edytorem — narysowanie ściany przed dodaniem siatki jest normalnym etapem pracy.
- **Cicha korekta do siatki.** Wynik zawsze zgodny z tym, co policzy FDS, ale użytkownik wpisuje 3.15 i dostaje 3.20 bez wyjaśnienia — najgorszy rodzaj niespodzianki w narzędziu inżynierskim.

## Uzupełnienie (2026-07-30) — jak to wyszło w kodzie

Cztery rzeczy doprecyzowały się przy pisaniu i warto je mieć zapisane, bo żadna nie wynika wprost z decyzji powyżej.

### Patch niesie też pozycję w liście

`{uuid, kolekcja, before, after}` okazało się o jedno pole za krótkie. FDS czyta plik namelistów po kolei i przy nakładających się `&OBST`-ach wygrywa późniejszy, więc element przywrócony na koniec listy to nie jest ten sam scenariusz, do którego użytkownik cofał. Patch niesie więc `index` — miejsce, na którym element stał.

### Cofnięcie nadpisuje element w miejscu, nie podmienia go

Formularze wiążą się przez `[(ngModel)]` do obiektu znalezionego w liście, a zaznaczenie i most CAD trzymają ten sam obiekt. Podmiana na nowy zostawiłaby każde z nich przy czymś, czego w scenariuszu już nie ma. Element odtworzony z JSON-a jest więc wkopiowywany w istniejący (`Object.assign`) — klasy modelu trzymają stan w zwykłych polach `_`, więc przenosi się całość. Wstawienie dotyczy tylko elementu, którego w liście nie ma.

### Walidacja liczy cały scenariusz, nie tylko to, co ruszyła komenda

Przesunięty `&OBST` zmienia to, na czym stoi `&VENT` oparty o niego, a przesunięta `&MESH` zmienia siatkę, względem której mierzy się wszystko w środku. „Co komenda dotknęła" to nie to samo co „na co komenda wpłynęła", więc przebieg jest pełny — kilka milisekund raz na gest, nie raz na klatkę.

### Przyrostowy `update()` nie mierzy sceny na nowo

Kamera, zakresy przekrojów i szerokości krawędzi są wielokrotnościami rozmiaru modelu (ADR-0002). Przeliczanie ich przy każdej edycji ruszałoby widok pod użytkownikiem w najgorszym możliwym momencie. Rozmiar sceny ustala `render()`; `update()` rysuje tylko to, co się zmieniło, i zostawia kamerę oraz płaszczyzny tam, gdzie je ustawiono.
