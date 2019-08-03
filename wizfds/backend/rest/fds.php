<?php 
require_once("config.php");
require_once("db.php");

function createScenario($args) { 
	$db = new Database();
	$res = new Message("createScenario()");
	$data = array();

	try {
		$postData = json_decode(file_get_contents('php://input'));
		$data = array(
			"projectId"=>nullToEmpty($args['project_id']),
			"name"=>"New FDS scenario",
			"fdsFile"=>"",
			"fdsObject"=>"",
			"uiState"=>"",
			"acFile"=>"",
			"acPath"=>"",
			"user_id"=>$_SESSION['user_id']
		);
		$result = $db->pg_create("insert into scenarios(project_id, name, fds_file, fds_object, ui_state, ac_file, ac_hash, user_id) values ($1, $2, $3, $4, $5, $6, $7, $8) returning id", $data);

		if(!empty($result)) {
			$id = $result[0]['id'];
			$data['id'] = $id;

			# Create directory with scenario
			$path = "~/wizfds_users/". $_SESSION['email'] ."/". $args['project_id'] ."/fds/$id";
			system("mkdir -p $path");

			echo json_encode($res->createResponse("success", array($data['name'] ." created"), $data));
		}
		else {
			echo json_encode($res->createResponse("error", array("Server error! Scenario was not created"), $data));
		}
	} catch(Exception $e) {
		echo json_encode($res->createResponse("error", array("Server error! Scenario was not created"), $data));
	}
}

function updateScenario($args) {
	$db = new Database();
	$res = new Message("updateScenario()");
	$data = array();

	try {
		$postData = json_decode(file_get_contents('php://input'));

		if($postData->type == "head") {
			$data = Array(
				"id"=>nullToEmpty($postData->data->id),
				"name"=>nullToEmpty($postData->data->name),
				"user_id"=>$_SESSION['user_id']
			);
			$result = $db->pg_change("update scenarios set name=$2 where id=$1 and user_id=$3;", $data);

		} 
		else if($postData->type == "input") {
			$data = Array(
				"id"=>nullToEmpty($postData->data->id),
				"fdsFile"=>nullToEmpty($postData->data->fdsFile),
				"user_id"=>$_SESSION['user_id']
			);
			$result = $db->pg_change("update scenarios set fds_file=$2 where id=$1 and user_id=$3;", $data);
		}
		else {
			$data = Array(
				"id"=>nullToEmpty($args['id']),
				"name"=>nullToEmpty($postData->data->name),
				"fdsFile"=>nullToEmpty($postData->data->fdsFile),
				"fdsObject"=>json_encode(nullToEmpty($postData->data->fdsObject)),
				"uiState"=>json_encode(nullToEmpty($postData->data->uiState)),
				"acFile"=>nullToEmpty($postData->data->acFile),
				"acPath"=>nullToEmpty($postData->data->acPath),
				"user_id"=>$_SESSION['user_id']
			);
			$result = $db->pg_change("update scenarios set name=$2, fds_file=$3, fds_object=$4, ui_state=$5, ac_file=$6, ac_hash=$7 where id=$1 and user_id=$8;", $data);

			# Assign not encoded values after db update
			$data['uiState'] = $postData->data->uiState;
			$data['fdsObject'] = $postData->data->fdsObject;
		}

		if(!empty($result)) {
			echo json_encode($res->createResponse("success", array("Scenario ". $postData->data->name ." updated"), $data));
		}
		else {
			echo json_encode($res->createResponse("error", array("Server error! Scenario not updated"), $data));
		}
	} catch(Exception $e) {
			echo json_encode($res->createResponse("error", array("Server error! Scenario not updated"), $data));
	}
}

function deleteScenario($args) {
	$db = new Database();
	$res = new Message("deleteScenario()");
	$data = array();

	try {
		$data = Array(
			"id"=>$args['id'],
			"user_id"=>$_SESSION['user_id']
		);

		$result_project = $db->pg_read("select project_id from scenarios where id=$1 and user_id=$2", $data);
		$result = $db->pg_change("delete from scenarios where id=$1 and user_id=$2;", $data);

		if(!empty($result)) {
			# Remove scenario directory
			$path = "~/wizfds_users/". $_SESSION['email'] ."/". $result_project[0]['project_id'] ."/fds/". $args['id'];
			rrmdir($path);

			echo json_encode($res->createResponse("success", array("Scenario deleted"), $data));
		}
		else {
			echo json_encode($res->createResponse("error", array("Server error! Scenario not deleted"), $data));
		}
	} catch(Exception $e) {
		echo json_encode($res->createResponse("error", array("Server error! Scenario not deleted"), $data));
	}
}

function getScenario($args) {
	$db = new Database();
	$res = new Message("deleteScenario()");
	$data = array();

	try {
		$data = array(
			"id"=>nullToEmpty($args['id']),
			"user_id"=>$_SESSION['user_id']
		);
		
		$result = $db->pg_read("select id, project_id, name, fds_file, fds_object, ui_state, ac_file, ac_hash from scenarios where id=$1 and user_id=$2", $data);

		if(!empty($result)) {
			# Create new response data object
			$data = array(
				"id"=>$result[0]['id'],
				"projectId"=>$result[0]['project_id'],
				"name"=>$result[0]['name'],
				"fdsFile"=>$result[0]['fds_file'],
				"fdsObject"=>json_decode($result[0]['fds_object']),
				"uiState"=>json_decode($result[0]['ui_state']),
				"acFile"=>$result[0]['ac_file'],
				"acPath"=>$result[0]['ac_hash']
			);

			echo json_encode($res->createResponse("info", array("Scenario ".$result[0]['name'] ." loaded"), $data));
		}
		else {
			echo json_encode($res->createResponse("error", array("Server error! Scenario not loaded"), $data));
		}
	} catch(Exception $e) {
		echo json_encode($res->createResponse("error", array("Server error! Scenario not loaded"), $data));
	}
}

function runFdsSimulaion($args){
	$res = new Message("runFdsSimulation()");
	$data = array();
	echo json_encode($res->createResponse("info", array("Function not active"), $data));
	return;

	#$allowedId = array(1);
	#if(in_array((int)$_SESSION['user_id'], $allowedId)) { }
}

function getLibrary($args) {
	$db = new Database();
	$res = new Message("getLibrary()");
	$data = array();

	try {
		$data = array(
			"user_id"=>nullToEmpty($_SESSION['user_id'])
		);
		
		$result = $db->pg_read("select id, json from library where user_id=$1", $data);

		if(!empty($result)) {
			# Create new response data object
			$data = json_decode($result[0]['json']);

			echo json_encode($res->createResponse("info", array("Library loaded"), $data));
		}
		else {
			echo json_encode($res->createResponse("error", array("Server error! Library not loaded"), $data));
		}
	} catch(Exception $e) {
		echo json_encode($res->createResponse("error", array("Server error! Library not loaded"), $data));
	}
}

function updateLibrary($args) {
	$db = new Database();
	$res = new Message("updateLibrary()");
	$data = array();

	try {
		$postData = json_decode(file_get_contents('php://input'));
		$data = array(
			nullToEmpty($_SESSION['user_id']), 
			nullToEmpty($postData)
		);

		# Check if isset library object in db for user
		$result = $db->pg_read("select id from library where user_id=$1", array($data[0]));
		if(empty($result)) {
			$db->pg_create("insert into library (user_id) values ($1)", array($data[0]));
		}

		$result = $db->pg_change("update library set json=$2 where user_id=$1;", $data);

		if(!empty($result)) {
			# Create new response data object
			$data = $data[1];

			echo json_encode($res->createResponse("info", array("Library updated"), $data));
		}
		else {
			echo json_encode($res->createResponse("error", array("Server error! Library not updated"), $data));
		}
	} catch(Exception $e) {
		echo json_encode($res->createResponse("error", array("Server error! Library not updated"), $data));
	}
}

?>
