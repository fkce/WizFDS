<?php

# The shared demo account may read everything and change nothing. Writes raise
# this instead of failing silently, so the handler can say "demo" rather than
# "server error" - the client used to be told the save had failed.
class DemoModeException extends RuntimeException {
}

# One wording, three places would otherwise spell it out (router, handler exit,
# smoke test).
define('WIZFDS_DEMO_MESSAGE', 'Demo mode - changes are not saved');
