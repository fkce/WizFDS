# Parsowanie binariów FDS w przeglądarce

Pliki wynikowe FDS (`.sf`, `.bf`, `.prt5`, `.s3d`, `.iso`) czyta klient —
TypeScript/`DataView` według formatów z `read*.c` SmokeView — a źródłem danych
są surowe bajty: w `webSmokeview` serwowane przez backend, w aplikacji `wizfds`
czytane z lokalnego katalogu wyników wskazanego przez użytkownika (File System
Access API). Katalogiem plików wynikowych jest `.smv`, czytany w kliencie (#115).

Alternatywą była konwersja po stronie serwera — jak dzisiejsze
`smokeview -runhtmlscript` dla obstów — odrzucona, bo wymaga binarki SMV albo
własnego konwertera na serwerze, nie działa dla plików lokalnych i mnoży
formaty pośrednie (a eksport HTML SmokeView gubi metry, zob. ADR-0002).

Konsekwencje: przeglądarka musi rozumieć rekordy Fortran unformatted
(markery długości wokół każdego rekordu) i radzić sobie z dużymi plikami —
strumieniowanie i ewentualne przetwarzanie na WebGPU są po naszej stronie.
Wzorce formatów: `docs/reference/fds-smv-structure.md` (sekcja ②). Pomocniczo —
nie jako wytyczna — czytniki JS z https://github.com/ProfRino/fds-viewer.
