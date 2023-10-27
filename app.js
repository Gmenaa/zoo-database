require('dotenv').config();
const mysql = require('mysql2');

const query1 = `INSERT INTO enclosures VALUES (1876, 'Chilly Waddle World', 'penguin', 8, 'open'}`;

async function run() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });

    try {
        const query1 = `INSERT INTO enclosures VALUES (876, 'Chilly Waddle World', 'penguin', 8, 'open')`;
        await connection.execute(query1);
        console.log('Insertion successful.');
    } catch (error) {
        console.error('Error executing query: ' + error.message);
    } finally {
        await connection.end();
        console.log('MySQL connection closed.');
    }
}

run();