-- Reset hasła ustawiał `users.session_id = ''`, co nie unieważniało niczego:
-- kolumna jest tylko zapisywana (gdy pusta), nigdy porównywana, a autoryzacja
-- opiera się wyłącznie na `$_SESSION['user_id']`. Sesja przejęta przed resetem
-- działała po nim dalej — czyli dokładnie w scenariuszu, w którym reset hasła
-- ma pomóc.
--
-- Znacznik czasu jest porównywany z momentem wydania sesji: wszystko, co wydano
-- wcześniej, przestaje być ważne przy najbliższym żądaniu.

alter table users add column if not exists sessions_valid_from timestamptz;
