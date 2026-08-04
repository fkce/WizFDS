# ADR-0015: Limit prób logowania z rosnącym opóźnieniem, reset hasła linkiem jednorazowym

- **Data:** 2026-08-04
- **Status:** zaakceptowana
- **Dotyczy:** `projects/wizfds/backend/lib/auth.php`, `projects/wizfds/backend/login.php`, migracje `005`–`006`
- **Rozszerza:** [ADR-0013](0013-sesje-php-jako-mechanizm-uwierzytelnienia.md)

## Kontekst

Rewizja z 2026-08-04 zastała logowanie bez żadnego ogranicznika: hasło można było zgadywać bez końca i bez śladu. Nie było też resetu hasła — użytkownik pisał maila do autora, który zmieniał hasło ręcznie. Przy okazji wyszło, że konta sprzed wprowadzenia soli (trzy, uśpione od 2018–2019) przechodziły ścieżką „przelicz hash na nowo z tego, co wpisano, a potem zweryfikuj" — czyli **wpuszczały na dowolne hasło**.

Ograniczenia, w których projektujemy: hosting współdzielony bez Redisa i bez crona pod naszą kontrolą, jedna baza PostgreSQL wspólna dla instancji produkcyjnej i zamrożonej, poczta wychodząca przez `mail()`.

## Decyzja

**Budżet zgadywania w oknie przesuwnym, z rosnącym opóźnieniem przed twardą odmową. Reset hasła linkiem jednorazowym, którego nie przechowujemy.**

1. Pięć nieudanych prób na adres albo trzydzieści na host w oknie 15 minut → odmowa wydana **przed** sprawdzeniem hasła. Każda wcześniejsza porażka opóźnia kolejną próbę o sekundę (do pięciu), więc dozwolone pięć prób nie jest pięcioma natychmiastowymi.
2. Licznik żyje w tabeli `auth_attempts` — to okno, nie księga. Trwałym śladem zdarzeń uwierzytelnienia jest log aplikacji. Tabela czyszczona jest oportunistycznie przy zapisie (1 na 50 żądań), bo nie mamy własnego crona.
3. Udane logowanie zeruje budżet adresu. Budżet hosta zostaje — celowo, bo to on ogranicza rozsiew po wielu kontach.
4. Reset: link ważny 60 minut, jednorazowy, unieważniający poprzedni. W bazie leży wyłącznie `sha256` tokenu. Formularz odpowiada identycznie niezależnie od tego, czy adres istnieje. Najwyżej trzy zgłoszenia na adres na godzinę.
5. Reset unieważnia sesje wydane wcześniej (`users.sessions_valid_from` kontra `$_SESSION['issued_at']`) — inaczej przejęta sesja przeżywa zmianę hasła, czyli dokładnie to, przed czym reset ma chronić.
6. Hasło: minimum 10 znaków i nie może być adresem konta. Bez wymuszania znaków specjalnych.
7. Ścieżka „przelicz hash na nowo" znika. Konta bez soli mają wyczyszczone hasło (odmowa w obu instancjach) i odzyskują dostęp linkiem resetującym.

## Konsekwencje

**Pozytywne**
- Zgadywanie hasła przestaje być darmowe i zostawia ślad; atak na jedno konto kosztuje 15 minut za każde pięć prób.
- Reset działa bez udziału człowieka, a wyciek kopii bazy nie daje przejęcia konta — tokenów tam nie ma.
- Zamknięte obejście „dowolne hasło" dla kont sprzed soli, również na zamrożonej instancji (poprawka po stronie danych, bo jej kod jest zamrożony).

**Negatywne / do obsłużenia**
- **Blokada jest bronią obosieczną**: znając cudzy adres, można pięcioma błędnymi próbami odciąć go od logowania na 15 minut. Świadomie wybrane — alternatywą jest nieograniczone zgadywanie. Gdyby okazało się uciążliwe, kolejnym krokiem jest captcha po serii prób zamiast twardej odmowy.
- Limit per host uderza w użytkowników za wspólnym NAT-em: trzydzieści porażek z jednego adresu IP blokuje wszystkich za nim na 15 minut.
- Logowanie nadal trwa mierzalnie dłużej dla adresu, który istnieje (brak atrapy weryfikacji), a rejestracja wprost mówi „already exists" — enumeracja kont jest zawężona, nie zamknięta.
- Token wędruje w URL-u, więc trafia do logów serwera i historii przeglądarki. Akceptowalne przy jednorazowości i godzinnej ważności.
- Czyszczenie okna zależy od ruchu; przy zerowym ruchu wiersze zostają do następnego żądania.

## Rozważone alternatywy

- **Blokada konta po N próbach do czasu interwencji.** Odrzucone: zamienia atak na hasło w atak na dostępność, a nie mamy panelu do odblokowywania.
- **Captcha zamiast opóźnienia.** Rozsądne i mniej uciążliwe, ale wymaga wpięcia reCAPTCHA w formularz logowania — a ten klucz jest dziś przypisany do jednej domeny i sam wymaga naprawy.
- **Wysyłka resetu przez zewnętrznego dostawcę (SMTP/API).** Lepsza dostarczalność niż `mail()`, ale to nowa zależność i nowy sekret do trzymania; do rozważenia, jeśli maile zaczną lądować w spamie.
