# ADR-0002: Współrzędne sceny w metrach 1:1, origin w (0,0,0) układu FDS

- **Data:** 2026-07-26
- **Status:** zaakceptowana
- **Dotyczy:** `projects/web-smokeview-lib`

## Kontekst

Cała geometria jest dziś skalowana do sześcianu jednostkowego. `HelpersService` trzyma stan normalizacji (`normDelta`, `normXMin/YMin/ZMin`, `normXMax/YMax/ZMax`), a każdy serwis rysujący przelicza swoje `xb` na `vis.xbNorm`, dzieląc przez `normDelta`.

Konsekwencje tego wyboru widać w całym kodzie:

- zakresy clippingu to magiczne `-1.1` / `1.1` (`obst.service.ts`, `fire.service.ts`, `vent.service.ts`),
- `camera.upperRadiusLimit = 50`, `wheelPrecision = 500`, `minZ = 0.01` — dobrane pod scenę o rozmiarze ~1,
- grubości krawędzi to stałe `0.05` / `0.1` niezależnie od skali modelu,
- rozmiary strzałek jetfanów podawane w metrach są dzielone przez `normDelta` (`jetfan.service.ts:136`),
- `normalizeObsts()` i `normalizeHoles()` zawierają skopiowaną heurystykę „policz bounds, jeśli `normDelta === 1`", bo kolejność wywołań serwisów nie jest niczym wymuszona.

Najpoważniejsze: `normDelta` jest **globalne dla sceny**. Dodanie jednego obiektu wykraczającego poza dotychczasowy bounding box zmienia dzielnik, więc wymaga przeliczenia i przebudowania **całej** geometrii.

WizFDS ma docelowo służyć do rysowania geometrii w przeglądarce (ADR-0003). Użytkownik wpisuje wymiary w metrach, potrzebuje siatki, snapowania i wymiarowania w metrach, a współrzędna odczytana z ekranu musi dać się wpisać wprost do pliku `.fds`.

## Decyzja

Scena jest renderowana **w metrach, 1:1, w układzie współrzędnych FDS**, z originem w (0,0,0). Normalizacja do sześcianu jednostkowego znika — razem z polem `vis.xbNorm` i stanem normalizacji w `HelpersService`.

Wszystko, co dotąd było stałą dobraną pod scenę jednostkową, jest wyliczane z bounding boxa sceny:

- limity i czułość kamery (`minZ`, `maxZ`, `wheelPrecision`, `panningSensibility`, `upper/lowerRadiusLimit`),
- zakresy suwaków clippingu (w metrach, prezentowane użytkownikowi jako wartości fizyczne),
- grubości krawędzi i rozmiary markerów (skalowane do rozmiaru sceny lub liczone w przestrzeni ekranu).

Scena pozostaje prawoskrętna z osią Z w górę (`useRightHandedSystem = true`, `camera.upVector = (0,0,1)`) — tak jak dziś i tak jak w FDS.

## Konsekwencje

**Pozytywne**
- Współrzędna z pickowania jest od razu współrzędną FDS — bez konwersji w obie strony przy każdej operacji edycyjnej.
- Snapowanie, wymiarowanie i siatka działają w jednostkach, w których myśli użytkownik.
- Dodanie obiektu poza dotychczasowym bounding boxem nie unieważnia geometrii pozostałych obiektów.
- Znika cała klasa błędów wynikająca z kolejności wywołań serwisów i współdzielonego stanu normalizacji.

**Negatywne / do obsłużenia**
- Trzeba przejść przez wszystkie stałe dobrane pod skalę jednostkową; przeoczona daje efekt „niewidocznej" albo „gigantycznej" geometrii.
- Wartości clippingu przestają być bezwymiarowe — suwaki muszą operować na zakresie bounding boxa.
- Klasy domenowe `Obst`, `Mesh`, `Open` i `primitives` mają pole `vis` z `xbNorm`. Nie trafia ono do `toJSON()`, więc nie ma go w bazie — usunięcie jest bezpieczne, ale wymaga sprawdzenia wszystkich odczytów.

**Wyjątek `webSmokeview` — zdjęty (#115).** Do 2026-08 standalone viewer czytał eksport HTML SmokeView, który normalizuje geometrię do sześcianu jednostkowego i nie niesie skali — współrzędne nie były tam metrami. Od #115 viewer czyta sam plik `.smv` (`parsers/smv/smv-parser.service.ts`), którego token `PDIM` niesie wymiary siatek w metrach; ścieżka eksportu JSON została wycofana w całości i decyzja obowiązuje bez wyjątków.

**Precyzja.** Float32 daje ok. 7 cyfr znaczących. Przy modelu o rozciągłości 1000 m błąd reprezentacji pozycji to rząd 0,1 mm — dla tuneli i garaży bez znaczenia. Gdyby kiedyś pojawiły się modele oddalone o kilometry od originu, wracamy do tematu przesunięcia originu renderowania (rozważone i odrzucone poniżej).

## Rozważone alternatywy

- **Metry z przesunięciem originu do środka sceny.** Chroni precyzję float przy modelach daleko od zera, ale wprowadza stałe przesunięcie na granicy model↔render, o którym trzeba pamiętać przy każdym pickowaniu i każdym wpisaniu współrzędnej. Odrzucone jako przedwczesna optymalizacja — zakres modeli WizFDS tego nie wymaga.
- **Zachować normalizację, dodać jawną warstwę konwersji.** Mniej zmian w istniejących serwisach, ale każda funkcja edycyjna musiałaby konwertować w obie strony, a problem globalnego `normDelta` przy dodawaniu obiektów pozostaje.
