-- Schemat zastany, spisany z produkcji 2026-08-04 (wcześniej istniał wyłącznie
-- w bazie — repozytorium nie miało żadnego zapisu struktury).
--
-- Wszystko przez `if not exists`, więc na istniejącej bazie ta migracja jest
-- operacją pustą; na czystej bazie stawia komplet tabel. Numer 000, żeby biegła
-- przed 001.
--
-- UWAGA — dwie rzeczy zastane, świadomie tu odwzorowane, nie naprawione:
--   * `user_id` i `scenarios.project_id` są `smallint` (max 32767), podczas gdy
--     `projects.id` to sekwencja stojąca już na ~3900. Poszerzenie kolumn
--     przepisuje tabelę `scenarios` (1,3 GB) pod wyłączną blokadą, więc należy
--     do osobnego okna serwisowego.
--   * brak kluczy obcych i brak unikalności `users.email` (w danych jest jedna
--     para duplikatów, więc unikalny indeks nie przejdzie bez wcześniejszego
--     sprzątnięcia).

create table if not exists users (
	id             serial primary key,
	email          text,
	password       text,
	username       text,
	editor         text,
	websocket_host text,
	websocket_port text,
	session_id     text,
	access_time    timestamp,
	access_ip      text,
	created        timestamp default current_timestamp,
	tooltips       boolean default true,
	salt           text
);

create table if not exists projects (
	id          serial primary key,
	user_id     smallint,
	name        text,
	description text,
	category_id text,
	modified    timestamp default current_timestamp
);

create table if not exists scenarios (
	id         serial primary key,
	user_id    smallint,
	project_id smallint,
	name       text,
	fds_file   text,
	fds_object text,
	ui_state   text,
	ac_file    text,
	ac_hash    text,
	modified   timestamp default current_timestamp
);

create table if not exists categories (
	id       serial primary key,
	user_id  smallint,
	label    text,
	uuid     text,
	active   boolean,
	visible  boolean,
	modified timestamp default current_timestamp
);

create table if not exists library (
	id      serial primary key,
	user_id smallint,
	json    text
);
