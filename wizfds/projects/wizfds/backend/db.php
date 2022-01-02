<?php
require_once('./config.php');

class Database {

	private $config;
	private $user_id;
	private $connect;

	function __construct() {
		$this->config = new Config();
		$this->user_id = $_SESSION['user_id'];
		$this->connect = "";
	}

	public function pg_start() {
		$this->connect=pg_connect("host=". $this->config->host ." port=". $this->config->port ." dbname=". $this->config->db ." user=". $this->config->dbUser ." password=". $this->config->dbPass);
	}

	public function pg_stop() {
		pg_close();
	}

	public function pg_read_mult($qq,$arr=[]) { 
		
		($result=pg_query_params($this->connect, $qq, $arr)) || $this->reportBug(array("$qq", $arr, pg_last_error($this->connect)));
		$k=pg_fetch_all($result);
		return($k);
	}

	public function pg_read($qq,$arr=[]) { 
		
		$connect=pg_connect("host=". $this->config->host ." port=". $this->config->port ." dbname=". $this->config->db ." user=". $this->config->dbUser ." password=". $this->config->dbPass);
		($result=pg_query_params($connect, $qq, $arr)) || $this->reportBug(array("$qq", $arr, pg_last_error($connect)));
		$k=pg_fetch_all($result);
		pg_close();
		return($k);
	}
	
	public function pg_change($qq,$arr=[]) { 
		
		$connect=pg_connect("host=". $this->config->host ." port=". $this->config->port ." dbname=". $this->config->db ." user=". $this->config->dbUser ." password=". $this->config->dbPass);
		if($this->user_id != 5) {
			($result=pg_query_params($connect, $qq, $arr)) || $this->reportBug(array("$qq", $arr, pg_last_error($connect))); 
			$rows=pg_affected_rows($result);
			pg_close();
			return($rows);
		}
		pg_close();
		return;
	}

	public function pg_create($qq,$arr=[]) { 
		
		$connect=pg_connect("host=". $this->config->host ." port=". $this->config->port ." dbname=". $this->config->db ." user=". $this->config->dbUser ." password=". $this->config->dbPass);
		if($this->user_id != 5) {
			($result=pg_query_params($connect, $qq, $arr)) || $this->reportBug(array("$qq", $arr, pg_last_error($connect))); 
			$rows=pg_affected_rows($result);
			$k=pg_fetch_all($result);
			pg_close();
			return($k);
		}
		pg_close();
		return;
	}

	public function reportBug($arr) {

		$current_time=date("Y-m-d G:i:s");
		$params=print_r($arr[1],1);
		$reportQuery=join("\n" , array('--------' ,  $current_time."/".$_SERVER['REMOTE_ADDR'] , $_SERVER['REQUEST_URI'], $arr[0] , $params, $arr[2] , "\n\n"));
		mail('mateusz.fliszkiewicz@gmail.com', 'Wizfds bug?', "$reportQuery", "From: wizfds@wizfds.com"); 
	}
}

?>
