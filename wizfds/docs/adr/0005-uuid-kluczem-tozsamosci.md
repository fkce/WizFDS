# ADR-0005: `uuid` jest kluczem tożsamości obiektu; `idAC` schodzi do roli linku do CAD

- **Data:** 2026-07-26
- **Status:** zaakceptowana
- **Dotyczy:** `projects/wizfds/src/app/services/cad`, `projects/wizfds/src/app/services/fds-object`, `projects/web-smokeview-lib`

## Kontekst

Synchronizacja z pluginem CAD opiera się dziś na `idAC` — identyfikatorze obiektu w AutoCAD/BricsCAD/GStarCAD. `CadService` dopasowuje przychodzące elementy do istniejących wyszukiwaniem binarnym po `idAC` (kilkanaście metod `transform*`, m.in. `binaryIndexOf(acElement, sortedCurrentElements, 'idAC')`), a przy imporcie elementów z biblioteki przepisuje `idAC` na obiekty biblioteczne (`libSurf.idAC`, `libJetfan.idAC`, `libFire.idAC`, `libSlcf.idAC`, …).

Obiekty mają też `uuid`, ale nie pełni on dziś roli klucza w dopasowywaniu.

Gdy geometria zacznie powstawać w przeglądarce (ADR-0003), pojawią się obiekty, które **nigdy nie istniały w CAD i nie mają `idAC`**. Dopasowywanie po `idAC` przestaje być kompletne.

## Decyzja

**`uuid` staje się jedynym kluczem tożsamości obiektu** — w modelu, w bibliotece wizualizacji, przy zaznaczaniu i w komendach edycji (ADR-0004).

`idAC` schodzi do roli **opcjonalnego odnośnika do obiektu w CAD**:

- obiekt narysowany w przeglądarce ma `uuid`, nie ma `idAC`;
- obiekt zaimportowany z CAD ma `uuid` i `idAC`;
- `CadService` dopasowuje po `idAC` **tylko w obrębie obiektów, które ten `idAC` mają**, i nie traktuje jego braku jako błędu ani jako sygnału „to nowy obiekt z CAD".

Scenariusz może zawierać jednocześnie obiekty z obu źródeł. Import z CAD nie usuwa ani nie nadpisuje obiektów bez `idAC`.

## Konsekwencje

**Pozytywne**
- Użytkownicy migrują stopniowo — mogą dorysować w przeglądarce do modelu zaimportowanego z CAD, zamiast wybierać jedno albo drugie.
- Jeden mechanizm zaznaczania i adresowania obiektów w całym systemie: 3D, formularze, komendy edycji.
- Wygaszenie pluginu CAD w przyszłości nie wymaga zmiany modelu tożsamości.

**Negatywne / do obsłużenia**
- `CadService` wymaga przeglądu wszystkich miejsc, gdzie `idAC` jest traktowane jako klucz główny — a jest ich kilkanaście. Ryzyko regresji w działającym mechanizmie synchronizacji.
- Trzeba jednoznacznie określić zachowanie przy usunięciu obiektu po stronie CAD: dziś brak elementu w przychodzącym zestawie może oznaczać „usunięty w CAD", co przy obiektach bez `idAC` nie ma sensu i nie może ich dotyczyć.
- Selekcja z CAD (`selectCad` / `fSelect` w `WebsocketService`) przychodzi z `idAC` — potrzebne jest tłumaczenie `idAC` → `uuid` przed przekazaniem do biblioteki.

## Rozważone alternatywy

- **Scenariusz jest albo CAD-owy, albo webowy, bez mieszania.** Zero zmian w `CadService`, ale użytkownik nie może dorysować w przeglądarce do modelu z CAD — a to najbardziej naturalna ścieżka migracji.
- **Wygaszenie pluginu CAD od razu, tryb tylko-import.** Najczystsze docelowo, ale wymaga, żeby edytor webowy najpierw dorównał możliwościom CAD.

## Uzupełnienie (2026-07-30)

Rozpoznanie przed Fazą 5 (#88) pokazało, że problem jest poważniejszy niż opisany wyżej, i domknęło pytanie o usuwanie po stronie CAD.

### To nie jest problem przyszły

`fExport()` (`websocket.service.ts:277`) jest **pełną podmianą**: dla każdej kolekcji czyści listę przez `remove(...)` i wypełnia ją od nowa z ładunku CAD. A `transformObsts()` (`cad.service.ts:409`) — jak wszystkie czternaście metod `transform*` — buduje wynik **wyłącznie** z elementów przychodzących. Cokolwiek jest w `currentElements`, a czego ładunek nie wymienia, po prostu wypada.

Czyli OBST dodany przyciskiem w formularzu (`obstruction.component.ts:157`, tworzy `Obst` bez `idAC`) **znika przy najbliższym imporcie z CAD już dziś**. To samo dotyczy dziury, pożaru, urządzenia, wentylacji.

### Reguła scalania

Wynikiem scalania jest:

- każdy element z ładunku CAD, dopasowany do istniejącego po `idAC` **w obrębie elementów, które `idAC` mają** — pola przepisywane dokładnie jak dziś;
- plus każdy istniejący element **bez** `idAC`, przeniesiony nietknięty.

Brak w ładunku oznacza więc „usunięto w CAD" tylko dla elementów, które z CAD przyszły. Dla elementu narysowanego w przeglądarce nie oznacza nic.

Konsekwencja techniczna: `rewriteIds()` (`cad.service.ts:62`) nadaje `id` elementom przychodzącym z pustym `id`, kontynuując od najwyższego numeru — musi więc widzieć **połączoną** listę, inaczej nowy OBST z CAD dostanie numer zajęty przez obiekt narysowany w przeglądarce.

### Obiekt z `idAC` pozostaje własnością CAD

Rysunek jest panem geometrii swoich obiektów. Edycja w przeglądarce obiektu, który ma `idAC`, zostanie nadpisana przy najbliższym imporcie — tak jak dziś nadpisywana jest zmiana `xb` wprowadzona w formularzu. To reguła świadoma, nie przeoczenie.

Odrzucono odłączanie obiektu od CAD przy pierwszej edycji: jego odpowiednik z rysunku wrócił by przy następnym imporcie jako nowy obiekt, zostawiając użytkownika z dwiema ścianami.

### W drugą stronę nic nie jedzie samo

Obiekt narysowany w przeglądarce pozostaje webowy — ma `uuid`, nie ma `idAC` i nie trafia do CAD automatycznie, nawet gdy plugin jest podłączony. Istniejący jawny przycisk „Create CAD element" w formularzu (`obstruction.component.ts:200`, wysyła `createObstWeb`) pozostaje jedyną drogą dla kogoś, kto chce mieć ten obiekt także na rysunku.

Automatyczne wypychanie odtwarzałoby dwukierunkową synchronizację, której ta decyzja i ADR-0004 celowo unikają, i natychmiast czyniłoby nowy obiekt własnością CAD.

### Wyjątek: kolizja `id` z ładunkiem

Reguła „przenieś każdy element bez `idAC`" ma jeden wyjątek. `&SURF` jest dla CAD-a **nazwą warstwy** — powierzchnia dodana w aplikacji i warstwa o tej samej nazwie to ta sama powierzchnia, a dwa `&SURF` o identycznym `id` są w pliku FDS niejednoznaczne. Element bez `idAC`, którego `id` przyszło w ładunku, jest więc pomijany: rysunek wygrywa, spójnie z regułą „obiekt z `idAC` pozostaje własnością CAD".

Typów numerowanych automatycznie (`OBST1`, `HOLE2`, …) to nie dotyczy — `rewriteIds()` nadaje zawsze numer o jeden większy od najwyższego zajętego, więc kolizja tam nie powstaje.

Osobna konsekwencja: `fExport()` dokłada domyślną warstwę `inert`, której nie ma w ładunku. Skoro scalanie przenosi ją teraz z poprzedniego importu, dokładanie drugiej duplikowałoby ją przy każdym imporcie — dlatego `fExport()` dodaje `inert` tylko wtedy, gdy scalona lista go nie zawiera.

### Tłumaczenie selekcji

`fSelect` tłumaczy `idAC → uuid` na wejściu, `selectCad` `uuid → idAC` na wyjściu. Element bez `idAC` jest w tę drugą stronę pomijany — nie da się pokazać w rysunku obiektu, którego rysunek nie zawiera.
