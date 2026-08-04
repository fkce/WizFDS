<?php
require_once("config.php");
require_once("db.php");

function getProjects() {
	$db = new Database();
	$res = new Message("getProjects()");
	$data = array();

	try {
		# One query for the whole tree. This used to be a query per project, so an
		# account with 500 projects paid 501 round trips to open its project list.
		# Only the two booleans the client needs are computed, not the file bodies.
		$result = $db->pg_read(
			"select p.id, p.name, p.description, p.category_id,
			        s.id as scenario_id, s.name as scenario_name,
			        coalesce(s.fds_file, '') <> '' as has_fds,
			        coalesce(s.ac_file, '') <> '' as has_ac
			   from projects p
			   left join scenarios s on s.project_id = p.id
			  where p.user_id = $1
			  order by p.name, p.id, s.name",
			array($_SESSION['user_id'])
		);

		# The join repeats each project once per scenario; fold the rows back into
		# the nested shape the client expects, keeping the order the query gave.
		$projects = array();
		foreach($result as $row) {
			$id = $row['id'];

			if(!isset($projects[$id])) {
				$projects[$id] = Array(
					"id"=>$id,
					"name"=>$row['name'],
					"description"=>$row['description'],
					"category"=>$row['category_id'],
					"fdsScenarios"=>array(),
				);
			}

			# A project with no scenarios still produces one row, with nulls in the
			# scenario columns.
			if($row['scenario_id'] !== null) {
				$projects[$id]['fdsScenarios'][] = Array(
					"id"=>$row['scenario_id'],
					"name"=>$row['scenario_name'],
					"hasFdsFile"=>$row['has_fds'] === 't',
					"hasAcFile"=>$row['has_ac'] === 't'
				);
			}
		}
		$data = array_values($projects);

		echo json_encode($res->createResponse("success", array("Projects loaded"), $data));

	} catch(Throwable $e) {
		handlerFailed($res, $e, "Server error! Projects not loaded", $data);
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
			$path = wizfds_user_dir(new Config(), $_SESSION['email'], array($id));
			if (!wizfds_ensure_dir($path)) {
				wizfds_log('warning', 'project directory not created', array('project_id' => $id));
			}

			echo json_encode($res->createResponse("success", array($data['name'] ." created"), $data));
		}
		else {
			echo json_encode($res->createResponse("error", array("Server error! Project not created"), $data));
		}
	} catch(Throwable $e) {
		handlerFailed($res, $e, "Server error! Project not created", $data);
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

		# Both deletes or neither: a failure between them used to leave the
		# scenarios behind with no project to reach them from.
		$result = $db->transaction(function() use ($db, $data) {
			$db->pg_change("delete from scenarios where project_id=$1 and user_id=$2;", $data);
			return $db->pg_change("delete from projects where id=$1 and user_id=$2;", $data);
		});

		if(!empty($result)) {
			# Remove project directory. The path used to be spelled "~/wizfds_users/…",
			# which PHP does not expand, so nothing was ever deleted.
			wizfds_remove_dir(new Config(), $_SESSION['email'], array($data['id']));

			echo json_encode($res->createResponse("success", array("Project deleted"), $data));
		}
		else {
			echo json_encode($res->createResponse("error", array("Server error! Project not deleted"), $data));
		}
	} catch(Throwable $e) {
		handlerFailed($res, $e, "Server error! Project not deleted", $data);
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
	} catch(Throwable $e) {
		handlerFailed($res, $e, "Server error! Project not updated", $data);
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
	} catch(Throwable $e) {
		handlerFailed($res, $e, "Server error! Project not updated", $data);
	}
}

function createCategory() {
	$db = new Database();
	$res = new Message("createCategory()");
	$data = array();

	try {
		# This used to read from an undefined $postData, so every category was
		# created with null columns.
		$postData = json_decode(file_get_contents('php://input'));
		$data = array(
			"user_id"=>$_SESSION['user_id'],
			"label"=>nullToEmpty($postData->label),
			"uuid"=>nullToEmpty($postData->uuid),
			"active"=>json_encode(nullToEmpty($postData->active)),
			"visible"=>json_encode(nullToEmpty($postData->visible)),
		);
		
		# "returning id" is what makes pg_fetch_all give a row back; without it the
		# insert succeeded but the client was told the category had not been created.
		$result = $db->pg_create("insert into categories (user_id, label, uuid, active, visible) values ($1, $2, $3, $4, $5) returning id", $data);

		if(!empty($result)) {
			echo json_encode($res->createResponse("success", array("Category created"), $data));
		}
		else {
			echo json_encode($res->createResponse("error", array("Server error! Category not created"), $data));
		}
	} catch(Throwable $e) {
		handlerFailed($res, $e, "Server error! Category not created", $data);
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
	} catch(Throwable $e) {
		handlerFailed($res, $e, "Server error! Category not deleted", $data);
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
	} catch(Throwable $e) {
		handlerFailed($res, $e, "Server error! Category not updated", $data);
	}
}

?>
