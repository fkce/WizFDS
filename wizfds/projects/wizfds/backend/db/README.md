# Migracje schematu bazy

Schemat PostgreSQL WizFDS zmienia się **wyłącznie** przez pliki w `migrations/`. Nie wprowadzamy zmian ręcznie na serwerze — inaczej schemat istnieje tylko w głowie bazy produkcyjnej i nikt (łącznie z agentem w kolejnej sesji) nie wie, jak wygląda.

## Konwencja

- Nazwa pliku: `NNN-krotki-opis.sql`, numer kolejny z zerami (`001-`, `002-`, …). Kolejność wykonania to kolejność nazw.
- Jeden plik = jedna spójna zmiana. Migracja biegnie w transakcji, więc albo wejdzie w całości, albo wcale.
- **Pliku, który gdziekolwiek już się wykonał, nie edytujemy** — dopisujemy kolejny. Runner śledzi zastosowane migracje w tabeli `schema_migrations`.
- Migracja powinna dać się wykonać na bazie z danymi: nowe kolumny z wartością domyślną albo `null`, indeksy tworzone bez blokowania zapisów, jeśli tabela jest duża.

## Uruchamianie

Runner jest skryptem CLI i czyta poświadczenia z `config.php` **z katalogu roboczego**, dlatego uruchamia się go z docroota (tam leży prawdziwy `config.php`, a nie szablon z repozytorium):

```bash
ssh wizfds
cd /home/dkubera/domains/wizfds.com/public_html/app

# co by się wykonało
php /home/dkubera/git/WizFDS/wizfds/projects/wizfds/backend/db/migrate.php --dry-run

# wykonanie
php /home/dkubera/git/WizFDS/wizfds/projects/wizfds/backend/db/migrate.php
```

Kolejność przy wdrożeniu: `git pull` w klonie backendu → migracje → smoke testy (`backend/tests/smoke.sh`).

## Czego nie robić

**Nie podpinaj `db/` symlinkiem do docroota.** Reszta backendu (`rest/`, `router/`, `lib/`) jest tam widoczna przez symlinki, bo router musi ją dołączać. `db/` nie jest dołączane przez nic — a przez symlink pliki `migrations/*.sql` stałyby się publicznie czytelne (reguła `.htaccess` blokuje tylko `*.json` w korzeniu). Runner uruchamiasz ścieżką do klonu, nie przez docroot.

## Uwaga o dwóch instancjach

`wizfds.com` (zamrożona) i `app.wizfds.com` korzystają z **tej samej bazy**. Migracja dotyka więc obu — zmiana musi być wsteczna, dopóki stara instancja działa: dodawanie kolumn i tabel jest bezpieczne, usuwanie i zmiana nazw nie.
