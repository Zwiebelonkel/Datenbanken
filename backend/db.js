const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'highscores_db',
  waitForConnections: true,
  connectionLimit: 10,
});

module.exports = pool;
