<?php
require_once('./config.php');
require_once('./lib/logger.php');

class Database {

	private $config;
	private $user_id;
	private $connect;

	function __construct() {
		$this->config = new Config();
		$this->user_id = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null;
		$this->connect = "";
	}

	public function pg_start() {
		$this->connect = $this->open();
	}

	public function pg_stop() {
		if ($this->connect) {
			pg_close($this->connect);
			$this->connect = "";
		}
	}

	# A failed query used to return false and mail the query to the author, while
	# the caller carried on and reported success. It now throws, so the handler's
	# catch decides what the client is told.
	private function open() {
		$connect = @pg_connect(
			"host=". $this->config->host ." port=". $this->config->port .
			" dbname=". $this->config->db ." user=". $this->config->dbUser .
			" password=". $this->config->dbPass
		);

		if ($connect === false) {
			wizfds_log('error', 'database connection failed');
			throw new RuntimeException('Database connection failed');
		}

		return $connect;
	}

	private function run($connect, $query, $params) {
		$result = @pg_query_params($connect, $query, $params);

		if ($result === false) {
			# The query text and its parameters carry user data - log the database's
			# own message only. The request URI in the log entry says which endpoint.
			wizfds_log('error', 'database query failed', array('db_error' => pg_last_error($connect)));
			throw new RuntimeException('Database query failed');
		}

		return $result;
	}

	# Reads over the connection opened by pg_start(), for handlers that issue
	# several queries in a row.
	public function pg_read_mult($qq, $arr = []) {
		if (!$this->connect) {
			$this->pg_start();
		}
		return pg_fetch_all($this->run($this->connect, $qq, $arr));
	}

	public function pg_read($qq, $arr = []) {
		$connect = $this->open();
		try {
			return pg_fetch_all($this->run($connect, $qq, $arr));
		} finally {
			pg_close($connect);
		}
	}

	public function pg_change($qq, $arr = []) {
		if ($this->isReadOnly()) {
			return null;
		}

		$connect = $this->open();
		try {
			return pg_affected_rows($this->run($connect, $qq, $arr));
		} finally {
			pg_close($connect);
		}
	}

	public function pg_create($qq, $arr = []) {
		if ($this->isReadOnly()) {
			return null;
		}

		$connect = $this->open();
		try {
			return pg_fetch_all($this->run($connect, $qq, $arr));
		} finally {
			pg_close($connect);
		}
	}

	# The shared demo account may look but not touch.
	private function isReadOnly() {
		return $this->user_id !== null && (string) $this->user_id === (string) $this->config->demoUserId;
	}
}
