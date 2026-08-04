#!/usr/bin/env bash
# WizFDS backend smoke tests — exercises a deployed instance over HTTP.
#
#   ./smoke.sh https://app.wizfds.com
#   RESOLVE=app.wizfds.com:443:195.78.67.34 ./smoke.sh https://app.wizfds.com
#
# The authenticated half signs in through the demo account (?demo=true), so the
# script needs no credentials and writes nothing durable — the demo user's writes
# are discarded server-side.
#
# Run it before and after every backend deploy. Exit code is non-zero if any
# assertion fails.

set -u

BASE="${1:-https://app.wizfds.com}"
RESOLVE="${RESOLVE:-}"
JAR="$(mktemp)"
trap 'rm -f "$JAR"' EXIT

CURL=(curl -s --max-time 30)
[ -n "$RESOLVE" ] && CURL+=(--resolve "$RESOLVE")

PASS=0
FAIL=0

ok()   { PASS=$((PASS + 1)); printf '  \033[32mok\033[0m   %s\n' "$1"; }
bad()  { FAIL=$((FAIL + 1)); printf '  \033[31mFAIL\033[0m %s\n' "$1"; [ -n "${2:-}" ] && printf '       %s\n' "$2"; }
head1() { printf '\n\033[1m%s\033[0m\n' "$1"; }

# assert_status <description> <expected-code> <curl args...>
assert_status() {
  local desc="$1" want="$2"; shift 2
  local got
  got=$("${CURL[@]}" -o /dev/null -w '%{http_code}' "$@")
  if [ "$got" = "$want" ]; then ok "$desc"; else bad "$desc" "oczekiwano $want, otrzymano $got"; fi
}

# assert_body_contains <description> <needle> <curl args...>
assert_body_contains() {
  local desc="$1" needle="$2"; shift 2
  local body
  body=$("${CURL[@]}" "$@")
  if printf '%s' "$body" | grep -qF -- "$needle"; then ok "$desc"; else bad "$desc" "brak '$needle' w odpowiedzi"; fi
}

# assert_body_lacks <description> <needle> <curl args...>
assert_body_lacks() {
  local desc="$1" needle="$2"; shift 2
  local body
  body=$("${CURL[@]}" "$@")
  if printf '%s' "$body" | grep -qF -- "$needle"; then bad "$desc" "znaleziono '$needle' w odpowiedzi"; else ok "$desc"; fi
}

printf '\033[1mWizFDS backend smoke — %s\033[0m\n' "$BASE"

head1 'Anonim (bez sesji)'

assert_status 'GET / przekierowuje na logowanie' 302 "$BASE/"
assert_body_contains 'GET /login pokazuje formularz' "name='email'" "$BASE/login"
assert_status 'GET /results.json jest odrzucone' 403 "$BASE/results.json"
assert_body_lacks 'GET /config.php nie wypisuje sekretow' 'dbPass' "$BASE/config.php"
assert_body_lacks 'GET /api/projects bez sesji nie wydaje danych' '"from":"getProjects()"' "$BASE/api/projects"
assert_body_lacks 'GET /api/settings bez sesji nie wydaje danych' '"from":"getSettings()"' "$BASE/api/settings"

# Logowanie zlym haslem musi wrocic formularzem z komunikatem, a nie 500 -
# check() siega po polaczenie z baza i to wlasnie tam pekalo.
assert_body_contains 'POST /login ze zlym haslem odrzuca lagodnie' 'Invalid e-mail or password' \
  -X POST -d 'check=Login&email=nobody@example.com&password=wrong-on-purpose' "$BASE/login"

head1 'Ciasteczko sesji'

COOKIE_HEADERS=$("${CURL[@]}" -D - -o /dev/null -c "$JAR" "$BASE/login?demo=true")
SET_COOKIE=$(printf '%s' "$COOKIE_HEADERS" | grep -i '^set-cookie:' | head -1)

if [ -n "$SET_COOKIE" ]; then ok 'logowanie demo ustawia sesje'; else bad 'logowanie demo ustawia sesje' 'brak naglowka Set-Cookie'; fi

for flag in HttpOnly Secure SameSite; do
  if printf '%s' "$SET_COOKIE" | grep -qi "$flag"; then
    ok "ciasteczko ma $flag"
  else
    bad "ciasteczko ma $flag" "Set-Cookie: ${SET_COOKIE:-brak}"
  fi
done

head1 'Sesja demo'

assert_body_contains 'GET /api/settings zwraca ustawienia' '"from":"getSettings()"' -b "$JAR" "$BASE/api/settings"
assert_body_contains 'GET /api/projects zwraca liste projektow' '"from":"getProjects()"' -b "$JAR" "$BASE/api/projects"
assert_body_contains 'GET /api/categories zwraca kategorie' '"from":"getCategories()"' -b "$JAR" "$BASE/api/categories"
assert_body_contains 'GET /api/library zwraca biblioteke' '"from":"getLibrary()"' -b "$JAR" "$BASE/api/library"
assert_status 'GET /results.json po odczycie projektow nadal odrzucone' 403 "$BASE/results.json"

head1 'CSRF'

assert_status 'PUT /api/settings bez naglowka jest odrzucony' 403 \
  -b "$JAR" -X PUT -H 'Content-Type: application/json' -d '{}' "$BASE/api/settings/5"
CSRF_CODE=$("${CURL[@]}" -o /dev/null -w '%{http_code}' -b "$JAR" -X PUT \
  -H 'Content-Type: application/json' -H 'X-Requested-With: XMLHttpRequest' \
  -d '{}' "$BASE/api/settings/5")
if [ "$CSRF_CODE" != "403" ]; then ok 'PUT /api/settings z naglowkiem przechodzi'; else bad 'PUT /api/settings z naglowkiem przechodzi' 'odrzucone mimo naglowka'; fi

head1 'Tryb demo'

# Konto demo nie zapisuje - ma o tym powiedziec wprost, a nie udawac awarii serwera.
assert_body_contains 'zapis w trybie demo melduje sie jako demo' 'Demo mode' \
  -b "$JAR" -X PUT -H 'Content-Type: application/json' -H 'X-Requested-With: XMLHttpRequest' \
  -d '{}' "$BASE/api/settings/5"

head1 'Zasoby aplikacji'

assert_status 'index.html jest serwowany zalogowanemu' 200 -b "$JAR" "$BASE/"
assert_status 'shader .wgsl jest dostepny' 200 "$BASE/assets/shaders/fire.vertex.wgsl"

head1 'Wylogowanie'

assert_status 'GET /logout przekierowuje' 302 -b "$JAR" -c "$JAR" "$BASE/logout"
assert_body_lacks 'po wylogowaniu API nie wydaje danych' '"from":"getProjects()"' -b "$JAR" "$BASE/api/projects"

printf '\n\033[1mWynik:\033[0m %d ok, %d bledow\n' "$PASS" "$FAIL"
[ "$FAIL" -eq 0 ]
