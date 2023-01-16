
<?php

require 'credentials.php';

// Create connection
$mysqli = new mysqli($servername, $username, $password, $dbname);

if ($mysqli->connect_errno) {
  echo "Failed to connect to MySQL: " . $mysqli->connect_error;
  exit();
}

$sql = $_GET["SQL"];

$query_results = array();

// Execute multi query
if ($mysqli->multi_query($sql))
{
  do
  {
    // Store first result set
    if ($result = $mysqli->store_result()) {

      $query_result = array();

      while ($row = $result->fetch_assoc()) {
        array_push($query_result, $row);
      }

      array_push($query_results, $query_result);

     $result->free_result();
    }

     //Prepare next result set
  } while ($mysqli->next_result());
}

echo json_encode($query_results);

$mysqli->close();
?>
