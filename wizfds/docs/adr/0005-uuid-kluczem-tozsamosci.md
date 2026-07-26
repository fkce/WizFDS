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
