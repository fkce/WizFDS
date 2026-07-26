# ADR-0001: Rendering wyłącznie na WebGPU (WGSL), usunięcie ścieżki WebGL/GLSL

- **Data:** 2026-07-26
- **Status:** zaakceptowana
- **Dotyczy:** `projects/web-smokeview-lib`

## Kontekst

`BabylonService.createScene()` próbuje utworzyć `WebGPUEngine`, a przy niepowodzeniu wraca do `BABYLON.Engine` (WebGL). Wybór języka shadera jest podpięty pod wynik tej próby (`useWGSL = isWebGPU`), więc w repo utrzymywane są dwa równoległe komplety shaderów: `src/assets/shaders/wgsl/` i `src/assets/shaders/glsl/`.

Audyt z 2026-07-26 wykazał eksperymentalnie (izolowany harness: Babylon 7.54.3, prawdziwe pliki shaderów, serwer z SPA-fallbackiem odtwarzającym dev-server Angulara i produkcyjny `/view/`), że **ścieżka GLSL nie działa**:

| Shader | WGSL (WebGPU) | GLSL (WebGL) |
|---|---|---|
| `obst`, `obstBackCap`, `mesh`, `slice` | OK | `VERTEX SHADER ERROR: 0:7: '<' : syntax error` |
| `vent`, `arrow` | OK | OK |
| `fire` | OK | plik nie istnieje |

Przyczyny:

1. **`#include<__decl__>`** w `glsl/{obst,obstBackCap,mesh,slice}.vertex.fx`. Babylon usuwa `__decl__` i dokleja `"Declaration"`, po czym szuka klucza `Declaration` w `IncludesShadersStore` — taki klucz nie istnieje w 7.54.3. Wtedy fetchuje `<ShadersRepository>ShadersInclude/Declaration.fx`, a `_functionContainer.loadFile()` jest wołane **bez callbacku błędu** (`babylon.max.js:53760`). Przy serwerze z SPA-fallbackiem wraca `index.html` ze statusem 200 i HTML zostaje wklejony w kod GLSL; przy prawdziwym 404 kompilacja nigdy się nie kończy, bez żadnego błędu.
2. **Brak `glsl/fire.*.fx`.** Shadera `fire` używa nie tylko `FireService`, ale też `VentService.renderBasicVents()` — na WebGL znikają zarówno pożary, jak i wszystkie podstawowe VENT-y.

Dodatkowo oba komplety **rozjechały się semantycznie**: GLSL tnie geometrię po `worldPosition` (world space), WGSL po `vPositionOS` (object space) — zgodne tylko dopóki world matrix jest macierzą jednostkową; modele oświetlenia w `mesh.fragment.*` są zupełnie różne (Phong vs ambient+diffuse).

WebGPU jest dostępne w Chrome/Edge od wersji 113, w Safari od 26 i w Firefoksie od 141.

## Decyzja

Renderujemy **wyłącznie na WebGPU, w WGSL**. Katalog `src/assets/shaders/glsl/` zostaje usunięty razem z całą logiką wyboru języka (`useWGSL`, `forceWebGL`, `forceWGSL`, gałąź `folder`/`ext` w `loadShaderSources()`).

Brak WebGPU w przeglądarce kończy się **jawnym komunikatem** dla użytkownika, a nie cichym fallbackiem na ścieżkę, która i tak nie działa.

## Konsekwencje

**Pozytywne**
- Każdy nowy element wizualizacji wymaga jednego kompletu shaderów zamiast dwóch.
- Znika klasa błędów wynikająca z rozjazdu semantyki między backendami.
- Można bez zastrzeżeń korzystać z funkcji wyłącznych dla WebGPU: `snapshotRendering`, compute shaderów (przyszłe SMOKE3D, ISOF, PLOT3D), tekstur 3D, storage buffers.
- Otwiera drogę do rozważenia Babylon Lite (WebGPU-exclusive, tree-shakable) — patrz ADR-0003.

**Negatywne / do obsłużenia**
- Użytkownicy na przeglądarkach bez WebGPU tracą wizualizację. W praktyce **nic nie tracą**, bo dziś widzą pustą scenę — ale muszą dostać czytelny komunikat zamiast ciszy.
- Trzeba wykryć WebGPU możliwie wcześnie i zakomunikować to w UI, nie dopiero przy próbie renderowania.

## Rozważone alternatywy

- **Naprawić GLSL i utrzymywać oba backendy.** Wymaga dopisania `fire.*.fx`, usunięcia `#include<__decl__>`, ujednolicenia clippingu i oświetlenia oraz testów obu ścieżek. Każdy nowy element kosztowałby cztery pliki shaderów zamiast dwóch i podwójną weryfikację — przy planowanej rozbudowie (patrz ADR-0003) to trwały podatek bez odbiorcy.
- **Zostawić bez zmian.** Odrzucone: martwy kod udający działający fallback jest gorszy niż jawny brak wsparcia.
