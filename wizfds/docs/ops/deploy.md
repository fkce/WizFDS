# Runbook: build lokalny i deploy produkcyjny WizFDS

> Procedura operacyjna. Część A = praca lokalna (przygotowanie, dev, build). Część B = wdrożenie na produkcję (wizfds.com).
> **Deploy na produkcję jest nieodwracalny** — czytaj kroki po kolei, uruchamiaj `--dry-run` przed właściwym `rsync`, sprawdzaj wynik każdego kroku.
> Stan zweryfikowany na dzień **2026-07-23**. Zmiany na serwerze (ścieżki, host key) → zaktualizuj ten plik.

---

## Architektura deployu (skrót)

**Build robi się lokalnie** — serwer produkcyjny **nie ma node/npm**, przyjmuje gotowy `dist/`.

| Komponent | Źródło builda (lokalnie) | Cel na serwerze | Mechanizm |
|---|---|---|---|
| **wizfds** (edytor FDS) | `dist/wizfds/browser/` | `public_html/view/` | `rsync` z wykluczeniami |
| **wizWelcome** (landing) | `dist/wizWelcome/browser/` | `public_html/welcome/` | `rsync` (rzadko — ostatni build 2019) |
| **webSmokeview** (viewer 3D) | — | **nie deployowany osobno** | wbudowany w `wizfds` przez `web-smokeview-lib` (import ze źródeł) |
| **backend PHP** | — (nie budowany) | symlinki → `svn/WizFDS/wizfds/projects/wizfds/backend/` | **`git pull`** w `/home/dkubera/svn/WizFDS/` |

**Serwer:** `s156.cyber-folks.pl:222` · user `dkubera` · alias SSH **`wizfds`** (w `~/.ssh/config` w WSL) · logowanie kluczem.
**Katalog domeny:** `/home/dkubera/domains/wizfds.com/public_html/`

Dlaczego backend przez `git pull`: pliki `index.php`, `db.php`, `login.php`, `rest/`, `router/` w `public_html/` to **symlinki** celujące w katalog `/home/dkubera/svn/WizFDS/` — a ten mimo nazwy „svn" **jest repozytorium `git`** (klon [`fkce/WizFDS`](https://github.com/fkce/WizFDS)). `git pull` w tym katalogu automatycznie aktualizuje pliki wskazywane przez symlinki.

---

## Prerekwizyty i bezpieczeństwo

- **WSL (Ubuntu)** z `rsync`, `ssh`, `git`. Komendy serwerowe uruchamiasz przez `wsl ...` z PowerShella albo bezpośrednio w powłoce WSL.
- **Alias SSH `wizfds`** skonfigurowany w `~/.ssh/config` w WSL (Host `wizfds` → `s156.cyber-folks.pl`, Port `222`, User `dkubera`, IdentityFile <klucz>). Test: `wsl ssh wizfds "whoami"` → `dkubera`.
- **Host key serwera** (zweryfikowany 2026-07-23):
  - RSA `SHA256:cm267MIJO1LPZiUaWgr0kWttUSaX/OGPvQUW8zO7JFY`
  - ECDSA `SHA256:nXla93f+aYi/K6Lfnj8A75QnK41N3I4VuEggnJSQlKs`
  - **ED25519 `SHA256:PFcq+rh/dzkvtjkrh2j/iw/rfnthAKBe4X/ERZPe3dc`**

  Jeśli SSH ostrzeże „REMOTE HOST IDENTIFICATION HAS CHANGED" (np. po kolejnej migracji serwera u cyber-folks): **potwierdź fingerprint w panelu/supporcie hostingu**, a dopiero potem odśwież wpis:
  ```bash
  wsl ssh-keygen -R "[s156.cyber-folks.pl]:222"
  wsl bash -lc "ssh-keyscan -p 222 s156.cyber-folks.pl >> ~/.ssh/known_hosts"
  ```
- **`config.php`** (`public_html/config.php`) — realny plik z sekretami (dostęp do bazy), poza gitem. **Nigdy nie wchodzi do `rsync`, nigdy nie nadpisuj.** (Wykluczenia `rsync` poniżej i tak go nie dotyczą — leży w roocie `public_html`, nie w `view/`.)
- **Nie ruszaj legacy**: `public_html/v5/` oraz `/home/dkubera/svn/wizfds/` (mała litera) to stary, prawdziwy checkout SVN — poza zakresem tego runbooka.

---

## Część A — Praca lokalna

Ścieżka repo (ta maszyna): `C:\Users\mateu\Documents\GitHub\WizFDS\wizfds` (w WSL: `/mnt/c/Users/mateu/Documents/GitHub/WizFDS/wizfds`).

### A1. Przygotowanie (po `git clone` lub po zmianie zależności)

```powershell
npm ci                    # instalacja dokładnie wg package-lock.json (albo: npm install)
npm run wizFds:cm:copy    # WYMAGANE: kopiuje addony CodeMirror (fds-mode/hint/fold) do node_modules
```
> `wizFds:cm:copy` jest konieczny **przed buildem i dev serve** — aplikacja importuje `codemirror/mode/fds/fds`, `codemirror/addon/hint/fds-hint`, `codemirror/addon/fold/fds-fold` (patrz `allowedCommonJsDependencies` w `angular.json`). Bez tego edytor FDS się wysypie.

### A2. Serwery deweloperskie

```powershell
npm run wizFds:start      # wizfds  → http://localhost:4200 (--open)
npm run webSmv:start      # webSmokeview (standalone viewer 3D)
npm run wizWel:start      # wizWelcome (landing)
```
**Proxy dev:** `projects/wizfds/proxy.conf.js` przekierowuje `/api`, `/login`, `/logout`, `/register` na `fliszer.vdl.pl` i przepisuje cookies, żeby sesja działała na `localhost`. Dzięki temu lokalny frontend gada z zdalnym backendem/bazą — nie musisz stawiać PHP lokalnie.

### A3. Buildy produkcyjne

```powershell
npm run wizFds:build-prod   # ng build wizfds --configuration production --base-href=/view/  → dist/wizfds/browser/
npm run wizWel:build-prod   # → dist/wizWelcome/browser/   (tylko gdy zmieniasz landing)
```
Uwagi:
- **Zawsze przez skrypty npm** — samo `ng build wizfds` używa konfiguracji domyślnej (`optimization:false`, z source-mapami). Konfiguracja `production` (hashowanie nazw, minifikacja, `environment.prod.ts`) jest w skryptach `*:build-prod`.
- **`--base-href=/view/`** dla wizfds jest krytyczny — aplikacja jest serwowana z podkatalogu `/view/`. Bez tego ścieżki do assetów będą złe.
- `webSmokeview` i `web-smokeview-lib` **nie są** częścią deployu produkcyjnego (viewer jest wbudowany w `wizfds`). Buduj je tylko do pracy standalone.
- Output esbuildowego buildera `application` ląduje w podkatalogu **`browser/`** — źródłem uploadu jest `dist/<projekt>/browser/`, nie `dist/<projekt>/`.

---

## Część B — Deploy produkcyjny

> Wykonuj z powłoki WSL (albo prefiksuj każdą komendę `wsl `). Dla czytelności ustaw zmienną z lokalną ścieżką repo:
> ```bash
> REPO=/mnt/c/Users/mateu/Documents/GitHub/WizFDS/wizfds
> ```

### B0. Przygotowanie release

1. Upewnij się, że jesteś na właściwym commicie (`git log --oneline -1`) i że kod przechodzi build.
2. **Podbij wersję** w `package.json` (`version`) — używana jako etykieta snapshotu rollbacku (np. `0.7.1` → `0.7.2`).
3. Zbuduj lokalnie: `npm run wizFds:build-prod` (i `wizWel:build-prod`, jeśli zmieniałeś landing).
4. Sanity-check outputu: `ls "$REPO/dist/wizfds/browser/"` — powinny być `index.html`, `main-*.js`, `styles-*.css`, `assets/`.

### B1. Frontend `wizfds` → `view/`

**Krok 1 — snapshot obecnego żywego builda (rollback).** Ustaw `OLD` = wersja, którą właśnie zastępujesz (ta aktualnie na produkcji):
```bash
ssh wizfds 'cd /home/dkubera/domains/wizfds.com/public_html/view && \
  OLD=0.7.1; mkdir -p "v$OLD" && \
  find . -maxdepth 1 -mindepth 1 \
    -not -name "v[0-9]*" -not -name "index.php" -not -name ".htaccess" \
    -exec cp -a {} "v$OLD"/ \; && echo "snapshot -> view/v$OLD OK"'
```
Kopiuje bieżące pliki roota `view/` (index.html, `*.js`, `*.css`, `assets/`, favicon) do `view/v<stara-wersja>/`, pomijając bramkę, `.htaccess` i istniejące katalogi wersji.

**Krok 2 — próba na sucho (`--dry-run`).** Pokazuje CO zostanie zmienione/usunięte, bez ruszania serwera:
```bash
rsync -rtvz --delete --dry-run --chmod=D755,F644 \
  --exclude='index.php' --exclude='.htaccess' --exclude='/v[0-9]*' \
  "$REPO/dist/wizfds/browser/" \
  wizfds:/home/dkubera/domains/wizfds.com/public_html/view/
```
Przejrzyj listę: usuwane powinny być tylko **stare hashowane pliki** (`main-<stary-hash>.js` itp.). Jeśli widzisz `deleting index.php`, `.htaccess` albo `v0.x.0/` — **STOP**, wykluczenia nie zadziałały.

**Krok 3 — właściwy upload** (ta sama komenda bez `--dry-run`):
```bash
rsync -rtvz --delete --chmod=D755,F644 \
  --exclude='index.php' --exclude='.htaccess' --exclude='/v[0-9]*' \
  "$REPO/dist/wizfds/browser/" \
  wizfds:/home/dkubera/domains/wizfds.com/public_html/view/
```
Dlaczego tak:
- **`--delete`** + hashowane nazwy → stare buildy nie zalegają w `view/`.
- **wykluczenia** chronią pliki serwerowe, których nie ma w `dist/`: `index.php` (bramka logowania — sprawdza sesję, przekierowuje niezalogowanych na `/welcome`), `.htaccess` (`DirectoryIndex`), katalogi wersji `v0.6.0`/`v0.7.0`/…
- **`--chmod=D755,F644`** normalizuje uprawnienia (źródło leży na `/mnt/c`, gdzie wszystko ma 0777).

**Krok 4 — weryfikacja:**
```bash
ssh wizfds 'ls -la /home/dkubera/domains/wizfds.com/public_html/view | grep -E "index\.(html|php)|\.htaccess|main-"'
```
Sprawdź, że `index.php` i `.htaccess` **nadal są**, a `index.html`/`main-*.js` mają świeży hash i datę. Na koniec otwórz https://wizfds.com/view/ (zalogowany) i https://wizfds.com/welcome (wylogowany → powinno działać przekierowanie).

### B2. Frontend `wizWelcome` → `welcome/` (tylko przy zmianie landingu)

`welcome/` to czysta statyka (brak plików serwerowych), więc bez wykluczeń:
```bash
rsync -rtvz --delete --dry-run --chmod=D755,F644 \
  "$REPO/dist/wizWelcome/browser/" \
  wizfds:/home/dkubera/domains/wizfds.com/public_html/welcome/
# po werydze dry-run — bez --dry-run
```

### B3. Backend PHP → `git pull`

```bash
ssh wizfds 'cd /home/dkubera/svn/WizFDS && git fetch && git status -sb && git pull --ff-only'
```
Asercje przed pull: gałąź `master`, working tree czysty (`git status -sb` bez zmian). `--ff-only` zapobiega przypadkowym merge-commitom. Po pull symlinki (`index.php`, `rest/`, `router/`…) automatycznie wskazują nowy kod — nic więcej nie trzeba kopiować.

### Rollback

Frontend — przywróć poprzednią wersję ze snapshotu (bez rebuildu):
```bash
ssh wizfds 'cd /home/dkubera/domains/wizfds.com/public_html/view && \
  PREV=0.7.0; \
  find . -maxdepth 1 -mindepth 1 -not -name "v[0-9]*" -not -name "index.php" -not -name ".htaccess" -exec rm -rf {} \; && \
  cp -a "v$PREV"/* . && echo "rollback <- view/v$PREV OK"'
```
Backend — cofnij do poprzedniego commita: `ssh wizfds 'cd /home/dkubera/svn/WizFDS && git reset --hard <poprzedni-commit>'` (świadomie, tylko gdy wiesz co robisz).

---

## Known issues / do weryfikacji

1. ⚠️ **Backend na produkcji jest przestarzały.** Checkout `/home/dkubera/svn/WizFDS/` stoi na `905121f` (era Angular 13), a repo lokalnie na `207675d` (Angular 20). Frontend `view/` jest świeży, backend **nie** → możliwy rozjazd API. **Przed następnym realnym deployem** sprawdź różnice i wykonaj kontrolowany pull:
   ```bash
   ssh wizfds 'cd /home/dkubera/svn/WizFDS && git log --oneline 905121f..origin/master -- wizfds/projects/wizfds/backend'
   ```
2. **Mylące nazewnictwo `svn/`.** `/home/dkubera/svn/WizFDS/` to git, nie svn (legacy nazwa katalogu). `/home/dkubera/svn/wizfds/` (mała litera) i `public_html/v5/` to prawdziwe, stare SVN — nie ruszać.
3. **`welcome/` bardzo stary** (build z 2019, stary format Angulara). Redeploy tylko przy realnej zmianie landingu.
4. **Uprawnienia z `/mnt/c`.** Źródło na dysku Windows nie niesie sensownych uprawnień — dlatego `--chmod=D755,F644` w `rsync`. Bez tego pliki wylądują z 0777.
5. **Nowe katalogi outputu łatwo pominąć przy ręcznym uploadzie.** 2026-07-23 `rsync --dry-run` wykrył, że produkcyjny `view/` nie miał katalogu **`media/`** (fonty KaTeX) — poprzedni upload przez WinSCP przeoczył nowy folder obok `assets/`, przez co wzory KaTeX leciały na fontach zastępczych. Dograno addytywnie (`rsync` bez `--delete`) i zweryfikowano (`HTTP 200`, `font/woff2`). **Lekcja:** `rsync` (Krok B1) synchronizuje całe drzewo `browser/`, więc problem nie wróci; przy WinSCP zawsze porównaj listę katalogów `dist/wizfds/browser/` z `view/`.

---

## Ściąga (cheatsheet)

```bash
# --- lokalnie ---
npm ci && npm run wizFds:cm:copy          # po instalacji zależności
npm run wizFds:start                       # dev :4200
npm run wizFds:build-prod                  # → dist/wizfds/browser/

# --- deploy (WSL) ---
REPO=/mnt/c/Users/mateu/Documents/GitHub/WizFDS/wizfds
# 1) snapshot rollback (OLD = wersja obecnie żywa)
ssh wizfds 'cd .../public_html/view && OLD=0.7.1; mkdir -p v$OLD && find . -maxdepth 1 -mindepth 1 -not -name "v[0-9]*" -not -name "index.php" -not -name ".htaccess" -exec cp -a {} v$OLD/ \;'
# 2) dry-run  3) upload  (te same flagi, drugi bez --dry-run)
rsync -rtvz --delete --dry-run --chmod=D755,F644 --exclude='index.php' --exclude='.htaccess' --exclude='/v[0-9]*' "$REPO/dist/wizfds/browser/" wizfds:/home/dkubera/domains/wizfds.com/public_html/view/
# 4) backend
ssh wizfds 'cd /home/dkubera/svn/WizFDS && git fetch && git status -sb && git pull --ff-only'
```

WinSCP (awaryjnie, zamiast `rsync`): wgraj zawartość `dist/wizfds/browser/` do `public_html/view/`, ręcznie usuwając stare `main-*.js`/`styles-*.css`, i **nie kasując** `index.php`, `.htaccess`, `v0.*`.
