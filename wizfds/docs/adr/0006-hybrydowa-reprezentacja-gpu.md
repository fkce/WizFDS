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

Zmiany uniformów (suwaki przycinania, kamera) przechodzą przez snapshot poprawnie — pęka wyłącznie zmiana strukturalna puli. Ponieważ promocja i degradacja obiektu (rdzeń tej decyzji) jest właśnie taką zmianą, włączone zostaje wyłącznie `Intermediate`.

### Ile te mechanizmy w ogóle mogłyby dać

Zmierzone na GPU tą samą bryłą bazową, tymi samymi shaderami i tą samą konstrukcją instancji co `BoxInstancePool`. Cała siatka w kadrze — nic nie jest odsiewane, każda instancja rasteryzowana w każdej klatce, kamera w ruchu:

| OBST-ów | trójkątów | klatka (mediana) | CPU w `scene.render()` | meshy w scenie |
|---:|---:|---:|---:|---:|
| 10 000 | 240 tys. | 8,4 ms | 0,6 ms | 2 |
| 50 000 | 1,2 mln | 8,4 ms | 0,5 ms | 2 |
| 100 000 | 2,4 mln | 8,4 ms | 0,4 ms | 2 |
| 400 000 | 9,6 mln | 8,3 ms | 0,4 ms | 2 |

8,3 ms to sufit odświeżania monitora (120 Hz) — przy czterdziestokrotności skali z Definition of Done scena nadal go trzyma, a progu nie znaleziono. Wyłączenie krawędzi i back capa przy 200 000 nie zmienia mediany; wcześniejsze przypuszczenie, że krawędzie będą wąskim gardłem, okazało się błędne.

Kolumna CPU jest tu jedyną istotną, bo **`snapshotRendering` i `Aggressive` skracają wyłącznie ją** — składanie bufora poleceń, sortowanie, bindowanie stanu. Wynosi 0,4–0,6 ms przy każdej wielkości, w budżecie 8,3 ms. Gdyby oba działały i wycięły ją do zera, zysk to około 6% klatki.

Powód jest ten sam, dla którego podjęto tę decyzję: oba mechanizmy skalują się z **liczbą meshy**, a ta wynosi dwa niezależnie od tego, czy rysowany jest tysiąc czy czterysta tysięcy prostopadłościanów. Thin instances zlikwidowały to, co te ustawienia optymalizują — miałyby sens przy projekcie „osobny `Mesh` na każdy obiekt", który ta ADR odrzuca.

**Wniosek: `snapshotRendering` i `Aggressive` zostają wyłączone na stałe** — nie dlatego, że są zepsute (choć są), lecz dlatego, że przy tej reprezentacji ich zysk jest nieodróżnialny od zera. Nie ma po co do nich wracać, dopóki liczba meshy w scenie pozostaje stała.

*Zastrzeżenie: vsync ukrywa zapas — powyższe nie mówi, ile z tych 8,3 ms zużywa GPU. Dla tej decyzji nie ma to znaczenia, bo czas CPU zmierzono bezpośrednio.*

### Które elementy trafiły do puli

`OBST`, `MESH` i korpusy jetfanów. **`VENT` nie** — mimo że decyzja wymienia „bryły VENT-ów": w modelu FDS `&VENT` jest płaszczyzną, a `HelpersService.generateVentGeometry()` obsługuje wyłącznie przypadki `x1==x2`, `y1==y2` i `z1==z2`. Nie ma tam bryły do instancjonowania, więc `VentService` zostaje na wspólnym buforze z zakresami ścian.

## Uzupełnienie po wdrożeniu (#90): trzecia ścieżka, nazwana

Powyższe zapisano jako **wyjątek dla `&VENT`**. Przy domykaniu listy migracyjnej z #90 okazało się, że to nie wyjątek, tylko reguła dla całej klasy elementów: płaszczyzną jest też `OPEN`, płaszczyzną jest pożar (rysowany jako płaszczyzna swojego `&VENT`-a) i płaszczyzną są wlot i wylot jetfana. Każdy z tych czterech serwisów miał własną kopię tego samego kodu — pętla po płaszczyznach, dopisanie wierzchołków, przesunięcie indeksów, spisanie zakresów ścian.

Ścieżki są więc **trzy**, z jawnym kryterium przydziału:

| Ścieżka | Dla czego | Tożsamość |
|---|---|---|
| Thin instances (`BoxInstancePool`) | prostopadłościany: `OBST`, `MESH`, korpusy jetfanów | slot instancji |
| Wspólny bufor (`PlaneBatch`) | prostokąty zorientowane wzdłuż osi: `VENT`, `OPEN`, pożary, płaszczyzny jetfanów | zakres ścian w buforze |
| Osobne meshe | geometria wynikowa: `OBST` z otworem, przyszłe `&GEOM`, obiekt edytowany | sam mesh |

Płaszczyzny nie są instancjonowane nie dlatego, że jest ich mało, lecz dlatego, że trzy możliwe orientacje prostokąta to **inna geometria**, a nie ta sama bryła w innej skali — inaczej niż w przypadku prostopadłościanu, gdzie macierz per instancja wystarcza.

Dwie rzeczy, które ujawniło sprowadzenie tego do jednego miejsca:

- Płaszczyzna, której `XB` ma grubość na każdej osi (a taka potrafi przyjść ze scenariusza importowanego z CAD), wpisywała do bufora indeksy wskazujące na wierzchołki, których nigdy nie dodano — czyli na wierzchołki **następnego** elementu. Zakres ścian nazywał wtedy cudzy element i pickowanie trafiało w zły obiekt. `PlaneBatch` taką płaszczyznę pomija.
- `OPEN` był ostatnią ścieżką sprzed przebudowy: mesh na każdy otwór, `StandardMaterial`, zero przycinania. Suwak przecinał cały model **poza** otworami.

Stan uniformów i trzystanowy przycisk widoczności, wspólne dla wszystkich warstw płaszczyzn, siedzą w `ClippedPlaneLayer` — inaczej czwarty element geometrii wejściowej skopiowałby je po raz czwarty.

## Rozważone alternatywy

- **Wyłącznie osobne meshe.** Najprostsze i całkowicie wystarczające przy setkach obiektów — ale nie przy dziesięciu tysiącach.
- **Wyłącznie thin instances plus pickowanie przez bufor identyfikatorów na GPU.** Najwydajniejsze, konieczne dopiero przy dziesiątkach tysięcy obiektów. Znacząco więcej pracy w rdzeniu i utrudniona obsługa geometrii nietypowej.
