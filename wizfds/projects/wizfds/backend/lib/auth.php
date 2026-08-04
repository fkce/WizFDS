<?php
# Account plumbing: password hashing, how hard guessing is allowed to be, and
# password-reset tokens. Paths are docroot-relative so config.php is the real
# file with the credentials, not the template in the repository.
require_once('./config.php');
require_once('./lib/logger.php');

# Long enough to be worth typing, no composition rules - NIST SP 800-63B has
# argued for years that forced symbols buy nothing and cost memorability.
define('WIZFDS_MIN_PASSWORD_LENGTH', 10);

# Guessing budget, counted over a sliding window. The per-address limit is what
# stops an attacker working through one account; the per-address limit alone
# would let a botnet spray many accounts from one host, hence the wider IP one.
define('WIZFDS_ATTEMPT_WINDOW_MINUTES', 15);
define('WIZFDS_MAX_FAILURES_PER_EMAIL', 5);
define('WIZFDS_MAX_FAILURES_PER_IP', 30);
define('WIZFDS_THROTTLE_STEP_SECONDS', 1);

define('WIZFDS_RESET_TTL_MINUTES', 60);
define('WIZFDS_MAX_RESETS_PER_EMAIL', 3);

function wizfds_client_ip() {
	return isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '';
}

# --- Hasła -------------------------------------------------------------------

# The scheme predates this file and is kept exactly: an application secret held
# outside the database (per address, in the user's directory) is concatenated
# with the password and the user's own salt, folded through sha512 into 64 raw
# bytes - which also keeps the input under bcrypt's 72-byte cutoff - and hashed
# with bcrypt.
#
# $email must be the address AS STORED, because it selects the secret's file.
function wizfds_password_material($config, $email, $password, $salt) {
	$stringToHash = $config->getAppSecret($email) . $password . $salt;
	$intermediate = hash('sha512', $stringToHash);

	$base256 = '';
	$len = strlen($intermediate);
	for ($i = 0; $i < $len; $i += 2) {
		$base256 .= chr(hexdec(substr($intermediate, $i, 2)));
	}

	return $base256;
}

function wizfds_password_verify($config, $email, $password, $salt, $storedHash) {
	return password_verify(wizfds_password_material($config, $email, $password, $salt), $storedHash);
}

function wizfds_password_make($config, $email, $password, $salt) {
	return password_hash(wizfds_password_material($config, $email, $password, $salt), PASSWORD_BCRYPT);
}

function wizfds_new_salt() {
	return base64_encode(random_bytes(2048));
}

# Returns a message to show the user, or null when the password is acceptable.
function wizfds_password_problem($password, $email = '') {
	if (strlen($password) < WIZFDS_MIN_PASSWORD_LENGTH) {
		return 'Password must be at least ' . WIZFDS_MIN_PASSWORD_LENGTH . ' characters long.';
	}
	if ($email !== '' && strcasecmp(trim($password), trim($email)) === 0) {
		return 'Password must not be your e-mail address.';
	}
	return null;
}

# --- Limit tempa -------------------------------------------------------------

function wizfds_record_attempt($db, $kind, $identifier, $successful) {
	$db->pg_create(
		"insert into auth_attempts (kind, identifier, ip, successful) values ($1, $2, $3, $4) returning id",
		array($kind, strtolower(trim($identifier)), wizfds_client_ip(), $successful ? 't' : 'f')
	);

	# The table is a rate-limiting window, not a ledger - the audit trail lives in
	# the application log. Trim it here so nothing has to be scheduled.
	if (random_int(1, 50) === 1) {
		$db->pg_change("delete from auth_attempts where created < current_timestamp - interval '1 day'");
	}
}

function wizfds_failures_for_email($db, $email) {
	$result = $db->pg_read(
		"select count(*) as n from auth_attempts
		  where kind = 'login' and successful = false and identifier = $1
		    and created > current_timestamp - ($2 || ' minutes')::interval",
		array(strtolower(trim($email)), WIZFDS_ATTEMPT_WINDOW_MINUTES)
	);

	return empty($result) ? 0 : (int) $result[0]['n'];
}

function wizfds_failures_for_ip($db) {
	$result = $db->pg_read(
		"select count(*) as n from auth_attempts
		  where kind = 'login' and successful = false and ip = $1
		    and created > current_timestamp - ($2 || ' minutes')::interval",
		array(wizfds_client_ip(), WIZFDS_ATTEMPT_WINDOW_MINUTES)
	);

	return empty($result) ? 0 : (int) $result[0]['n'];
}

# True when this address (or this host) has spent its guessing budget.
function wizfds_login_blocked($db, $email) {
	if (wizfds_failures_for_email($db, $email) >= WIZFDS_MAX_FAILURES_PER_EMAIL) {
		return true;
	}

	return wizfds_failures_for_ip($db) >= WIZFDS_MAX_FAILURES_PER_IP;
}

# Each failure makes the next attempt slower, so the five allowed guesses are not
# five *fast* guesses - the cliff alone would let a script spend the whole budget
# in a few milliseconds, and concurrent requests could all read the counter
# before any of them recorded a failure.
function wizfds_throttle_delay($failures) {
	if ($failures <= 0) {
		return 0;
	}

	return min($failures, WIZFDS_MAX_FAILURES_PER_EMAIL) * WIZFDS_THROTTLE_STEP_SECONDS;
}

# A password that turned out to be right clears the budget, so a user who
# fumbled a few times is not locked out of their next session.
function wizfds_clear_failures($db, $email) {
	$db->pg_change(
		"delete from auth_attempts where kind = 'login' and successful = false and identifier = $1",
		array(strtolower(trim($email)))
	);
}

function wizfds_reset_requests_exhausted($db, $email) {
	$result = $db->pg_read(
		"select count(*) as n from auth_attempts
		  where kind = 'reset' and identifier = $1
		    and created > current_timestamp - interval '1 hour'",
		array(strtolower(trim($email)))
	);

	return !empty($result) && (int) $result[0]['n'] >= WIZFDS_MAX_RESETS_PER_EMAIL;
}

# --- Reset hasła -------------------------------------------------------------

# Only the hash is stored. The token itself exists in the e-mail and nowhere
# else, so a copy of the database does not let anyone take over an account.
function wizfds_create_reset_token($db, $userId) {
	$token = bin2hex(random_bytes(32));

	# One live link per account: asking again invalidates the previous mail.
	$db->pg_change(
		"update password_resets set used_at = current_timestamp where user_id = $1 and used_at is null",
		array($userId)
	);

	$db->pg_create(
		"insert into password_resets (user_id, token_hash, expires_at)
		 values ($1, $2, current_timestamp + ($3 || ' minutes')::interval)
		 returning id",
		array($userId, hash('sha256', $token), WIZFDS_RESET_TTL_MINUTES)
	);

	return $token;
}

# Returns the user row the token belongs to, or null when the link is unknown,
# already used or expired.
function wizfds_reset_token_user($db, $token) {
	if (!is_string($token) || $token === '') {
		return null;
	}

	$result = $db->pg_read(
		"select u.id, u.email, u.salt, r.id as reset_id
		   from password_resets r
		   join users u on u.id = r.user_id
		  where r.token_hash = $1 and r.used_at is null and r.expires_at > current_timestamp",
		array(hash('sha256', $token))
	);

	return empty($result) ? null : $result[0];
}

# Burning the token and invalidating older sessions belong together: the point of
# a reset is that whoever knew the old password stops having access. Sessions
# carry the moment they were issued and are dropped when they predate this stamp.
function wizfds_burn_reset_token($db, $resetId, $userId) {
	$db->pg_change("update password_resets set used_at = current_timestamp where id = $1", array($resetId));
	$db->pg_change("update users set sessions_valid_from = current_timestamp where id = $1", array($userId));
}

# True when the session in hand was issued before the account's sessions were
# invalidated (password reset). Called on every request that carries a session.
function wizfds_session_outdated($validFrom) {
	if ($validFrom === null || $validFrom === '') {
		return false;
	}

	$issuedAt = isset($_SESSION['issued_at']) ? (int) $_SESSION['issued_at'] : 0;

	return $issuedAt < strtotime($validFrom);
}
