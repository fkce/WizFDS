<?php
# Gate for the /view/ layout. Goes through the shared bootstrap so a session
# cookie is never issued here without the hardened flags.
require_once("lib/session.php");
wizfds_session_start();

if (isset($_SESSION['user_id']) and $_SESSION['user_id'] != '') {
	include('index.html');
} else {
	header('Location: https://wizfds.com/welcome');
}
