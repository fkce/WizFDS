<?php
# Session bootstrap. Every entry point (router, login form, logout) must go
# through here so the cookie flags are set in one place - php.ini on the shared
# host leaves HttpOnly, SameSite and strict mode off.

function wizfds_session_secure() {
	if (!empty($_SERVER['HTTPS']) && strtolower($_SERVER['HTTPS']) !== 'off') {
		return true;
	}
	return isset($_SERVER['HTTP_X_FORWARDED_PROTO']) && $_SERVER['HTTP_X_FORWARDED_PROTO'] === 'https';
}

function wizfds_session_start() {
	if (session_status() === PHP_SESSION_ACTIVE) {
		return;
	}

	# Reject session ids the server never issued, so a planted id cannot become
	# a valid session once the victim logs in (session fixation).
	ini_set('session.use_strict_mode', '1');
	ini_set('session.use_only_cookies', '1');

	session_name('wizfds');
	session_set_cookie_params(array(
		'lifetime' => 0,
		'path'     => '/',
		'domain'   => '',
		'secure'   => wizfds_session_secure(),
		'httponly' => true,
		'samesite' => 'Lax',
	));

	session_start();
}

# Drop the current session and start an empty one with the same cookie flags.
# Used by logout and by the registration form.
function wizfds_session_reset() {
	wizfds_session_start();

	$_SESSION = array();

	# Expire the old cookie as well, so the browser stops presenting an id the
	# server has already thrown away.
	if (ini_get('session.use_cookies') && !headers_sent()) {
		$params = session_get_cookie_params();
		setcookie(session_name(), '', array(
			'expires'  => time() - 42000,
			'path'     => $params['path'],
			'domain'   => $params['domain'],
			'secure'   => $params['secure'],
			'httponly' => $params['httponly'],
			'samesite' => isset($params['samesite']) ? $params['samesite'] : 'Lax',
		));
	}

	session_destroy();
	wizfds_session_start();
}
