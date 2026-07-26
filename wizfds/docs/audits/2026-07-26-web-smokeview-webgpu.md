# Audyt: `visualize` + `web-smokeview-lib` (WebGPU)

- **Data:** 2026-07-26
- **Zakres:** `projects/wizfds/src/app/views/main/fds/visualize`, `projects/web-smokeview-lib` (6690 linii kodu produkcyjnego), wszystkie shadery WGSL i GLSL
- **Cel:** ocena gotowości modułu przed rozbudową o nowe elementy wizualizacji i docelowo o edycję geometrii w przeglądarce
- **Decyzje podjęte na podstawie tego audytu:** ADR-0001 … ADR-0006 w [`docs/adr/`](../adr/)
- **Plan wdrożenia:** [`docs/plans/smokeview-core-migration.md`](../plans/smokeview-core-migration.md)

## Metoda

1. Lektura całości kodu biblioteki i komponentu `visualize`, wszystkich shaderów oraz odnośnych fragmentów `babylonjs@7.54.3` w `node_modules`.
2. Weryfikacja API Babylona względem oficjalnej dokumentacji (Context7: `/babylonjs/documentation`) — WGSL w `ShaderMaterial`, `CSG2`, `snapshotRendering`, `performancePriority`, `Material.freeze()`.
3. **Eksperyment**: izolowany harness kompilujący wszystkie shadery biblioteki na obu backendach, na serwerze odtwarzającym SPA-fallback dev-servera Angulara i produkcyjnego `/view/`.

Znaleziska są oznaczone jako **[potwierdzone eksperymentalnie]**, **[potwierdzone w kodzie]** (wynika jednoznacznie z lektury kodu, deterministyczne) albo **[hipoteza]**.

## Środowisko

| | |
|---|---|
| Babylon.js | **7.54.3**, pakiet **UMD** `babylonjs` + `babylonjs-materials` (nie `@babylonjs/core`) |
| Engine | `WebGPUEngine` z fallbackiem na `Engine` (WebGL) — `babylon.service.ts:70-90` |
| Język shaderów | wybierany automatycznie: `useWGSL = isWebGPU` |
| Assety | shadery lib kopiowane do `wizfds` i `webSmokeview` globem `**/*` w `angular.json` |
| Budżet bundla | initial: 6 MB ostrzeżenie / 12 MB błąd |

## Wynik eksperymentu

Engine wykryty: **WebGPU**.

| Shader | WGSL (WebGPU) | GLSL (WebGL) |
|---|---|---|
| `obst` | ✅ OK | ❌ `VERTEX SHADER ERROR: 0:7: '<' : syntax error` |
| `obstBackCap` | ✅ OK | ❌ ten sam błąd |
| `mesh` | ✅ OK | ❌ ten sam błąd |
| `slice` | ✅ OK (kompiluje się — patrz A3) | ❌ ten sam błąd |
| `vent` | ✅ OK | ✅ OK |
| `arrow` | ✅ OK | ✅ OK |
| `fire` | ✅ OK | ⛔ plik nie istnieje |

**Wniosek: cały komplet WGSL kompiluje się poprawnie. Ścieżka WebGL jest martwa.** Na maszynie bez WebGPU użytkownik widzi pustą scenę, a nie „gorszą grafikę".

---

## A. Blokery funkcjonalne

### A1. Brak shaderów `fire` dla GLSL **[potwierdzone eksperymentalnie]**

`src/assets/shaders/glsl/` nie zawiera `fire.vertex.fx` ani `fire.fragment.fx`. Shadera `fire` używają **dwa** serwisy:

- `fire.service.ts:144` — pożary,
- `vent.service.ts:375` — **wszystkie podstawowe VENT-y** (`renderBasicVents()` ładuje `'fire'`, bo ten shader ma clipping i uniform `transparent`).

Na WebGL `fetch` dostaje `index.html` (status 200 z SPA-fallbacku), shader się nie kompiluje. Obie metody są `async` i nikt ich nie łapie (`visualize.component.ts:74,110`) → cicha, nieobsłużona odrzucona obietnica.

### A2. `#include<__decl__>` psuje wszystkie pozostałe shadery GLSL **[potwierdzone eksperymentalnie]**

Występuje w `glsl/{obst,obstBackCap,mesh,slice}.vertex.fx` (pierwsza linia pliku).

Mechanizm, prześledzony w `node_modules/babylonjs/babylon.max.js`:

1. `_ProcessIncludes` wykrywa `__decl__` (linia 53694), usuwa go i dokleja `"Declaration"`.
2. Klucz `Declaration` **nie istnieje** w `IncludesShadersStore` w 7.54.3 (zweryfikowane).
3. Kod wchodzi w gałąź `else` i fetchuje `<ShadersRepository>ShadersInclude/Declaration.fx`, przy czym `ShadersRepository` jest ustawione przez `babylon.service.ts:100-103` na `assets/shaders/glsl/`.
4. `_functionContainer.loadFile(url, onSuccess)` (linia 53760) jest wołane **bez callbacku błędu**.

Skutki zależą od serwera: przy SPA-fallbacku (dev-server Angulara, produkcyjny `/view/`) wraca `index.html` ze statusem 200 i **HTML zostaje wklejony w kod GLSL** — stąd `'<' : syntax error`. Przy prawdziwym 404 kompilacja **nigdy się nie kończy**, bez żadnego błędu w konsoli.

### A3. `slice.fragment.wgsl` jest atrapą **[potwierdzone w kodzie]**

```wgsl
let uv = vec2<f32>(0.5, 0.5);
return FragmentOutputs(textureSample(texture_colorbar_sampler_tex, texture_colorbar_sampler_texSampler, uv));
```

Shader ignoruje `texture_coordinate` i zawsze sampluje ten sam punkt colorbara. `slice.vertex.wgsl` deklaruje atrybuty `texture_coordinate` i `blank`, po czym **nie przekazuje żadnego varying** do fragmentu. Obsługa `blank` (wycinanie komórek zasłoniętych geometrią) nie istnieje w WGSL w ogóle.

Wersja GLSL jest poprawna merytorycznie (`texture_coordinate / 255.0`, `if (vblank == 0.0 && is_blank == 1) discard`) — ale się nie kompiluje (A2). **SLCF nie działa na żadnym backendzie.**

### A4. `Slice` rzuca `TypeError` w konstruktorze **[potwierdzone w kodzie]**

`slice.ts:61-94` tworzy materiał wewnątrz `.then()`, a `slice.ts:96` woła synchronicznie:

```ts
this.material.setInt('is_blank', this.isBlank);
```

`this.material` jest wtedy `undefined`. Gałąź `if (svc?.loadShaderSources)` jest zawsze wybierana, bo `babylon.service.ts:145` ustawia `scene.babylonService`.

### A5. Rozjazd semantyki clippingu **[potwierdzone w kodzie]**

GLSL tnie po `worldPosition` (world space, `glsl/obst.vertex.fx`), WGSL po `vPositionOS` (object space, `wgsl/obst.vertex.wgsl`). Zgodne wyłącznie dopóki world matrix jest macierzą jednostkową. Strzałki jetfanów już mają rotację i przesunięcie (`jetfan.service.ts:155-214`) — pierwszy element z transformacją, dla którego zażądamy clippingu, rozjedzie się między backendami.

### A6. Rozjazd modeli oświetlenia **[potwierdzone w kodzie]**

`glsl/mesh.fragment.fx` implementuje pełny Phong (`lightPos`, składowa zwierciadlana, `shininessVal`), a `wgsl/mesh.fragment.wgsl` — proste ambient + diffuse. Ten sam model wygląda inaczej zależnie od backendu.

---

## B. Architektura warstwy shaderów

**B1. Brak cache'owania.** `loadShaderSources()` robi `fetch(..., { cache: 'no-cache' })` przy każdym wywołaniu. `ObstService.render()` woła je **trzykrotnie** (opaque, transparent, backCap) → sześć żądań na jedno renderowanie, powtarzanych przy każdym renderze.

**B2. Martwy kod konfiguracji repozytorium.** `babylon.service.ts:99-113` ustawia `Engine.ShadersRepository`, `Effect.ShadersRepository`, `Effect.ShadersRepositoryWGSL` i woła nieistniejące `Effect.SetShadersRepository?.()`. Wszystkie shadery i tak są pobierane własnym `fetch`-em i wstrzykiwane jako `vertexSource`/`fragmentSource`. Jedyny realny efekt tego bloku to globalne nadpisanie repozytorium, przez które Babylon szuka **własnych** plików include pod ścieżką naszych assetów (i to właśnie ono materializuje A2).

**B3. Materiały powstają asynchronicznie, UI o tym nie wie.** Każda kontrolka może trafić na `undefined`:
- `smokeview.component.html:29` — `obstService.material.wireframe`,
- `obst.service.ts:70` — `this.mesh.material.setFloat(...)` w `clip()`,
- `smokeview.component.html:30` — `obstService.mesh.edgesWidth`.

**B4. `freeze()` — zachowanie zweryfikowane.** `Material.freeze()` (`babylon.max.js:185125`) ustawia wyłącznie `checkReadyOnlyOnce = true`. `setFloat` działa dalej, więc clipping na zamrożonym materiale jest poprawny. Natomiast przełączenie `wireframe` na zamrożonym materiale nie przebuduje efektu.

**B5. Redundantny atrybut `color`.** Babylon dodaje `VertexBuffer.ColorKind` automatycznie, gdy mesh ma dane koloru (`babylon.max.js:191092`). Ręczne dodawanie `"color"` do `attributes` jest nadmiarowe (nieszkodliwe — jest sprawdzenie `indexOf`), ale dokumentacja WGSL wprost odradza tę praktykę.

---

## C. Wydajność

**C1. Pakiet UMD zamiast ES6.** `babylonjs` nie podlega tree-shakingowi — cały silnik ląduje w bundlu. Przy WebGPU-only (ADR-0001) otwiera się droga do `@babylonjs/core` lub Babylon Lite (WebGPU-exclusive, tree-shakable, wynik pixel-identyczny).

**C2. `scene.freeActiveMeshes()` zamiast `freezeActiveMeshes()`.** `obst.service.ts:658` — wywołanie **czyści** cache aktywnych meshy zamiast go zamrozić. Komentarz obok („Put somewhere else…") sugeruje, że intencją była optymalizacja.

**C3. Niewykorzystane mechanizmy dla scen statycznych.** Scena jest w praktyce niezmienna po załadowaniu, a mimo to nie użyto `engine.snapshotRendering` / `SnapshotRenderingHelper` (wyłączne dla WebGPU), `scene.performancePriority` ani instancjonowania.

**C4. Przestarzałe API.** `BABYLON.Mesh.CreateLines` w `babylon.service.ts:221-241`.

**C5. Wycieki pamięci.**
- `ObstService.render()` disposuje meshe, ale nie materiały — przy każdym renderze zostaje osierocony `ShaderMaterial`.
- `open.service.ts:41`: `for (let i; i < this.meshes.length; i++)` — `i` jest `undefined`, warunek to `undefined < n` → `false`. **Pętla nigdy się nie wykonuje**, meshe i materiały OPEN nie są zwalniane nigdy.

---

## D. Model danych i geometria

**D1. Przeliczanie normalnych w czasie O(n²).** `obst.service.ts:489-510`: dla **każdego** OBST kod skanuje **całą** tablicę `this.indices`, szukając indeksów należących do jego zakresu. Przy 5000 OBST (30 000 indeksów × 5000 iteracji) to setki milionów operacji na jedno renderowanie.

**D2. Pickowanie wskazuje zły obiekt.** `obst.service.ts:708-772`: ray-triangle liczony w JS po wszystkich trójkątach, a wynik mapowany przez `this.obsts[Math.floor(intersectInfo[0].faceId / 12)]`. Założenie „12 trójkątów na obiekt w jednym buforze" łamią:
- OBST z otworami (CSG, zmienna liczba trójkątów),
- podział na bufor nieprzezroczysty i przezroczysty (osobne meshe, osobna numeracja, wspólna tablica `this.obsts`).

Dodatkowo `smokeview.component.ts:48` woła `this.obstService.pickedObstMesh.dispose()` bez sprawdzenia, czy mesh istnieje — Ctrl+klik w pustkę przed pierwszym zaznaczeniem rzuca wyjątek.

**D3. Przestarzała `BABYLON.CSG`.** `hole.service.ts:42-44` używa klasy `CSG`, zdeprecjonowanej w Babylonie 7.31 na rzecz `CSG2` (biblioteka Manifold, wymaga `await BABYLON.InitializeCSG2Async()`). Stara implementacja jest wolna i zawodzi na ścianach współpłaszczyznowych — a `&HOLE` w FDS z definicji jest współpłaszczyznowy ze ścianami `&OBST`.

**D4. Otwory nie są przypisywane do przegród.** `ObstService.holeIntersectsObst()` (`:892`) wymaga **pełnego zawierania** otworu w bryle OBST. W FDS `&HOLE` zwykle przebija przegrodę na wylot i wystaje poza jej obrys, więc typowy otwór nie zostanie przypisany do żadnego OBST. Poprawna implementacja (test przecięcia AABB) istnieje w `hole.service.ts:231` i **nie jest używana**.

**D5. Normalizacja jako ukryty stan globalny.** `HelpersService` trzyma `normDelta` i `norm{X,Y,Z}{Min,Max}`. Kolejność wywołań serwisów decyduje o poprawności wyniku; `ObstService`, `HoleService` i `JetfanService` mają skopiowaną heurystykę „policz bounds, jeśli `normDelta === 1`" na wypadek, gdyby `MeshService` nie zdążył. `FireService`, `VentService` i `OpenService` po prostu zakładają, że ktoś już policzył. Brak jawnego kontraktu — to najpoważniejsza pułapka przy dodawaniu nowych elementów.

**D6. Dwa niespójne kontrakty na granicy aplikacja↔biblioteka.** `visualize.component.ts` przekazuje OBST i MESH jako obiekty domenowe przez referencję (linia 40), a pożary i VENT-y remapuje ręcznie (linie 52-109), bo te klasy nie mają pola `vis`. `IObst.surf` ma typ `any`, a biblioteka sięga po `obst.surf.surf_id.id`.

**D7. Biblioteka mutuje model domenowy aplikacji.** `ObstService.normalizeObsts()` zapisuje do `obst.vis.xbNorm` (`:231`) na obiektach przekazanych przez referencję. Pole `vis` istnieje w klasach `Obst`, `Mesh`, `Open` i `primitives`, ale **nie trafia do `toJSON()`** — więc nie ląduje w bazie. Wyciek warstwy prezentacji do domeny, bez konsekwencji dla persystencji.

**D8. `getNormals()` jest martwy i błędny.** `helpers.service.ts:154-171` zwraca normalne wyłącznie dla osi Z (sześć razy powtórzony wzorzec „dół/góra"), co nie odpowiada geometrii z `getVerticesFromXb()`. Metoda nie jest nigdzie wywoływana — normalne liczy `VertexData.ComputeNormals`.

**D9. `HelpersService` używa globalnego `BABYLON`.** `helpers.service.ts:29,35,41` odwołuje się do `BABYLON.Vector3`, mimo że plik importuje tylko `{ Vector3 }`. Działa wyłącznie dzięki temu, że pakiet UMD wystawia globalny obiekt `BABYLON` — po ewentualnym przejściu na `@babylonjs/core` (C1) te trzy linie przestaną się kompilować.

---

## E. Cykl życia

**E1. Singletony przeżywają scenę.** Wszystkie serwisy są `providedIn: 'root'` i trzymają referencje do meshy, materiałów oraz stan (`clipX`, `visibility`, tablice geometrii). `SmokeviewComponent.ngOnDestroy()` niszczy scenę i engine, nie dotykając serwisów. Po powrocie do widoku `ready$` — jako `ReplaySubject(1)` — **natychmiast emituje starą wartość**, więc `VisualizeComponent.ngAfterViewInit()` zaczyna renderować, zanim nowa scena powstanie.

**E2. `VisualizeComponent` ma `ngOnDestroy()` bez `implements OnDestroy`.** Działa (Angular sprawdza obecność metody), ale bez kontroli typów.

**E3. Brak obsługi utraty kontekstu GPU.** Nie ma reakcji na `device lost` w WebGPU ani na `webglcontextlost`.

---

## F. Pokrycie FDS i SmokeView

Zaimplementowane: `&MESH`, `&OBST`, `&HOLE`, `&VENT`, `OPEN`, kolor i przezroczystość z `&SURF`, pożary, jet fany (własne rozszerzenie WizFDS).

Puste stuby (po ~10 linii, sam dekorator `@Injectable`): `BndfService`, `GeomService`, `PartService`, `LineService`, `SliceCellService`, `SliceNodeService`. `SliceGeomService` zawiera wyłącznie zakomentowany kod z czasów Three.js.

Luki względem SmokeView — zgodnie z tabelą w [`docs/reference/fds-smv-structure.md`](../reference/fds-smv-structure.md): PLOT3D (`.q`), izopowierzchnie (`.iso`), dym 3D (`.s3d`), HVAC, ZONE. Do tego BNDF i PART mają stuby bez implementacji, a SLCF nie działa (A3, A4).

`consts/shaders.ts` zawiera 57 linii shaderów GLSL dla slice (`vertCode_slice_geom` i pokrewne) — nieużywanych przez żaden serwis, pozostałość po poprzedniej implementacji.

---

## Podsumowanie: co blokuje rozbudowę

Sam fakt, że da się dopisać kolejny `renderXxx()`, nie znaczy, że warto. Przy planowanym kierunku (edycja geometrii w przeglądarce) cztery rzeczy trzeba rozstrzygnąć **zanim** dojdą nowe elementy:

1. **Jednostki** (D5, ADR-0002) — bez współrzędnych w metrach nie ma snapowania, wymiarowania ani sensownego wprowadzania danych.
2. **Tożsamość obiektu na GPU** (D2, ADR-0006) — bez niej nie ma zaznaczania, hover, gizmo ani powiązania 3D z formularzem.
3. **Granica aplikacja↔biblioteka** (D6, D7, ADR-0004) — dziś biblioteka pisze do modelu domenowego, a kontrakt danych to `any`.
4. **Cykl życia** (E1) — bez tego każda nawigacja do widoku i z powrotem zostawia stan w stanie nieokreślonym.

Blokery A1–A6 znikają w większości wraz z decyzją ADR-0001 (usunięcie GLSL). Pozostają A3 i A4 — SLCF wymaga napisania od nowa, niezależnie od backendu.
