# ADR-0013: Sesje PHP zostają mechanizmem uwierzytelnienia; CSRF pilnuje nagłówek, nie token

- **Data:** 2026-08-04
- **Status:** zaakceptowana
- **Dotyczy:** `projects/wizfds/backend/lib/session.php`, `projects/wizfds/backend/index.php`, `projects/wizfds/src/app/services/http-manager`

## Kontekst

Backend uwierzytelnia ciasteczkiem sesyjnym PHP (`wizfds`) od 2019 roku. Rewizja bezpieczeństwa z 2026-08-04 wykazała, że sam mechanizm nie był skonfigurowany: ciasteczko wychodziło bez `HttpOnly` i bez `SameSite`, `session.use_strict_mode` był wyłączony (podrzucony identyfikator sesji stawał się ważny po zalogowaniu ofiary), a żadna operacja zmieniająca stan nie miała ochrony przed żądaniem z obcej witryny. Ustawienia pochodziły z `php.ini` współdzielonego hostingu — czyli spoza naszej kontroli i bez śladu w repozytorium.

Alternatywą rozważaną wprost było przejście na tokeny (JWT/Bearer): rozdzieliłoby API od sesji przeglądarkowej i ułatwiło późniejsze wystawienie API dla wtyczki CAD. Kosztem jest przepisanie logowania, przechowywanie tokenu w kliencie i mechanizm odświeżania — przy czym żadna z dzisiejszych dziur nie wynikała z wyboru sesji, tylko z ich konfiguracji.

Istotne jest też, że aplikacja i API stoją pod **jednym originem** (`app.wizfds.com`), odkąd frontend woła API ścieżkami relatywnymi. Nie ma ruchu cross-origin, który token miałby obsłużyć.

## Decyzja

**Zostajemy przy sesjach PHP. Konfigurujemy je w kodzie, nie w `php.ini`. CSRF zamykamy wymaganiem własnego nagłówka, nie tokenem w sesji.**

1. Każde wejście do aplikacji (router, formularz logowania, bramka `/view/`) startuje sesję przez `wizfds_session_start()` z `lib/session.php`. Flagi ciasteczka (`HttpOnly`, `Secure`, `SameSite=Lax`) i `use_strict_mode=1` są ustawiane tam i tylko tam.
2. Wylogowanie i formularz rejestracji przechodzą przez `wizfds_session_reset()`, który dodatkowo wygasza stare ciasteczko.
3. `POST`/`PUT`/`DELETE` pod `/api/*` wymagają nagłówka `X-Requested-With`. Przeglądarka nie dołoży własnego nagłówka do żądania z obcej witryny bez preflightu CORS, a tego serwer nigdy nie zatwierdza — nagłówki `Access-Control-Allow-Origin: *` zostały usunięte. Formularz logowania wysyła POST poza `/api` i działa bez zmian.
4. Nagłówek dokłada jeden interceptor Angulara, wspólny dla wszystkich wywołań.

## Konsekwencje

**Pozytywne**
- Konfiguracja bezpieczeństwa sesji jest w repozytorium i podlega przeglądowi kodu; migracja hostingu jej nie zabierze.
- Zero zmian w kliencie poza jednym interceptorem — nie ma stanu tokenu do przechowywania, odświeżania ani unieważniania.
- Ochrona CSRF nie ma terminu ważności, więc długa sesja edycji scenariusza nie wygasa w połowie zapisu (token w sesji miałby ten problem).

**Negatywne / do obsłużenia**
- Klient inny niż przeglądarkowy (np. gdyby wtyczka CAD kiedyś wołała REST zamiast WebSocketu) musi sam dołożyć nagłówek. Dziś takiego klienta nie ma.
- Sesje nie są współdzielone między `wizfds.com` a `app.wizfds.com` — ciasteczko jest host-only. To zamierzone przy dwóch instancjach na jednej bazie, ale oznacza osobne logowanie.
- `SameSite=Lax` przepuszcza nawigacje GET z obcych witryn; wszystko, co zmienia stan, jest za nagłówkiem, ale każdy nowy endpoint GET zmieniający stan złamałby to założenie.

## Rozważone alternatywy

- **Tokeny JWT/Bearer.** Odrzucone: nie usuwają żadnej ze znalezionych dziur, a wymagają przepisania logowania i obsługi cyklu życia tokenu w kliencie. Przy jednym originie nie kupują nic poza teoretyczną gotowością na przyszłe API.
- **Klasyczny token CSRF w sesji.** Najmocniejsza opcja, niezależna od zachowań przeglądarek. Odrzucona ze względu na koszt: token trzeba wstrzyknąć do `index.html`, odesłać przy każdym zapisie i obsłużyć jego wygaśnięcie przy sesjach trwających godzinami.
- **Poleganie na samym `SameSite`.** Najtańsze, ale zostawia obronę zależną wyłącznie od domyślnego zachowania przeglądarki i rozsypuje się, gdyby CORS kiedykolwiek został poluzowany.
