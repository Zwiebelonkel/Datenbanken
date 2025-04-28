const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'deinBenutzername',
  password: 'deinPasswort',
  database: 'deineDatenbank',
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;
