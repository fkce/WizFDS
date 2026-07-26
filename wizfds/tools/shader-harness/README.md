# Shader harness

Kompiluje **wszystkie** shadery używane przez `web-smokeview-lib` w izolacji od aplikacji — bez logowania, bez scenariusza, bez backendu — i raportuje wynik per shader, per język.

Narzędzie powstało przy audycie z 2026-07-26 ([`docs/audits/2026-07-26-web-smokeview-webgpu.md`](../../docs/audits/2026-07-26-web-smokeview-webgpu.md)) i to ono dostarczyło dowodu, że ścieżka WebGL nie działa.

## Uruchomienie

```bash
node tools/shader-harness/server.js        # domyślnie port 4599
node tools/shader-harness/server.js 5000   # inny port
```

Następnie otwórz `http://localhost:4599` w przeglądarce **z obsługą WebGPU** (Chrome/Edge 113+, Safari 26+, Firefox 141+). Wynik pojawia się na stronie i w konsoli; obiekt `window.__RESULTS__` zawiera go w formie strukturalnej.

Wymaga wyłącznie `node_modules/babylonjs` — czyli wykonanego `npm install`. Nie buduje aplikacji.

## Co wykrywa

Dwie rzeczy, których zwykłe uruchomienie aplikacji **nie** pokazuje:

1. **Brakujący plik shadera.** Serwer celowo odtwarza SPA-fallback dev-servera Angulara i produkcyjnego `/view/`: nieznana ścieżka zwraca `index.html` ze statusem **200**, nie 404. Brakujący shader nie objawia się więc jako błąd sieci, tylko jako HTML wklejony w kod shadera. Harness porównuje treść odpowiedzi i raportuje `MISSING`.

2. **Shader, który nigdy nie kończy kompilacji.** Babylon pobiera nierozwiązane pliki `#include` **bez callbacku błędu** (`babylon.max.js:53760`), więc zły include wiesza kompilację w ciszy — bez wyjątku i bez wpisu w konsoli. Stąd jawny timeout (6 s) i osobny werdykt `TIMEOUT`.

## Odporność na zmiany układu katalogów

Układ shaderów zmienia się wraz z migracją WebGPU-only (#82):

| Przed | Po |
|---|---|
| `assets/shaders/wgsl/<nazwa>.<etap>.wgsl` | `assets/shaders/<nazwa>.<etap>.wgsl` |
| `assets/shaders/glsl/<nazwa>.<etap>.fx` | — (usunięte) |

Harness **wykrywa** układ zamiast go zakładać, i przy układzie płaskim pomija ścieżkę GLSL. Działa więc zarówno przed migracją, jak i po niej.

## Wynik odniesienia (2026-07-26, przed #82)

| Shader | WGSL (WebGPU) | GLSL (WebGL) |
|---|---|---|
| `obst`, `obstBackCap`, `mesh`, `slice` | OK | `VERTEX SHADER ERROR: 0:7: '<' : syntax error` |
| `vent`, `arrow` | OK | OK |
| `fire` | OK | plik nie istnieje |

Po ukończeniu #82 oczekiwany wynik to `=== ALL 7 SHADERS OK ===` przy układzie płaskim.

## Dodanie nowego shadera

Dopisz jego nazwę do tablicy `NAMES` w `index.html`. Jeśli shader czyta nietypowe atrybuty wierzchołków, dodaj je w `buildProbeMesh()` oraz na liście `attributes` — tak jak `texture_coordinate` i `blank` na potrzeby `slice`.
