require('dotenv').config();
const mysql = require('mysql2');

async function run(outletid) {

    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_DATABASE
    });

    console.log(outletid);

    try {
        //const query1 = `INSERT INTO enclosures VALUES (876, 'Chilly Waddle World', 'penguin', 8, 'open')`;
        //await connection.execute(query1);
        //console.log('Insertion successful.');
    } catch (error) {
        console.error('Error executing query: ' + error.message);
    } finally {
        await connection.end();
        console.log('MySQL connection closed.');
    }
}

function generate_revenue_report() {
    var selectedOutlets = Array.from(document.querySelectorAll('input[name="outlet"]:checked')).map(function(checkbox) {
        return checkbox.value;
    });
    //alert(selectedOutlets);

    var startDate = document.querySelector('input[name="startdate"]').value;
    var endDate = document.querySelector('input[name="enddate"]').value;
    //alert(startDate);
    //alert(endDate);

    if(selectedOutlets.length === 0 || startDate === '' || endDate === '') {
        alert("Please select outlets and enter a date range.");
        return;
    }

    for (var i = 0; i < selectedOutlets.length; i++) {
        var outlet = selectedOutlets[i];
        if(outlet === "safari-treasures") {
            console.log("before calling run()")
            run(1);
        }
        // Perform actions for each selected outlet, e.g., generate reports
        alert("Generating report for outlet: " + outlet);
    }

}