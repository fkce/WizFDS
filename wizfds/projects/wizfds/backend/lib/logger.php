<?php
# Paths are resolved against the docroot on purpose: config.php there holds the
# real credentials, while the copy in the repository is only a template.
require_once('./config.php');
require_once('./rest/utils.php');

# Application log. Replaces the previous "mail the failing query to the author"
# reporting: query text and parameters carry user data, and a broken query could
# flood the mailbox. One JSON object per line, in a monthly file outside the
# docroot.

function wizfds_log_dir() {
	$config = new Config();

	if (!empty($config->logPath)) {
		return rtrim(wizfds_expand_home($config->logPath), '/');
	}

	# Default next to the user files, i.e. outside any docroot.
	return dirname(rtrim(wizfds_expand_home($config->usersPath), '/')) . '/wizfds-logs';
}

# Never let logging break a request: a missing directory or a full disk must not
# turn into a 500 on top of whatever is already going wrong.
function wizfds_log($level, $message, $context = array()) {
	try {
		$dir = wizfds_log_dir();
		if (!is_dir($dir)) {
			@mkdir($dir, 0700, true);
		}

		$entry = array(
			'time'    => date('c'),
			'level'   => $level,
			'message' => $message,
			'method'  => isset($_SERVER['REQUEST_METHOD']) ? $_SERVER['REQUEST_METHOD'] : '',
			'uri'     => isset($_SERVER['REQUEST_URI']) ? $_SERVER['REQUEST_URI'] : '',
			'user_id' => isset($_SESSION['user_id']) ? $_SESSION['user_id'] : null,
			'ip'      => isset($_SERVER['REMOTE_ADDR']) ? $_SERVER['REMOTE_ADDR'] : '',
		);

		# Context carries diagnostics only - never query text or bound parameters.
		foreach ($context as $key => $value) {
			$entry[$key] = is_scalar($value) ? $value : json_encode($value);
		}

		@file_put_contents(
			$dir . '/wizfds-' . date('Y-m') . '.log',
			json_encode($entry) . "\n",
			FILE_APPEND | LOCK_EX
		);
	} catch (Throwable $e) {
		# nothing left to do - swallowing beats a cascading failure
	}
}
