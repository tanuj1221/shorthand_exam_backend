const mysql = require('mysql2/promise');
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'tanuj1221',
    database: 'shorthandExam2024',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0 // Added database name
  });

module.exports = connection

