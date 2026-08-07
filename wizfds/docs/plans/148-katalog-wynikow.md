# Plan #148 — katalog wyników: `ResultsDirectory`, surowe bajty, picker

- **Data:** 2026-08-07
- **Podstawa:** issue [#148](https://github.com/fkce/WizFDS/issues/148) + [komentarz z decyzjami](https://github.com/fkce/WizFDS/issues/148#issuecomment-5215109648), ADR-0016, ADR-0010, `CONTEXT.md` (hasła: *Katalog wyników*, *Grupa wielkości*, *Zakres wielkości*)
- **Zasada nadrzędna:** po każdej fazie wszystkie trzy projekty się budują i testują; żadna faza nie zostawia webSmokeview bez działającego podglądu geometrii.
- **Gałąź:** `feat/results-directory` (start z `master`).

Każda faza jest samodzielna — zawiera własne odnośniki do wzorców. Wykonawca fazy
nie musi znać pozostałych faz.

---

## Faza 0 — Ustalenia zwiadu (przeczytać, nie wykonywać)

### Dozwolone API (zweryfikowane w źródłach, nie z pamięci)

**File System Access (MDN + WHATWG fs.spec):**
- `window.showDirectoryPicker({ id, mode: 'read' })` → `Promise<FileSystemDirectoryHandle>`; wymaga secure context i gestu użytkownika (inaczej `SecurityError`); odrzucenie = `AbortError`. Tylko Chromium (Chrome/Edge 105+); Firefox/Safari — brak.
- Wykrywanie wyłącznie przez `'showDirectoryPicker' in window`. **Nigdy** przez obecność typu `FileSystemDirectoryHandle` (ten istnieje wszędzie przez OPFS).
- `dirHandle.getFileHandle(name, { create: false })` — **nie przyjmuje ścieżek z `/`** (spec: nazwa z separatorem → `TypeError` przed dotknięciem dysku; brak pliku → `NotFoundError`). Segmenty przechodzić przez `getDirectoryHandle()`, `getFileHandle()` tylko na ostatnim. Oba wyjątki mapować na jedno „pliku nie ma".
- `fileHandle.getFile()` → `File` — **migawka**; po zmianie pliku na dysku stary `File` przestaje być czytelny. Brać świeży `File` per odczyt, nie cache'ować na życie widoku.
- `File.slice(start, end)` — `end` wyłączny; poza zakresem → pusty Blob (`size === 0`), nie wyjątek.
- Uchwyty są `[Serializable]` → wolno je składować w IndexedDB (potwierdzone w spec WHATWG i docs Chrome). `queryPermission({mode:'read'})` bez gestu; `requestPermission({mode:'read'})` **wymaga gestu**. Po restarcie przeglądarki zawsze potrzebny przycisk z `requestPermission()` za kliknięciem.
- Fallback: `<input type="file" webkitdirectory multiple>` (Chrome 30+, Firefox 50+, Safari 11.1+). `File.webkitRelativePath` **zawiera nazwę wybranego katalogu jako pierwszy segment** (przykład MDN: `PhotoAlbums/Birthdays/.../PIC2343.jpg`) — przy budowie mapy plików pierwszy segment odciąć; separator zawsze `/`.

**Express 4 (`express@4.17.1` + `send@0.17.1`, przeczytane ze źródeł `pillarjs/send`):**
- `res.sendFile(relPath, { root }, fn)` obsługuje `Range`/206/`Accept-Ranges`/HEAD natywnie, bez nowych zależności. Obsługiwany jest tylko pierwszy zakres (`ranges[0]`) — wystarcza, czytniki ślą pojedyncze zakresy.
- Ochrona przed traversal: `send` dekoduje ścieżkę, **potem** aplikuje `UP_PATH_REGEXP` (`..` → 403), potem dokleja `root`. `%2e%2e` → 403, `%252e%252e` → 404. `root` jest szczelną granicą.
- Brak pliku: `ENOENT`/`ENOTDIR` → `err.status = 404` w callbacku `fn` — bez callbacka poleci `next(err)`; callback podać.
- Składnia trasy `:path(*)` + `req.params[0]` jest specyficzna dla Express 4 — zostajemy na 4, żadnej migracji przy okazji.

**fetch + Range (MDN):**
- `fetch(url, { headers: { Range: 'bytes=0-0' } })` — **sprawdzać `status === 206`**; 200 znaczy, że serwer zignorował Range (i właśnie wysłał całe 500 MB). Rozmiar całości z `Content-Range: bytes 0-0/total`, nie z `Content-Length`.
- Sonda rozmiaru: `GET` z `Range: bytes=0-0` zamiast HEAD — jedna wymiana daje rozmiar **i** dowód, że Range działa.
- Same-origin: zero zastrzeżeń CORS.

**IndexedDB (MDN):** jeden store bez `keyPath`, `store.put(value, key)` / `store.get(key)`; surowe API opakowane w promisy, bez biblioteki.

### Anty-wzorce (nie robić)

- ~~`getFileHandle('podkatalog/plik')`~~ — `TypeError`, patrz wyżej.
- ~~HEAD jako sonda~~ — Range 0-0.
- ~~Wykrywanie FSA po typie~~ — tylko `'showDirectoryPicker' in window`.
- ~~Uchwyt w `UiState`~~ — `FileSystemDirectoryHandle` nie jest JSON-em, przez `toJSON()` wyjdzie `{}` (`services/ui-state/ui-state.ts:353-370`).
- ~~TestBed w specach biblioteki~~ — lib testuje przez `new Klasa()` (wzorzec `smv-parser.service.spec.ts:8-13`).
- ~~UI katalogu w bibliotece~~ — ADR-0010: biblioteka rysuje, host decyduje; do biblioteki idą tylko typy, źródła bajtów i czysta logika grupowania.
- ~~`HttpClient` w bibliotece~~ — `HttpResultsDirectory` na `fetch` (jedyny precedens fetch w lib: `babylon.service.ts:498`, mock: `babylon.service.spec.ts:43`).
- ~~Ikona `database-outline`~~ — nie ma jej w spricie `assets/mdi.svg`; są m.in. `folder-open-outline`, `folder-outline`, `folder-search-outline`, `refresh`, `alert-circle-outline`, `file-document-outline`.
- ~~Literalny `#3B82F6` w SCSS~~ — tylko tokeny `var(--accent…)` z `projects/wizfds/src/styles/_tokens.scss:77-80`.
- ~~Migracja Express na 5 / PDO-podobne „przy okazji"~~ — zakres to bajty, nie porządki.

### Fakty o stanie repo, na których plan stoi

- Parser `.smv` (#115) już zwraca katalog: `SmvFile.results: SmvResultFile[]` — `parsers/smv/smv-file.ts:32-61`; `parse(text: string): SmvFile` — `smv-parser.service.ts:27`. Parser bierze **tekst**; dekodowanie bajtów należy do wołającego.
- `SmvResultFile.filename` jest względny wobec katalogu wyników (`smv-file.ts:36`); wpisy `prt5` mają puste `longLabel`/`unit` (`smv-parser.service.ts:302-311`) — UI musi mieć fallback na nazwę pliku.
- Drzewo webSmokeview emituje dziś ścieżki **absolutne** serwera (`directory-tree` od `global.gConfig.pathToSimulations`, `backend/routes/tree.js:9`), a `loadSmv` czyta dowolną ścieżkę bez walidacji (`backend/routes/loaders.js:12`).
- `pako` żyje w 4 plikach webSmokeview (tree.js:2,17; loaders.js:2,31; tree.service.ts:4,25; geometry-loader.service.ts:3,49 + spec) i nigdzie indziej w repo; żeby faktycznie odszedł z klienta, `/api/tree` też musi przestać gzipować.
- **tsconfig:** żaden nie ma `"dom.asynciterable"` w `lib` — bez tego `for await (const h of dir.values())` się nie kompiluje (iteratory są wyłącznie w `lib.dom.asynciterable.d.ts:23-31`). `showDirectoryPicker`, `queryPermission`, `requestPermission` **nie istnieją** w typach TS 5.8 — potrzebna własna deklaracja w wizfds.
- Ribbon ma przygotowane miejsce: `ribbon.component.ts:31` (`RibbonTabId`), `:40-44` (`FIXED_TABS`, docstring: „Phase 6 (#89) adds a Results tab here"), panel-host `ribbon.component.html:79`.
- Paleta właściwości nie ma zakładek i jest kontraktowo związana z zaznaczeniem (`properties-palette.component.ts:26-35`) → katalog wyników to **siostrzany komponent**, nie zakładka palety.
- CHID: `main.currentFdsScenario.fdsObject.general.head.chid` (`head.ts:46-48`); id scenariusza: `main.currentFdsScenario.id: number` (`fds-scenario.ts:56-58`); `currentFdsScenario$` odpala się przy **zmianie scenariusza**, nie przy edycji CHID (`main.service.ts:28-30`).
- Wzorzec degradacji storage: `layout.service.ts:14-49` (prefiks klucza `wizfds.`, `try/catch` wokół każdego dostępu).
- Backend webSmokeview nie jest nigdzie zdeployowany (`docs/ops/deploy.md:18,84`) — zmiany kontraktu `/api/tree` nie łamią żadnej produkcji.

---

## Faza 1 — Kontrakt `ResultsDirectory` i obie implementacje (web-smokeview-lib)

**Cel:** biblioteka umie odpowiedzieć „daj mi bajty pliku X z katalogu wyników" z dwóch źródeł, z sondą dostępności i rozmiaru.

1. **tsconfig:** dopisać `"dom.asynciterable"` do `lib` w korzennym `tsconfig.json` (obok `"es2022","dom"`) i w `projects/web-smokeview-lib/tsconfig.lib.json` (obok `"dom","es2020"`).
2. **`services/results/results-directory.ts`** (typy bez infiksu `.service`, wzorzec `smv-file.ts`):
   - `ResultsDirectory { open(filename: string): Promise<ResultFileHandle | null> }` — `null` = pliku nie ma; `filename` względny wobec katalogu wyników, separator `/`, dokładnie jak w `SmvResultFile.filename`.
   - `ResultFileHandle { readonly size: number; read(offset: number, length: number): Promise<ArrayBuffer> }`.
   - Komentarze kontraktowe: skąd `null` (spis treści `.smv` bywa kłamliwy — *Katalog wyników* w CONTEXT.md), czemu dostęp swobodny (czytniki #149+ skaczą po klatkach), czemu bez strumieni.
3. **`services/results/local-results-directory.ts`** — implementacja nad FSA:
   - konstruktor `new LocalResultsDirectory(handle: FileSystemDirectoryHandle)`; `open()` schodzi segmentami (`getDirectoryHandle` po drodze, `getFileHandle` na końcu), `TypeError`/`NotFoundError`/`TypeMismatchError` → `null`;
   - `read()` bierze **świeży** `File` przez `getFile()` (migawka!), potem `slice(offset, offset+length).arrayBuffer()`; `size` z `File.size` w chwili `open()`;
   - druga droga wejścia dla fallbacku: statyczna `LocalResultsDirectory.fromFiles(files: FileList | readonly File[])` budująca mapę `ścieżka względna → File` z `webkitRelativePath` **z odciętym pierwszym segmentem**.
4. **`services/results/http-results-directory.ts`** — implementacja nad `fetch`:
   - konstruktor `new HttpResultsDirectory(baseUrl: string)` (URL katalogu przypadku, bez końcowego `/`);
   - `open()`: `GET` z `Range: bytes=0-0`; `206` → rozmiar z `Content-Range` (`bytes 0-0/total`); `404` → `null`; `200` lub brak `Content-Range` → błąd „serwer nie obsługuje Range" (nie udawać sukcesu);
   - `read()`: `Range: bytes=offset-(offset+length-1)`, wymagać `206`, zwrócić `arrayBuffer()`;
   - enkodować segmenty ścieżki (`encodeURIComponent` per segment, `/` zostaje).
5. **`public-api.ts`:** `export * from './lib/services/results/results-directory'` + linie dla obu implementacji (wzorzec: linie 11-12 z #115).
6. **Specyfikacje** (kolokowane, bez TestBed):
   - `local-results-directory.spec.ts` — fake'i uchwytów jako obiekty literalne zgodne z typami `lib.dom` (przypadki: plik jest / brak → null / zagnieżdżona ścieżka / `fromFiles` z odcięciem pierwszego segmentu / `read` wycina właściwe bajty);
   - `http-results-directory.spec.ts` — `spyOn(window, 'fetch')` (wzorzec `babylon.service.spec.ts:43`); przypadki: 206+Content-Range → size; 404 → null; 200 → błąd; `read` śle poprawny nagłówek Range i wymaga 206.

**Weryfikacja:** `ng test webSmokeviewLib` zielone; `grep -r "HttpClient" projects/web-smokeview-lib/src` bez nowych trafień; build `npm run webSmvLib:build-prod` przechodzi.

**Gotowe, gdy:** oba źródła przechodzą te same scenariusze kontraktowe (istnieje/brak/rozmiar/wycinek), a biblioteka kompiluje się z `for await` po uchwycie katalogu.

---

## Faza 2 — Backend webSmokeview: jeden endpoint surowych bajtów

**Cel:** serwer serwuje bajty każdego pliku przypadku przez Range, `.smv` tą samą drogą; gzip-JSON i path traversal znikają.

1. **`backend/routes/results.js`** (nowy; rejestracja w `app.js` obok linii 19-21):
   ```js
   app.get('/api/results/:path(*)', (req, res) => {
       res.sendFile(req.params.path, { root: global.gConfig.pathToSimulations }, (err) => {
           if (err && !res.headersSent) { res.status(err.status || 500).end(); }
       });
   });
   ```
   `send` sam załatwia Range/206/HEAD/`Accept-Ranges` i 403 na `..`; callback obowiązkowy (ENOENT → 404 zamiast `next(err)`).
2. **`backend/routes/tree.js`:** ścieżki węzłów **względne** wobec `pathToSimulations` (odciąć prefiks korzenia, `\` → `/`), odpowiedź bez gzipa — czysty JSON w tej samej kopercie `{meta, data}`.
3. **Wyburzenia:** `backend/routes/loaders.js` (cała trasa `loadSmv`), `backend/routes/routes.js` + `backend/example/` (martwa atrapa `/api/slices` — zero konsumentów we froncie), `pako` z `backend/package.json`.
4. **Front webSmokeview:**
   - `tree.service.ts` — bez `ungzip` (czysty JSON z `/api/tree`);
   - `geometry-loader.service.{ts,spec.ts}` — **usunąć**;
   - `tree.component.ts:52-63` — klik w `.smv` buduje `new HttpResultsDirectory(ConfigService.settings.host + '/api/results/' + katalogPrzypadku)` (katalog = względna ścieżka węzła bez nazwy pliku), potem `open('<plik>.smv')` → `read(0, size)` → `new TextDecoder().decode(...)` → `SmvParserService.parse` → `render(smv.scene)`; zachować `smv.results` i instancję `ResultsDirectory` w polu komponentu dla fazy 3;
   - `pako` z korzennego `package.json` (po grep: zero innych użyć w repo).
5. **Testy backendu** (`supertest@4.0.2` już w devDependencies, podłączyć skrypt `"test": "node --test"`): traversal `..` → 403, plik spoza korzenia niedostępny, `Range: bytes=0-0` → 206 + `Content-Range`, brak pliku → 404, HEAD → nagłówki bez ciała. Fixture: katalog tymczasowy z małym plikiem.

**Weryfikacja:** testy backendu zielone; `ng test webSmokeview` zielone (spec drzewa przepięty na mock `fetch`); ręcznie: `node backend/app.js` + `npm run webSmv:start`, klik w `.smv` renderuje geometrię jak przed zmianą; `grep -ri "pako" projects/ package.json` → zero trafień.

**Gotowe, gdy:** geometria w webSmokeview ładuje się przez `/api/results/...` z Range, a `curl -H "Range: bytes=0-0"` na plik przypadku zwraca 206 z `Content-Range`.

---

## Faza 3 — Grupowanie i lista wyników w webSmokeview

**Cel:** po wczytaniu przypadku panel drzewa pokazuje katalog wyników: format → grupa wielkości → pliki per siatka, z rozmiarem i dostępnością.

1. **`services/results/quantity-groups.ts`** w bibliotece (czysta funkcja + typy, spec kolokowany, bez TestBed): `groupResults(results: readonly SmvResultFile[])` → lista formatów (`kind`) → *grupy wielkości* (klucz: `longLabel` + dla slice `ior`+`bounds`; etykieta grupy dla slice z położeniem, np. `TEMPERATURE, Z=2.4` — współrzędna z `grids` nie jest potrzebna na #148, wystarczy indeks/`bounds`) → wpisy per `meshIndex`. Fallback dla pustych etykiet `prt5`: nazwa pliku. Eksport w `public-api.ts`. To odbicie hasła *Grupa wielkości* z CONTEXT.md — logika wspólna obu hostom, więc w bibliotece (to nie „chrome", ADR-0010 nienaruszony).
2. **Sonda dostępności w komponencie drzewa:** po `parse()` dla każdego `SmvResultFile` → `directory.open(filename)`; wynik (`size` albo `null`) trzymany w mapie `filename → {size} | null`; sondy równolegle (`Promise.all`), UI nie czeka — wiersze doładowują status.
3. **Markup:** sekcja „Results" pod drzewem w `tree.component.html` — nagłówek wzorem `.header` (`tree.component.scss:12-22`), wiersze wzorem `@mixin menu` (`:24-38`), wcięcia `.menu-l2/l3` (`:59-70`); grupa zwijana jak poziomy drzewa (`.open/.close` `:40-49`). Wiersz pliku: ikona formatu, `MESH n`, rozmiar (formatowanie `KB/MB/GB`), a przy `null` — `alert-circle-outline` + szarość (`--on-surface-muted`). Nic nie jest klikalne w sensie ładowania — to katalog, czytniki przyjdą w #149+.
4. Przy okazji (jednolinijkowa poprawka, ta sama okolica): poziom 3 drzewa używa ligatur `folder`/`folder_open` zamiast `svgIcon` (`tree.component.html:28-29`) — ujednolicić do `svgIcon`.
5. **`tree.component.spec.ts`** rozszerzyć: fixture `smvFixture()` ma wpisy wszystkich formatów — po wczytaniu spec sprawdza, że lista grup powstała, że sonda oznaczyła brakujący plik jako niedostępny (mock `fetch` z 404) i że dostępny ma rozmiar z `Content-Range`.

**Weryfikacja:** `ng test webSmokeviewLib` i `ng test webSmokeview` zielone; ręcznie na case z `d:/smokeweb/`: lista grup zgodna z zawartością `.smv`, plik skasowany z dysku pokazuje się jako niedostępny.

**Gotowe, gdy:** panel drzewa pokazuje katalog wyników wczytanego przypadku zgodnie z hasłami *Katalog wyników* i *Grupa wielkości*, bez parsowania czegokolwiek poza `.smv`.

---

## Faza 4 — wizfds: picker, trwałość, ribbon i panel katalogu

**Cel:** użytkownik wskazuje lokalny folder wyników w widoku Visualize; katalog wyników scenariusza widać w panelu; wybór przeżywa przeładowanie strony.

1. **Typy FSA:** nowy `projects/wizfds/src/typings/file-system-access.d.ts` — deklaracja `Window.showDirectoryPicker(options?)` oraz rozszerzenie `FileSystemHandle` o `queryPermission`/`requestPermission` (sygnatury z Fazy 0; typy WICG nie istnieją w TS 5.8). Upewnić się, że plik łapie się w `tsconfig.app.json` i `tsconfig.spec.json` (katalog `src` jest w `include`/`files` — zweryfikować, w razie czego dopisać).
2. **`services/results-directory/results-directory.service.ts`** (`providedIn: 'root'`, bez wpisu w `app.module.ts` — precedens `LayoutService`):
   - stan: `catalog$` (grupy + mapa dostępności), `status$` (`'closed' | 'picking' | 'resumable' | 'open' | 'error'` z komunikatem), bieżący `ResultsDirectory`;
   - `openPicker()`: `'showDirectoryPicker' in window` → `showDirectoryPicker({ id: 'wizfds-results', mode: 'read' })`; `AbortError` → cisza; po wyborze → `scan()`;
   - `openFiles(files: FileList)` — droga fallbacku → `LocalResultsDirectory.fromFiles` → `scan()`;
   - `scan()`: listowanie `.smv` w korzeniu uchwytu (`for await`), reguła CHID z decyzji: dokładnie jeden → bierz (miękkie ostrzeżenie przy nazwie ≠ `main.currentFdsScenario.fdsObject.general.head.chid`); kilka → `<chid>.smv`, inaczej stan „wybierz z listy"; zero → błąd „to nie katalog wyników"; wybrany `.smv` → `open()` → `read` → `TextDecoder` → `SmvParserService.parse` → `groupResults` + sondy dostępności (jak w fazie 3);
   - **IndexedDB:** prywatny helper (promisy nad surowym API, wzorzec MDN): baza `wizfds`, store `results-handles`, `put(handle, scenarioId)`; klucz = `main.currentFdsScenario.id`; każdy dostęp w `try/catch` z degradacją do trybu sesyjnego (wzorzec `layout.service.ts:36-49`);
   - przy starcie/zmianie scenariusza (`mainService.currentFdsScenario$`): zamknij stan, `get(scenarioId)` → jest uchwyt → `queryPermission` → `'granted'` → od razu `scan()`; `'prompt'` → stan `resumable` (przycisk); brak → `closed`;
   - `resume()` (z klику): `requestPermission({mode:'read'})` → `'granted'` → `scan()`, inaczej `closed`.
3. **Ribbon** (`views/main/fds/visualize/ribbon/`):
   - `ribbon.component.ts:31` — `RibbonTabId` + `'results'`; `:40-44` — wpis w `FIXED_TABS`;
   - nowy blok `*ngSwitchCase="'results'"` w `ribbon.component.html` (skopiować anatomię sekcji Measure `:234-254`): przycisk `cmd big` „Open folder" (`svgIcon="folder-open-outline"`) → `openPicker()`, warunkowy „Resume access" (`svgIcon="refresh"`) przy `status === 'resumable'`, „Close" przy otwartym; obok `.readout-row` (`:352-356`) z nazwą katalogu i CHID; przy braku FSA — ukryty `<input type="file" webkitdirectory multiple>` odpalany tym samym przyciskiem (etykieta bez zmian), `(change)` → `openFiles()`.
4. **`views/main/fds/visualize/results-catalog/`** — nowy komponent (`standalone: false`; import przy `app.module.ts:102-104`, deklaracja przy `:154-156`):
   - siostra palety: wpięcie obok `<app-properties-palette>` w `visualize.component.html:13`, `*ngIf` na otwartym katalogu, szerokość skopiowana z `visualize.component.scss:31-34`;
   - SCSS przeniesiony klasami z palety (`properties-palette.component.scss`): `.palette` `:13-23`, `.palette-head` `:25-54`, `.palette-empty` `:56-78` (stan „resumable"/błędy), `.group/.group-title/.row` `:87-160` na listę format → grupa → pliki; wiersze jak w fazie 3 (rozmiar, `alert-circle-outline` dla braków); żadnych literalnych kolorów, tylko tokeny.
5. **Spec:** `results-directory.service.spec.ts` — wzorzec `appServiceProviders()` (`testing/app-service-testing.ts:26-43`) + scenariusz z `ribbon.component.spec.ts:69-86`; fake uchwytów jak w fazie 1; IndexedDB zamockowane przez fake helpera (nie odpalać prawdziwego IDB w Karmie); przypadki: reguła CHID (1/kilka/zero), degradacja bez IDB, `resumable` po `queryPermission === 'prompt'`. Spec komponentu katalogu: render grup z fixture.

**Weryfikacja:** `ng test wizfds` zielone; `npm run wizFds:start` → localhost:4200 (sesja domyślna, bez logowania): w Visualize zakładka Results otwiera picker, wskazanie folderu z wynikami FDS pokazuje katalog, F5 → przycisk „Resume access" przywraca po jednym kliku. Fallback sprawdzić w Firefoksie (input webkitdirectory).

**Gotowe, gdy:** pełna pętla picker → skan → katalog → trwałość działa na prawdziwym folderze wyników, a scenariusz bez folderu niczego nie zmienia w dotychczasowym Visualize.

---

## Faza 5 — Weryfikacja końcowa

1. `ng test webSmokeviewLib && ng test webSmokeview && ng test wizfds` — komplet zielony.
2. Buildy produkcyjne: `npm run webSmvLib:build-prod && npm run webSmv:build-prod && npm run wizFds:build-prod`.
3. Grepy anty-wzorców: `pako` (zero w repo), `fs.readFile(req.params` (zero w backendzie), `showDirectoryPicker` wyłącznie za guardem `'showDirectoryPicker' in window`, `HttpClient` bez nowych użyć w bibliotece, literalne `#3b82f6` poza `_tokens.scss` (zero nowych).
4. Testy backendu (faza 2) zielone.
5. Odhaczyć checklistę w #148 i zderzyć wynik z komentarzem decyzji (każdy punkt scope'u ma pokrycie: picker ✓, backend raw ✓, abstrakcja ✓, katalog ✓, UI obu konsumentów ✓).
6. PR na `master` z gałęzi `feat/results-directory` (opis po angielsku).
