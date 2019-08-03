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
	public $demoUserId = '';
	public $demoUserEmail = '';

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

class Message {
    public $response = array( "meta"=>array( "status" => "error", "from" => "", "details" => ""), "data"=>array());

    function __construct($from) {
        $this->response['meta']['from'] = $from;
    }

    function createResponse($status, $details, $data) {
        $this->response['meta']['status'] = isset($status) ? $status : "error";
        $this->response['meta']['details'] = isset($details) ? $details : "No details ...";
        $this->response['data'] = isset($data) ? $data : array();
        return $this->response;
    }

}
?>