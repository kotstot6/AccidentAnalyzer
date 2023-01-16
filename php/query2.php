<?php

$servername = "localhost";//"104.198.184.205";
$username = "root";
$password = "Ko:190281:0910";//"['M@5gK+64F5-$9,";
$dbname = "us_accidents";//"us-accidents-database";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);
// Check connection
if ($conn->connect_error) {
  die("Connection failed: " . $conn->connect_error);
}

$sql = $_GET["SQL"];
$result = $conn->query($sql);

$rows = array();


while($row = $result->fetch_assoc())
{
  array_push($rows, $row);
}

echo json_encode($rows);

$conn->close();
?>
