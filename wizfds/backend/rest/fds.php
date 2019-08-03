<?php 
require_once("config.php");
require_once("db.php");

function createScenario($args) { 

	$db = new Database();
	$res = new Message("createScenario()");
	$data = array();

	try {
		$postData=json_decode(file_get_contents('php://input'));
		$data=array(
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

			# ????
			//$decoded_ui=json_decode($data['ui_state']);
			//$data['ui_state']=$decoded_ui;

			echo json_encode($res->createResponse("success", array($data['name'] ." created"), $data));
		}
		else {
			echo json_encode($res->createResponse("success", array("Server error! Project was not created properly"), $data));
		}
	} catch(Exception $e) {
		echo json_encode($res->createResponse("success", array("Server error! Project was not created properly"), $data));
	}
}

	function updateScenario($args) {/*{{{*/
		global $db;
		$result = "";

		$post = file_get_contents('php://input');

		try {
			$postData=json_decode($post);
			if($postData->type=="head") {
				$data=Array(
					"id"=>nullToEmpty($postData->data->id),
					"name"=>nullToEmpty($postData->data->name),
					"user_id"=>$_SESSION['user_id']
				);
				$db_result=$db->pg_change("update scenarios set name=$2 where id=$1 and user_id=$3;", $data);

			} 
			else if($postData->type=="input") {
				$data=Array(
					"id"=>nullToEmpty($postData->data->id),
					"fdsFile"=>nullToEmpty($postData->data->fdsFile),
					"user_id"=>$_SESSION['user_id']
				);
				$db_result=$db->pg_change("update scenarios set fds_file=$2 where id=$1 and user_id=$3;", $data);
			}
			else {
				$data=Array(
					"id"=>nullToEmpty($args['id']),
					"name"=>nullToEmpty($postData->data->name),
					"fdsFile"=>nullToEmpty($postData->data->fdsFile),
					"fdsObject"=>json_encode(nullToEmpty($postData->data->fdsObject)),
					"uiState"=>json_encode(nullToEmpty($postData->data->uiState)),
					"acFile"=>nullToEmpty($postData->data->acFile),
					"acPath"=>nullToEmpty($postData->data->acPath),
					"user_id"=>$_SESSION['user_id']
				);
				$db_result=$db->pg_change("update scenarios set name=$2, fds_file=$3, fds_object=$4, ui_state=$5, ac_file=$6, ac_hash=$7 where id=$1 and user_id=$8;", $data);
			}
			
		} catch(Exception $e) {
			$result="error";
		}
		
		if($result!="error" && $db_result==1) {
			if($postData->type != "head") {
				$data['uiState']=$postData->data->uiState;
				$data['fdsObject']=$postData->data->fdsObject;
			}
			
			$res=Array(
				"meta"=>Array(
					"status" => "success",
					"from" => "updateScenario()",
					"details" => Array("Scenario ".$postData->data->name." updated sucessfully")
				),
				"data"=>$data
			);
		} else {
			$res=Array(
				"meta"=>Array(
					"status" => "error",
					"from" => "updateScenario()",
					"details" => Array("Server error! Scenario not updated")
				),
				"data"=>array()
			);
		}
		echo json_encode($res);	
	}
/*}}}*/
	function deleteScenario($args) {/*{{{*/

		try {
			$data=Array(
				"id"=>$args['id'],
				"user_id"=>$_SESSION['user_id']
			);
			global $db;
			$db_result_projects=$db->pg_read("select project_id from scenarios where id=$1 and user_id=$2", $data);
			$db_result_scenarios=$db->pg_change("delete from scenarios where id=$1 and user_id=$2;", $data);
			$result="success";

		} catch(Exception $e) {
			$result="error";
		}
		if($result!="error" && $db_result_scenarios==1) {
			// Usun katalog scenariusza
			$path="~/wizfds_users/".$_SESSION['email']."/".$db_result_projects[0]['project_id']."/fds/".$args['id'];
			rrmdir($path);

			$res=Array(
				"meta"=>Array(
					"status" => "success",
					"from" => "deleteScenario()",
					"details" => Array("Scenario deleted")
				),
				"data"=>$data
			);
		} else {
			$res=Array(
				"meta"=>Array(
					"status" => "error",
					"from" => "deleteScenario()",
					"details" => Array("Server error! Scenario not deleted")
				),
				"data"=>array()
			);
		}
		echo json_encode($res);	
	}
/*}}}*/
	function getScenario($args) {/*{{{*/

		$result = "";

		try {
			$post=file_get_contents('php://input');
			$data=Array(
				"id"=>nullToEmpty($args['id']),
				"user_id"=>$_SESSION['user_id']
			);
			
			global $db;
			$db_result=$db->pg_read("select id, project_id, name, fds_file, fds_object, ui_state, ac_file, ac_hash from scenarios where id=$1 and user_id=$2", $data);

		} catch(Exception $e) {
			$result="error";
		}

		if($result!="error" && !is_null($db_result)) {
			
			$decoded_ui=json_decode($db_result[0]['ui_state']);
			$decoded_object=json_decode($db_result[0]['fds_object']);

			$res_data=array(
				"id"=>$db_result[0]['id'],
				"projectId"=>$db_result[0]['project_id'],
				"name"=>$db_result[0]['name'],
				"fdsFile"=>$db_result[0]['fds_file'],
				"fdsObject"=>$decoded_object,
				"uiState"=>$decoded_ui,
				"acFile"=>$db_result[0]['ac_file'],
				"acPath"=>$db_result[0]['ac_hash']
			);

			$res=Array(
				"meta"=>Array(
					"status" => "info",
					"from" => "getScenario()",
					"details" => Array("Scenario ".$db_result[0]['name']." loaded")
				),
				"data"=>$res_data
			);
		} else {
			$res=Array(
				"meta"=>Array(
					"status" => "error",
					"from" => "getScenario()",
					"details" => Array("Server error! Scenario not loaded")
				),
				"data"=>array()
			);

		}
		echo json_encode($res);	
	}
/*}}}*/
function runFdsSimulaion($args){/*{{{*/
		global $db;

		// Sprawdz czy ma dostep do obliczen
		//$allowedId = array(1, 3, 4, 5, 6, 10);
		$allowedId = array(1);

		if(!in_array((int)$_SESSION['user_id'], $allowedId)) {
			$res=Array(
				"meta"=>Array(
					"status" => "error",
					"from" => "runFdsSimulaion()",
					"details" => Array("You have no permission to run sumulations")
				),
				"data"=>""
			);
		}
		else {
			$post=json_decode(file_get_contents('php://input'),1);
			//$text=json2fds($post);

			$res=Array(
				"meta"=>Array(
					"status" => "success",
					"from" => "runFdsSimulaion()",
					"details" => Array("Simulation run")
				),
				"data"=>""
			);

			// zapisz do katalogu uzytkownika
			$path="~/wizfds_users/".$_SESSION['email']."/".$post['project_id']."/fds/".$post['id'];
			system("mkdir -p $path");
			array_map('unlink', glob("$path/*.fds"));

			$text.="\nFDSVER=6";
			$text.="\nPATH='".$_SESSION['email']."/".$post['project_id']."/fds/".$post['id']."'";

			file_put_contents("$path/".$post['fds_object']['general']['head']['chid'].".fds", $text);

			// tutaj run sim ... powinna symulacja uruchamiac się w folderze projektu nie w /mnt/duch/obliczenia ...
			// trzeba zmienic na folder users w /mnt/duch/obliczenia
			system("cp $path/".$post['fds_object']['general']['head']['chid'].".fds /mnt/fds/tmp/");
			system("sudo -u mimooh /usr/bin/python /mnt/fds/bin/admin.py -n -v 6 &");
		}

		echo json_encode($res);	
}/*}}}*/
// JSON <--> FDS
function fdsObjectToText($args) {/*{{{*/
		// przyjmuje caly scenariusz, przekształca reprezentację obiektową ze scenario.fds_object na tekst i wstawia pod scenario.fds_file, odsyła cały scenariusz. Ewentualnie koryguje błędy w fds_object
		global $db;

		$_SESSION['user_id'] = 1;
		$user_id=$_SESSION['user_id'];


		$post = json_decode(file_get_contents('php://input'),true);

		//$text=json2fds($post);

		$res=Array(
			"meta"=>Array(
				"status" => "success",
				"from" => "fdsObjectToText()",
				"details" => array("FDS file updated")
			),
			"data"=>$text
		);

		//$text.="\nFDSVER=6";
		//$text.="\nPATH='".$_SESSION['email']."/".$post['project_id']."/fds/".$post['id']."'";

		//// zapisz do katalogu uzytkownika
		//$path="~/wizfds_users/".$_SESSION['email']."/".$post['project_id']."/fds/".$post['id'];
		//system("mkdir -p $path");
		//array_map('unlink', glob("$path/*.fds"));
		//file_put_contents("~/wizfds_users/".$_SESSION['email']."/".$post['project_id']."/fds/".$post['id']."/".$post['fds_object']['general']['head']['chid'].".fds", $text);

		echo json_encode($res);	
}
/*}}}*/
function fdsTextToObject($args) {/*{{{*/

		// przyjmuje caly scenariusz, przekształca reprezentację tekstowa ze scenario.fds_file na obiekt i wstawia pod scenario.fds_object, odsyła cały scenariusz. Ewentualnie koryguje błędy w fds_file
		global $db;
		$post=json_decode(file_get_contents('php://input'),1);

		$text=$post;

		$res=Array(
			"meta"=>Array(
				"status" => "success",
				"from" => "fdsTextToObject()",
				"details" => array()
			),
			"data"=>$text
		);
		echo json_encode($res);	
}
/*}}}*/
// LIBRARY FDS
function getLibrary($args) {/*{{{*/

		$user_id=$_SESSION['user_id'];

		try {
			$post=file_get_contents('php://input');
			$data=Array(
				"user_id"=>nullToEmpty($user_id)
			);
			
			global $db;
			$db_result=$db->pg_read("select id, json from library where user_id=$1", $data);
			$result="success";

		} catch(Exception $e) {
			$result="error";
		}

		if($result!="error" && !is_null($db_result)) {
			$decoded_library=json_decode($db_result[0]['json']);
			$res_data=$decoded_library;

			$res=Array(
				"meta"=>Array(
					"status" => "info",
					"from" => "getLibrary()",
					"details" => Array("Library loaded")
				),
				"data"=>$res_data
			);
		} else {
			$res=Array(
				"meta"=>Array(
					"status" => "error",
					"from" => "getLibrary()",
					"details" => Array("Server error! Library not loaded")
				),
				"data"=>array()
			);

		}
		echo json_encode($res);	
}/*}}}*/
function updateLibrary($args) {/*{{{*/

		global $db;
		$post=file_get_contents('php://input');
		$user_id=$_SESSION['user_id'];

		try {
			$data=Array(nullToEmpty($user_id), nullToEmpty($post));

			$db_result=$db->pg_read("select id from library where user_id=$1", Array($data[0]));
			if($db_result == ''){
				$db->pg_create("insert into library (user_id) values ($1)", Array($data[0]));
			}

			$db_result=$db->pg_change("update library set json=$2 where user_id=$1;", $data);
			$result="success";
			
		} catch(Exception $e) {
			$result="error";
		}

		error_log($result);
		
		if($result!="error" && $db_result==1) {
			$res=Array(
				"meta"=>Array(
					"status" => "success",
					"from" => "updateLibrary()",
					"details" => array("Library updated")
				),
				"data"=>$data[1]
			);
		} else {
			$res=Array(
				"meta"=>Array(
					"status" => "error",
					"from" => "updateLibrary()",
					"details" => array("Server error! Library nor updated")
				),
				"data"=>array()
			);
		}
		echo json_encode($res);	

}/*}}}*/


?>
