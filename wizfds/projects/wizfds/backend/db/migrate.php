<?php
# Migration runner. CLI only - run it from the docroot, where config.php is the
# real file with the database credentials (the copy in the repository is a
# template):
#
#   cd /home/dkubera/domains/wizfds.com/public_html/app
#   php /home/dkubera/git/WizFDS/wizfds/projects/wizfds/backend/db/migrate.php
#
# Add --dry-run to list what would be applied without touching the database.
#
# Every .sql file in migrations/ runs once, in filename order, inside its own
# transaction, and is recorded in schema_migrations. Files are never edited
# after they have run anywhere - add a new one instead.

if (PHP_SAPI !== 'cli') {
	http_response_code(404);
	exit;
}

require_once('./config.php');

$dryRun = in_array('--dry-run', $argv, true);
$config = new Config();

$connection = @pg_connect(
	"host=". $config->host ." port=". $config->port .
	" dbname=". $config->db ." user=". $config->dbUser .
	" password=". $config->dbPass
);

if ($connection === false) {
	fwrite(STDERR, "Nie udalo sie polaczyc z baza.\n");
	exit(1);
}

function run_or_die($connection, $sql, $params = array()) {
	$result = @pg_query_params($connection, $sql, $params);
	if ($result === false) {
		fwrite(STDERR, "SQL nie powiodl sie: " . pg_last_error($connection) . "\n");
		exit(1);
	}
	return $result;
}

run_or_die($connection, "create table if not exists schema_migrations (
	name text primary key,
	applied_at timestamptz not null default current_timestamp
)");

$applied = array();
foreach (pg_fetch_all(run_or_die($connection, "select name from schema_migrations")) ?: array() as $row) {
	$applied[$row['name']] = true;
}

$files = glob(__DIR__ . '/migrations/*.sql');
sort($files);

$pending = 0;
foreach ($files as $file) {
	$name = basename($file);

	if (isset($applied[$name])) {
		echo "  juz zastosowana: $name\n";
		continue;
	}

	$pending++;

	if ($dryRun) {
		echo "  do zastosowania: $name\n";
		continue;
	}

	echo "  stosuje: $name ... ";

	# pg_query, not pg_query_params: a migration is a script, not one statement.
	run_or_die($connection, 'BEGIN');
	$result = @pg_query($connection, file_get_contents($file));
	if ($result === false) {
		$error = pg_last_error($connection);
		@pg_query($connection, 'ROLLBACK');
		fwrite(STDERR, "BLAD\n$error\n");
		exit(1);
	}
	run_or_die($connection, "insert into schema_migrations (name) values ($1)", array($name));
	run_or_die($connection, 'COMMIT');

	echo "ok\n";
}

echo $pending === 0 ? "Baza jest aktualna.\n" : "Gotowe: $pending migracji.\n";
