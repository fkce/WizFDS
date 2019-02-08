<?php
session_name("wizfds");

require_once("config.php");
require_once("db.php");

$db = new Database();  

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
		<div><label>Log into WizFDS</label></div>
		<div><input type='email' name='email' placeholder='E-mail address'></div>
		<div><input type='password' name='password' placeholder='Password'></div>
		<div><input type='submit' name='check' value='Login'></div>
		<div><input type='submit' name='addUserShowForm' value='Register'></div>
	</div>
	</form>
	";
}

function registerForm() {
	$config = new Config();
	echo "
	<form method='post' action=".$_SERVER['REQUEST_URI'].">
		<div class='register'>
			<div><label>Register new user</label></div>
			<div><input type='text' name='userName' required placeholder='Name'></div>
			<div><input type='email' name='email' required placeholder='E-mail address'></div>
			<div><input onkeyup='checkPasswordMatch();' id='txtNewPassword' type='password' name='password' placeholder='Password'></div>
			<div><input onkeyup='checkPasswordMatch();' id='txtConfirmPassword' type='password' name='password2' placeholder='Repeat password'></div>
			<div class='g-recaptcha' data-sitekey='". $config->recaptchaPublic ."'></div>
			<input type='hidden' name='makeRegister' value=1/> 
			<div><input id='registerButton' type='submit' value='Register'></div>
			<div id='divCheckPasswordMatch'></div>
		</div>
	</form>
	";
}

function check() {
	global $db;
	$config = new Config();

	if(!empty($_POST['email']) and !empty($_POST['password'])) {

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
	global $db;
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

			// Check if user e-mail already exists
			$result = $db->pg_read("SELECT * from users where email=$1", array($_POST['email']));
			if(!empty($result)) { 
				echo $_POST['email']." already exists.<br>"; 
				exit(); 
			}

			// Create user home folder
			system("mkdir -p ". $config->usersPath . $_POST['email']);

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

		}
	}
}
/*}}}*/

# init /*{{{*/
if(!isset($_SESSION['email'])) { 
	echo "
	<html>
	<head>
	<title>
		WizFDS - GUI for FDS
	</title>
	<meta charset='utf-8'/>
	<link href='/login.css' rel='stylesheet' />
	<link href='https://fonts.googleapis.com/css?family=Play' rel='stylesheet'>
	<link href='https://fonts.googleapis.com/icon?family=Material+Icons' rel='stylesheet'>
	<script type='text/javascript' src='https://ajax.googleapis.com/ajax/libs/jquery/1/jquery.min.js'></script>
	<script src='https://www.google.com/recaptcha/api.js'></script>
	</head>
	<body>
	<div ng-app='loginapp'>
	";
	if(isset($_REQUEST['check'])) { check(); } 
	if(isset($_REQUEST['makeRegister'])) { makeRegister(); check(); } 
	if(isset($_REQUEST['addUserShowForm'])) { registerForm(); } 
	else { loginForm(); }
	echo "
	<div class='login-support'>Support: mateusz.fliszkiewicz @ fkce.pl</div>
	<!--login app-->
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

/*}}}*/
