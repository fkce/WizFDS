-- Klucze wskazujące na użytkownika i projekt były `smallint` (maks. 32767),
-- podczas gdy `projects.id` i `users.id` to sekwencje `integer`. Przy 3902
-- projektach było jeszcze daleko do granicy, ale wstawienie scenariusza do
-- projektu o id > 32767 kończyłoby się błędem — i to bez żadnego ostrzeżenia
-- wcześniej.
--
-- Tu małe tabele; `scenarios` (1,3 GB) osobno w migracji 003, żeby ewentualne
-- niepowodzenie przepisania dużej tabeli nie wycofało również tych zmian.

alter table projects   alter column user_id type integer;
alter table categories alter column user_id type integer;
alter table library    alter column user_id type integer;
