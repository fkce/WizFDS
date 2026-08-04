<?php
require_once("config.php");
require_once("db.php");
require_once("lib/session.php");
require_once("lib/logger.php");
require_once("rest/utils.php");

wizfds_session_start();

function guidv4($data) 
{
	assert(strlen($data) == 16);

	$data[6] = chr(ord($data[6]) & 0x0f | 0x40); // set version to 0100
	$data[8] = chr(ord($data[8]) & 0x3f | 0x80); // set bits 6-7 to 10

	return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
} 

function loginForm() {
	echo "
	<form method='post' action=".$_SERVER['REQUEST_URI'].">
	<div class='login'>
		<div class='brand'>
			<span class='brand-name'>Wiz<span class='brand-accent'>FDS</span></span>
			<span class='beta-chip'>beta</span>
			<div class='brand-sub'>GUI for Fire Dynamics Simulator</div>
		</div>
		<div class='fields'>
			<input type='email' name='email' placeholder='E-mail address'>
			<input type='password' name='password' placeholder='Password'>
		</div>
		<div class='actions'>
			<input class='btn btn-primary' type='submit' name='check' value='Login'>
			<input class='btn btn-ghost' type='submit' name='addUserShowForm' value='Register'>
		</div>
	</div>
	</form>
	";
}

function registerForm() {
	$config = new Config();
	echo "
	<form method='post' action=".$_SERVER['REQUEST_URI'].">
		<div class='register'>
			<div class='brand'>
				<span class='brand-name'>Wiz<span class='brand-accent'>FDS</span></span>
				<span class='beta-chip'>beta</span>
			</div>
			<div class='form-title'>Register new user</div>
			<div class='fields'>
				<input type='text' name='userName' required placeholder='Name'>
				<input type='email' name='email' required placeholder='E-mail address'>
				<input onkeyup='checkPasswordMatch();' id='txtNewPassword' type='password' name='password' placeholder='Password'>
				<input onkeyup='checkPasswordMatch();' id='txtConfirmPassword' type='password' name='password2' placeholder='Repeat password'>
			</div>
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

function check() {
	# This file is include()d from inside login(), so anything assigned at its top
	# level lands in that function's scope, not the global one - the connection has
	# to be opened here.
	$db = new Database();
	$config = new Config();

	if(!empty($_POST['email']) and !empty($_POST['password']) and wizfds_valid_email($_POST['email'])) {

		// Select user data from db
		$result = $db->pg_read("SELECT * from users where email = $1", array($_POST['email']));
		if(!empty($result) and strlen($result[0]['password']) > 1) {
			extract($result[0]);

			// Generate new hashes for existing users with old algorithm
			if($salt == "") {
				// Generate user secret code
				$userSecret = base64_encode(random_bytes(2048));

				// Concat strings and prepare salt
				$appSecret = $config->getAppSecret($_POST['email']);
				$stringToHash = $appSecret . $_POST['password'] . $userSecret;
				$intermediateHashedString = hash('sha512', $stringToHash);
				$len = strlen($intermediateHashedString);
				$base256HashedString = '';
				for ($i = 0; $i < $len; $i += 2) {
					$base256HashedString .= chr(hexdec(substr($intermediateHashedString, $i, 2)));
				}

				// Generate final hash
				$pass = password_hash($base256HashedString, PASSWORD_BCRYPT);

				// Update user to database and return id
				$result=$db->pg_change("UPDATE users set password = $1, salt = $2 where id = $3;", array($pass, $userSecret, $id));

				// Overwrite db values
                $password = $pass;
                $salt = $userSecret;
			}

			// Regenerate intermediate hash
			$appSecret = $config->getAppSecret($_POST['email']);
            $stringToHash = $appSecret . $_POST['password'] . $salt;
            $intermediateHashedString = hash('sha512', $stringToHash);
            $len = strlen($intermediateHashedString);
            $base256HashedString = '';
            for ($i = 0; $i < $len; $i += 2) {
                $base256HashedString .= chr(hexdec(substr($intermediateHashedString, $i, 2)));
            }

			// Verify passwords
            if(password_verify($base256HashedString, $password)) {
				session_regenerate_id(True);
				$_SESSION['user_id']="$id";
				$_SESSION['email']="$email";
				$_SESSION['editor']="$editor";

				header("Location: https://". $_SERVER['SERVER_NAME']);
				return;
			}
		}
	}
	echo "<div class='login-error'>Invalid e-mail or password. Try again.</div>";
}

function makeRegister() {
	$db = new Database();
	$config = new Config();

	// Recaptcha implementation
	$response = $_POST["g-recaptcha-response"];
	$url = 'https://www.google.com/recaptcha/api/siteverify';
	$data = array(
		'secret' => $config->recaptchaSecret,
		'response' => $_POST["g-recaptcha-response"]
	);
	$options = array(
		'http' => array (
			'method' => 'POST',
			'content' => http_build_query($data)
		)
	);
	$context  = stream_context_create($options);
	$verify = file_get_contents($url, false, $context);
	$captcha_success = json_decode($verify);

	// Check if a boot register user
	if ($captcha_success->success==false) {
		echo "<p style='text-align: center;'>You are a bot! Go away!</p>";
	} else if ($captcha_success->success==true) {

		// Check if send data are not empty
		if(!empty($_POST['email']) and !empty($_POST['password'])) {

			// The address becomes a directory name under usersPath, so it has to be
			// a real address and nothing that could climb out of that directory.
			if(!wizfds_valid_email($_POST['email'])) {
				echo "<div class='login-error'>Invalid e-mail address.</div>";
				return;
			}

			// Check if user e-mail already exists
			$result = $db->pg_read("SELECT * from users where email=$1", array($_POST['email']));
			if(!empty($result)) {
				echo $_POST['email']." already exists.<br>";
				exit();
			}

			// Create user home folder
			wizfds_ensure_dir(wizfds_user_dir($config, $_POST['email']));

			// Salt and hash user password
			// Generate user secret code
			$userSecret = base64_encode(random_bytes(2048));

			// Concat strings and prepare salt
            $appSecret = $config->getAppSecret($_POST['email']);
            $stringToHash = $appSecret . $_POST['password'] . $userSecret;
            $intermediateHashedString = hash('sha512', $stringToHash);
            $len = strlen($intermediateHashedString);
            $base256HashedString = '';
            for ($i = 0; $i < $len; $i += 2) {
                $base256HashedString .= chr(hexdec(substr($intermediateHashedString, $i, 2)));
            }

			// Generate final hash
			$pass = password_hash($base256HashedString, PASSWORD_BCRYPT);

			// Add user to database and return id
			$result=$db->pg_create("INSERT INTO users (email, password, salt, editor, websocket_host, websocket_port, username) values($1, $2, $3, $4, $5, $6, $7) returning id;", array($_POST['email'], $pass, $userSecret, 'default', 'localhost', 2012, $_POST['userName']));
			$user_id = $result[0]['id'];

			// Create default categories
			$result=$db->pg_create("INSERT INTO categories (user_id, label, active, visible, uuid) values($1, $2, $3, $4, $5);", array($user_id, 'current', true, true, guidv4(random_bytes(16))));
			$result=$db->pg_create("INSERT INTO categories (user_id, label, active, visible, uuid) values($1, $2, $3, $4, $5);", array($user_id, 'archive', true, true, guidv4(random_bytes(16))));
			$result=$db->pg_create("INSERT INTO categories (user_id, label, active, visible, uuid) values($1, $2, $3, $4, $5);", array($user_id, 'finished', true, true, guidv4(random_bytes(16))));

			$headers = "From: wizfds@wizfds.com\r\nReply-To: wizfds@wizfds.com";
			mail("mateusz.fliszkiewicz@fkce.pl", "New WizFDS user registered", "$_POST[email] has registered in WizFDS!", $headers);

		}
	}
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
	if(isset($_REQUEST['check'])) { check(); } 
	if(isset($_REQUEST['makeRegister'])) { makeRegister(); check(); } 
	if(isset($_REQUEST['addUserShowForm'])) { registerForm(); } 
	else { loginForm(); }
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
