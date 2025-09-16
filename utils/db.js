const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'auth-db861.hstgr.io',
    user: process.env.DB_USERNAME || 'u694828008_dekorrbaz',
    password: process.env.DB_PASSWORD || '9kH+5s^CbEQm',
    database: process.env.DB_DATABASE || 'u694828008_dekorbaz',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

module.exports = pool;