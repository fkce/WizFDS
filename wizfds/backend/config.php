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
	public $appSecret = getAppSecret();
	// Directory can not be public
	public $usersPath = '~/wizfds_users/';

	private getAppSecret() {
		// Return or create application secret salt
		if(file_exists($this->userPath .'appSecret.txt')) {
			return fgets(fopen($file, 'r'));
		} else {
			$applicationSecret = base64_encode(random_bytes(2048));
			file_put_contents($this->userPath . 'appSecret.txt', $applicationSecret);
			return $applicationSecret;
		}
	}
}

?>
