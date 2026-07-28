# ADR-0006: Hybrydowa reprezentacja GPU — thin instances dla masy, osobne meshe dla obiektów wyróżnionych

- **Data:** 2026-07-26
- **Status:** zaakceptowana
- **Dotyczy:** `projects/web-smokeview-lib`

## Kontekst

Skala scenariuszy WizFDS to **1000–10000 OBST** (garaże wielopoziomowe, tunele z wyposażeniem).

Dwa skrajne podejścia mają przeciwne wady:

- **Jeden wielki mesh** (stan obecny) — jeden draw call, ale zero tożsamości obiektu na GPU, a każda edycja przebudowuje cały bufor. Do tego dochodzi dzisiejsze O(n²) przy liczeniu normalnych (`obst.service.ts:489-510`).
- **Osobny `Mesh` na każdy obiekt** — natywne pickowanie, gizmo i per-obiekt widoczność bez żadnej dodatkowej maszynerii, ale przy 10 000 obiektów liczba draw calli i narzut na obliczanie macierzy oraz frustum culling stają się problemem.

Wszystkie OBST w FDS to prostopadłościany zorientowane wzdłuż osi — geometrycznie identyczne z dokładnością do skali i przesunięcia. To modelowy przypadek dla instancjonowania.

Wyjątki, których nie da się wyrazić jedną instancjonowaną bryłą: OBST z otworami (HOLE — geometria wynikowa jest indywidualna), przyszłe `&GEOM` (dowolne siatki trójkątów) oraz obiekt aktualnie edytowany, który zmienia się co klatkę.

## Decyzja

Reprezentacja **hybrydowa**, z jednoznacznym kryterium przydziału:

- **Thin instances** — domyślna ścieżka dla masy prostopadłościanów (OBST, MESH, jetfany, bryły VENT-ów). Jedna bryła bazowa, per-instancja macierz i kolor. Instancje niosą swoją tożsamość, żeby dało się przejść od trafienia do `uuid` (ADR-0005).
- **Osobne meshe** — dla obiektów, które nie mieszczą się w instancjonowaniu: OBST z otworami, `&GEOM`, obiekt zaznaczony lub przeciągany, oraz wszystko, co ma własną geometrię wynikową.

Obiekt może **przechodzić między ścieżkami**: zaznaczenie lub rozpoczęcie edycji promuje go do osobnego mesha, zakończenie edycji wraca go do puli instancji. Dzięki temu edycja nigdy nie przebudowuje bufora tysięcy obiektów.

Pickowanie idzie przez mechanizmy Babylona (z obsługą pickowania thin instances), nie przez ręczny raycasting w JS.

## Konsekwencje

**Pozytywne**
- Koszt renderowania masy geometrii przestaje rosnąć liniowo z liczbą draw calli.
- Edycja pojedynczego obiektu nie dotyka bufora pozostałych.
- Scena jest w praktyce statyczna poza momentem edycji, co otwiera drogę do `snapshotRendering` (WebGPU) i `scene.performancePriority`.

**Negatywne / do obsłużenia**
- Dwie ścieżki renderowania = dwie ścieżki do przetestowania; promocja i degradacja obiektu między nimi musi być bezszwowa wizualnie.
- ~~Rysowanie krawędzi (`enableEdgesRendering`) na thin instances zachowuje się inaczej niż na zwykłych meshach~~ — nieaktualne od Babylona 9. `EdgesRenderer.render()` bindje `world0..world3` z mesha bazowego i rysuje `thinInstanceCount` instancji, więc jedno wywołanie obsługuje całą pulę. Osobna geometria krawędzi ani obrys w shaderze nie były potrzebne (#87).
- Sortowanie przezroczystości przy instancjonowaniu jest trudniejsze; dzisiejszy podział na mesh nieprzezroczysty i przezroczysty trzeba odtworzyć na poziomie puli instancji.

## Uzupełnienie po wdrożeniu (#87): mechanizmy „statycznej sceny"

Powyżej napisano, że hybryda otwiera drogę do `snapshotRendering` i `scene.performancePriority`. Zmierzone na urządzeniu WebGPU (Babylon 9.18, `tools/shader-harness` + sterowanie Playwrightem) — **dwa z trzech ustawień psują właśnie to rysowanie, które mają przyspieszyć**:

| Ustawienie | Wynik |
|---|---|
| `ScenePerformancePriority.Intermediate` | działa; wyłącza pickowanie całej sceny przy każdym ruchu myszy — przy 10 000 instancji to 10 000 testów promienia na `pointermove`. Wyłącza też `autoClear`, które trzeba przywrócić: model nie zakrywa całego kanwasu i tło rozmazywałoby się przy obrocie kamery. |
| `ScenePerformancePriority.Aggressive` | **psuje**. Po zmianie `thinInstanceCount` pula przestaje być rysowana w ogóle — zostają same krawędzie — a `scene.resetDrawCache()` tego nie cofa. |
| `engine.snapshotRendering` (tryb STANDARD) | **psuje**. Ten sam objaw po tym samym wyzwalaczu, a `snapshotRenderingReset()` go nie naprawia. Dodatkowo `reset()` to w Babylonie `enabled = false; enabled = true`, więc nie da się go użyć nawet jako bezpiecznego no-opa na silniku, który nigdy nie włączył snapshotów. |

Zmiany uniformów (suwaki przycinania, kamera) przechodzą przez snapshot poprawnie — pęka wyłącznie zmiana strukturalna puli. Ponieważ promocja i degradacja obiektu (rdzeń tej decyzji) jest właśnie taką zmianą, włączone zostaje wyłącznie `Intermediate`. Do tematu można wrócić, gdy Babylon to naprawi.

### Które elementy trafiły do puli

`OBST`, `MESH` i korpusy jetfanów. **`VENT` nie** — mimo że decyzja wymienia „bryły VENT-ów": w modelu FDS `&VENT` jest płaszczyzną, a `HelpersService.generateVentGeometry()` obsługuje wyłącznie przypadki `x1==x2`, `y1==y2` i `z1==z2`. Nie ma tam bryły do instancjonowania, więc `VentService` zostaje na wspólnym buforze z zakresami ścian.

## Rozważone alternatywy

- **Wyłącznie osobne meshe.** Najprostsze i całkowicie wystarczające przy setkach obiektów — ale nie przy dziesięciu tysiącach.
- **Wyłącznie thin instances plus pickowanie przez bufor identyfikatorów na GPU.** Najwydajniejsze, konieczne dopiero przy dziesiątkach tysięcy obiektów. Znacząco więcej pracy w rdzeniu i utrudniona obsługa geometrii nietypowej.
