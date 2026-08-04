<?php
# Router manual:
# https://github.com/nikic/FastRoute

require_once("lib/session.php");
require_once("lib/logger.php");

wizfds_session_start();

# Only for developing purpose
#$_SESSION['user_id'] = 1;
#$_SESSION['email'] = "mateusz.fliszkiewicz@fkce.pl";

# Include db connection
require_once("db.php");

require_once("router/vendor/autoload.php");

require_once("rest/main.php");
require_once("rest/utils.php");

require_once("rest/projects.php");
require_once("rest/fds.php");

# A browser will not attach a custom header to a cross-site request without a
# CORS preflight, which this server never approves - so requiring one on writes
# is what stands between a session cookie and a forged request. The login form
# posts to /login, outside /api, and is unaffected.
function requireXhrHeader($httpMethod, $uri) {
	if (!in_array($httpMethod, array('POST', 'PUT', 'DELETE'), true)) {
		return;
	}
	if (strpos($uri, '/api/') !== 0) {
		return;
	}
	if (isset($_SERVER['HTTP_X_REQUESTED_WITH'])) {
		return;
	}

	wizfds_log('warning', 'request without X-Requested-With rejected');

	http_response_code(403);
	header('Content-Type: application/json');
	$res = new Message("csrf");
	echo json_encode($res->createResponse("error", array("Request rejected"), array()));
	exit;
}

# Keep alive session while rest requests
function refreshSessionActivity($db) {
	if (!isset($_SESSION['user_id']) or $_SESSION['user_id'] == "") {
		return;
	}

	# The demo account is shared and read-only; there is no point recording one
	# visitor's activity over another's, and the write would be refused anyway.
	if ($db->isReadOnly()) {
		return;
	}

	$result = $db->pg_read("SELECT session_id, access_time, access_ip FROM users where id = $1;", array($_SESSION['user_id']));
	if (empty($result)) {
		return;
	}
	extract($result[0]);

	if ($session_id == "") {
		$db->pg_change(
			"UPDATE users SET session_id = $1, access_time = current_timestamp, access_ip = $2 where id = $3;",
			array(session_id(), $_SERVER['REMOTE_ADDR'], $_SESSION['user_id'])
		);
	} else {
		$check = $db->pg_read("SELECT access_time from users where current_timestamp - access_time < INTERVAL '60 minutes' and id = $1;", array($_SESSION['user_id']));
		if (!empty($check)) {
			$db->pg_change("UPDATE users SET access_time = current_timestamp where id = $1;", array($_SESSION['user_id']));
		}
	}

	$now = time();
	if (isset($_SESSION['discard_after']) && $now > $_SESSION['discard_after']) {
		# This session has worn out its welcome; kill it and start a brand new one
		wizfds_session_reset();
	}
	# Either new or old, it should live at most for another hour
	$_SESSION['discard_after'] = $now + 3600;
}

function main() {

	$httpMethod = $_SERVER['REQUEST_METHOD'];
	$uri = rawurldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

	requireXhrHeader($httpMethod, $uri);

	$db = new Database();
	refreshSessionActivity($db);

	if(isset($_SESSION['user_id'])){
		$dispatcher = FastRoute\simpleDispatcher(function(FastRoute\RouteCollector $r) {
			$r->addRoute('GET'    , '/'                             , 'getIndex');

			$r->addRoute(['GET', 'POST']    , '/login'                        , 'login');
			$r->addRoute(['GET', 'POST']   , '/register'                     , 'register');
			$r->addRoute('GET'    , '/logout'                       , 'logout');

			$r->addRoute('GET'    , '/api/projects'                 , 'getProjects');
			$r->addRoute('POST'   , '/api/project'                  , 'createProject');
			$r->addRoute('DELETE' , '/api/project/{id}'             , 'deleteProject');
			$r->addRoute('PUT'    , '/api/project/{id}'             , 'updateProject');

			$r->addRoute('PUT'    , '/api/fdsScenario/{id}'         , 'updateScenario');
			$r->addRoute('POST'   , '/api/fdsScenario/{project_id}' , 'createScenario');
			$r->addRoute('DELETE' , '/api/fdsScenario/{id}'         , 'deleteScenario');
			$r->addRoute('GET'    , '/api/fdsScenario/{id}'         , 'getScenario');

			$r->addRoute('POST'   , '/api/runfdssimulation'         , 'runFdsSimulaion');

			$r->addRoute('GET'    , '/api/settings'                 , 'getSettings');
			$r->addRoute('PUT'    , '/api/settings/{id}'            , 'updateSettings');
			$r->addRoute('GET'    , '/api/refreshSession'            , 'refreshSession');

			$r->addRoute('GET'    , '/api/categories'               , 'getCategories');
			$r->addRoute('POST'   , '/api/category'                 , 'createCategory');
			$r->addRoute('DELETE' , '/api/category/{uuid}'          , 'deleteCategory');
			$r->addRoute('PUT'    , '/api/category/{uuid}'          , 'updateCategory');

			$r->addRoute('GET'    , '/api/library'                  , 'getLibrary');
			$r->addRoute('PUT'    , '/api/library'                  , 'updateLibrary');

			$r->addRoute('GET'   	, '/{nothing:.+}'     					  , 'getIndex');
		});

	} else {
		$dispatcher = FastRoute\simpleDispatcher(function(FastRoute\RouteCollector $r) {
			$r->addRoute('GET'  , '/'      , 'getFrontPage');
			$r->addRoute(['GET', 'POST']   , '/login'      , 'login');
			$r->addRoute(['GET', 'POST']   , '/register'                     , 'register');
			$r->addRoute('GET'  , '/{nothing:.+}'      , 'getFrontPage');
		});
 	}

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

# Nothing below the handlers is allowed to surface a stack trace to the client:
# report the failure, log it, and keep the response shape the client expects.
try {
	main();
} catch (DemoModeException $e) {
	$res = new Message("index");
	echo json_encode($res->createResponse("warning", array(WIZFDS_DEMO_MESSAGE), array()));
} catch (Throwable $e) {
	wizfds_log('error', 'unhandled error', array('error' => $e->getMessage(), 'file' => basename($e->getFile()), 'line' => $e->getLine()));

	if (!headers_sent()) {
		http_response_code(500);
		header('Content-Type: application/json');
	}
	$res = new Message("index");
	echo json_encode($res->createResponse("error", array("Server error"), array()));
}
