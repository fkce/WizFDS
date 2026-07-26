# Plan migracji `web-smokeview-lib` na nowy rdzeń

- **Data:** 2026-07-26
- **Podstawa:** [audyt z 2026-07-26](../audits/2026-07-26-web-smokeview-webgpu.md), ADR-0001 … ADR-0006
- **Zasada nadrzędna:** po każdej fazie podgląd geometrii **działa**. Żadna faza nie zostawia modułu w stanie nieużywalnym.

Odniesienia w nawiasach kwadratowych wskazują znaleziska z audytu.

---

## Faza 0 — Odblokowanie i higiena

**Cel:** usunąć martwy kod i naprawić błędy, które nie zależą od nowego rdzenia. Wszystko tutaj jest samodzielne i niskiego ryzyka.

1. **Usunąć ścieżkę GLSL** (ADR-0001): katalog `src/assets/shaders/glsl/`, przełączniki `useWGSL` / `forceWebGL` / `forceWGSL`, gałąź `folder`/`ext` w `loadShaderSources()`, fallback na `BABYLON.Engine` w `createScene()`. Shadery WGSL przenieść z podkatalogu `wgsl/` bezpośrednio do `assets/shaders/`. [A1, A2, A5, A6]
2. **Komunikat o braku WebGPU**: wykrycie `navigator.gpu` przed próbą utworzenia sceny i czytelna informacja w UI zamiast pustego kanwasu. [ADR-0001]
3. **Usunąć martwą konfigurację repozytorium shaderów** — `babylon.service.ts:99-113`. [B2]
4. **Cache źródeł shaderów** w `loadShaderSources()`: mapa `nazwa → Promise<sources>`, zdjęcie `cache: 'no-cache'`. Redukuje sześć żądań na render OBST do dwóch na całą sesję. [B1]
5. **Naprawić wycieki**: `open.service.ts:41` (pętla `for (let i; …)`, która nigdy się nie wykonuje) oraz dispose materiałów w `ObstService.render()`. [C5]
6. **`freeActiveMeshes()` → `freezeActiveMeshes()`** albo usunięcie wywołania, jeśli nie ma uzasadnienia. [C2]
7. **Naprawić przypisywanie otworów**: `ObstService` ma używać `HoleService.holeIntersectsObst()` (test przecięcia AABB) zamiast własnej wersji wymagającej pełnego zawierania. Bez tego typowy `&HOLE` nie jest w ogóle przypisywany. [D4]
8. **Zabezpieczyć UI przed asynchronicznym materiałem**: `smokeview.component.html:29,30` oraz `smokeview.component.ts:48` (`pickedObstMesh.dispose()` bez sprawdzenia istnienia). [B3, D2]
9. **Usunąć martwy kod**: `helpers.service.ts` → `getNormals()` [D8], `consts/shaders.ts` (nieużywane shadery slice z czasów Three.js), zakomentowana zawartość `slice-geom.service.ts`.
10. **Odkurzyć assety `webSmokeview`**: `projects/webSmokeview/src/assets/shaders/` zawiera własną, przestarzałą kopię shaderów, przykrywaną przez glob z `angular.json`. Usunąć.

**Gotowe, gdy:** podgląd na WebGPU działa jak dotąd, przeglądarka bez WebGPU pokazuje komunikat, w repo nie ma ani jednego pliku `.fx`, a renderowanie sceny nie generuje osieroconych materiałów.

---

## Faza 1 — Rdzeń: cykl życia i tożsamość

**Cel:** dać scenie jawny cykl życia i wprowadzić `uuid` jako klucz, zanim cokolwiek zacznie zależeć od nowej reprezentacji GPU.

1. **Kontrakt danych** na granicy aplikacja↔biblioteka: otypowane, płaskie struktury wejściowe zamiast klas domenowych przekazywanych przez referencję. Koniec z `IObst.surf: any` i z ręcznym remapowaniem pożarów i VENT-ów w `visualize.component.ts:52-109`. [D6, ADR-0004]
2. **Biblioteka przestaje mutować wejście** — żadnego zapisu do `obst.vis.*`. [D7]
3. **Rejestr sceny**: dwukierunkowe mapowanie `uuid` ↔ reprezentacja w scenie, jedno miejsce zamiast tablic rozsypanych po serwisach. [ADR-0005]
4. **Jawny cykl życia**: tworzenie i niszczenie sceny resetuje stan wszystkich serwisów rysujących. `ready$` przestaje być `ReplaySubject(1)` odtwarzającym nieaktualny sygnał po ponownym wejściu w widok. [E1]
5. **`implements OnDestroy`** w `VisualizeComponent` [E2] i reakcja na utratę urządzenia GPU [E3].

**Gotowe, gdy:** wielokrotne wejście i wyjście z widoku wizualizacji nie zostawia śladu w postaci starych meshy, błędów w konsoli ani renderowania do nieistniejącej sceny.

---

## Faza 2 — Współrzędne w metrach

**Cel:** wyeliminować normalizację do sześcianu jednostkowego (ADR-0002).

1. Usunąć `norm*` z `HelpersService` i pole `vis.xbNorm` ze wszystkich ścieżek renderowania oraz z klas `Obst`, `Mesh`, `Open`, `primitives` (pole nie trafia do `toJSON()`, więc baza nie jest naruszona). [D5, D7]
2. Wyliczać z bounding boxa sceny: parametry kamery (`minZ`, `maxZ`, `wheelPrecision`, `panningSensibility`, limity promienia), zakresy clippingu, grubości krawędzi, rozmiary markerów i strzałek. [D5]
3. Clipping przenieść na wartości w metrach; suwaki UI mapować na zakres bounding boxa zamiast na `-1.1 … 1.1`.
4. Usunąć skopiowaną heurystykę „policz bounds, jeśli `normDelta === 1`" z `ObstService`, `HoleService` i `JetfanService`.
5. Zamienić `BABYLON.Mesh.CreateLines` na aktualne API [C4] i usunąć odwołania do globalnego `BABYLON` w `HelpersService` [D9].

**Gotowe, gdy:** współrzędna odczytana z pickowania jest wprost współrzędną FDS w metrach, a scena wygląda tak samo jak przed migracją — dla modeli o rozciągłości od kilku do kilkuset metrów.

---

## Faza 3 — Reprezentacja GPU i pickowanie

**Cel:** wprowadzić hybrydę z ADR-0006 i naprawić zaznaczanie.

1. **Thin instances** dla prostopadłościanów: jedna bryła bazowa, per-instancja macierz i kolor, tożsamość instancji powiązana z `uuid`. [ADR-0006]
2. **Osobne meshe** dla geometrii nietypowej: OBST z otworami, przyszłe `&GEOM`, obiekt zaznaczony lub edytowany. Promocja i degradacja obiektu między ścieżkami.
3. **Pickowanie przez mechanizmy Babylona** zamiast ręcznego raycastingu; usunięcie `Math.floor(faceId / 12)`. Obsługa hover i wielokrotnego zaznaczenia. [D2]
4. **Usunięcie przeliczania normalnych w O(n²)** — przy instancjonowaniu normalne bryły bazowej liczone są raz. [D1]
5. **Krawędzie na thin instances** — dzisiejsze `enableEdgesRendering()` zachowuje się inaczej; potrzebna osobna geometria krawędzi albo obrys w shaderze. [ADR-0006]
6. **Migracja na `CSG2`** (`await InitializeCSG2Async()`) dla `&HOLE`. [D3]
7. **Włączyć `snapshotRendering` i `scene.performancePriority`** — scena poza edycją jest statyczna. [C3]

**Gotowe, gdy:** Ctrl+klik trafia we właściwy obiekt, również dla OBST z otworami i przezroczystych; scena z 10 000 OBST renderuje się płynnie.

---

## Faza 4 — Migracja elementów i uzupełnienie geometrii wejściowej

Kolejno, każdy element na nowy rdzeń: MESH → OBST → HOLE → VENT → OPEN → jet fany → pożary.

Po zamknięciu listy migracyjnej — nowe elementy geometrii wejściowej: `&DEVC` / `&PROP` (czujki, tryskacze, termopary; wzorzec: `smv_objects.tex` i `IOobjects.c` w SMV), `&GEOM`, `&ZONE`, `&INIT`.

**Gotowe, gdy:** w bibliotece nie ma już ani jednej ścieżki renderowania sprzed migracji.

---

## Faza 5 — Edycja geometrii

1. **Strumień komend edycji** z biblioteki, walidacja i zastosowanie po stronie aplikacji, undo/redo na `Fds`. [ADR-0004]
2. **Gizmo** przesuwania i skalowania, z podglądem gestu rysowanym lokalnie i komendą emitowaną na jego zakończenie.
3. **Snapowanie**: do siatki `&MESH`, do krawędzi i naroży istniejącej geometrii, do wprowadzonej wartości.
4. **Rysowanie nowych obiektów**: OBST, HOLE, VENT.
5. **`CadService` na `uuid`** — przegląd wszystkich miejsc traktujących `idAC` jako klucz główny, tłumaczenie `idAC` → `uuid` przy selekcji z CAD. [ADR-0005]
6. **Wymiarowanie i pomiar odległości.**

---

## Faza 6 — Post-processing

1. **Oś czasu** wspólna dla wszystkich formatów animowanych, zastępująca dzisiejszy `PlayerService` z `setInterval`.
2. **SLCF od nowa** — obecna implementacja nie działa: shader WGSL ignoruje `texture_coordinate`, brak obsługi `blank`, konstruktor `Slice` rzuca `TypeError`. [A3, A4]
3. **BNDF**, **PART** — dziś puste stuby.
4. **Luki względem SmokeView**: ISOF, SMOKE3D, PLOT3D, HVAC, ZONE (tabela w [`docs/reference/fds-smv-structure.md`](../reference/fds-smv-structure.md)). Compute shadery WebGPU są tu realną przewagą, szczególnie dla SMOKE3D i ISOF.
5. **Colorbary i legendy** — wzorzec w `getdatacolors.c` i `colorbars.c` w SMV.

---

## Poza planem, do rozstrzygnięcia osobno

- **Migracja z pakietu UMD `babylonjs` na `@babylonjs/core` albo Babylon Lite** [C1]. ADR-0001 to odblokowuje, ale decyzja wymaga osobnego rozpoznania — dotyka każdego importu w bibliotece.
- **Testy.** Wszystkie pliki `.spec.ts` w bibliotece to wygenerowane stuby. Przy pracy nad rdzeniem warto ustalić minimum: testy jednostkowe geometrii i normalizacji plus weryfikacja wizualna Playwrightem (już w `devDependencies`).
