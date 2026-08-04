# ADR-0014: Backend zostaje na FastRoute i `pg_*`, bez frameworka i bez Composera

- **Data:** 2026-08-04
- **Status:** zaakceptowana
- **Dotyczy:** `projects/wizfds/backend/`

## Kontekst

Backend to ~750 linii proceduralnego PHP: `index.php` z FastRoute, cztery pliki handlerów w `rest/`, klasa `Database` na funkcjach `pg_*` i `config.php` z sekretami poza gitem. Nie ma Composera — katalog `router/vendor/` jest wgrany do repozytorium w całości.

Przy rewizji z 2026-08-04 wracało pytanie, czy nie przepisać tego na Slim/Laravel z PDO. Argumenty za są realne: nazwane parametry zamiast pozycyjnych tablic asocjacyjnych (dziś liczy się kolejność kluczy i cicha pomyłka przy edycji zapytania jest łatwa), wyjątki z `PDO::ERRMODE_EXCEPTION` zamiast ręcznego sprawdzania `false`, gotowy warstwowy middleware, testowalność.

Rozstrzygające są jednak warunki, w jakich to działa:

- **Serwer nie ma node ani Composera.** Hosting współdzielony u cyber-folks przyjmuje pliki, nie procesy budowania. Każda zależność musiałaby być wgrywana ręcznie razem z drzewem `vendor/`.
- **Powierzchnia API to 19 tras.** Cztery zasoby (projekty, scenariusze, kategorie, biblioteka) plus ustawienia i sesja. To nie jest rozmiar, przy którym framework zaczyna się zwracać.
- **Backend zmienia się rzadko.** Między 2022 a 2026 rokiem jedyną zmianą w katalogu `backend/` była poprawka `.htaccess`. Frontend przeszedł w tym czasie z Angulara 13 na 20.

## Decyzja

**Backend zostaje na FastRoute i `pg_*`. Nie wprowadzamy frameworka ani Composera.** Poprawiamy to, co realnie boli, w miejscu:

1. Bezpieczeństwo i poprawność mają pierwszeństwo przed strukturą — sesje, CSRF, walidacja ścieżek, uczciwe wyjątki i logi (ADR-0013, tura 1 rewizji).
2. Wspólne mechanizmy trafiają do `lib/` (sesja, log) i `rest/utils.php` (ścieżki, wspólne zakończenie handlera przy błędzie), zamiast być kopiowane po plikach.
3. Zapytania pozostają parametryzowane przez `pg_query_params`. Migracja na PDO jest dopuszczalna później, per plik, jeśli pojawi się powód mocniejszy niż estetyka.
4. Schemat bazy przestaje istnieć wyłącznie na serwerze — zmiany idą przez ponumerowane pliki SQL w repozytorium.

## Konsekwencje

**Pozytywne**
- Wdrożenie backendu to nadal `git pull` w klonie, na który celują symlinki — bez kroku budowania, którego serwer nie umie wykonać.
- Zmiany bezpieczeństwa dało się dowieźć w jednej turze, bo nie konkurowały o uwagę z migracją frameworka.
- Nie ma drzewa zależności, które trzeba by śledzić pod kątem podatności na hostingu bez narzędzi.

**Negatywne / do obsłużenia**
- Tablice asocjacyjne przekazywane do `pg_query_params` wiążą się pozycyjnie — kolejność kluczy musi zgadzać się z `$1..$n`. To zostaje jako pułapka; chroni przed nią wyłącznie czujność przy edycji zapytań.
- Testy jednostkowe pozostają poza zasięgiem, dopóki handlery same wypisują JSON i czytają `$_SESSION`. Siatką bezpieczeństwa jest `backend/tests/smoke.sh` po HTTP, nie PHPUnit.
- Brak Composera oznacza, że każda przyszła biblioteka wymaga świadomej decyzji i ręcznego wgrania — co jest zamierzonym tarciem, ale tarciem.

## Rozważone alternatywy

- **Slim/Laravel + PDO.** Odrzucone: koszt migracji nieproporcjonalny do 19 tras i do tempa zmian w tym katalogu, a serwer nie ma czym zainstalować zależności.
- **Sam PDO, bez frameworka.** Kuszące i tańsze, ale to przepisanie wszystkich ~30 zapytań naraz — czyli maksimum powierzchni na regresję w turze, której celem było domknięcie dziur bezpieczeństwa. Zostawione jako możliwa późniejsza zmiana, wykonywana plik po pliku.

  **Aktualizacja 2026-08-04:** `pdo_pgsql` zostało włączone na hostingu, więc przeszkoda techniczna zniknęła — decyzja jednak nie. Migracja nadal nie rozwiązuje żadnego dzisiejszego problemu (zapytania są parametryzowane, błędy rzucają wyjątki, połączenie jest jedno na żądanie), a kosztuje przepisanie całej warstwy dostępu do danych. Jeśli kiedyś do niej wrócimy, sensowna kolejność to: najpierw wyodrębnić zapytania z handlerów (to one blokują testy jednostkowe), a dopiero potem podmienić sterownik — nie odwrotnie. **Nie migrujemy pojedynczych zapytań mimochodem**: mieszanka `pg_*` i PDO w jednej klasie `Database` oznaczałaby dwa zestawy reguł obsługi błędów i dwa sposoby wiązania parametrów.
