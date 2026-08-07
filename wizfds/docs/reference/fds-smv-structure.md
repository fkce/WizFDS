# Struktura repozytoriów FDS i SmokeView — indeks zadaniowy

> **Cel.** Szybko odnaleźć w źródłach/dokumentacji FDS i SmokeView informacje potrzebne do rozwoju WizFDS.
> WizFDS **nie reimplementuje fizyki FDS** — (1) generuje pliki wejściowe `.fds` i (2) buduje własny moduł wizualizacji (`projects/web-smokeview-lib`, BabylonJS/WebGPU) wzorowany na SmokeView.
> Dlatego indeks jest ułożony **wg naszej potrzeby**, nie wg pełnego drzewa repo. Trzeciorzędne rzeczy (bundlowane biblioteki C w SMV: glut/glew/jpeg/png/zlib, datasety walidacyjne, skrypty CI, solver fizyki) są pominięte.
>
> **Migawka:** gałąź domyślna `master` obu repo, stan na **2026-07-23**. Linki wskazują na `master` (zawsze aktualny kod) — jeśli upstream przeniesie plik, link może się zdezaktualizować; wtedy zaktualizuj datę migawki i ścieżki. Zobacz [Utrzymanie](#utrzymanie) na końcu.

**Repozytoria upstream (NIST / `firemodels`):**

| Repo | Język | Co zawiera | Link |
|---|---|---|---|
| **FDS** — Fire Dynamics Simulator | Fortran 90 | silnik symulacji; parser inputu, solver, zapis outputu | https://github.com/firemodels/fds |
| **SMV** — SmokeView | C / C++ | oficjalny viewer wyników FDS; czytniki formatów + rendering OpenGL | https://github.com/firemodels/smv |

Ścieżki lokalne (nasz kod) są względne wobec `wizfds/` i klikalne w edytorze.

---

## Mapa orientacyjna (tylko katalogi istotne dla nas)

**FDS** — [`firemodels/fds`](https://github.com/firemodels/fds/tree/master)
| Katalog | Do czego nam |
|---|---|
| [`Source/`](https://github.com/firemodels/fds/tree/master/Source) | kod solvera; nas interesują głównie `read.f90` (input) i `dump.f90` (output — w tym `WRITE_SMOKEVIEW_FILE`, pisarz pliku `.smv`; `smvv.f90` to writery iso/smoke3d) |
| [`Manuals/FDS_User_Guide/`](https://github.com/firemodels/fds/tree/master/Manuals/FDS_User_Guide) | **referencja namelistów** — źródło prawdy o parametrach `&OBST`, `&SURF`, `&REAC`… |
| [`Manuals/FDS_Technical_Reference_Guide/`](https://github.com/firemodels/fds/tree/master/Manuals/FDS_Technical_Reference_Guide) | fizyka (rzadko potrzebne, ale bywa — np. jednostki, definicje wielkości) |
| [`Verification/`](https://github.com/firemodels/fds/tree/master/Verification) · [`Validation/`](https://github.com/firemodels/fds/tree/master/Validation) | **setki gotowych plików `.fds`** — bezcenne jako przykłady poprawnej składni każdego namelistu |

**SMV** — [`firemodels/smv`](https://github.com/firemodels/smv/tree/master)
| Katalog | Do czego nam |
|---|---|
| [`Source/shared/`](https://github.com/firemodels/smv/tree/master/Source/shared) | **czytniki formatów plików** (`read*.c`) — warstwa niskopoziomowa, współdzielona; tu jest prawda o formatach binarnych |
| [`Source/smokeview/`](https://github.com/firemodels/smv/tree/master/Source/smokeview) | IO + rendering viewera (`IO*.c`); wzorzec dla naszego `web-smokeview-lib` |
| [`Manuals/SMV_Technical_Reference_Guide/`](https://github.com/firemodels/smv/tree/master/Manuals/SMV_Technical_Reference_Guide) | opis struktur danych i formatów |
| [`Manuals/SMV_User_Guide/`](https://github.com/firemodels/smv/tree/master/Manuals/SMV_User_Guide) | tabele wielkości slice/boundary ([`SLCFlabels.tex`](https://github.com/firemodels/smv/blob/master/Manuals/SMV_User_Guide/SLCFlabels.tex), [`BNDFlabels.tex`](https://github.com/firemodels/smv/blob/master/Manuals/SMV_User_Guide/BNDFlabels.tex)) |

---

## ① Input FDS — jak nasz model → poprawny plik `.fds`

Nasz kod składa plik wejściowy z modelu obiektowego (`services/json-fds/` → `json2fds()`, `parseAmper()`), a definicje bytów/atrybutów trzymamy w [`enums/fds/entities/fds-entities.ts`](../../projects/wizfds/src/app/enums/fds/entities/fds-entities.ts) i klasach w [`services/fds-object/`](../../projects/wizfds/src/app/services/fds-object). Gdy poprawiamy/rozszerzamy dany namelist, sprawdzamy go po stronie FDS w dwóch miejscach:

- **Dokumentacja (źródło prawdy o parametrach):** [`Manuals/FDS_User_Guide/FDS_User_Guide.tex`](https://github.com/firemodels/fds/blob/master/Manuals/FDS_User_Guide/FDS_User_Guide.tex). Każdy namelist ma tam swój rozdział z tabelą parametrów, typów i wartości domyślnych. Tabela gatunków/specie: [`spec_table.tex`](https://github.com/firemodels/fds/blob/master/Manuals/FDS_User_Guide/spec_table.tex); obiekty rysowane w SMV: [`smv_objects.tex`](https://github.com/firemodels/fds/blob/master/Manuals/FDS_User_Guide/smv_objects.tex).
- **Parser (źródło prawdy o składni i akceptowanych polach):** [`Source/read.f90`](https://github.com/firemodels/fds/blob/master/Source/read.f90). Ma **jedną podprocedurę `READ_<NAMELIST>` na namelist** — szukaj `SUBROUTINE READ_OBST`, `READ_SURF`, `READ_SLCF`, `READ_REAC`, `READ_DEVC` itd. To pokazuje *dokładnie* jakie pola FDS czyta i jak je waliduje (często wyprzedza dokumentację).

**Namelisty, które WizFDS wspiera**, i ich podprocedura w `read.f90` (skrót — pełną listę ~40 zwraca `grep 'SUBROUTINE READ_' Source/read.f90`):

`&HEAD`→`READ_HEAD` · `&TIME`→`READ_TIME` · `&MISC`→`READ_MISC` · `&INIT`→`READ_INIT` · `&DUMP`→`READ_DUMP` · `&MESH`→`READ_MESH` · `&OBST`→`READ_OBST` · `&HOLE`→`READ_HOLE` · `&VENT`→`READ_VENT` · `&SURF`→`READ_SURF` · `&MATL`→`READ_MATL` · `&GEOM`→`READ_GEOM`* · `&REAC`→`READ_REAC` · `&COMB`→`READ_COMB` · `&SPEC`→`READ_SPEC` · `&PART`→`READ_PART` · `&PROP`→`READ_PROP` · `&DEVC`→`READ_DEVC` · `&CTRL`→`READ_CTRL` · `&SLCF`→`READ_SLCF` · `&BNDF`→`READ_BNDF` · `&ISOF`→`READ_ISOF` · `&RAMP`→`READ_RAMP` · `&ZONE`→`READ_ZONE`
> \* `READ_GEOM` bywa złączony z parsowaniem geometrii immersed; szukaj `GEOM` w `read.f90` i `geom.f90`.

**Przykłady poprawnej składni:** dowolny plik z [`Verification/`](https://github.com/firemodels/fds/tree/master/Verification) (pogrupowane tematycznie, np. `Verification/Fires/`, `Verification/HVAC/`) lub [`Validation/`](https://github.com/firemodels/fds/tree/master/Validation). Szybciej niż czytać `.tex`, gdy chcesz zobaczyć „jak to się realnie pisze".

---

## ② Formaty plików wyjściowych — format ↔ reader w SMV ↔ nasz kod

FDS zapisuje wyniki do plików binarnych (potwierdzone w [`Source/dump.f90`](https://github.com/firemodels/fds/blob/master/Source/dump.f90)), a plik-katalog `.smv` (`WRITE_SMOKEVIEW_FILE`, także w `dump.f90`) spina scenę i wskazuje pozostałe pliki. Nasz viewer musi czytać te same formaty.

**Warstwy po stronie SMV:** `Source/shared/read*.c` = parser formatu (współdzielony przez smokeview/smokezip/smokediff); `Source/smokeview/IO*.c` = IO + rendering w viewerze. Spec formatów: [`SMV_Technical_Reference_Guide.tex`](https://github.com/firemodels/smv/blob/master/Manuals/SMV_Technical_Reference_Guide/SMV_Technical_Reference_Guide.tex) — ale **najpewniejszym źródłem prawdy jest kod `read*.c`**.

| Plik / token `.smv` | Co zawiera | Zapis w FDS | Reader w SMV (format) | IO/render w SMV | Nasz serwis w `web-smokeview-lib` |
|---|---|---|---|---|---|
| **`.smv`** (master) | meshe, geometria, lista plików danych, obst/vent/device | `WRITE_SMOKEVIEW_FILE` w [`dump.f90`](https://github.com/firemodels/fds/blob/master/Source/dump.f90) | [`shared/readsmvfile.c`](https://github.com/firemodels/smv/blob/master/Source/shared/readsmvfile.c) — kanoniczny parser tokenów `.smv` | [`smokeview/readsmv.c`](https://github.com/firemodels/smv/blob/master/Source/smokeview/readsmv.c) (geometria nagłówka), dyspozycja w [`main.c`](https://github.com/firemodels/smv/blob/master/Source/smokeview/main.c) | [`parsers/smv/smv-parser.service.ts`](../../projects/web-smokeview-lib/src/lib/services/parsers/smv/smv-parser.service.ts) (#115) — geometria w metrach + katalog plików wynikowych |
| **`.sf`** (`SLCF` / cell-centered `SLCC`) | slice — 2D wycinek skalarny w czasie | [`dump.f90`](https://github.com/firemodels/fds/blob/master/Source/dump.f90) | [`shared/readslice.c`](https://github.com/firemodels/smv/blob/master/Source/shared/readslice.c) | [`smokeview/IOslice.c`](https://github.com/firemodels/smv/blob/master/Source/smokeview/IOslice.c) | [`parsers/sf/sf-parser.ts`](../../projects/web-smokeview-lib/src/lib/services/parsers/sf/sf-parser.ts) (format) + [`drawing/slice/slice.service.ts`](../../projects/web-smokeview-lib/src/lib/services/drawing/slice/slice.service.ts) (rendering, #149; SLCC → #159, volume → #160) |
| **`.bf`** (`BNDF` / `BNDC`) | boundary — wielkości na powierzchniach obst | [`dump.f90`](https://github.com/firemodels/fds/blob/master/Source/dump.f90) | (parser w `getdata.c`/IO) | [`smokeview/IOboundary.c`](https://github.com/firemodels/smv/blob/master/Source/smokeview/IOboundary.c) | [`drawing/bndf/bndf.service.ts`](../../projects/web-smokeview-lib/src/lib/services/drawing/bndf/bndf.service.ts) |
| **`.prt5`** (`PRT5`) | cząstki / particles | [`dump.f90`](https://github.com/firemodels/fds/blob/master/Source/dump.f90) | (w IO) | [`smokeview/IOpart.c`](https://github.com/firemodels/smv/blob/master/Source/smokeview/IOpart.c) | [`drawing/part/part.service.ts`](../../projects/web-smokeview-lib/src/lib/services/drawing/part/part.service.ts) |
| **geom** (`GEOM`, immersed) | geometria trójkątowa | `geom.f90` / [`dump.f90`](https://github.com/firemodels/fds/blob/master/Source/dump.f90) | [`shared/readgeom.c`](https://github.com/firemodels/smv/blob/master/Source/shared/readgeom.c) | [`smokeview/IOgeometry.c`](https://github.com/firemodels/smv/blob/master/Source/smokeview/IOgeometry.c), [`drawGeometry.c`](https://github.com/firemodels/smv/blob/master/Source/smokeview/drawGeometry.c) | [`drawing/geom/geom.service.ts`](../../projects/web-smokeview-lib/src/lib/services/drawing/geom/geom.service.ts) |
| **`.q`** (`PL3D`) | plot3d — pełne pole 3D (5 wielkości) | [`dump.f90`](https://github.com/firemodels/fds/blob/master/Source/dump.f90) | (w IO) | [`smokeview/IOplot3d.c`](https://github.com/firemodels/smv/blob/master/Source/smokeview/IOplot3d.c) | ⚠️ **brak** — jeszcze nie renderujemy |
| **`.iso`** (`ISOF`) | izopowierzchnie | [`dump.f90`](https://github.com/firemodels/fds/blob/master/Source/dump.f90) | [`shared/isobox.c`](https://github.com/firemodels/smv/blob/master/Source/shared/isobox.c) | [`smokeview/IOiso.c`](https://github.com/firemodels/smv/blob/master/Source/smokeview/IOiso.c) | ⚠️ **brak** |
| **`.s3d`/`.sz`** (`SMOKE3D`/`SMOKG3D`) | dym/sadza 3D (RLE-kompresja) | [`dump.f90`](https://github.com/firemodels/fds/blob/master/Source/dump.f90) | [`shared/readsmoke.c`](https://github.com/firemodels/smv/blob/master/Source/shared/readsmoke.c) | [`smokeview/IOsmoke.c`](https://github.com/firemodels/smv/blob/master/Source/smokeview/IOsmoke.c), `IOvolsmoke` | ⚠️ **brak** (mamy tylko [`drawing/fire/fire.service.ts`](../../projects/web-smokeview-lib/src/lib/services/drawing/fire/fire.service.ts) dla płomienia) |
| **`.svo`** (`DEVICE`/objects) | definicje obiektów/urządzeń rysowanych | [`smv_objects.tex`](https://github.com/firemodels/fds/blob/master/Manuals/FDS_User_Guide/smv_objects.tex) | [`shared/readobject.c`](https://github.com/firemodels/smv/blob/master/Source/shared/readobject.c) | [`smokeview/IOobjects.c`](https://github.com/firemodels/smv/blob/master/Source/smokeview/IOobjects.c) | (markery w drawing/*) |
| **HVAC** | sieć wentylacji mechanicznej | [`dump.f90`](https://github.com/firemodels/fds/blob/master/Source/dump.f90) | [`shared/readhvac.c`](https://github.com/firemodels/smv/blob/master/Source/shared/readhvac.c) | [`smokeview/IOhvac.c`](https://github.com/firemodels/smv/blob/master/Source/smokeview/IOhvac.c) | ⚠️ **brak** |
| **`.zone`** (`ZONE`, CSV) | model strefowy (zone) | [`dump.f90`](https://github.com/firemodels/fds/blob/master/Source/dump.f90) | (CSV) | [`smokeview/IOzone.c`](https://github.com/firemodels/smv/blob/master/Source/smokeview/IOzone.c) | ⚠️ **brak** |

> **Luki naszego viewera (⚠️):** plot3d (`.q`), izopowierzchnie (`.iso`), dym 3D (`.s3d`), HVAC, zone. Jeśli któryś trzeba dodać — kolumny „Reader w SMV" i „IO/render w SMV" pokazują dokładnie skąd czerpać wzorzec.

**Byty geometrii, które rysujemy z inputu (nie z plików wynikowych)** — biblioteka nie czyta `.fds`; dostaje gotowy kontrakt `SceneInput` (ADR-0004), budowany przez `SceneInputService` w `wizfds` albo przez [`services/parsers/smokeviewJson/`](../../projects/web-smokeview-lib/src/lib/services/parsers/smokeviewJson) w `webSmokeview`:

| Byt | Nasz serwis | Wzorzec w SMV |
|---|---|---|
| `&OBST` | [`drawing/obst/obst.service.ts`](../../projects/web-smokeview-lib/src/lib/services/drawing/obst/obst.service.ts) | rendering obst w `smokeview/showscene.c` |
| `&VENT` | [`drawing/vent/vent.service.ts`](../../projects/web-smokeview-lib/src/lib/services/drawing/vent/vent.service.ts) | j.w. |
| `&MESH` | [`drawing/mesh/mesh.service.ts`](../../projects/web-smokeview-lib/src/lib/services/drawing/mesh/mesh.service.ts) | siatki/`GRID` w `readsmvfile.c` |
| `&HOLE` | [`drawing/hole/hole.service.ts`](../../projects/web-smokeview-lib/src/lib/services/drawing/hole/hole.service.ts) | — |
| `OPEN` (vent) | [`drawing/open/open.service.ts`](../../projects/web-smokeview-lib/src/lib/services/drawing/open/open.service.ts) | — |
| jet fan | [`drawing/jetfan/jetfan.service.ts`](../../projects/web-smokeview-lib/src/lib/services/drawing/jetfan/jetfan.service.ts) | — (własne rozszerzenie WizFDS) |

### Czym karmi się `webSmokeview`

Standalone viewer nie ma scenariusza — czyta **sam plik `.smv`** (#115): backend serwuje surowe bajty każdego pliku przypadku przez `/api/results/<ścieżka>` z obsługą `Range` (#148), a [`parsers/smv/smv-parser.service.ts`](../../projects/web-smokeview-lib/src/lib/services/parsers/smv/smv-parser.service.ts) buduje z niego `SceneInput` w metrach (token `PDIM` niesie wymiary siatek) oraz katalog plików wynikowych (tokeny `SLCF`/`BNDF`/`PRT5`/`SMOKF3D`/`ISOG`) dla fazy 6 (#89).

> **Historia.** Do 2026-08 backend wołał `smokeview -runhtmlscript`, a viewer czytał `<chid>_obst.json` — trzy płaskie tablice z samymi obstami, znormalizowane do sześcianu jednostkowego bez możliwości odzyskania metrów (stały wyjątek od ADR-0002). Ścieżka wycofana w całości wraz z `ObstJsonService`.

---

## ③ Wnętrze SmokeView — referencja dla renderingu w `web-smokeview-lib`

Gdy poprawiamy *jak* rysujemy (kolory, mapowanie wartości, kamera, shadery), wzorcem jest kod SMV:

| Temat | Kod w SMV | Nasz odpowiednik |
|---|---|---|
| Palety / colorbary | [`shared/colorbars.c`](https://github.com/firemodels/smv/blob/master/Source/shared/colorbars.c), [`colorbar_defs.c`](https://github.com/firemodels/smv/blob/master/Source/shared/colorbar_defs.c), [`color2rgb.c`](https://github.com/firemodels/smv/blob/master/Source/shared/color2rgb.c); [`smokeview/colortable.c`](https://github.com/firemodels/smv/blob/master/Source/smokeview/colortable.c) | [`consts/colorbars.ts`](../../projects/web-smokeview-lib/src/lib/consts/colorbars.ts); nazwane kolory FDS trzyma aplikacja w [`enums/fds/enums/fds-enums-colors.ts`](../../projects/wizfds/src/app/enums/fds/enums/fds-enums-colors.ts) |
| Mapowanie dane→kolor + zakresy | [`smokeview/getdatacolors.c`](https://github.com/firemodels/smv/blob/master/Source/smokeview/getdatacolors.c), [`getdatabounds.c`](https://github.com/firemodels/smv/blob/master/Source/smokeview/getdatabounds.c) | logika w `drawing/slice/*` i `drawing/bndf/*` |
| Shadery | [`smokeview/shaders.c`](https://github.com/firemodels/smv/blob/master/Source/smokeview/shaders.c) | [`consts/shaders.ts`](../../projects/web-smokeview-lib/src/lib/consts/shaders.ts) + `src/assets/shaders/` (WGSL; GLSL jako fallback) |
| Kamera / rzutowanie / viewporty | [`smokeview/camera.c`](https://github.com/firemodels/smv/blob/master/Source/smokeview/camera.c), [`viewports.c`](https://github.com/firemodels/smv/blob/master/Source/smokeview/viewports.c) | [`services/babylon/babylon.service.ts`](../../projects/web-smokeview-lib/src/lib/services/babylon/babylon.service.ts), [`babylon/viewCube/view-cube.service.ts`](../../projects/web-smokeview-lib/src/lib/services/babylon/viewCube/view-cube.service.ts) |
| Rysowanie sceny / pętla renderu | [`smokeview/showscene.c`](https://github.com/firemodels/smv/blob/master/Source/smokeview/showscene.c), [`drawGeometry.c`](https://github.com/firemodels/smv/blob/master/Source/smokeview/drawGeometry.c) | `services/babylon/` + `services/drawing/*` |
| Odtwarzanie w czasie (animacja) | menu/update w `smokeview/menus.c`, `update.c` | [`services/player/player.service.ts`](../../projects/web-smokeview-lib/src/lib/services/player/player.service.ts) |
| Publiczne API modułu | — | [`services/smokeview-api/smokeview-api.service.ts`](../../projects/web-smokeview-lib/src/lib/services/smokeview-api/smokeview-api.service.ts) |

---

## Jak szybko szukać (cheatsheet)

- **Parametry namelistu X** → `FDS_User_Guide.tex` (rozdział) **lub** `SUBROUTINE READ_X` w `read.f90`.
- **Jak zapisać przykład X** → `grep -rl '&X' Verification/` w repo FDS.
- **Format binarny pliku wynikowego** → odpowiedni `Source/shared/read*.c` (prawda) + `SMV_Technical_Reference_Guide.tex` (opis).
- **Jak SMV renderuje X** → `Source/smokeview/IO<x>.c` / `showscene.c`.
- **Etykiety/jednostki wielkości slice/boundary** → `SMV_User_Guide/SLCFlabels.tex`, `BNDFlabels.tex`.
- **Kod przez przeglądarkę bez klonowania** → `gh api repos/firemodels/<fds|smv>/contents/<ścieżka>` lub `gh search code '<token>' --repo firemodels/<repo>`.

## Utrzymanie

Ten plik to **migawka `master` z 2026-07-23**. Odśwież, gdy:
- upstream przeniesie/zmieni nazwę pliku (link 404) — popraw ścieżkę i datę,
- dodamy w `web-smokeview-lib` obsługę formatu z ⚠️ — usuń „brak", wpisz nowy serwis,
- rozszerzymy model o kolejny namelist — dopisz go do listy w sekcji ①.

Domyślne gałęzie obu repo: `master`. Fakt o repozytoriach zapisany też w pamięci projektu (`memory/upstream-fds-smv-repos.md`).
