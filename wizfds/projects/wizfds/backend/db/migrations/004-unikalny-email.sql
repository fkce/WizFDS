-- Rejestracja sprawdzała duplikat adresu tylko w PHP (`select ... where email=$1`
-- przed `insert`), więc dwa równoległe zgłoszenia mogły założyć dwa konta na ten
-- sam adres — a sprawdzenie było dodatkowo czułe na wielkość liter, przez co
-- `Harris.Fan@arup.com` i `harris.fan@arup.com` żyły obok siebie jako osobne
-- konta (to pierwsze, puste, usunięto 2026-08-04 wraz z tą serią migracji).
--
-- Indeks po `lower(email)` domyka jedno i drugie: baza pilnuje unikalności
-- niezależnie od wielkości liter i niezależnie od wyścigu w kodzie.
--
-- Uwaga: samo logowanie nadal porównuje adres dokładnie (`where email=$1`), więc
-- kto zarejestrował się z wielkimi literami, musi je wpisywać. Ujednolicenie
-- logowania należy do tury 3 (konta).

create unique index if not exists users_email_lower_uniq on users (lower(email));
