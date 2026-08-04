-- Ciąg dalszy 002, dla tabeli `scenarios`.
--
-- Zmiana typu z `smallint` na `integer` wymusza przepisanie tabeli pod blokadą
-- ACCESS EXCLUSIVE — na czas migracji aplikacja nie odczyta ani nie zapisze
-- scenariuszy. Tabela ma 15 tys. wierszy, ale 1,3 GB, bo trzyma JSON scenariusza
-- i plik FDS poza wierszem (TOAST), więc przepisanie potrzebuje porównywalnej
-- ilości wolnego miejsca na serwerze bazy. Uruchamiać w oknie serwisowym.
--
-- Indeksy z migracji 001 odbudują się automatycznie razem z tabelą.

alter table scenarios alter column user_id    type integer;
alter table scenarios alter column project_id type integer;
