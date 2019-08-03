<?php
// MAIN
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

// SETTINGS
function getSettings($args) {
	$user_id=$_SESSION['user_id'];

	global $db;
	$result=$db->pg_read("select username, editor, websocket_host, websocket_port, email, tooltips from users where id=$1", array($user_id));
	extract($result[0]);
	
	$answer=Array(
		"meta"=>Array(
			"status" => "info",
			"from" => "getSettings()",
			"details" => Array("Settings loaded")
		),
		"data"=>Array(
			"userId" => $user_id,
			"userName" => $username,
			"editor" => $editor,
			"websocketHost" => $websocket_host,
			"websocketPort" => $websocket_port,
			"email" => $email,
			"tooltips" => $tooltips
		)
	);
	echo json_encode($answer);	
}

function updateSettings($args) {
	$user_id=$_SESSION['user_id'];
	$post=file_get_contents('php://input');

	try {
		$postData=json_decode($post);

		$data=Array(
			"id" => $user_id,
			"userName" => nullToEmpty($postData->userName),
			"editor" => nullToEmpty($postData->editor),
			"websocket_host" => nullToEmpty($postData->websocket->host),
			"websocket_port" => nullToEmpty($postData->websocket->port),
			"email" => nullToEmpty($postData->email),
			"tooltips" => nullToEmpty($postData->tooltips)
		);
		
		global $db;
		$result=$db->pg_change("update users set username=$2, editor=$3, websocket_host=$4, websocket_port=$5, email=$6, tooltips=$7 where id=$1;", $data);

	} catch(Exception $e) {
		$result = "error";
	}

	if($result != "error" && $result > 0) {
		$answer=Array(
			"meta"=>Array(
				"status" => "success",
				"from" => "updateSettings()",
				"details" => Array("User settings have been successfully updated")
			),
			"data"=>$data
		);
	} else {
		$answer=Array(
			"meta"=>Array(
				"status" => "error",
				"from" => "updateSettings()",
				"details" => Array("An error has occur - settings were not saved properly")
			),
			"data" => Array()
		);
	}
	echo json_encode($answer);	
}

?>
