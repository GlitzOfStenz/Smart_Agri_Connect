<?php
session_start();
if(!isset($_SESSION['user_id'])){
    header("Location: login.php");
    exit();
}

$conn = new mysqli("localhost","root","","smart_agri");

$user_id = $_SESSION['user_id'];

$result = $conn->query("SELECT * FROM users WHERE id='$user_id'");
$user = $result->fetch_assoc();
?>

<!DOCTYPE html>
<html>
<head>
<title>My Profile</title>
<link rel="stylesheet" href="profile.css">
</head>

<body>

<div class="profile-container">

<h2>My Profile</h2>

<div class="profile-card">

<form action="update_profile.php" method="POST" enctype="multipart/form-data">

<div class="profile-pic">
<img src="<?php echo $user['profile_pic'] ?? 'default.png'; ?>" width="120">
<br><br>
<input type="file" name="profile_pic">
</div>

<div class="profile-fields">

<label>Name</label>
<input type="text" name="name" value="<?php echo $user['name']; ?>">

<label>Email</label>
<input type="email" name="email" value="<?php echo $user['email']; ?>">

<label>Phone</label>
<input type="text" name="phone" value="<?php echo $user['phone']; ?>">

<label>District</label>
<input type="text" name="district" value="<?php echo $user['district']; ?>">

<label>Address</label>
<textarea name="address"><?php echo $user['address'] ?? ''; ?></textarea>

<label>Aadhar Card Upload</label>
<input type="file" name="aadhar">

<label>About Your Farming</label>
<textarea name="intro"><?php echo $user['intro'] ?? ''; ?></textarea>

<br>
<button type="submit">Update Profile</button>

</div>

</form>

</div>
</div>

</body>
</html>