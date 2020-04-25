<?php
require_once("config.php");
require_once("db.php");

function getFrontPage() {
	include("welcome/index.html");
}

function getIndex() {
	include("view/index.php");
}

function login() {
	include("login.php");
}

function register() {
	session_destroy(); $_SESSION=""; session_name("wizfds"); session_start();  
	$_REQUEST['addUserShowForm'] = '';
	include("login.php");
}

function logout() {
	session_destroy(); $_SESSION=''; session_start();  
	header("Location: https://wizfds.com");
}

function refreshSession() {
	$res = new Message("refreshSession()");
	$data = array();
	echo json_encode($res->createResponse("success", array("Session refreshed"), $data));
}

// SETTINGS
function getSettings($args) {
	$db = new Database();
	$res = new Message("getSettings()");
	$data = array();

	$result=$db->pg_read("select username, editor, websocket_host, websocket_port, email, tooltips from users where id=$1", array($_SESSION['user_id']));
	
	if(!empty($result)) {
		extract($result[0]);
		$data = array(
			"userId" => $_SESSION['user_id'],
			"userName" => $username,
			"editor" => $editor,
			"websocketHost" => $websocket_host,
			"websocketPort" => $websocket_port,
			"email" => $email,
			"tooltips" => $tooltips
		);
		echo json_encode($res->createResponse("info", array("Settings loaded"), $data));
	}
	else {
		echo json_encode($res->createResponse("error", array("Server error! Settings not loaded"), $data));
	}
}

function updateSettings($args) {
	$db = new Database();
	$res = new Message("updateSettings()");
	$data = array();

	try {
		$postData=json_decode(file_get_contents('php://input'));
		$data=Array(
			"id" => $_SESSION['user_id'],
			"userName" => nullToEmpty($postData->userName),
			"editor" => nullToEmpty($postData->editor),
			"websocket_host" => nullToEmpty($postData->websocket->host),
			"websocket_port" => nullToEmpty($postData->websocket->port),
			"email" => nullToEmpty($postData->email),
			"tooltips" => nullToEmpty($postData->tooltips)
		);
		
		$result=$db->pg_change("update users set username=$2, editor=$3, websocket_host=$4, websocket_port=$5, email=$6, tooltips=$7 where id=$1;", $data);

		if(!empty($result)) {
			echo json_encode($res->createResponse("info", array("Settings updated"), $data));
		}
		else {
			echo json_encode($res->createResponse("error", array("Server error! Settings not updated"), $data));
		}
	} catch(Exception $e) {
		echo json_encode($res->createResponse("error", array("Server error! Settings not updated"), $data));
	}
}

?>