# ADR-0004: Aplikacja jest źródłem prawdy; biblioteka emituje komendy edycji

- **Data:** 2026-07-26
- **Status:** zaakceptowana
- **Dotyczy:** `projects/web-smokeview-lib`, `projects/wizfds/src/app/services/fds-object`

## Kontekst

Stan scenariusza żyje w aplikacji, w obiekcie `Fds` (`services/fds-object/fds-object.ts`). To on jest serializowany do pliku wejściowego przez `JsonFdsService.json2fds()`, zapisywany przez `FdsScenarioService` (auto-save z wariantami `head` / `input` / `all`) i synchronizowany z pluginem CAD przez `CadService`.

Granica między aplikacją a biblioteką jest dziś nieszczelna w obie strony:

- `VisualizeComponent` przekazuje obiekty domenowe **przez referencję, bez kopiowania** (`visualize.component.ts:40`), a biblioteka je **mutuje** — `ObstService.normalizeObsts()` zapisuje do `obst.vis.xbNorm` (`obst.service.ts:231`). Warstwa widoku pisze do modelu domenowego.
- Jednocześnie dla pożarów i podstawowych VENT-ów ta sama komponenta robi **ręczne mapowanie** na interfejsy biblioteki (`visualize.component.ts:52-109`), bo te klasy nie mają pola `vis`. Dwa różne kontrakty na tej samej granicy.
- `IObst.surf` ma typ `any`, a biblioteka sięga po `obst.surf.surf_id.id` — struktura modelu domenowego przecieka do biblioteki bez żadnego kontraktu typów.

Edycja geometrii w 3D wymaga rozstrzygnięcia, kto jest właścicielem stanu i gdzie mieszka historia zmian.

## Decyzja

**`Fds` w aplikacji pozostaje jedynym źródłem prawdy.** Biblioteka nie mutuje niczego, co dostanie.

Przepływ jest jednokierunkowy:

1. Aplikacja przekazuje bibliotece **stan do wyrenderowania** — przez jawny, otypowany kontrakt (nie przez referencje do klas domenowych).
2. Interakcja użytkownika w 3D powoduje, że biblioteka emituje **komendę edycji** opisującą intencję, np. „przesunięto obiekt o `uuid` X do `XB` Y", „utworzono OBST o zadanym `XB`", „usunięto obiekt o `uuid` Z".
3. Aplikacja komendę **waliduje** (reguły FDS, przyciąganie do siatki MESH, kolizje) i stosuje na `Fds`.
4. Zmieniony stan wraca do biblioteki jako nowy stan do wyrenderowania.

Undo/redo, auto-save i synchronizacja z CAD zostają w aplikacji, operując na `Fds` — czyli tam, gdzie już dziś są.

Biblioteka może utrzymywać stan **czysto prezentacyjny** (co jest zaznaczone, pozycja kamery, widoczność warstw, bieżąca klatka animacji). Nie utrzymuje niczego, co ma odpowiednik w pliku `.fds`.

## Konsekwencje

**Pozytywne**
- Jeden model, jedna historia zmian — brak ryzyka rozjazdu dwóch reprezentacji.
- Walidacja reguł FDS jest w jednym miejscu i obowiązuje tak samo dla edycji z formularza, z 3D i z importu z CAD.
- Zaznaczenie w 3D, podświetlenie na liście i formularz można spiąć przez `uuid` bez dodatkowej warstwy tłumaczącej.
- Biblioteka staje się testowalna w izolacji: wejście to stan, wyjście to strumień komend.

**Negatywne / do obsłużenia**
- Trzeba zdefiniować i utrzymywać jawny kontrakt danych na granicy — dziś jego rolę pełni `any` i mutacja w miejscu.
- Przy przeciąganiu obiektu myszą pełny obieg (komenda → walidacja → nowy stan → render) musi zmieścić się w budżecie klatki. Rozwiązanie: podgląd przeciągania rysowany lokalnie w bibliotece jako stan prezentacyjny, komenda emitowana dopiero na zakończenie gestu.
- `webSmokeview` jako standalone viewer nie ma `Fds`; potrzebuje cienkiego adaptera budującego ten sam kontrakt z wczytanych plików.

## Rozważone alternatywy

- **Biblioteka z własnym modelem dokumentu i dwukierunkową synchronizacją.** Większa niezależność biblioteki, ale dwa modele do utrzymania w zgodzie i undo/redo musiałoby obejmować oba.
- **Wspólny pakiet modelu geometrii dla aplikacji i biblioteki.** Najczystsze docelowo, ale wymaga ruszenia klas w `services/fds-object`, z których korzysta cała aplikacja i `JsonFdsService`. Do rozważenia później, gdy kontrakt z punktu 1 się ustabilizuje.
