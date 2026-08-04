# Manipulator przesunięcia (move gizmo) dla pudełek osiowych — jak go zaprojektować

- **Data:** 2026-08-03
- **Kontekst:** `#124` (faza 5: gizmo, snapping, dynamic input), gałąź `feat/124-gizmo-snapping`
- **Dotyczy:** `projects/web-smokeview-lib/src/lib/services/editing/gizmo.service.ts`
- **Status:** notatka badawcza — nie jest decyzją. Decyzja, jeśli zapadnie, idzie do `docs/adr/`.
- **Zakres porównania:** edytory CAD i silniki 3D (AutoCAD, SketchUp, Unity, Blender) **oraz** preprocesory symulacyjne (PyroSim, BlenderFDS, Ansys SpaceClaim/Discovery, COMSOL, Abaqus/CAE) — ta druga grupa jest bliższa temu, czym jest WizFDS.

## Pytanie

Jak zaprojektować manipulator przesunięcia w edytorze CAD/3D dla pudełek osiowych (`&OBST`, `&VENT`, `&HOLE` — sześć liczb `XB` i żadnego obrotu), żeby był **nienachalny** (mały, cichy, nie zasłania modelu), a mimo to **funkcjonalny** (trafialny myszą, jednoznaczny co do osi, współpracujący ze snapem i dynamic input)?

Bezpośredni powód: `PositionGizmo` przy `scaleRatio = 1.6` jest „nienaturalnie duży" i wchodzi w drogę. Skala była podniesiona na czas testów.

## Stan obecny — co dokładnie rysujemy

Dwa manipulatory, przełączane z ribbona (`ribbon.component.html:99-106`, przyciski **Move** / **Resize**):

| | move | resize |
|---|---|---|
| czym jest | Babylonowy `PositionGizmo` | sześć (a właściwie pięć) własnych trójkątnych uchwytów |
| rozmiar | `GIZMO_SCALE = 1.6` — `gizmo.service.ts:91` | `HANDLE_PIXELS = 12` — `gizmo.service.ts:53` |
| grubość | `ARROW_THICKNESS = 3` — `gizmo.service.ts:81` | — |
| jednostka rozmiaru | kąt widzenia (patrz niżej) | **piksele ekranu**, przeliczane co klatkę (`gizmo.service.ts:769-786`) |
| obszar trafienia | collider Babylona | własna niewidzialna kula-apertura, `diameter: 1.6` w jednostkach uchwytu (`gizmo.service.ts:717-721`) |
| kolor | domyślny RGB Babylona + żółty hover | `ACCENT_COLOR` = `#3b82f6` (`consts/drawing.ts:22`) |

Reszta pipeline'u, która ma znaczenie dla każdej z opcji:

- **klik vs. drag** rozstrzyga się na `pointerup` po dystansie `CLICK_SLOP` (`smokeview.component.ts:120-131`); naciśnięcie na manipulator jest odsiewane przez `gizmo.isPointerOnGizmo` (`smokeview.component.ts:98`).
- **Shift wyłącza kamerę** na czas trzymania (`smokeview.component.ts:186-195`: „Held down, the camera stops answering the pointer at all, so a drag can only be the tool"). To już istniejąca odpowiedź na problem „chybienie obraca model".
- **dynamic input** to klawiatura routowana wprost do gestu, bez fokusu DOM (`smokeview.component.ts:209-242`): cyfry, Tab, Enter, Backspace, przecinek jako kropka.
- **jeden gest = jedna komenda** (ADR-0004, ADR-0009); podgląd żyje w bibliotece, komenda leci na końcu gestu (`gizmo.service.ts:399-408`).

## Ustalenia — Babylon.js 9.18.0

Wszystkie liczby poniżej są **zweryfikowane w zainstalowanym buildzie** (`node_modules/babylonjs/babylon.max.js`, wersja 9.18.0), nie tylko w dokumentacji.

### Geometria strzałki

`AxisDragGizmo._CreateArrow(scene, material, thickness = 1, isCollider = false)`
([źródło](https://github.com/BabylonJS/Babylon.js/blob/master/packages/dev/core/src/Gizmos/axisDragGizmo.ts), potwierdzone w buildzie):

- stożek: `diameterTop: 0, height: 0.075, diameterBottom: 0.0375 * (1 + (thickness - 1) / 4)`, pozycja `z += 0.3`
- trzon: `diameterTop/Bottom: 0.005 * thickness, height: 0.275`, pozycja `z += 0.1375`
- całość: `this._gizmoMesh.scaling.scaleInPlace(1/3)`

Czyli **strzałka ma 0.3375 / 3 = 0.1125 jednostki długości** w przestrzeni `_rootMesh`.

### Collider jest z definicji grubszy od tego, co widać

W konstruktorze `AxisDragGizmo` powstają **dwie** strzałki:

```js
const arrow    = _CreateArrow(scene, coloredMaterial, thickness);
const collider = _CreateArrow(scene, coloredMaterial, thickness + 4, /* isCollider */ true);
```

Collider ma `visibility = 0` i grubość **`thickness + 4`**. Przy domyślnym `thickness = 1` trzon-collider jest **pięciokrotnie** szerszy niż trzon widoczny, a podstawa stożka-collidera dwukrotnie szersza.

> **Korekta do komentarza w naszym kodzie.** `gizmo.service.ts:78-81` uzasadnia `ARROW_THICKNESS = 3` zdaniem: „The default is a hairline, **and its collider is no wider**". Druga połowa tego zdania jest nieprawdziwa — Babylon zawsze buduje osobny collider `thickness + 4`. Cały argument za pogrubieniem strzałek stoi więc na błędnej przesłance (a dodatkowo Shift już odbiera kamerę pointerowi).

### Co dokładnie znaczy `scaleRatio`

`Gizmo._update()` (potwierdzone w buildzie):

```js
let scale = this.scaleRatio;
if (camera.mode == ORTHOGRAPHIC_CAMERA) { scale *= camera.orthoTop - camera.orthoBottom; }
else { scale *= Vector3.Dot(offsetToCamera, camera.getDirection(forward)); }
this._rootMesh.scaling.setAll(scale);
```

Skala świata = `scaleRatio × odległość wzdłuż osi widzenia`. To znaczy, że **`scaleRatio` jest miarą kątową, nie pikselową**: gizmo zajmuje stały *ułamek wysokości kadru*, niezależnie od zoomu — ale zależnie od wysokości canvasu i od `fov`.

Nasz `metresPerPixel(distance, fov, canvasHeight) = 2·d·tan(fov/2)/H` (`services/editing/snap.ts:45-50`) pozwala to przeliczyć dokładnie. Kamera nigdzie nie ustawia `fov`, więc obowiązuje domyślne **0.8 rad** (`babylon.d.ts:156432`: „Field Of View is set in Radians. (default is 0.8)"), a `2·tan(0.4) = 0.8456`.

**Wzór:** `piksele = rozmiar_lokalny × scaleRatio × H / (2·tan(fov/2))`

### Ile to jest w pikselach (canvas H = 900 px, fov 0.8)

| element | teraz (`scaleRatio 1.6`, `thickness 3`) | domyślny Babylon (`1.0`, `1`) | propozycja (`0.63`, `1`) |
|---|---|---|---|
| długość strzałki | **192 px** | 120 px | 75 px |
| trzon (widoczny) | 8.5 px | 1.8 px | 1.1 px |
| trzon (collider) | 19.9 px | 8.9 px | 5.6 px |
| podstawa stożka (widoczna) | 31.9 px | 13.3 px | 8.4 px |
| podstawa stożka (collider) | 53.2 px | 26.6 px | 16.8 px |
| kwadrat uchwytu płaszczyzny | 78 px | 49 px | 31 px |

Dla porównania nasz uchwyt resize: trójkąt **15.6 px** długości i 12 px szerokości, apertura **19.2 px** średnicy — i to niezależnie od wysokości canvasu.

Dwa wnioski:

1. Manipulator move jest dziś **ponad dziesięciokrotnie dłuższy** niż uchwyt resize jest szeroki. To nie jest różnica stopnia, to dwa różne języki wizualne w jednym widoku.
2. Ponieważ `scaleRatio` jest kątowe, a `HANDLE_PIXELS` pikselowe, na monitorze 1440p (H ≈ 1300 px) strzałki urosną do ~277 px, a uchwyty resize zostaną przy 12 px. Rozjazd się pogłębia.

### Uchwyty płaszczyzn stoją dokładnie na środku zaznaczenia

`PlaneDragGizmo._CreatePlane` tworzy kwadrat `width: 0.1375, height: 0.1375, sideOrientation: DOUBLESIDE`, parentuje go do węzła `"plane"` **bez żadnego przesunięcia**, po czym `scaling.scaleInPlace(1/3)`. Trzy kwadraty (`xPlaneGizmo`, `yPlaneGizmo`, `zPlaneGizmo`) siedzą więc jeden w drugim, wyśrodkowane na kotwicy gizma — czyli na środku zaznaczonego elementu.

Przy `scaleRatio 1.6` to ~78 px prostopadłych do siebie płaszczyzn zasłaniających dokładnie ten punkt, który użytkownik próbuje obejrzeć. To osobna, niezależna od strzałek przyczyna wrażenia „wchodzi w drogę". (W Unity/AutoCAD analogiczne uchwyty płaszczyzn są **odsunięte** od środka na przecięcie osi.)

`thickness` z konstruktora `PositionGizmo` idzie tylko do gizm osiowych — płaszczyzny go nie dostają.

### Co Babylon daje do zmiany

- `scaleRatio` na `PositionGizmo` **propaguje się** do wszystkich sześciu podgizm (potwierdzone w źródle).
- `planarGizmoEnabled` (`babylon.d.ts:118363+`) włącza/wyłącza trzy płaszczyzny; domyślnie są wyłączone (`_isEnabled = false` w `PlaneDragGizmo`).
- `xGizmo` / `yGizmo` / `zGizmo` / `xPlaneGizmo` / … są publiczne, każde ma gettery `coloredMaterial`, `hoverMaterial`, `disableMaterial` (`StandardMaterial` — materiał można mutować, np. podmienić `diffuseColor` na `ACCENT_COLOR`).
- `PositionGizmo.setCustomMesh()` **rzuca błędem**: „Custom meshes are not supported on this gizmo, please set the custom meshes on the gizmos contained within this one (gizmo.xGizmo, gizmo.yGizmo, gizmo.zGizmo)". Na podgizmach `setCustomMesh(mesh)` działa i „disposes and replaces the current meshes" — czyli **usuwa też collider**; własną aperturę trzeba wtedy dostarczyć samemu (dokładnie tak, jak robią to nasze uchwyty resize).
- `PositionGizmo.addToAxisCache(mesh, cache)` pozwala zarejestrować własne meshe jako collidery danej osi, żeby podświetlenie hover je uwzględniało.
- `snapDistance` (domyślnie 0) — snap co stałą odległość w jednostkach Babylona. Dla nas bezużyteczny: nasz snap jest do siatki `&MESH`, krawędzi i naroży, z tolerancją mierzoną w pikselach (`#124`).
- `PointerDragBehavior` ma `detachCameraControls` (domyślnie `true`), `dragAxis` / `dragPlaneNormal`, `moveAttached`, `useObjectOrientationForDragging` — czyli wszystko, czego potrzebuje własny uchwyt (`babylon.d.ts:162516+`).

## Ustalenia — edytory CAD i silniki 3D

### AutoCAD: żadnego gizma w 2D, mały gizmo w 3D

- **Rozmiar uchwytu to 5 pikseli.** `GRIPSIZE`: „Sets the size of the grip box, **in device independent pixels**", typ Integer, wartość początkowa **5**, zakres 1–255 ([help.autodesk.com, GRIPSIZE](https://help.autodesk.com/cloudhelp/2025/ENU/AutoCAD-Core/files/GUID-5F355F5F-0DDE-49B4-B253-C6BA717BAF8B.htm)). Nie ma osobnego manipulatora przesunięcia — jest **zaznaczenie, które samo staje się uchwytem**.
- **Przeciągnięcie uchwytu = rozciągnięcie; wybrane uchwyty = przesunięcie.** „Grips on text, block references, midpoints of lines, centers of circles, and point objects **move the object rather than stretching it**" ([AutoCAD Web Help, Grips](https://help.autodesk.com/cloudhelp/ENU/AutoCAD-Web-Help/files/Drafting-and-Creating/AutoCAD_Web_Help_Drafting_and_Creating_GRIPS_html.html)). Czyli: uchwyt na *charakterystycznym punkcie* rozciąga, uchwyt **środkowy** przesuwa.
- **Tryby przełącza klawiatura, nie osobne ikony.** „Press Enter or Spacebar to cycle to the move, rotate, scale, or mirror grip modes, or right-click the selected grip to view a shortcut menu" ([To Edit Objects Using Grips](https://help.autodesk.com/cloudhelp/2021/ENU/AutoCAD-Core/files/GUID-484774B4-8F67-4E19-8647-83A7D314782B.htm)).
- W 3D AutoCAD pokazuje gizmo (3DMOVE), ale dla siatek „only the center grip is displayed" ([About Using Grips to Edit 3D Objects](https://help.autodesk.com/cloudhelp/2024/ENU/AutoCAD-Core/files/GUID-EFC0FFC0-2515-4BBE-A901-BC0528A4467E.htm)) — gizmo jest opcją, nie domyślnym meblem na ekranie.

Lekcja: **5 px kwadrat plus aperturę większą od kwadratu** uważa się w CAD za wystarczający cel dla myszy. Nienachalność bierze się stąd, że manipulator *jest* zaznaczeniem, a nie dodatkową konstrukcją nad nim.

### SketchUp: narzędzie Move nie ma żadnego manipulatora

Przepływ to: „Select the item you want to move" → „Click a point in your model as a reference" → „**Move your mouse to move your selection.** As you move your selection, the inference points and the values in the Measurements box change" ([Moving Entities Around](https://help.sketchup.com/en/sketchup/moving-entities-around)).

Oś blokuje się dopiero, gdy użytkownik tego chce: „To lock an inference to an axis as you move, hold down the **Shift** key when the move line turns the color of your desired axis" albo „use the **arrow keys** to manually lock to an axis". Dokładne wartości wpisuje się w Measurements box, także **po** zakończeniu ruchu.

Lekcja: przy dobrym systemie inference i polu do wpisania liczby manipulator jest zbędny. To najbardziej „niewidzialny" wariant — i najbardziej zależny od jakości podpowiedzi.

### Unity: rozmiar uchwytu liczony z odległości do kamery

`HandleUtility.GetHandleSize(position)` zwraca „**a constant screen-size for the handle**, based on the distance between from the supplied handle's position to the camera" ([docs.unity3d.com](https://docs.unity3d.com/ScriptReference/HandleUtility.GetHandleSize.html)). Każdy uchwyt w edytorze Unity jest skalowany tą funkcją — dokładnie ten sam wzorzec, którym my trzymamy uchwyty resize (`gizmo.service.ts:769-786`), tylko my liczymy go w metrach na piksel.

### Blender: rozmiar gizma to preferencja użytkownika wyrażona w pikselach

Blender wystawia **Preferences → Viewport → Display → Gizmo Size** jako średnicę gizma w pikselach, obok osobnych rozmiarów dla Object Origin i Mini Axes ([Blender Manual, Preferences → Viewport](https://docs.blender.org/manual/en/latest/editors/preferences/viewport.html)).

> ⚠️ `docs.blender.org` odrzuca automatyczne pobieranie (HTTP 403); powyższe pochodzi z wyników wyszukiwania w tej domenie, nie z dosłownego cytatu. Sam fakt — że rozmiar gizma jest w Blenderze **preferencją w pikselach** — jest niesporny, ale konkretnej wartości domyślnej nie udało się zweryfikować u źródła. Nie opierać na niej żadnej decyzji.

### Wspólny mianownik: „małe, ale chwytne"

Wszystkie cztery narzędzia rozwiązują ten sam konflikt tak samo:

1. **rozmiar w pikselach ekranu**, nie w jednostkach sceny (AutoCAD `GRIPSIZE`, Blender preferencja, Unity `GetHandleSize`, nasze `HANDLE_PIXELS`);
2. **obszar trafienia większy niż rysunek** (AutoCAD: apertura ≠ grip box; Babylon: collider `thickness + 4`; my: kula-apertura 19 px wokół trójkąta 12 px);
3. **hover jako sygnał**, że coś jest chwytne — zanim użytkownik naciśnie;
4. **klawiatura jako droga na skróty** (AutoCAD: Enter cyklicznie zmienia tryb; SketchUp: strzałki blokują oś) zamiast trzeciego widżetu na ekranie.

## Ustalenia — preprocesory symulacyjne

To jest bliższa rodzina niż AutoCAD czy Blender: narzędzia, w których geometria jest **wsadem do solvera**, a nie rysunkiem. Wniosek z tej sekcji jest inny niż z poprzedniej i ważniejszy dla nas.

### PyroSim — bezpośrednia konkurencja, i nie ma w nim żadnego gizma osiowego

PyroSim (Thunderhead Engineering) to GUI do FDS-a, czyli dokładnie ten sam problem, co nasz. **Nie rysuje strzałek ani triady.** Rysuje uchwyty na punktach i ścianach — czyli to, czym są nasze grip-y resize.

Z rozdziału *Editing Objects* ([PyroSim 2025.1 Docs](https://www.thunderheadeng.com/docs/2025-1/pyrosim/user-interface/editing-objects/)):

- „Nearly all geometric objects can also be graphically edited in the **3D** or **2D View** with the **Select/Manipulate Tool**"
- „**Handles** appear on an object either as a blue dot […] or a face with a different color. **The dots indicate a point that can be moved in either two or three dimensions.** A discolored face indicates that a face can be moved or extruded along a line."
- hover jest jedynym podświetleniem: „Hover the cursor over the desired handle. If the handle is a dot, **it will turn yellow**. If the handle is a face, the entire face will turn yellow."
- gest: „Move the handle using **Click-drag Mode** or **Multi-click Mode** to specify **two points defining the movement vector**" — czyli AutoCAD-owy base point → second point, ta sama figura myślowa co „uchwyt środkowy przesuwa".
- uchwyty pojawiają się **tylko przy pojedynczym zaznaczeniu**: „If a single object is selected, it may show manipulation handles (blue dots or faces)" ([3D View](https://www.thunderheadeng.com/docs/2025-1/pyrosim/user-interface/3d-view/)). To ta sama reguła, co nasze `canResize` (`gizmo.service.ts:246-248`).
- liczba uchwytów jest limitowana z powodów wydajnościowych: „By default, PyroSim limits the number of displayed handles to improve application responsiveness. The maximum value can be changed under **File→Preferences→Maximum manipulation handles**."

Dwie rzeczy poza samymi uchwytami:

- **Przyciski myszy są rozdzielone inaczej niż u nas.** „Left-click an object to select it." / „Drag the **middle** mouse button to pan the model." / „Drag the **right** mouse button to orbit the model." ([3D View](https://www.thunderheadeng.com/docs/2025-1/pyrosim/user-interface/3d-view/)). Lewy przycisk należy w całości do zaznaczania i manipulacji, więc **chybienie uchwytu niczym nie grozi** — nie ma konfliktu, który u nas wymusił Shift i uzasadniał pogrubianie strzałek.
- **Dokładne wartości wchodzą dialogiem, nie przy myszy.** „In the **Move** dialog: select **Copy**, set **Number of Copies** to `4`, set **Offset** to be `2.0` meters along the Y axis, and click **OK**" — z menu **Model** ([Trusses](https://www.thunderheadeng.com/docs/2025-1/pyrosim/geometry/trusses/)). Dokumentacja *Editing Objects* nie wspomina o wpisywaniu liczb ani o snapowaniu w trakcie ciągnięcia uchwytu.

> Wniosek: nasz **manipulator resize jest już „PyroSimowy"**, a manipulator move jest w tym towarzystwie ciałem obcym. I odwrotnie: nasz dynamic input (liczby wpisywane w trakcie gestu, `#124`) jest **lepszy** niż modalny dialog PyroSima — to przewaga, którą warto podkreślić, a nie zakryć wielkim gizmem.

### BlenderFDS / BFDS — cała edycja geometrii to Blender

BFDS jest dodatkiem do Blendera: „An open source Blender add-on that makes it easy to create and manage NIST FDS models, and their geometries", „**With Blender's powerful 3D tools, you can build and edit FDS entities** directly in a familiar environment" ([firetools.org/bfds](https://firetools.org/bfds/)). Dodatek nie wnosi własnych manipulatorów — wnosi panele właściwości FDS.

W Blenderze zaś przesunięcie **domyślnie nie ma gizma**: w domyślnym keymapie `("transform.translate", {"type": 'G', "value": 'PRESS'}, None)` ([`blender_default.py:384`](https://github.com/blender/blender/blob/main/scripts/presets/keyconfig/keymap_data/blender_default.py)) — wciskasz **G**, ruszasz myszą, ograniczasz osią (X/Y/Z), wpisujesz liczbę, Enter. Gizmo strzałkowe należy do narzędzia `builtin.move` z toolbara (ten sam fragment keymapy), czyli pojawia się dopiero wtedy, gdy użytkownik świadomie wybierze to narzędzie.

### Ansys SpaceClaim / Discovery — gizmo jest, ale należy do narzędzia

- Uchwyt (Move handle) składa się z osi translacji, łuków obrotu, płaszczyzn między osiami i kuli w środku; „You use the Move handle by clicking the axes of the Move handle and dragging to move the selected object" ([The Move handle](https://help.spaceclaim.com/v19.0/en/Content/The_Move_handle.htm)).
- Pojawia się **po włączeniu narzędzia**, nie po samym zaznaczeniu: „Click **Move** in the Edit group on the Design tab. Select the object(s) that you want to move." — a program sam zgaduje punkt zaczepienia: „Discovery SpaceClaim **guesses at the anchor point and orientation**" ([Moving](https://help.spaceclaim.com/v19.0/en/Content/Moving.htm), [The Move handle](https://help.spaceclaim.com/v19.0/en/Content/The_Move_handle.htm)).
- Kierunek wybiera się osią: „Click an axis and drag in that direction to move the selected object."
- **Dokładna liczba wchodzi w trakcie ciągnięcia**: „You can press the **spacebar** to dimension the move", a linijka pozwala zwymiarować ruch względem wskazanej krawędzi lub ściany: „Once you select an axis on the Move handle, select this option and click an edge or face to anchor the ruler […] Enter a value to use the ruler to dimension the move" ([Moving](https://help.spaceclaim.com/v19.0/en/Content/Moving.htm)).

To jest dokładnie model „gizmo związane z narzędziem + wpisywanie liczby w trakcie gestu", który my mamy w ribbonie (Move / Resize) i w dynamic input.

### COMSOL i Abaqus — przesunięcie to formularz, nie gest

- **COMSOL**: `Move` to węzeł w drzewie geometrii, wywoływany „in the Geometry toolbar, from the **Transforms** menu"; użytkownik podaje „**Displacement vector** (the default) or **Positions**" i wpisuje „the displacement in each direction by entering **x**, **y**, and **z**" ([COMSOL 6.3 — Move](https://doc.comsol.com/6.3/doc/com.comsol.help.comsol/comsol_ref_geometry.23.086.html)). Dokumentacja nie przewiduje przeciągania obiektu w oknie graficznym w ogóle — przesunięcie jest **operacją parametryczną w historii modelu**.
- **Abaqus/CAE**: `Instance → Translate` prosi o wektor: „Select the **start point** of the translation vector. You can select any existing vertices or datum points, **or you can enter the coordinates in the text box in the prompt area**", i to samo dla punktu końcowego ([Abaqus 2017 docs, mirror MIT](https://abaqus-docs.mit.edu/2017/English/SIMACAECAERefMap/simacae-t-asmtranslateinstancebtn.htm)). O przeciąganiu myszą dokumentacja nie wspomina.

### Odpowiedź na pytanie postawione w zleceniu

**W preprocesorach symulacyjnych normą jest transformacja wpisywana, a gest myszą jest dodatkiem** — i to dodatkiem, który prawie nigdy nie ma postaci stałej triady strzałek:

| narzędzie | manipulator na ekranie | kiedy widoczny | dokładna wartość |
|---|---|---|---|
| PyroSim | punkty i ściany (bez strzałek) | po zaznaczeniu **jednego** obiektu | dialog **Move** z menu Model |
| BlenderFDS | manipulatory Blendera | gdy wybrane narzędzie Move; inaczej **G** | wpisywana w trakcie gestu |
| Ansys SpaceClaim | triada + łuki + kula | **po włączeniu narzędzia Move** | spacja / linijka w trakcie ciągnięcia |
| COMSOL | brak | — | wektor przemieszczenia w formularzu |
| Abaqus/CAE | brak | — | dwa punkty wektora albo wpisane współrzędne |

Trzy rzeczy, którymi te programy trzymają manipulator z drogi:

1. **Zakres czasowy zamiast rozmiaru** — manipulator należy do narzędzia albo do pojedynczego zaznaczenia i znika, gdy nie jest potrzebny (PyroSim, SpaceClaim, Blender). Nasze przełączniki Move / Resize w ribbonie już to robią.
2. **Uchwyt zamiast konstrukcji** — punkt lub ściana, którą i tak trzeba narysować, zamiast trzech strzałek dostawionych do modelu (PyroSim).
3. **Hover zamiast rozmiaru** — to podświetlenie, nie wielkość, mówi „to jest chwytne" (PyroSim: żółty; Babylon ma to gotowe w `hoverMaterial`).

## Opcje dla nas

### (a) Tylko zmniejszyć `scaleRatio`

Jedna liczba w `gizmo.service.ts:91`. `1.0` = wygląd domyślny Babylona (120 px przy H=900), `0.6–0.7` = ~75–84 px, czyli proporcja zbliżona do uchwytów Unity/Blendera.

- **+** minimalna zmiana, zero ryzyka regresji, natychmiast widoczny efekt.
- **−** zostaje magiczna liczba o niejasnej jednostce; na innym monitorze wychodzi inny rozmiar; nie rusza problemu płaszczyzn na środku ani niespójności z uchwytami resize.

### (a′) Wyrazić rozmiar w pikselach (rozwinięcie (a) — **rekomendowane**)

Zamiast stałej `1.6` liczyć `scaleRatio` z docelowej długości strzałki w pikselach, tak jak `placeHandles()` liczy rozmiar uchwytu:

```
scaleRatio = pikseleStrzałki × 2·tan(fov/2) / (canvasHeight × 0.1125)
```

gdzie `0.1125 = 0.3375 / 3` to długość strzałki w przestrzeni `_rootMesh` (czubek stożka stoi na `0.3 + 0.075/2 = 0.3375`, a całość jest skalowana przez `1/3`). Przeliczane przy zmianie rozmiaru canvasu (nie co klatkę — `fov` i wysokość canvasu się nie zmieniają w trakcie orbitowania).

- **+** jedna jednostka dla obu manipulatorów; stały wygląd na każdym monitorze; da się skomentować bez machania rękami („strzałka ma 75 px, uchwyt resize 12 px").
- **−** kilkanaście linii kodu więcej niż (a); wymaga reakcji na resize canvasu.

### (b) Cieńsze strzałki, collider bez zmian

`ARROW_THICKNESS` z 3 na 1 (ewentualnie 2). Collider zostaje `thickness + 4`, więc przy `thickness = 1` i strzałce 75 px trzon do trafienia ma 5.6 px, a stożek 16.8 px — to jest **dokładnie rząd wielkości AutoCAD-owego grip boxa 5 px**.

- **+** wizualnie cichszy manipulator bez utraty trafialności; usuwa fałszywą przesłankę z komentarza w kodzie.
- **−** `thickness` steruje jednocześnie rysunkiem i colliderem (`t` i `t+4`), więc nie da się mieć „bardzo cienko, ale bardzo szeroki chwyt" bez własnych meshy. Jeśli okaże się to potrzebne: `setCustomMesh` na podgizmach + własna apertura + `addToAxisCache` — czyli ten sam wzorzec, co przy uchwytach resize.

### (c) Zero gizma — przeciąganie samej bryły (SketchUp)

Naciśnięcie na zaznaczony element i pociągnięcie = przesunięcie; oś dopowiada inference albo klawisz.

- **+** najbardziej nienachalne z możliwych; zero nowej geometrii na ekranie; naturalne dla „przesuń tę ścianę kawałek dalej".
- **−** kolizja z kamerą: lewy przycisk na bryle to dziś **orbita** (ADR-0010: „a plain click still selects and a drag in empty space still orbits"). Trzeba by albo modyfikatora, albo trybu, w którym drag na zaznaczeniu należy do narzędzia — a Shift już znaczy „oddaj drag narzędziu" (`smokeview.component.ts:186-195`), więc miejsce na to jest.
- **uwaga z PyroSima:** ta kolizja nie jest prawem natury, tylko konsekwencją naszego mapowania przycisków. PyroSim oddaje lewy przycisk zaznaczaniu i manipulacji, a orbitę przenosi na prawy — i wtedy przeciąganie bryły albo uchwytu jest jednoznaczne bez żadnego modyfikatora. To osobna decyzja UX (poza zakresem `#124`), ale gdyby kiedyś zapadła, opcje (c) i (d) stają się znacznie tańsze.
- **−** w 3D przeciąganie bryły wymaga płaszczyzny odniesienia. SketchUp rozwiązuje to inference'em, którego nie mamy; dla nas naturalną domyślną płaszczyzną jest **pozioma na wysokości `z1` elementu** (budynki stoją na kondygnacjach), a `z` zostaje dla klawiatury i uchwytu resize.
- **−** największy zakres pracy z całej listy i największa zmiana nawyku.

### (d) Jeden środkowy uchwyt w stylu AutoCAD-a

Mały kwadrat (12 px, `ACCENT_COLOR`, apertura jak przy resize) na środku zaznaczenia. Naciśnięcie zaczyna swobodny ruch w płaszczyźnie poziomej, `dz` wpisuje się z klawiatury w dynamic input, który już działa.

- **+** rozmiarem i językiem wizualnym spójny z uchwytami resize — jedna rodzina kształtów zamiast dwóch;
- **+** wprost odwzorowuje model AutoCAD-a, który zna użytkownik tego programu (uchwyt środkowy przesuwa, uchwyty na obrysie rozciągają);
- **+** **to jest dokładnie model PyroSima** — „blue dot" przesuwa punkt, „discolored face" ciągnie ścianę, hover na żółto. Użytkownik przychodzący od konkurencji nie musi się uczyć niczego nowego, a my dokładamy do tego dynamic input, którego PyroSim nie ma;
- **+** jeden gest, jedna komenda — nic w ADR-0004/0009 się nie zmienia;
- **−** gubi ruch wzdłuż jednej osi, dopóki nie dojdzie blokada osi (Shift albo strzałki, jak w SketchUpie) — a dla `&OBST` „przesuń o 3 m wzdłuż X" to częsty przypadek;
- **−** ruch tylko w poziomie jest arbitralny, dopóki nie ma podpowiedzi płaszczyzny.

### (e) Strzałki na żądanie (hover / po zaznaczeniu uchwytu środkowego)

Domyślnie widać tylko środkowy kwadrat; strzałki pojawiają się, gdy kursor jest nad nim (albo po jego kliknięciu, jak „hot grip" w AutoCAD-zie).

- **+** ekran czysty w 95% czasu, pełna funkcjonalność wtedy, gdy jest potrzebna;
- **+** technicznie tanie: `isEnabled` na podgizmach albo `attachedNode = null`, hover wykrywalny naszą własną aperturą;
- **−** afordancja ukryta — użytkownik musi się dowiedzieć, że tam coś jest; wymaga podpowiedzi w statusie/tooltipie;
- **−** migotanie na granicy hovera, jeśli próg będzie źle dobrany (potrzebna histereza).

## Rekomendacja

Punkt wyjścia po przejrzeniu preprocesorów: **w tej klasie narzędzi dokładna liczba jest drogą podstawową, a gest myszą — wygodnym przybliżeniem.** COMSOL i Abaqus nie mają nawet przeciągania; PyroSim wysyła po dokładną wartość do dialogu; SpaceClaim każe wcisnąć spację w trakcie ciągnięcia. My mamy dynamic input przy kursorze i paletę właściwości (ADR-0010), czyli **obie drogi lepsze niż konkurencja** — manipulator nie musi więc dźwigać precyzji i nie ma powodu, żeby był duży. Wielkie strzałki nie kupują nam dokładności; kupują je liczby, które i tak już działają.

**Krok 1 — teraz, mała zmiana w `gizmo.service.ts` (opcje a′ + b):**

1. `GIZMO_SCALE` zastąpić stałą pikselową, np. `MOVE_ARROW_PIXELS = 75`, i liczyć `scaleRatio` wzorem powyżej. Wtedy `HANDLE_PIXELS = 12` i długość strzałki żyją w tej samej jednostce i dają się porównać w komentarzu.
2. `ARROW_THICKNESS` na `1` (ewentualnie `2`), z poprawionym komentarzem: collider Babylona to zawsze `thickness + 4`, a Shift i tak odbiera drag kamerze.
3. Zdecydować o płaszczyznach. Trzy kwadraty ~78 px wyśrodkowane na elemencie to osobna przyczyna „wchodzi w drogę". Najtańsze: zmniejszają się razem ze `scaleRatio` (do ~31 px). Lepsze: `setCustomMesh` na `xPlaneGizmo`/`yPlaneGizmo`/`zPlaneGizmo` z kwadratem **odsuniętym** od środka na przecięcie osi, jak w Unity i AutoCAD-zie.
4. Kolory: żółty hover Babylona nie należy do naszej palety. Kolory osi (czerwony/zielony/niebieski) warto zostawić — uczą, która oś jest która — ale `hoverMaterial.diffuseColor` wypada ustawić na `ACCENT_COLOR`.
5. Przy okazji: nasze uchwyty resize **nie mają dziś żadnej reakcji na hover** (jeden wspólny materiał, `gizmo.service.ts:694-703`). Skoro to hover, a nie rozmiar, niesie komunikat „to jest chwytne" (PyroSim: dot robi się żółty), podświetlenie uchwytu pod kursorem jest tańszym sposobem na trafialność niż każdy piksel dodany do geometrii.

**Krok 2 — do rozważenia po obejrzeniu kroku 1 (opcja d, ewentualnie z e):**

Dodać środkowy uchwyt w stylu AutoCAD-a jako *podstawowy* sposób chwytania, a strzałki zostawić jako doprecyzowanie osi. To jedyna opcja, która robi z manipulatorów **jedną rodzinę** (kwadrat środkowy + trójkąty na ścianach, wszystko ~12 px, wszystko w akcencie) zamiast doklejać CAD-owe uchwyty do gizma z silnika gier.

Za tym krokiem stoi teraz mocniejszy argument niż estetyka: **PyroSim, czyli program, z którego przychodzi nasz użytkownik, nie ma triady strzałek w ogóle** — ma punkty i ściany. Nasze grip-y resize są już w tym języku; środkowy uchwyt domyka rodzinę i sprowadza całą edycję geometrii do jednego słownika kształtów.

**Czego nie rekomenduję teraz:** pełnego (c). Wymaga systemu inference, którego nie mamy, i rusza kontrakt kamery z ADR-0010. Warto do niego wrócić, gdy snap dorobi się podpowiedzi kierunku — wtedy (c) i (d) zbiegają się w jedno.

## Ograniczenia, które każda opcja musi uszanować

- `XB` jest osiowe — nie ma obrotu do zaoferowania (`#124`).
- Jeden gest = jedna komenda = jeden wpis w historii (ADR-0004, ADR-0009).
- Podgląd gestu żyje w bibliotece; aplikacja jest źródłem prawdy (ADR-0004).
- Dynamic input jedzie za kursorem, nie za zaznaczeniem (`gizmo.service.ts:36-42`), i klawiatura nigdy nie dotyka fokusu DOM (`smokeview.component.ts:180-184`).
- Klik zaznacza, drag w pustce obraca kamerę (ADR-0010) — manipulator nie może tego złamać.
- Tolerancja snapu jest mierzona w pikselach (~10 px, `#124`); rozmiar uchwytu powinien być z nią współmierny, żeby „widzę uchwyt" i „snap złapie" znaczyły to samo.

## Źródła

**Kod (zweryfikowany lokalnie):**

- `projects/web-smokeview-lib/src/lib/services/editing/gizmo.service.ts:53,63,71,81,91,622-642,691-758,769-786`
- `projects/web-smokeview-lib/src/lib/views/smokeview/smokeview.component.ts:79-131,186-195,209-242`
- `projects/web-smokeview-lib/src/lib/services/editing/snap.ts:45-50`, `snap.service.ts:256-265`
- `projects/web-smokeview-lib/src/lib/consts/drawing.ts:22`
- `projects/wizfds/src/app/views/main/fds/visualize/ribbon/ribbon.component.html:93-113`
- `node_modules/babylonjs/babylon.d.ts:118363-118530` (`PositionGizmo`), `:119747-119800` (`AxisDragGizmo`), `:156432` (domyślny `fov`), `:162516-162620` (`PointerDragBehavior`); `node_modules/babylonjs/babylon.max.js` — geometria strzałki, collider `thickness + 4`, `_update()`, `_CreatePlane` (build 9.18.0)

**Babylon.js (źródło):**

- [`axisDragGizmo.ts`](https://github.com/BabylonJS/Babylon.js/blob/master/packages/dev/core/src/Gizmos/axisDragGizmo.ts)
- [`positionGizmo.ts`](https://github.com/BabylonJS/Babylon.js/blob/master/packages/dev/core/src/Gizmos/positionGizmo.ts)
- [`planeDragGizmo.ts`](https://github.com/BabylonJS/Babylon.js/blob/master/packages/dev/core/src/Gizmos/planeDragGizmo.ts)
- [`gizmo.ts`](https://github.com/BabylonJS/Babylon.js/blob/master/packages/dev/core/src/Gizmos/gizmo.ts)

**Dokumentacja producentów — preprocesory symulacyjne:**

- [PyroSim 2025.1 — Editing Objects](https://www.thunderheadeng.com/docs/2025-1/pyrosim/user-interface/editing-objects/) — uchwyty jako punkty i ściany, hover na żółto, tryby Click-drag / Multi-click, limit liczby uchwytów
- [PyroSim 2025.1 — 3D View](https://www.thunderheadeng.com/docs/2025-1/pyrosim/user-interface/3d-view/) — przyciski myszy, uchwyty przy pojedynczym zaznaczeniu, snapowanie do ścian
- [PyroSim 2025.1 — Trusses](https://www.thunderheadeng.com/docs/2025-1/pyrosim/geometry/trusses/) — dialog **Move** (Copy / Number of Copies / Offset) z menu Model
- [BFDS (BlenderFDS) — firetools.org](https://firetools.org/bfds/) oraz [README repozytorium](https://github.com/firetools/blenderfds)
- [Blender — domyślny keymap, `blender_default.py`](https://github.com/blender/blender/blob/main/scripts/presets/keyconfig/keymap_data/blender_default.py) — `transform.translate` pod **G**, gizmo przy narzędziu `builtin.move`
- [Ansys SpaceClaim — The Move handle](https://help.spaceclaim.com/v19.0/en/Content/The_Move_handle.htm)
- [Ansys SpaceClaim — Moving](https://help.spaceclaim.com/v19.0/en/Content/Moving.htm)
- [COMSOL 6.3 — Move (Transforms)](https://doc.comsol.com/6.3/doc/com.comsol.help.comsol/comsol_ref_geometry.23.086.html)
- [Abaqus/CAE — Translating part or model instances](https://abaqus-docs.mit.edu/2017/English/SIMACAECAERefMap/simacae-t-asmtranslateinstancebtn.htm) *(oficjalna treść Dassault hostowana przez MIT)*

**Dokumentacja producentów — edytory CAD i silniki 3D:**

- [AutoCAD — GRIPSIZE (System Variable)](https://help.autodesk.com/cloudhelp/2025/ENU/AutoCAD-Core/files/GUID-5F355F5F-0DDE-49B4-B253-C6BA717BAF8B.htm)
- [AutoCAD Web Help — Grips](https://help.autodesk.com/cloudhelp/ENU/AutoCAD-Web-Help/files/Drafting-and-Creating/AutoCAD_Web_Help_Drafting_and_Creating_GRIPS_html.html)
- [AutoCAD — To Edit Objects Using Grips](https://help.autodesk.com/cloudhelp/2021/ENU/AutoCAD-Core/files/GUID-484774B4-8F67-4E19-8647-83A7D314782B.htm)
- [AutoCAD — About Using Grips to Edit 3D Objects](https://help.autodesk.com/cloudhelp/2024/ENU/AutoCAD-Core/files/GUID-EFC0FFC0-2515-4BBE-A901-BC0528A4467E.htm)
- [SketchUp — Moving Entities Around](https://help.sketchup.com/en/sketchup/moving-entities-around)
- [Unity — HandleUtility.GetHandleSize](https://docs.unity3d.com/ScriptReference/HandleUtility.GetHandleSize.html)
- [Blender Manual — Preferences → Viewport](https://docs.blender.org/manual/en/latest/editors/preferences/viewport.html) — *cytat drugiej ręki, patrz zastrzeżenie wyżej*
