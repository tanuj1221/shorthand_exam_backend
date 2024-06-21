const mysql = require('mysql2/promise');
require('dotenv').config(); // Load environment variables from .env file
const connection = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 100000,
  queueLimit: 0
  });

module.exports = connection

