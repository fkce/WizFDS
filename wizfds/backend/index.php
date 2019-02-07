<?php
# Temporary /*{{{*/
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Max-Age: 1000");

if($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
	header("Access-Control-Allow-Origin: *");
	header("Access-Control-Allow-Methods:GET,POST,PUT,DELETE,OPTIONS");
	header("Access-Control-Allow-Headers: Authorization, Content-Type,Accept, Origin");
	exit;
}

 // Access-Control headers are received during OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
	// return only the headers and not the content
	// only allow CORS if we're doing a GET - i.e. no saving for now.
	if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD']) && $_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD'] == 'GET') {
		header('Access-Control-Allow-Origin: *');
		header('Access-Control-Allow-Headers: X-Requested-With');
	}
	exit;
}
/*}}}*/
# Router manual:
# https://github.com/nikic/FastRoute

# Start session
session_name('wizfds');
if (session_status() == PHP_SESSION_NONE) {
	session_start();
}

# Only for developing purpose
#$_SESSION['user_id'] = 1;
#$_SESSION['email'] = "mateusz.fliszkiewicz@fkce.pl";

# Include db connection
require_once("db.php");
$db=new Database();

# Keep alive session while rest requests
if(isset($_SESSION['user_id']) and $_SESSION['user_id'] != "") {
	$result = $db->pg_read("SELECT session_id, access_time, access_ip FROM users where id = ". $_SESSION['user_id'] .";");
	extract($result[0]);

	if($session_id == ""){
		$update=$db->pg_change("UPDATE users SET session_id = '". session_id('wizfds') ."', access_time = current_timestamp, access_ip = '". $_SERVER['REMOTE_ADDR'] ."' where id = ". $_SESSION['user_id'] .";");
	} else {
		$check=$db->pg_read("SELECT access_time from users where current_timestamp - access_time < INTERVAL '20 minutes' and id = ". $_SESSION['user_id'] .";");
		if(count($check) > 0){
			$update=$db->pg_change("UPDATE users SET access_time = current_timestamp where id = ". $_SESSION['user_id'] .";");
		}
	}

	$now = time();
	if (isset($_SESSION['discard_after']) && $now > $_SESSION['discard_after']) {
		# This session has worn out its welcome; kill it and start a brand new one
		session_unset();
		session_destroy();
		session_name('wizfds');
		session_start();
	}
	# Either new or old, it should live at most for another hour
	$_SESSION['discard_after'] = $now + 3600;
}

require_once("router/vendor/autoload.php");

require_once("rest/main.php");
require_once("rest/utils.php");

require_once("rest/projects.php");
require_once("rest/fds.php");

function main() {

	if(isset($_SESSION['user_id'])){
		$dispatcher = FastRoute\simpleDispatcher(function(FastRoute\RouteCollector $r) {
			$r->addRoute('GET'    , '/'                             , 'getIndex');

			$r->addRoute('GET'    , '/login'                        , 'login');
			$r->addRoute('POST'   , '/login'                        , 'login');
			$r->addRoute('GET'    , '/logout'                       , 'logout');

			$r->addRoute('GET'    , '/api/projects'                 , 'getProjects');
			$r->addRoute('POST'   , '/api/project'                  , 'createProject');
			$r->addRoute('DELETE' , '/api/project/{id}'             , 'deleteProject');
			$r->addRoute('PUT'    , '/api/project/{id}'             , 'updateProject');

			$r->addRoute('PUT'    , '/api/fdsScenario/{id}'         , 'updateScenario');
			$r->addRoute('POST'   , '/api/fdsScenario/{project_id}' , 'createScenario');
			$r->addRoute('DELETE' , '/api/fdsScenario/{id}'         , 'deleteScenario');
			$r->addRoute('GET'    , '/api/fdsScenario/{id}'         , 'getScenario');

			$r->addRoute('POST'   , '/api/objtotext'                , 'fdsObjectToText');
			$r->addRoute('POST'   , '/api/texttoobj'                , 'fdsTextToObject');

			$r->addRoute('POST'   , '/api/runfdssimulation'         , 'runFdsSimulaion');

			$r->addRoute('GET'    , '/api/settings'                 , 'getSettings');
			$r->addRoute('PUT'    , '/api/settings/{id}'            , 'updateSettings');

			$r->addRoute('GET'    , '/api/categories'               , 'getCategories');
			$r->addRoute('POST'   , '/api/category'                 , 'createCategory');
			$r->addRoute('DELETE' , '/api/category/{uuid}'          , 'deleteCategory');
			$r->addRoute('PUT'    , '/api/category/{uuid}'          , 'updateCategory');

			$r->addRoute('GET'    , '/api/library'                  , 'getLibrary');
			$r->addRoute('PUT'    , '/api/library'                  , 'updateLibrary');
		});

	} else {
		$dispatcher = FastRoute\simpleDispatcher(function(FastRoute\RouteCollector $r) {
			$r->addRoute('GET'  , '/'      , 'getFrontPage');
			$r->addRoute(['GET', 'POST']  , '/login'      , 'login');
			$r->addRoute('GET'  , '/{nothing:.+}'      , 'getFrontPage');
		});
 	}

	// Fetch method and URI from somewhere
	$httpMethod = $_SERVER['REQUEST_METHOD'];
	$uri = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

	$routeInfo = $dispatcher->dispatch($httpMethod, $uri);

	switch ($routeInfo[0]) {
	    case FastRoute\Dispatcher::NOT_FOUND:
			header("HTTP/1.0 404 Not Found");		
			break;
	    case FastRoute\Dispatcher::METHOD_NOT_ALLOWED:
			$allowedMethods = $routeInfo[1];
			header("HTTP/1.0 405 Method Not Allowed");		
			break;
	    case FastRoute\Dispatcher::FOUND:
			$handler = $routeInfo[1];
			$vars = $routeInfo[2]; 
			call_user_func($handler, $vars);
			break;
	}
}

main();

?>
