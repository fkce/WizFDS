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
# Statements go through psql rather than PHP's pg_* on purpose: on this host only
# the PHP 7.4 build carries the pgsql extension, and the runner should not care
# which PHP the shell happens to resolve. The password travels in the
# environment, never on the command line.
#
# Every .sql file in migrations/ runs once, in filename order, inside its own
# transaction, and is recorded in schema_migrations. Files are never edited after
# they have run anywhere - add a new one instead.

if (PHP_SAPI !== 'cli') {
	http_response_code(404);
	exit;
}

require_once('./config.php');

$dryRun = in_array('--dry-run', $argv, true);
$config = new Config();

putenv('PGPASSWORD=' . $config->dbPass);

function psql_base($config) {
	return 'psql -X -q -v ON_ERROR_STOP=1 -A -t'
		. ' -h ' . escapeshellarg($config->host)
		. ' -p ' . escapeshellarg($config->port)
		. ' -U ' . escapeshellarg($config->dbUser)
		. ' -d ' . escapeshellarg($config->db);
}

# Returns the command's stdout; dies with the error if psql reported one.
function psql_query($config, $sql) {
	$command = psql_base($config) . ' -c ' . escapeshellarg($sql) . ' 2>&1';
	exec($command, $output, $status);

	if ($status !== 0) {
		fwrite(STDERR, "psql nie powiodl sie:\n" . implode("\n", $output) . "\n");
		exit(1);
	}

	return $output;
}

function psql_file($config, $file) {
	# -1 wraps the whole file in a single transaction, so a migration either lands
	# completely or not at all.
	$command = psql_base($config) . ' -1 -f ' . escapeshellarg($file) . ' 2>&1';
	exec($command, $output, $status);
	return array($status, $output);
}

psql_query($config, "create table if not exists schema_migrations (
	name text primary key,
	applied_at timestamptz not null default current_timestamp
)");

$applied = array();
foreach (psql_query($config, "select name from schema_migrations") as $line) {
	$line = trim($line);
	if ($line !== '') {
		$applied[$line] = true;
	}
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

	list($status, $output) = psql_file($config, $file);
	if ($status !== 0) {
		fwrite(STDERR, "BLAD\n" . implode("\n", $output) . "\n");
		exit(1);
	}

	psql_query($config, "insert into schema_migrations (name) values (" . pg_quote_literal($name) . ")");

	echo "ok\n";
}

echo $pending === 0 ? "Baza jest aktualna.\n" : "Gotowe: $pending migracji.\n";

# Migration names are filenames we control, but quote them properly anyway -
# pg_escape_literal lives in the extension this runner deliberately avoids.
function pg_quote_literal($value) {
	return "'" . str_replace("'", "''", $value) . "'";
}
