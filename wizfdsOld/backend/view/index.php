<?php
session_name('wizfds');
session_start();

if (isset($_SESSION['user_id']) and $_SESSION['user_id'] != '') {
	include('index.html');
} else {
	header('Location: https://wizfds.com/welcome');
}
