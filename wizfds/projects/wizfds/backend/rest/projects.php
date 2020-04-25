<?php
require_once("config.php");
require_once("db.php");

function getProjects() {
	$db = new Database();
	$res = new Message("getProjects()");
	$data = array();

	try {
		$result = $db->pg_read("select id, name, description, category_id from projects where user_id=$1 order by name, id", array($_SESSION['user_id']));
		
		foreach($result as $project) {

			# Create new scenarios array for each project
			if(isset($scenarios)) unset($scenarios);
			$scenarios = array();

			$resultScenario = $db->pg_read("select id, project_id, name, fds_file, ac_file, ac_hash from scenarios where project_id=$1 order by name", array($project['id']));

			if(!empty($resultScenario)) {
				foreach($resultScenario as $scenario){
					$hasFDS = $scenario['fds_file'] != "" ? true : false;
					$hasDWG = $scenario['ac_file'] != "" ? true : false;

					# Add to scenarios array
					$scenarios[] = Array(
						"id"=>$scenario['id'],
						"name"=>$scenario['name'],
						"hasFdsFile"=>$hasFDS,
						"hasAcFile"=>$hasDWG
					);
				}
			}

			# Add to projects array
			$data[] = Array(
				"id"=>$project['id'],
				"name"=>$project['name'],
				"description"=>$project['description'],
				"category"=>$project['category_id'], 
				"fdsScenarios"=>$scenarios,
			);
		}

		echo json_encode($res->createResponse("success", array("Projects loaded"), $data));

	} catch(Exception $e) {
		echo json_encode($res->createResponse("error", array("Server error! Projects not loaded"), $data));
	}
}

function createProject() {
	$db = new Database();
	$res = new Message("createProject()");
	$data = array();

	try {

		$result = $db->pg_read("select uuid from categories where user_id=$1 and label='current'", array($_SESSION['user_id']));
		$category_id = empty($result) ? '0000-0000-0000' : $result[0]['uuid'];

		$data = Array(
			"user_id"=>$_SESSION['user_id'],
			"name"=>"New project",
			"description"=>"Project description",
			"category_id"=>$category_id
		);
		
		$result = $db->pg_create("insert into projects(user_id,name,description,category_id) values ($1, $2, $3, $4) returning id", $data);
		
		if(!empty($result)) {
			$id = $result[0]['id'];
			$data['id'] = $id;

			# Create project directory
			$path="~/wizfds_users/". $_SESSION['email'] ."/$id";
			system("mkdir -p $path");

			echo json_encode($res->createResponse("success", array($data['name'] ." created", $path), $data));
		}
		else {
			echo json_encode($res->createResponse("error", array("Server error! Project not created"), $data));
		}
	} catch(Exception $e) {
		echo json_encode($res->createResponse("error", array("Server error! Project not created"), $data));
	}
}

function deleteProject($args) {
	$db = new Database();
	$res = new Message("deleteProject()");
	$data = array();

	try {
		$data = array(
			"id"=>$args['id'],
			"user_id"=>$_SESSION['user_id']
		);

		$result_scenarios = $db->pg_change("delete from scenarios where project_id=$1 and user_id=$2;", $data);
		$result = $db->pg_change("delete from projects where id=$1 and user_id=$2;", $data);

		if(!empty($result)) {
			# Remove project directory
			$path="~/wizfds_users/". $_SESSION['email'] ."/". $data['id'];
			rrmdir($path);

			echo json_encode($res->createResponse("success", array("Project deleted"), $data));
		}
		else {
			echo json_encode($res->createResponse("error", array("Server error! Project not deleted"), $data));
		}
	} catch(Exception $e) {
		echo json_encode($res->createResponse("error", array("Server error! Project not deleted"), $data));
	}
}

function updateProject($args) {
	$db = new Database();
	$res = new Message("updateProject()");
	$data = array();
	
	try {
		$postData = json_decode(file_get_contents('php://input'));
		$data = array(
			"id"=>nullToEmpty($postData->id),
			"name"=>nullToEmpty($postData->name),
			"description"=>nullToEmpty($postData->description),
			"category_id"=>nullToEmpty($postData->category),
			"user_id"=>$_SESSION['user_id']
		);
		
		$result = $db->pg_change("update projects set name=$2, description=$3, category_id=$4 where id=$1 and user_id=$5;", $data);

		if(!empty($result)) {
			echo json_encode($res->createResponse("success", array("Project ". $postData->name ." updated"), $data));
		}
		else {
			echo json_encode($res->createResponse("error", array("Server error! Project not updated"), $data));
		}
	} catch(Exception $e) {
		echo json_encode($res->createResponse("error", array("Server error! Project not updated"), $data));
	}
}

function getCategories($args) {
	$db = new Database();
	$res = new Message("getCategories()");
	$data = array();

	try {
		$result = $db->pg_read("select label, uuid, active, visible from categories where user_id=$1", array($_SESSION['user_id']));
		$data = $result;

		if(!empty($result)) {
			echo json_encode($res->createResponse("info", array("Categories loaded"), $data));
		}
		else {
			echo json_encode($res->createResponse("error", array("Server error! Categories not loaded"), $data));
		}
	} catch(Exception $e) {
		echo json_encode($res->createResponse("error", array("Server error! Project not updated"), $data));
	}
}

function createCategory() {
	$db = new Database();
	$res = new Message("createCategory()");
	$data = array();

	try {
		$data = array(
			"user_id"=>$_SESSION['user_id'],
			"label"=>$postData->label,
			"uuid"=>$postData->uuid,
			"active"=>json_encode(nullToEmpty($postData->active)),
			"visible"=>json_encode(nullToEmpty($postData->visible)),
		);
		
		$result = $db->pg_create("insert into categories (user_id, label, uuid, active, visible) values ($1, $2, $3, $4, $5)", $data);

		if(!empty($result)) {
			echo json_encode($res->createResponse("success", array("Category created"), $data));
		}
		else {
			echo json_encode($res->createResponse("error", array("Server error! Category not created"), $data));
		}
	} catch(Exception $e) {
		echo json_encode($res->createResponse("error", array("Server error! Category not created"), $data));
	}
}

function deleteCategory($args) {
	$db = new Database();
	$res = new Message("deleteCategory()");
	$data = array();
		
	try {
		$data = array(
			"uuid"=>$args['uuid'],
			"user_id"=>$_SESSION['user_id']
		);

		$result = $db->pg_change("delete from categories where uuid=$1 and user_id=$2;", $data);

		if(!empty($result)) {
			echo json_encode($res->createResponse("success", array("Category deleted"), $data));
		}
		else {
			echo json_encode($res->createResponse("error", array("Server error! Category not deleted"), $data));
		}
	} catch(Exception $e) {
		echo json_encode($res->createResponse("error", array("Server error! Category not deleted"), $data));
	}
}

function updateCategory($args) {
	$db = new Database();
	$res = new Message("updateCategory()");
	$data = array();

	try {
		$postData = json_decode(file_get_contents('php://input'));
		$data = array(
			"label"=>nullToEmpty($postData->label),
			"uuid"=>nullToEmpty($postData->uuid),
			"active"=>json_encode(nullToEmpty($postData->active)),
			"visible"=>json_encode(nullToEmpty($postData->visible)),
			"user_id"=>$_SESSION['user_id']
		);

		$result = $db->pg_change("update categories set label=$1, active=$3, visible=$4 where uuid=$2 and user_id=$5;", $data);

		if(!empty($result)) {
			echo json_encode($res->createResponse("info", array("Category updated"), $data));
		}
		else {
			echo json_encode($res->createResponse("error", array("Server error! Category not updated"), $data));
		}
	} catch(Exception $e) {
		echo json_encode($res->createResponse("error", array("Server error! Category not updated"), $data));
	}
}

?>