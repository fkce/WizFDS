<?php
require_once("config.php");
require_once("db.php");
require_once("lib/session.php");
require_once("lib/logger.php");
require_once("lib/auth.php");
require_once("rest/utils.php");

wizfds_session_start();

function guidv4($data)
{
	assert(strlen($data) == 16);

	$data[6] = chr(ord($data[6]) & 0x0f | 0x40); // set version to 0100
	$data[8] = chr(ord($data[8]) & 0x3f | 0x80); // set bits 6-7 to 10

	return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

function loginError($message) {
	echo "<div class='login-error'>". htmlspecialchars($message, ENT_QUOTES) ."</div>";
}

function loginNotice($message) {
	echo "<div class='login-notice'>". htmlspecialchars($message, ENT_QUOTES) ."</div>";
}

function brandHeader($subtitle = '') {
	$sub = $subtitle === '' ? '' : "<div class='brand-sub'>". htmlspecialchars($subtitle, ENT_QUOTES) ."</div>";
	return "
		<div class='brand'>
			<span class='brand-name'>Wiz<span class='brand-accent'>FDS</span></span>
			<span class='beta-chip'>beta</span>
			$sub
		</div>";
}

function loginForm() {
	echo "
	<form method='post' action='" . htmlspecialchars($_SERVER['REQUEST_URI'], ENT_QUOTES) . "'>
	<div class='login'>
		". brandHeader('GUI for Fire Dynamics Simulator') ."
		<div class='fields'>
			<input type='email' name='email' placeholder='E-mail address'>
			<input type='password' name='password' placeholder='Password'>
		</div>
		<div class='actions'>
			<input class='btn btn-primary' type='submit' name='check' value='Login'>
			<input class='btn btn-ghost' type='submit' name='addUserShowForm' value='Register'>
		</div>
		<div class='form-links'><a href='/reset'>Forgot your password?</a></div>
	</div>
	</form>
	";
}

function registerForm() {
	$config = new Config();
	echo "
	<form method='post' action='" . htmlspecialchars($_SERVER['REQUEST_URI'], ENT_QUOTES) . "'>
		<div class='register'>
			". brandHeader() ."
			<div class='form-title'>Register new user</div>
			<div class='fields'>
				<input type='text' name='userName' required placeholder='Name'>
				<input type='email' name='email' required placeholder='E-mail address'>
				<input onkeyup='checkPasswordMatch();' id='txtNewPassword' type='password' name='password' placeholder='Password'>
				<input onkeyup='checkPasswordMatch();' id='txtConfirmPassword' type='password' name='password2' placeholder='Repeat password'>
			</div>
			<div class='form-hint'>At least ". WIZFDS_MIN_PASSWORD_LENGTH ." characters.</div>
			<div class='g-recaptcha' data-sitekey='". $config->recaptchaPublic ."' data-theme='dark'></div>
			<input type='hidden' name='makeRegister' value=1/>
			<div class='actions'>
				<input id='registerButton' class='btn btn-primary' type='submit' value='Register'>
			</div>
			<div id='divCheckPasswordMatch'></div>
		</div>
	</form>
	";
}

function resetRequestForm() {
	echo "
	<form method='post' action='/reset'>
		<div class='login'>
			". brandHeader() ."
			<div class='form-title'>Reset your password</div>
			<div class='fields'>
				<input type='email' name='email' required placeholder='E-mail address'>
			</div>
			<input type='hidden' name='makeResetRequest' value=1/>
			<div class='actions'>
				<input class='btn btn-primary' type='submit' value='Send reset link'>
			</div>
			<div class='form-links'><a href='/login'>Back to sign in</a></div>
		</div>
	</form>
	";
}

function resetPasswordForm($token) {
	echo "
	<form method='post' action='/reset'>
		<div class='login'>
			". brandHeader() ."
			<div class='form-title'>Choose a new password</div>
			<div class='fields'>
				<input onkeyup='checkPasswordMatch();' id='txtNewPassword' type='password' name='password' placeholder='New password'>
				<input onkeyup='checkPasswordMatch();' id='txtConfirmPassword' type='password' name='password2' placeholder='Repeat new password'>
			</div>
			<div class='form-hint'>At least ". WIZFDS_MIN_PASSWORD_LENGTH ." characters.</div>
			<input type='hidden' name='token' value='". htmlspecialchars($token, ENT_QUOTES) ."'/>
			<input type='hidden' name='makeResetPassword' value=1/>
			<div class='actions'>
				<input id='registerButton' class='btn btn-primary' type='submit' value='Set new password'>
			</div>
			<div id='divCheckPasswordMatch'></div>
		</div>
	</form>
	";
}

function check() {
	# This file is include()d from inside login(), so anything assigned at its top
	# level lands in that function's scope, not the global one - the connection has
	# to be opened here.
	$db = new Database();
	$config = new Config();

	$email = isset($_POST['email']) ? trim($_POST['email']) : '';
	$password = isset($_POST['password']) ? $_POST['password'] : '';

	if ($email === '' || $password === '' || !wizfds_valid_email($email)) {
		loginError('Invalid e-mail or password. Try again.');
		return;
	}

	# Guessing budget spent: refuse before touching the password at all.
	if (wizfds_login_blocked($db, $email)) {
		wizfds_log('warning', 'login blocked by rate limit', array('identifier' => strtolower($email)));
		loginError('Too many attempts. Please wait ' . WIZFDS_ATTEMPT_WINDOW_MINUTES . ' minutes and try again.');
		return;
	}

	# Still inside the budget, but each previous failure makes this attempt
	# slower - five allowed guesses should not be five instant ones.
	$delay = wizfds_throttle_delay(wizfds_failures_for_email($db, $email));
	if ($delay > 0) {
		sleep($delay);
	}

	# Addresses are unique regardless of case (migration 004), so match the same
	# way - otherwise whoever registered with capitals cannot sign in without them.
	$result = $db->pg_read("SELECT * from users where lower(email) = lower($1)", array($email));

	if (!empty($result)) {
		$user = $result[0];

		# Accounts predating the salted scheme used to be handled by re-hashing
		# whatever password was typed and then verifying against that - which
		# accepted ANY password. They go through the reset link instead.
		if ($user['salt'] === null || $user['salt'] === '') {
			wizfds_log('warning', 'login attempt on an account with no salt', array('login_user_id' => $user['id']));
		} else if (strlen($user['password']) > 1
			&& wizfds_password_verify($config, $user['email'], $password, $user['salt'], $user['password'])) {

			wizfds_record_attempt($db, 'login', $email, true);
			wizfds_clear_failures($db, $email);

			session_regenerate_id(True);
			$_SESSION['user_id'] = $user['id'];
			$_SESSION['email'] = $user['email'];
			$_SESSION['editor'] = $user['editor'];
			# Stamped so a later password reset can tell this session apart from
			# one issued after it (lib/auth.php: wizfds_session_outdated).
			$_SESSION['issued_at'] = time();

			wizfds_log('info', 'login succeeded', array('login_user_id' => $user['id']));

			header("Location: https://". $_SERVER['SERVER_NAME']);
			return;
		}
	}

	wizfds_record_attempt($db, 'login', $email, false);
	wizfds_log('warning', 'login failed', array('identifier' => strtolower($email)));

	loginError('Invalid e-mail or password. Try again.');
}

function makeRegister() {
	$db = new Database();
	$config = new Config();

	// Recaptcha implementation
	$url = 'https://www.google.com/recaptcha/api/siteverify';
	$data = array(
		'secret' => $config->recaptchaSecret,
		'response' => isset($_POST["g-recaptcha-response"]) ? $_POST["g-recaptcha-response"] : ''
	);
	$options = array(
		'http' => array (
			'method' => 'POST',
			'content' => http_build_query($data)
		)
	);
	$context  = stream_context_create($options);
	$verify = @file_get_contents($url, false, $context);
	$captcha_success = json_decode($verify);

	// Check if a boot register user
	if (!isset($captcha_success->success) || $captcha_success->success == false) {
		echo "<p style='text-align: center;'>You are a bot! Go away!</p>";
		return false;
	}

	$email = isset($_POST['email']) ? trim($_POST['email']) : '';
	$password = isset($_POST['password']) ? $_POST['password'] : '';
	$password2 = isset($_POST['password2']) ? $_POST['password2'] : '';

	if ($email === '' || $password === '') {
		loginError('E-mail and password are required.');
		return false;
	}

	// The address becomes a directory name under usersPath, so it has to be
	// a real address and nothing that could climb out of that directory.
	if (!wizfds_valid_email($email)) {
		loginError('Invalid e-mail address.');
		return false;
	}

	if ($password !== $password2) {
		loginError('Passwords do not match.');
		return false;
	}

	$problem = wizfds_password_problem($password, $email);
	if ($problem !== null) {
		loginError($problem);
		return false;
	}

	// Check if user e-mail already exists. The unique index on lower(email)
	// (migration 004) is what actually settles a race between two sign-ups.
	$result = $db->pg_read("SELECT id from users where lower(email) = lower($1)", array($email));
	if (!empty($result)) {
		loginError($email . ' already exists.');
		return false;
	}

	// Create user home folder
	wizfds_ensure_dir(wizfds_user_dir($config, $email));

	$salt = wizfds_new_salt();
	$pass = wizfds_password_make($config, $email, $password, $salt);

	try {
		$result = $db->pg_create("INSERT INTO users (email, password, salt, editor, websocket_host, websocket_port, username) values($1, $2, $3, $4, $5, $6, $7) returning id;", array($email, $pass, $salt, 'default', 'localhost', 2012, isset($_POST['userName']) ? $_POST['userName'] : ''));
	} catch (Throwable $e) {
		loginError($email . ' already exists.');
		return false;
	}

	$user_id = $result[0]['id'];

	// Create default categories
	foreach (array('current', 'archive', 'finished') as $label) {
		$db->pg_create("INSERT INTO categories (user_id, label, active, visible, uuid) values($1, $2, $3, $4, $5);", array($user_id, $label, true, true, guidv4(random_bytes(16))));
	}

	wizfds_log('info', 'account registered', array('login_user_id' => $user_id));

	$headers = "From: wizfds@wizfds.com\r\nReply-To: wizfds@wizfds.com";
	mail("mateusz.fliszkiewicz@fkce.pl", "New WizFDS user registered", $email . " has registered in WizFDS!", $headers);

	return true;
}

function makeResetRequest() {
	$db = new Database();
	$email = isset($_POST['email']) ? trim($_POST['email']) : '';

	# The answer never changes, whether or not the address has an account -
	# otherwise this form becomes a way to ask who is registered.
	$neutral = 'If that address has an account, a reset link is on its way. The link is valid for '
		. WIZFDS_RESET_TTL_MINUTES . ' minutes.';

	if ($email === '' || !wizfds_valid_email($email)) {
		loginNotice($neutral);
		echo "<div class='form-links'><a href='/login'>Back to sign in</a></div>";
		return;
	}

	if (wizfds_reset_requests_exhausted($db, $email)) {
		wizfds_log('warning', 'password reset rate limited', array('identifier' => strtolower($email)));
		loginNotice($neutral);
		echo "<div class='form-links'><a href='/login'>Back to sign in</a></div>";
		return;
	}

	wizfds_record_attempt($db, 'reset', $email, true);

	$result = $db->pg_read("select id, email from users where lower(email) = lower($1)", array($email));

	if (!empty($result)) {
		$user = $result[0];
		$token = wizfds_create_reset_token($db, $user['id']);
		$link = 'https://' . $_SERVER['SERVER_NAME'] . '/reset?token=' . $token;

		$body = "Someone asked to reset the password for your WizFDS account.\r\n\r\n"
			. $link . "\r\n\r\n"
			. "The link is valid for " . WIZFDS_RESET_TTL_MINUTES . " minutes and can be used once.\r\n"
			. "If this was not you, ignore this message - your password stays as it is.\r\n";

		mail($user['email'], 'WizFDS password reset', $body, "From: wizfds@wizfds.com\r\nReply-To: wizfds@wizfds.com");

		wizfds_log('info', 'password reset requested', array('login_user_id' => $user['id']));
	} else {
		wizfds_log('info', 'password reset requested for unknown address', array('identifier' => strtolower($email)));
	}

	loginNotice($neutral);
	echo "<div class='form-links'><a href='/login'>Back to sign in</a></div>";
}

function makeResetPassword() {
	$db = new Database();
	$config = new Config();

	$token = isset($_POST['token']) ? $_POST['token'] : '';
	$password = isset($_POST['password']) ? $_POST['password'] : '';
	$password2 = isset($_POST['password2']) ? $_POST['password2'] : '';

	$user = wizfds_reset_token_user($db, $token);
	if ($user === null) {
		wizfds_log('warning', 'password reset with an invalid or expired link');
		loginError('This reset link is no longer valid. Ask for a new one.');
		resetRequestForm();
		return;
	}

	if ($password !== $password2) {
		loginError('Passwords do not match.');
		resetPasswordForm($token);
		return;
	}

	$problem = wizfds_password_problem($password, $user['email']);
	if ($problem !== null) {
		loginError($problem);
		resetPasswordForm($token);
		return;
	}

	# The application secret lives in the account's directory; registration
	# creates it, but an account whose directory went missing would otherwise get
	# a secret-less hash written here without a word.
	if (!wizfds_ensure_dir(wizfds_user_dir($config, $user['email']))) {
		wizfds_log('error', 'user directory unavailable during password reset', array('login_user_id' => $user['id']));
		loginError('Something went wrong. Please try again later.');
		return;
	}

	# A fresh salt, so the new password shares nothing with the old one.
	$salt = wizfds_new_salt();
	$hash = wizfds_password_make($config, $user['email'], $password, $salt);

	$db->pg_change("update users set password = $1, salt = $2 where id = $3", array($hash, $salt, $user['id']));
	wizfds_burn_reset_token($db, $user['reset_id'], $user['id']);
	wizfds_clear_failures($db, $user['email']);

	wizfds_log('info', 'password reset completed', array('login_user_id' => $user['id']));

	loginNotice('Your password has been changed. You can sign in now.');
	echo "<div class='form-links'><a href='/login'>Go to sign in</a></div>";
}

# signin demo user
function demoUser() {
	$config = new Config();
	if(isset($_GET['demo']) && $_GET['demo'] == 'true' && $config->demoUserId !== '') {
		session_regenerate_id(True);
		$_SESSION['user_id'] = $config->demoUserId;
		$_SESSION['email'] = $config->demoUserEmail;

		# Previously this mailed the author on every demo sign-in, after resolving
		# the visitor's IP through an unencrypted third-party geolocation API.
		wizfds_log('info', 'demo session started');

		header("Location: https://". $_SERVER['SERVER_NAME']);
		return;
	}
}

# init
if(!isset($_SESSION['email'])) {
	demoUser();

	echo "
	<html lang='en'>
	<head>
	<title>
		WizFDS - GUI for FDS
	</title>
	<meta charset='utf-8'/>
	<meta name='viewport' content='width=device-width, initial-scale=1'>
	<link rel='icon' type='image/png' href='/favicon.png'>
	<link href='/login.css' rel='stylesheet' />
	<link rel='preconnect' href='https://fonts.gstatic.com' crossorigin>
	<link href='https://fonts.googleapis.com/css2?family=Fira+Sans:wght@400;500;600&family=Fira+Code:wght@400;500&display=swap' rel='stylesheet'>
	<script type='text/javascript' src='https://ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js'></script>
	<script src='https://www.google.com/recaptcha/api.js'></script>
	</head>
	<body>
	<div class='auth-shell'>
	";

	if(isset($_REQUEST['makeResetPassword'])) { makeResetPassword(); }
	else if(isset($_REQUEST['makeResetRequest'])) { makeResetRequest(); }
	else if(isset($_GET['token'])) { resetPasswordForm($_GET['token']); }
	else if(isset($_REQUEST['wizfdsReset'])) { resetRequestForm(); }
	else {
		if(isset($_REQUEST['check'])) { check(); }

		if(isset($_REQUEST['makeRegister'])) {
			# Sign the new account straight in, as before - but only when the
			# registration went through. A rejected sign-up stays on its own form
			# with its own message, instead of dropping the visitor onto the login
			# box with everything they typed gone.
			if(makeRegister()) { check(); loginForm(); }
			else { registerForm(); }
		}
		else if(isset($_REQUEST['addUserShowForm'])) { registerForm(); }
		else { loginForm(); }
	}

	echo "
	<div class='login-support'>Support: mateusz.fliszkiewicz @ fkce.pl</div>
	</div>
	<script type='text/javascript'>
	function checkPasswordMatch() {
		var password = $('#txtNewPassword').val();
		var confirmPassword = $('#txtConfirmPassword').val();
		if (password != confirmPassword) {
			$('#registerButton').prop('disabled', true);
			$('#divCheckPasswordMatch').html('Passwords not matching...');
		}
		else {
			$('#registerButton').prop('disabled', false);
			$('#divCheckPasswordMatch').html('');
		}
	}
	</script>
	</body>
	</html>
	";
}
else {
	header("Location: https://". $_SERVER['SERVER_NAME']);
}
