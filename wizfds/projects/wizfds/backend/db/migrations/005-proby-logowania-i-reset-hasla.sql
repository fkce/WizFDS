-- Dwie tabele pod turę 3 (konta).
--
-- `auth_attempts` służy wyłącznie limitowaniu tempa — trzyma nieudane próby z
-- ostatnich kilkunastu minut i jest czyszczona w tle. Trwałym śladem zdarzeń
-- uwierzytelnienia jest log aplikacji (`wizfds-logs/`), nie ta tabela.
--
-- `password_resets` trzyma wyłącznie skrót tokenu. Token wychodzi mailem i nie
-- istnieje nigdzie po naszej stronie — wyciek bazy nie pozwala przejąć konta.

create table if not exists auth_attempts (
	id         bigserial primary key,
	kind       text not null,          -- 'login' albo 'reset'
	identifier text not null,          -- adres e-mail, zawsze małymi literami
	ip         text,
	successful boolean not null default false,
	created    timestamptz not null default current_timestamp
);

create index if not exists auth_attempts_identifier_idx on auth_attempts (kind, identifier, created);
create index if not exists auth_attempts_ip_idx         on auth_attempts (kind, ip, created);
create index if not exists auth_attempts_created_idx    on auth_attempts (created);

create table if not exists password_resets (
	id         bigserial primary key,
	user_id    integer not null,
	token_hash text not null,
	created    timestamptz not null default current_timestamp,
	expires_at timestamptz not null,
	used_at    timestamptz
);

create unique index if not exists password_resets_token_idx on password_resets (token_hash);
create index if not exists password_resets_user_idx on password_resets (user_id, used_at);
