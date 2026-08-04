# Runbook: build lokalny i deploy produkcyjny WizFDS

> Procedura operacyjna. Część A = praca lokalna (przygotowanie, dev, build). Część B = deploy produkcyjny na **app.wizfds.com** (główna i jedyna aktywna ścieżka deployu). Część C = zamrożona instancja legacy na wizfds.com (tylko do wglądu — **nie deployować**).
> **Deploy na produkcję jest nieodwracalny** — czytaj kroki po kolei, uruchamiaj `--dry-run` przed właściwym `rsync`, sprawdzaj wynik każdego kroku.
> Stan zweryfikowany na dzień **2026-08-04**. Zmiany na serwerze (ścieżki, host key) → zaktualizuj ten plik.

---

## Architektura deployu (skrót)

**Build robi się lokalnie** — serwer produkcyjny **nie ma node/npm**, przyjmuje gotowy `dist/`.

**Instancja produkcyjna: `https://app.wizfds.com`** (od 2026-08-04, wersja `1.0.0-beta.1`, układ root):

| Komponent | Źródło builda (lokalnie) | Cel na serwerze | Mechanizm |
|---|---|---|---|
| **wizfds** (edytor FDS) | `dist/wizfds/browser/` (build `wizFds:build-prod-app`, base-href `/`) | `public_html/app/` (korzeń docroota) | `rsync` z wykluczeniami |
| **webSmokeview** (viewer 3D) | — | **nie deployowany osobno** | wbudowany w `wizfds` przez `web-smokeview-lib` (import ze źródeł) |
| **backend PHP** | — (nie budowany) | symlinki → `git/WizFDS/wizfds/projects/wizfds/backend/` | **`git pull`** w `/home/dkubera/git/WizFDS/` |

**Wersja PHP:** app.wizfds.com działa na **PHP 8.2** (od 2026-08-04; pierwsza linia `public_html/app/.htaccess` → `AddHandler application/x-httpd-php82 php`). Rollback to ta jedna linia — kopia sprzed przełączenia leży obok jako `.htaccess.php74-<data>`. Rozszerzenie `pgsql` jest włączone dla 8.2 w panelu; `pdo_pgsql` **nie** — kod korzysta z `pg_*`. Instancja legacy zostaje na 7.4.

**Instancja legacy: `https://wizfds.com`** — zamrożona (frontend `0.7.1` w `public_html/view/`, backend-klon `/home/dkubera/svn/WizFDS/` na `905121f`, landing `welcome/` z 2019). **Nie ruszamy jej** — ani plików, ani klonu; procedura archiwalna w Części C.

**Serwer:** `s156.cyber-folks.pl:222` · user `dkubera` · alias SSH **`wizfds`** (w `~/.ssh/config` w WSL) · logowanie kluczem.
**Katalog domeny:** `/home/dkubera/domains/wizfds.com/public_html/` (subdomena app → podkatalog `app/`).

Obie instancje używają **tej samej bazy PostgreSQL** (kopia `config.php` w `app/`) — konta, projekty i biblioteki są wspólne, ale **sesje logowania osobne** (cookie `wizfds` jest host-only).

Dlaczego backend przez `git pull`: pliki `index.php`, `db.php`, `login.php`, `rest/`, `router/` w docroot to **symlinki** celujące w klon [`fkce/WizFDS`](https://github.com/fkce/WizFDS). `git pull` w klonie automatycznie aktualizuje pliki wskazywane przez symlinki.

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
- **`config.php`** — realny plik z sekretami (dostęp do bazy), poza gitem. Oryginał w `public_html/`, kopia w `public_html/app/`. **Nigdy nie wchodzi do `rsync`, nigdy nie nadpisuj** (wykluczenie `--exclude='config.php'` w komendzie deployu).
- **Certyfikat TLS (lekcja z 2026-08-04):** panel DirectAdmin wystawia **jeden** cert Let's Encrypt na domenę. Wystawienie certu „tylko dla subdomeny" **podmienia cert także dla wizfds.com** (incydent: cert `CN=app.wizfds.com` serwowany na wizfds.com → błąd nazwy w przeglądarkach). Przy każdej zmianie certu zaznaczaj **wszystkie nazwy naraz**: `wizfds.com`, `www.wizfds.com`, `app.wizfds.com`. Weryfikacja: `echo | openssl s_client -connect wizfds.com:443 -servername wizfds.com | openssl x509 -noout -ext subjectAltName`.
- **Nie ruszaj legacy**: `public_html/view/`, `public_html/welcome/`, `public_html/v5/`, `/home/dkubera/svn/WizFDS/` oraz `/home/dkubera/svn/wizfds/` (mała litera — prawdziwy stary checkout SVN) są poza zakresem bieżących deployów.

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

### A3. Build produkcyjny

```powershell
npm run wizFds:build-prod-app   # ng build wizfds --configuration production --base-href=/  → dist/wizfds/browser/
```
Uwagi:
- **Zawsze przez skrypty npm** — samo `ng build wizfds` używa konfiguracji domyślnej (`optimization:false`, z source-mapami). Konfiguracja `production` (hashowanie nazw, minifikacja, `environment.prod.ts`) jest w skryptach `*:build-prod*`.
- **`--base-href=/`** — app.wizfds.com serwuje aplikację z korzenia docroota. (Legacy skrypt `wizFds:build-prod` z `--base-href=/view/` zostaje tylko dla zamrożonej instancji wizfds.com — nie używaj go do deployu.)
- Build jest **host-agnostyczny**: frontend woła API relatywnie (na własny origin), więc ten sam `dist/` działa na dowolnym hoście.
- `webSmokeview` i `web-smokeview-lib` **nie są** częścią deployu produkcyjnego (viewer jest wbudowany w `wizfds`). Buduj je tylko do pracy standalone.
- Output esbuildowego buildera `application` ląduje w podkatalogu **`browser/`** — źródłem uploadu jest `dist/<projekt>/browser/`, nie `dist/<projekt>/`.

---

## Część B — Deploy produkcyjny (app.wizfds.com)

> Wykonuj z powłoki WSL (albo prefiksuj każdą komendę `wsl `). Dla czytelności ustaw zmienną z lokalną ścieżką repo:
> ```bash
> REPO=/mnt/c/Users/mateu/Documents/GitHub/WizFDS/wizfds
> ```

**Układ docroota `public_html/app/`:** korzeń = build Angulara (`index.html`, `main-*.js`, `assets/`, `media/`) + pliki serwerowe: symlinki backendu (`index.php`, `db.php`, `login.php`, `login.css`, `lib`, `rest`, `router` → `/home/dkubera/git/WizFDS/wizfds/projects/wizfds/backend/`), kopia `config.php` i `.htaccess`. Nowy plik lub katalog dołączany w korzeniu backendu wymaga **własnego symlinku** — inaczej `require_once` go nie znajdzie. Router FastRoute pełni rolę bramki: żądanie `/` przechodzi przez `index.php` (kontrola sesji — `DirectoryIndex index.php` w `.htaccess`), zalogowanym `getIndex()` serwuje `index.html` z korzenia, niezalogowanych `getFrontPage()` przekierowuje na `/login`.

### B0. Przygotowanie release

1. Zmiany wprowadzaj przez **branch + PR + merge do mastera** — backend na serwerze pulluje z `origin/master`.
2. **Podbij wersję** w `package.json` i `projects/wizfds/src/environments/environment*.ts` (np. `1.0.0-beta.1` → `1.0.0-beta.2`).
3. Zbuduj lokalnie: `npm run wizFds:build-prod-app`.
4. Sanity-check outputu: `ls "$REPO/dist/wizfds/browser/"` — powinny być `index.html` (z `<base href="/">`), `main-*.js`, `styles-*.css`, `assets/`, `media/`.

### B1. Frontend → `public_html/app/`

**Krok 1 — próba na sucho (`--dry-run`).** Pokazuje CO zostanie zmienione/usunięte, bez ruszania serwera:
```bash
rsync -rtvz --delete --dry-run --chmod=D755,F644 \
  --exclude='index.php' --exclude='.htaccess' --exclude='config.php' \
  --exclude='db.php' --exclude='login.php' --exclude='login.css' \
  --exclude='lib' --exclude='rest' --exclude='router' --exclude='cgi-bin' \
  "$REPO/dist/wizfds/browser/" \
  wizfds:/home/dkubera/domains/wizfds.com/public_html/app/
```
Przejrzyj listę: usuwane powinny być tylko **stare hashowane pliki** (`main-<stary-hash>.js` itp.). Jeśli widzisz `deleting index.php`, `config.php`, `rest` itd. — **STOP**, wykluczenia nie zadziałały. W układzie root pliki serwerowe leżą w tym samym katalogu co aplikacja, więc wykluczenia są krytyczne.

**Krok 2 — właściwy upload** (ta sama komenda bez `--dry-run`).

**Krok 3 — weryfikacja:** uruchom smoke testy — muszą przejść w całości (0 błędów):
```bash
bash "$REPO/projects/wizfds/backend/tests/smoke.sh" https://app.wizfds.com
```
Skrypt przechodzi ścieżkę użytkownika po HTTP (logowanie demo, odczyt projektów, kategorii i biblioteki, wylogowanie) i sprawdza asercje bezpieczeństwa: flagi ciasteczka sesji, odrzucenie zapisu bez nagłówka CSRF, brak wycieku danych dla anonima, łagodną odmowę przy złym haśle. Na koniec zaloguj się w przeglądarce na https://app.wizfds.com i przeklikaj aplikację.

Log aplikacji (błędy backendu) jest na serwerze poza docrootem:
```bash
ssh wizfds 'tail -20 /home/dkubera/wizfds-logs/wizfds-$(date +%Y-%m).log'
```

### B2. Backend → `git pull`

```bash
ssh wizfds 'cd /home/dkubera/git/WizFDS && git fetch && git status -sb && git pull --ff-only'
```
Asercje przed pull: gałąź `master`, working tree czysty (`git status -sb` bez zmian). `--ff-only` zapobiega przypadkowym merge-commitom. Po pull symlinki wskazują nowy kod automatycznie.

**Jeśli zmienił się `wizfds/projects/wizfds/backend/.htaccess`** — zregeneruj plik w docroot (jest kopią, nie symlinkiem, bo dokleja serwerowy `AddHandler`):
```bash
ssh wizfds 'BE=/home/dkubera/git/WizFDS/wizfds/projects/wizfds/backend; { echo "AddHandler application/x-httpd-php82 php"; cat "$BE/.htaccess"; } > /home/dkubera/domains/wizfds.com/public_html/app/.htaccess'
```

### B3. Rollback

Frontend — zbuduj dist ze starszego commita i wgraj ponownie (Krok B1):
```bash
git checkout <poprzedni-commit> && npm run wizFds:build-prod-app   # potem rsync jak w B1
```
Backend — cofnij klon do poprzedniego commita (nie dotyka wizfds.com — tamta instancja ma własny klon):
```bash
ssh wizfds 'cd /home/dkubera/git/WizFDS && git reset --hard <poprzedni-commit>'
```

---

## Część C — wizfds.com (legacy, ZAMROŻONE)

> **Nie deployujemy tu niczego.** Instancja zamrożona 2026-08-04 na wersji `0.7.1` (frontend `view/` z 2026-02-16, backend-klon `/home/dkubera/svn/WizFDS/` na `905121f`, landing `welcome/` z 2019). Zostaje jako działająca wersja odniesienia dla użytkowników, dopóki app.wizfds.com nie przejmie ruchu na stałe.

Elementy instancji (do wglądu przy diagnostyce):
- `public_html/view/` — frontend 0.7.1 + bramka `index.php` + snapshoty `v0.6.0`/`v0.7.0`/… (rollbacki starą metodą snapshotową)
- `public_html/welcome/` — landing (build 2019)
- `public_html/{index.php,db.php,login.php,rest,router}` — symlinki do `/home/dkubera/svn/WizFDS/` (git mimo nazwy „svn")
- `public_html/.htaccess`, `public_html/config.php` — ręczne pliki serwerowe

Archiwalna procedura deployu na tę instancję (snapshot → rsync do `view/` z wykluczeniami `index.php`/`.htaccess`/`v[0-9]*` → `git pull` w `svn/WizFDS`) jest w historii gita tego pliku (stan sprzed 2026-08-04).

---

## Migracje bazy

Schemat zmienia się wyłącznie przez ponumerowane pliki SQL w `projects/wizfds/backend/db/migrations/` (konwencja: `backend/db/README.md`). Kolejność przy wdrożeniu: `git pull` w klonie backendu → migracje → smoke testy.

```bash
ssh wizfds
cd /home/dkubera/domains/wizfds.com/public_html/app          # tu leży prawdziwy config.php
BE=/home/dkubera/git/WizFDS/wizfds/projects/wizfds/backend
php $BE/db/migrate.php --dry-run                              # co by weszło
php $BE/db/migrate.php                                        # wykonanie
```

Runner woła `psql` (nie `pg_*`), żeby nie zależeć od tego, które PHP rozwiąże powłoka i jakie ma rozszerzenia. Zastosowane migracje śledzi tabela `schema_migrations`. **Baza jest wspólna dla obu instancji** — dopóki wizfds.com żyje, migracje muszą być wsteczne (dodawanie kolumn/tabel tak, usuwanie i zmiany nazw nie).

---

## Known issues / do weryfikacji

1. **POST bez ciała żądania dostaje 406 od WAF hostingu**, zanim dotrze do PHP — z komunikatem „Połączenie zablokowane". Dotyczy obu instancji i nie ma związku z naszym kodem (aplikacja zawsze wysyła `{}`). Przy diagnostyce `curl`-em zawsze dodawaj `-d '{}'` do POST-ów, inaczej zdiagnozujesz cudzą regułę.
2. **reCAPTCHA na app.wizfds.com** — klucz w `config.php` jest przypisany do domeny wizfds.com; rejestracja nowych kont na subdomenie może odrzucać captchę, dopóki `app.wizfds.com` nie zostanie dopisana w konsoli Google reCAPTCHA. Do tego czasu rejestracja pozostaje na wizfds.com.
3. **Wspólna baza obu instancji** — zmiany w projektach zrobione na app.wizfds.com widzi też wizfds.com (i odwrotnie). Zamierzone; pamiętaj przy testach na żywych danych.
4. **Backend legacy na wizfds.com jest przestarzały** (klon na `905121f`, era Angular 13) względem frontendu `view/` (0.7.1 z mastera 2026-02). Świadomie zamrożone — nie „naprawiać" pullem, bo nowszy backend zmienia zachowanie (`logout`, layout-agnostyczne `getIndex`).
5. **Mylące nazewnictwo `svn/`.** `/home/dkubera/svn/WizFDS/` to git, nie svn (legacy nazwa katalogu). `/home/dkubera/svn/wizfds/` (mała litera) i `public_html/v5/` to prawdziwe, stare SVN — nie ruszać.
6. **Uprawnienia z `/mnt/c`.** Źródło na dysku Windows nie niesie sensownych uprawnień — dlatego `--chmod=D755,F644` w `rsync`. Bez tego pliki wylądują z 0777.
7. **Jeden cert TLS na domenę** — patrz „Certyfikat TLS" w prerekwizytach; przy odnowieniach zawsze wszystkie nazwy naraz.

---

## Ściąga (cheatsheet)

```bash
# --- lokalnie ---
npm ci && npm run wizFds:cm:copy          # po instalacji zależności
npm run wizFds:start                       # dev :4200
npm run wizFds:build-prod-app              # build produkcyjny (base-href=/) → dist/wizfds/browser/

# --- deploy app.wizfds.com (WSL) ---
REPO=/mnt/c/Users/mateu/Documents/GitHub/WizFDS/wizfds
# 1) dry-run  2) upload  (te same flagi, drugi bez --dry-run)
rsync -rtvz --delete --dry-run --chmod=D755,F644 --exclude='index.php' --exclude='.htaccess' --exclude='config.php' --exclude='db.php' --exclude='login.php' --exclude='login.css' --exclude='lib' --exclude='rest' --exclude='router' --exclude='cgi-bin' "$REPO/dist/wizfds/browser/" wizfds:/home/dkubera/domains/wizfds.com/public_html/app/
# 3) backend
ssh wizfds 'cd /home/dkubera/git/WizFDS && git fetch && git status -sb && git pull --ff-only'
# 4) smoke test (musi wyjść 0 błędów)
bash "$REPO/projects/wizfds/backend/tests/smoke.sh" https://app.wizfds.com
```

WinSCP (awaryjnie, zamiast `rsync`): wgraj zawartość `dist/wizfds/browser/` do `public_html/app/`, ręcznie usuwając stare `main-*.js`/`styles-*.css`, i **nie kasując** `index.php`, `.htaccess`, `config.php`, `db.php`, `login.php`, `login.css`, `lib`, `rest`, `router`.
