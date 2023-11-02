require('dotenv').config();
const mysql = require('mysql2');
const db_con = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password:process.env.DB_PASSWORD,
    database: process.env.DB_DATABASE,
})
    
db_con.connect((err) => {
    if (err) {
        throw err;
    }
    console.log('Connected to database');
})
module.exports = db_con;