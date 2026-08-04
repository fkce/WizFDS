<?php
require_once('./config.php');
require_once('./lib/logger.php');
require_once('./lib/exceptions.php');

class Database {

	# One connection per request, shared by every handler that asks for one.
	# Each query used to open and tear down its own, which cost a round trip to
	# the database server for every single statement.
	private static $connection = null;

	private $config;
	private $user_id;

	function __construct() {
		$this->config = new Config();
		$this->user_id = isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null;
	}

	private function connection() {
		if (self::$connection !== null && pg_connection_status(self::$connection) === PGSQL_CONNECTION_OK) {
			return self::$connection;
		}

		$connect = @pg_connect(
			"host=". $this->config->host ." port=". $this->config->port .
			" dbname=". $this->config->db ." user=". $this->config->dbUser .
			" password=". $this->config->dbPass
		);

		if ($connect === false) {
			wizfds_log('error', 'database connection failed');
			throw new RuntimeException('Database connection failed');
		}

		self::$connection = $connect;
		return self::$connection;
	}

	# A failed query used to return false and mail the query to the author, while
	# the caller carried on and reported success. It now throws, so the handler's
	# catch decides what the client is told.
	private function run($query, $params) {
		$connect = $this->connection();
		$result = @pg_query_params($connect, $query, $params);

		if ($result === false) {
			# The query text and its parameters carry user data - log the database's
			# own message only, and only its first line: a constraint violation
			# quotes the offending value on the DETAIL line below it. The request URI
			# in the log entry says which endpoint.
			wizfds_log('error', 'database query failed', array('db_error' => strtok(pg_last_error($connect), "\n")));
			throw new RuntimeException('Database query failed');
		}

		return $result;
	}

	public function pg_read($qq, $arr = []) {
		return pg_fetch_all($this->run($qq, $arr));
	}

	public function pg_change($qq, $arr = []) {
		$this->refuseWriteInDemo();
		return pg_affected_rows($this->run($qq, $arr));
	}

	public function pg_create($qq, $arr = []) {
		$this->refuseWriteInDemo();
		return pg_fetch_all($this->run($qq, $arr));
	}

	# Run $work inside a transaction: either every statement lands or none does.
	# Deleting a project deletes its scenarios first, and a failure between the
	# two used to leave the scenarios orphaned.
	public function transaction($work) {
		$this->run('BEGIN', array());

		try {
			$result = $work();
		} catch (Throwable $e) {
			$this->run('ROLLBACK', array());
			throw $e;
		}

		$this->run('COMMIT', array());
		return $result;
	}

	public function isReadOnly() {
		return $this->user_id !== null
			&& $this->config->demoUserId !== ''
			&& (string) $this->user_id === (string) $this->config->demoUserId;
	}

	private function refuseWriteInDemo() {
		if ($this->isReadOnly()) {
			throw new DemoModeException('Demo account is read-only');
		}
	}
}
