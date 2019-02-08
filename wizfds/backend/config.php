<?php
class Config {

	public $host = 'localhost';
	public $port = '5432';
	public $db = 'db_name';
	public $dbUser = 'db_user';
	public $dbPass = 'db_password';
	public $email = 'email';
	public $recaptchaPublic = '';
	public $recaptchaSecret = '';
	// Directory can not be public
	public $usersPath = '~/wizfds_users/';

	function __construct() {
    }

	// Get or create app secret key in user directory
	public function getAppSecret($user) {
        // Return or create application secret salt
        if(!file_exists($this->usersPath . $user .'/appSecret.txt')) {
            $applicationSecret = base64_encode(random_bytes(2048));
            file_put_contents($this->usersPath . $user .'/appSecret.txt', $applicationSecret);
        } 
		return fgets(fopen($this->usersPath . $user .'/appSecret.txt', 'r'));
    }
}
?>