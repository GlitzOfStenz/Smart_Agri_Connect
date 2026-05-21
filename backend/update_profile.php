<?php
session_start();
$conn = new mysqli("localhost","root","","smart_agri");

$user_id = $_SESSION['user_id'];

$name=$_POST['name'];
$email=$_POST['email'];
$phone=$_POST['phone'];
$district=$_POST['district'];
$address=$_POST['address'];
$intro=$_POST['intro'];

if($_FILES['profile_pic']['name']!=""){
$pic="uploads/".$_FILES['profile_pic']['name'];
move_uploaded_file($_FILES['profile_pic']['tmp_name'],$pic);
$conn->query("UPDATE users SET profile_pic='$pic' WHERE id='$user_id'");
}

if($_FILES['aadhar']['name']!=""){
$aadhar="uploads/".$_FILES['aadhar']['name'];
move_uploaded_file($_FILES['aadhar']['tmp_name'],$aadhar);
$conn->query("UPDATE users SET aadhar='$aadhar' WHERE id='$user_id'");
}

$conn->query("UPDATE users SET
name='$name',
email='$email',
phone='$phone',
district='$district',
address='$address',
intro='$intro'
WHERE id='$user_id'");

header("Location: profile.php");
?>