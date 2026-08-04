<?php

# --- User file paths ---------------------------------------------------------
# Paths under usersPath are named after the account's e-mail address, so the
# address is the one path segment a human can choose. It is validated here and
# built with native mkdir() rather than a shell (see wizfds_ensure_dir), because
# the old system("mkdir -p $path") would have executed anything after a ";".

function wizfds_valid_email($email) {
	if (!is_string($email) || $email === '') {
		return false;
	}
	if (filter_var($email, FILTER_VALIDATE_EMAIL) === false) {
		return false;
	}
	# Belt and braces for the filesystem: no separators, no traversal, no NUL.
	return !preg_match('#[/\\\\]#', $email) && strpos($email, '..') === false && strpos($email, "\0") === false;
}

# Absolute directory for a user, optionally below it (project / scenario ids).
# Returns null when the e-mail or any segment is not something we are willing to
# put in a path.
function wizfds_user_dir($config, $email, $segments = array()) {
	if (!wizfds_valid_email($email)) {
		return null;
	}

	$path = rtrim($config->usersPath, '/') . '/' . $email;

	foreach ($segments as $segment) {
		if (!preg_match('/^[A-Za-z0-9_-]+$/', (string) $segment)) {
			return null;
		}
		$path .= '/' . $segment;
	}

	return $path;
}

function wizfds_ensure_dir($path) {
	if ($path === null) {
		return false;
	}
	if (is_dir($path)) {
		return true;
	}
	return @mkdir($path, 0700, true);
}

function nullToEmpty($arg) {
	if(is_null($arg)) {
		return "";
	} else {
		return $arg;
	}
}

function rrmdir($dir) { 
	if (is_dir($dir)) { 
		$objects = scandir($dir); 
		foreach ($objects as $object) { 
			if ($object != "." && $object != "..") { 
				if (is_dir($dir."/".$object))
					rrmdir($dir."/".$object);
				else
					unlink($dir."/".$object); 
			} 
		}
		rmdir($dir); 
	} 
}

function my_shell_exec($cmd, &$stdout=null, &$stderr=null) {
	$proc = proc_open($cmd,[
		1 => ['pipe','w'],
		2 => ['pipe','w'],
	],$pipes);
	$stdout = stream_get_contents($pipes[1]);
	fclose($pipes[1]);
	$stderr = stream_get_contents($pipes[2]);
	fclose($pipes[2]);
	return proc_close($proc);
}

?>
