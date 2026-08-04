-- Każde zapytanie backendu filtruje po user_id (a scenariusze dodatkowo po
-- project_id), a jedynymi indeksami w bazie były klucze główne. Tabela
-- `scenarios` waży 1,3 GB przy 15 tys. wierszy, bo trzyma pełny JSON scenariusza
-- i plik FDS w wierszu — bez indeksu każde otwarcie listy projektów czytało ją
-- w całości sekwencyjnie.
--
-- Tabele są małe pod względem liczby wierszy, więc budowa indeksów trwa sekundy.

create index if not exists projects_user_id_idx    on projects   (user_id);
create index if not exists scenarios_project_id_idx on scenarios (project_id);
create index if not exists scenarios_user_id_idx   on scenarios  (user_id);
create index if not exists categories_user_id_idx  on categories (user_id);
create index if not exists library_user_id_idx     on library    (user_id);
