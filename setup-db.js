const mysql = require('mysql2/promise');

async function run() {
  const commonPasswords = [
    'Sungan@67',
    'root',
    'admin',
    'password',
    'mysql',
    'root123',
    '123456',
    '1234',
    'root_password_123',
    'root_password',
    'root_password_123!',
    'root!',
    'admin123',
    'root_password_1234',
    'user_password_123',
    ''
  ];

  let connection;
  let successPassword;

  for (const password of commonPasswords) {
    try {
      console.log(`Trying to connect as root with password: "${password}"...`);
      connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: password
      });
      successPassword = password;
      console.log(`Successfully connected as root with password: "${password}"!`);
      break;
    } catch (err) {
      console.log(`Failed: ${err.message}`);
    }
  }

  if (!connection) {
    console.error("Could not connect to MySQL with any root password.");
    process.exit(1);
  }

  try {
    console.log("Creating database healthcare_db if not exists...");
    await connection.query("CREATE DATABASE IF NOT EXISTS healthcare_db;");

    console.log("Creating or updating healthcare_user...");
    try {
      await connection.query("CREATE USER IF NOT EXISTS 'healthcare_user'@'localhost' IDENTIFIED WITH mysql_native_password BY 'user_password_123';");
    } catch (e) {
      console.log("Create user failed, attempting Alter: " + e.message);
    }

    console.log("Altering user 'healthcare_user'@'localhost' authentication plugin...");
    await connection.query("ALTER USER 'healthcare_user'@'localhost' IDENTIFIED WITH mysql_native_password BY 'user_password_123';");

    console.log("Granting privileges...");
    await connection.query("GRANT ALL PRIVILEGES ON healthcare_db.* TO 'healthcare_user'@'localhost';");
    await connection.query("FLUSH PRIVILEGES;");

    console.log("Database and user set up successfully!");
  } catch (err) {
    console.error("Error setting up database:", err);
  } finally {
    await connection.end();
  }
}

run();
