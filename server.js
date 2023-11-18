const http = require('http');
const fs = require('fs');
const path = require('path');
const bcrypt = require("bcrypt")
const db_con = require('./models/db')
const {displayPage} = require('./utils')
const {displayView} = require('./utils')
//Helper function to display all the page
const {collectinput} = require('./utils')
const {getcurrentdate} = require('./utils')
const {generatetoken} = require('./auth')
const {verifytoken} = require('./auth')
const {storeJWTcookie} = require('./auth')
const cookie = require('cookie');
const { parseArgs } = require('util');
const { start } = require('repl');
const { col } = require('sequelize');

let userId = "";
let userFirstName = "";

const server = http.createServer(function(req, res){
    //landing page and subpages
    if(req.url === "/" && req.method === 'GET'){
        displayPage("./public/index.html",res)
    }
    else if(req.url==='/login'&& req.method === 'GET'){
        displayPage("./public/login.html",res)
    }
    else if(req.url==='/guest'&& req.method === 'GET'){
        const cookies = cookie.parse(req.headers.cookie || '');
        const accessToken = cookies.jwt;
        if (!accessToken){
            res.statusCode(401).json({message:'Unauthorised'})
            return
        }
        const verify = verifytoken(accessToken)
        if (!verify){
            res.statusCode(401).json({message:'Invalid Token'})
            return
        }
        else if (verify){
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Zoo</title>
                <link rel="stylesheet" href="./styles.css">
                
            </head>
            <body>
                <header>
                    <span>Central Houston Zoo</span>
                    <div class="links header-links">
                        <a href="/tickets">Order Tickets</a>
                        <a href="">My Tickets</a>
                        <a href="">Our Animals</a>
                        <a href="/stores">Stores</a>
                        <a href="/donations">Donate</a>
                    </div>
                </header>
                <div class="hero">
                    <div class="hero-text button-field">
                        <h1><span>Welcome, ${userFirstName}</span></h1> 
                        
                        <button onclick="document.location='./'">Sign out</button> 
                    </div>
                </div>
                <main>
                    <!--TODO: add a main section to the landing page maybe news, updates, doesnt really matter, not priority at the moment  -->
                </main>
                </div>
            </body>
            </html>
            `)
            //displayPage("./public/guest.html",res)
        }
        else{
            res.writeHead(302, {Location: './login'});
            res.end('Unauthorised')
        }
    }

    // ? Guest Tickets page
    else if(req.url==='/tickets' && req.method === 'GET'){
        displayPage("./public/tickets.html",res)
    }
    else if(req.url==='/tickets'&& req.method === 'POST'){
        collectinput(req, parsedata => {
            const visitdate = parsedata.visitdate;

            var regular = parsedata.regularticket;
            if (regular=='') regular = 0; 

            var child = parsedata.childticket;
            if (child=='') child = 0; 

            var elder = parsedata.elderticket;
            if (elder=='') elder = 0; 

            var infant = parsedata.infantticket;
            if (infant=='') infant = 0; 

            var student = parsedata.studentticket;
            if (student=='') student = 0; 

            var pricetotal=(regular*18+child*14+elder*11.50);

            console.log("User ID is: ", userId);
            console.log(visitdate);
            console.log(regular);
            console.log(child);
            console.log(elder);
            console.log(infant);
            console.log(student);

            const query = db_con.query('INSERT INTO tickets(guestid,no_regular,no_child,no_elder,no_infant,no_student,totalprice,visitdate) VALUES (?,?,?,?,?,?,?,?)', [userId,regular,child,elder,infant,student,pricetotal,visitdate], (err, result) => {
                if(err) throw err;
                console.log('Last ticket insert ID:', result.insertId);
                res.writeHead(302, {Location: './tickets'});
                res.end('Tickets Booked')
            });

        })
    }

    // ? Guest stores Page
    else if(req.url==='/stores' && req.method === 'GET'){
        displayPage("./public/stores.html",res)
    }
    else if(req.url==='/stores' && req.method === 'POST'){
        collectinput(req, parsedata => {
            // safari, trinkets, creature, lions hold quantities of items bought
            const safari = [];
            const safariprice = [24.99, 25.99, 26.99];

            const trinkets = [];
            const trinketsprice = [30.99, 19.99, 26.99];

            const creature = [];
            const creatureprice = [5.99, 3.99, 2.99];

            const lions = [];
            const lionsprice = [1.99, 3.99, 1.99];

            //? outlet 1 safari treasures
            const lionplush = parsedata.lioneplush;
            const safarihat = parsedata.safarihat;
            const giraffeplush = parsedata.giraffeplush;
            safari.push(lionplush, safarihat, giraffeplush);

            //? outlet 2 trinkets
            const animalfigurines = parsedata.animalfigurines;
            const keychaincharms = parsedata.keychaincharms;
            const necklace = parsedata.necklace;
            trinkets.push(animalfigurines, keychaincharms, necklace);

            //? outlet 3 creature
            const pizzaslice = parsedata.pizzaslice;
            const turkeysandwhich = parsedata.turkeysandwhich;
            const hotdogs = parsedata.hotdogs;
            creature.push(pizzaslice, turkeysandwhich, hotdogs);

            //? outlet 4 lions
            const icecreams = parsedata.icecreams;
            const slushies = parsedata.slushies;
            const popsicles = parsedata.popsicles;
            lions.push(icecreams, slushies, popsicles);

            // ? todays date
            const date = getcurrentdate();

            console.log(safari);
            console.log(trinkets);
            console.log(creature);
            console.log(lions);

            const insertRevenue = (outletid, none, date) => {
                db_con.query(
                    `INSERT INTO revenue (outletid, revenueamount, revenuedate) VALUES (?, ?, ?)`,
                    [outletid, none, date],
                    (err, result) => {
                        if (err) throw err;
                        console.log(`Inserted revenue for outlet ${outletid}`);
                    }
                );
            };
    
            // Function to update revenue amount in the database
            const updateRevenue = (outletid, totalAmount) => {
                db_con.query(
                    `UPDATE revenue SET revenueamount = revenueamount + ? WHERE outletid = ? AND revenuedate = ?`,
                    [totalAmount, outletid, date],
                    (err, result) => {
                        if (err) throw err;
                        console.log(`Updated revenue for outlet ${outletid}`);
                    }
                );
            };

            const checkRevenueExists = (outletid, callback) => {
                db_con.query(
                    'SELECT * FROM revenue WHERE outletid = ? AND revenuedate = ?',
                    [outletid, date],
                    (err, result) => {
                        if (err) throw err;
                        callback(result.length > 0); // true if record exists, false otherwise
                    }
                );
            };
    
            // Process each outlet, insert initial revenue, and then update
            const processOutlet = (outletid, items, prices) => {
                let totalAmount = 0;
    
                items.forEach((quantity, index) => {
                    if (quantity && !isNaN(quantity)) {
                        totalAmount += quantity * prices[index];
                    }
                });
    
                // Check if revenue record exists for the outlet
                checkRevenueExists(outletid, (exists) => {
                    if (!exists) {
                        // Insert initial revenue if record doesn't exist
                        insertRevenue(outletid, 0, date);
                    }

                    // Update revenue subsequently
                    updateRevenue(outletid, totalAmount);
                });
            };
    
            processOutlet(1, safari, safariprice);
            processOutlet(2, trinkets, trinketsprice);
            processOutlet(3, creature, creatureprice);
            processOutlet(4, lions, lionsprice);

            res.writeHead(302, {Location: './stores'});
            res.end('profit');

        });
    }

    // ? Guest donations page
    else if(req.url==='/donations'&& req.method === 'GET'){
        displayPage("./public/donations.html",res)
    }
    else if(req.url==='/donations'&& req.method === 'POST'){
        collectinput(req, parsedata => {
            const purpose =  parsedata.donationpurpose;
            const amount = parsedata.amount;
            const date = getcurrentdate();
            console.log(date);
            console.log("User ID is:", userId);
            console.log(purpose);
            console.log(amount);
            const query = db_con.query('INSERT INTO donations(donorid,donationamount,donationpurpose,donationdate) VALUES (?,?,?,?)', [userId,amount,purpose,date], (err, result) => {
                if(err) throw err;
                console.log('Last donation insert ID:', result.insertId);
                //alert(`Your Donation of $${donationamount} towards ${donationpurpose} was a success! Thank You! :)`)
                res.writeHead(302, {Location: './donations'});
                res.end('Donation Made')
            });
        });
    }

    else if (req.url === "/register" && req.method === 'POST'){
        collectinput(req,parsedata=>{
            console.log(parsedata)
            const email =parsedata.email
            const plainpassword = parsedata.password
            const phonenumber = parsedata.phonenumber
            const firstname = parsedata.firstname
            const lastname = parsedata.lastname
            const middlename = parsedata.middlename
            bcrypt.hash(plainpassword,5,function(err,hash){
                if (err){
                    console.log(err)
                }
                else{
                    const query = db_con.query('INSERT INTO guests(password,email,phonenumber,name_firstname,name_middlename,name_lastname) VALUES (?,?,?,?,?,?)', [hash,email,phonenumber,firstname,middlename,lastname], (err, res) => {
                        if(err) throw err;
                        console.log('Last insert ID:', res.insertId);
                    
                    })
                }
            })
            res.writeHead(302, {Location: './login'});
            res.end('User Registered')
        })
    }
    else if (req.url === "/login" && req.method === 'POST'){
        collectinput(req,parsedata=>{
            console.log(parsedata)
            const email =parsedata.email
            const plainpassword = parsedata.password
            db_con.query('SELECT * FROM guests WHERE email = ?',[email],(err,result)=>{
                if (err) throw err;
                else if (res.length === 0){
                    console.log("Email Not Found")
                }
                else{
                    const match =bcrypt.compareSync(plainpassword,result[0].password)
                        if (match){
                            //! declaring user info
                            userId = result[0].guestid;
                            userFirstName = result[0].name_firstname;

                            const token = generatetoken({email})
                            //store JWT in cookie
                            storeJWTcookie(res,token)
                            res.writeHead(302, {Location: './guest'});
                            res.end('User Logged In')
                        }
                        else{
                            res.writeHead(302, {Location: './login'});
                            res.end('User Not Logged In')
                        }
                        
                    } 
                })
            })
        }                  
    else if (req.url === "/register" && req.method === 'GET'){
        displayPage("./public/register.html",res)
    }
    else if (req.url ==="/passwordreset" && req.method === 'GET'){
        displayPage("./public/passwordreset.html",res)
    }
    else if (req.url ==="/emplogin" && req.method === 'GET'){
        displayPage("./public/emplogin.html",res)
    }
    else if (req.url === "/emplogin" && req.method === 'POST'){
        collectinput(req,parsedata=>{
            const employeeid = parsedata.employeeid
            const password = parsedata.password
            db_con.query('SELECT * FROM employees WHERE employeeid = ?',[employeeid],(err,result)=>{
                if (err) throw err;
                else if (result.length === 0){
                    console.log("ID Not Found")
                }
                else{
                    console.log(result[0].employeeid)
                    console.log(result)
                    if (password ===result[0].password){
                        // ! declaring employee info
                        userId = result[0].guestid
                        userFirstName = result[0].name_firstname;
                        if (result[0].position === "manager"){
                            const token = generatetoken({employeeid})
                            storeJWTcookie(res,token)
                            res.writeHead(302, {Location: './manager'})
                            res.end('Check login')
                        }
                        else if (result[0].position === "admin"){
                            const token = generatetoken({employeeid})
                            storeJWTcookie(res,token)
                            res.writeHead(302, {Location: './admin'})
                            res.end('Check login')
                        }
                        else if (result[0].position === "veterinarian"){
                            const token = generatetoken({employeeid})
                            storeJWTcookie(res,token)
                            res.writeHead(302, {Location: './vet'})
                            res.end('Check login')
                        }
                        else{
                            res.writeHead(302, {Location: './emplogin'});
                            res.end('User Not Logged In')   
                        }
                        
                    } 
                }
            })
            })
    }



//? Manager page and subpages
    else if(req.url === "/manager" && req.method === 'GET'){
        const cookies = cookie.parse(req.headers.cookie || '');
        const accessToken = cookies.jwt;
        if (!accessToken){
            res.statusCode(401).json({message:'Unauthorised'})
            return
        }
        const verify = verifytoken(accessToken)
        if (!verify){
            res.statusCode(401).json({message:'Invalid Token'})
            return
        }
        else if (verify){
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Zoo • Manager</title>
                <link rel="stylesheet" href="../dashboards.css">
            </head>
            <body>
                <header class="header">
                    <div class="header-left-items">
                        <h2>Manager Dashboard</h2>
                        <span>Welcome, ${userFirstName} </span>
                    </div>

                    <div class="header-right-items">
                        <div class="signout-link">
                            <!--TODO: actually logout and redirect to the home landing page  -->
                            <a href="./"><img src="../signout.jpeg" alt="signout icon link"></a>
                        </div>
                    </div>
                </header>

                <!--? sidebar (manager options) -->
                <section class="sidebar">
                    <h1 class="sidebar-header">Reports</h1>
                    <div class="subsection reports-subsection">
                        <div class="sidebar-link"> 
                            <a href='./man_rev_rep'>Revenue Reports</a>  
                        </div> 
                    </div>


                    <h1 class="sidebar-header">Management</h1>
                    <div class="subsection admin-subsection">
                        <div class="sidebar-link"> 
                            <a href=''>Modify Employees</a>  
                        </div> 
                    </div>
                </section>

                <!--? maybe display news, notifs, anything here idk, not priority -->
                <main class="main">
                    
                </main>
                
            </body>
            </html>
            
            `)
            //displayPage("./public/manager.html",res)
        }
        else{
            res.writeHead(302, {Location: './emplogin'});
            res.end('Unauthorised')
        }
    }
    else if(req.url === "/man_mod_emp" && req.method === 'GET'){
        displayPage("./public/manager_mod_employee.html",res)
    }
    else if(req.url ==="/man_rev_rep" && req.method === 'GET'){
        displayPage("./public/manager_revenue_rep.html",res)
    }
    else if(req.url ==="/man_rev_rep" && req.method === 'POST'){
        // ! Managers should only be able to see the revenue for their specific outlet, consider global var to track managers outlet
    }



//? Veterinarian page and subpages
    else if(req.url ==="/vet" && req.method === 'GET'){
        const cookies = cookie.parse(req.headers.cookie || '');
        const accessToken = cookies.jwt;
        if (!accessToken){
            res.statusCode(401).json({message:'Unauthorized'})
            return
        }
        const verify = verifytoken(accessToken)
        if (!verify){
            res.statusCode(401).json({message:'Invalid Token'})
            return
        }
        else if (verify){
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Zoo • Veterinarian</title>
                <link rel="stylesheet" href="../dashboards.css">
            </head>
            <body>
                <header class="header">
                    <div class="header-left-items">
                        <h2>Veterinarian Dashboard</h2>
                        <span>Welcome, ${userFirstName} </span>
                    </div>

                    <div class="header-right-items">
                        <div class="signout-link">
                            <!--TODO: actually logout and redirect to the home landing page  -->
                            <a href="./"><img src="../signout.jpeg" alt="signout icon link"></a>
                        </div>
                    </div>
                    
                </header>

                <!--? sidebar (vet options) -->
                <section class="sidebar">
                    <h1 class="sidebar-header">Reports</h1>
                    <div class="subsection reports-subsection">
                        <div class="sidebar-link"> 
                            <a href='./vet_health_rep'>Health Reports</a>  
                        </div> 
                    </div>


                    <h1 class="sidebar-header">Veterinary</h1>
                    <div class="subsection admin-subsection">
                        <div class="sidebar-link"> 
                            <a href=''>Modify Health Records</a>  
                        </div> 
                    </div>
                </section>

                <!--? maybe display news, notifs, anything here idk, not priority -->
                <main class="main">
                    
                </main>
                
            </body>
            </html>
            
            `)
            //displayPage("./public/vet.html",res)
        }
        else{
            res.writeHead(302, {Location: './emplogin'});
            res.end('Unauthorised')
        }
        displayPage("./public/vet.html",res)
    }
    else if(req.url ==="/vet_health_rep" && req.method === 'GET'){
        displayPage("./public/vet_health_rep.html",res)
    }
    else if(req.url ==="/vet_mod_health" && req.method === 'GET'){
        displayPage("./public/vet_mod_healthrecord.html",res)
    }
    


//? Admin page and subpages
    else if(req.url ==="/admin" && req.method === 'GET'){
        const cookies = cookie.parse(req.headers.cookie || '');
        const accessToken = cookies.jwt;
        if (!accessToken){
            res.statusCode(401).json({message:'Unauthorised'})
            return
        }
        const verify = verifytoken(accessToken)
        if (!verify){
            res.statusCode(401).json({message:'Invalid Token'})
            return
        }
        else if (verify) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Zoo • Admin</title>
                <link rel="stylesheet" href="../dashboards.css">
                <!-- <link rel="stylesheet" href="../admin.css"> -->
            </head>
            <body>
                <header class="header">
                    <div class="header-left-items">
                        <h2>Admin Dashboard</h2>
                        <span>Welcome, ${userFirstName}</span>
                    </div>

                    <div class="header-right-items">
                        <div class="signout-link">
                            <!--TODO: actually logout and redirect to the home landing page  -->
                            <a href="./"><img src="../signout.jpeg" alt="signout icon link"></a>
                            
                        </div>
                    </div>
                    
                </header>

                <!--? sidebar (admin options) -->
                <section class="sidebar">

                    <h1 class="sidebar-header">Reports</h1>
                    <div class="subsection reports-subsection">
                        
                        <div class="sidebar-link"> 
                            <a href='./admin_rev_rep'>Revenue Reports</a>  
                        </div> 
                        
                        <div class="sidebar-link"> 
                            <a href='./admin_health_rep'>Health Reports</a>  
                        </div> 
                        <div class="sidebar-link"> 
                            <a href='./admin_donor_rep'>Donation Reports</a> 
                        </div> 
                        
                    </div>


                    <h1 class="sidebar-header">Administration</h1>
                    <div class="subsection admin-subsection">

                        <!--! since triggers rely on animal insertions and we mmust present triggers live, this is priority others are not! -->
                        <div class="sidebar-link"> 
                            <a href=''>Modify Animals</a>  
                        </div> 

                        
                        <div class="sidebar-link"> 
                            <a href=''>Modify Enclosures</a>  
                        </div> 


                        <div class="sidebar-link"> 
                            <a href=''>Modify Outlets</a>  
                        </div> 
                        
                    </div>
                </section>

                <!--? maybe display news, notifs, anything here idk, not priority -->
                <main class="main">
                    
                </main>
                
            </body>
            </html>
            `)
            //displayPage("./public/admin.html",res)
        }
        else{
            res.writeHead(302, {Location: './emplogin'});
            res.end('Unauthorized')
        }
    }
    else if(req.url ==="/admin_donor_rep" && req.method === 'GET'){
        displayPage("./public/admin_donor_rep.html",res)
    }
    else if(req.url ==="/admin_donor_rep" && req.method === 'POST') {
        collectinput(req, parsedata => {
            const donations = [];
            const htmlTables = [];

            const conservation = parsedata.wildlifeconservation;
            const outreach = parsedata.communityoutreach;
            const education = parsedata.educationprograms;
            const research = parsedata.researchprograms;

            const startDate = parsedata.donationstartdate;
            const endDate = parsedata.donationenddate;

            const renderHtml = () => {
                const responseHtml = htmlTables.join('');
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.write(`
                <html>
                    <head>
                        <link rel="stylesheet" href="../donation_rep.css">
                    </head>
                    <body>
                        <header>
                            <a href="/admin">Home</a>
                        </header>
                        ${responseHtml}
                    </body>
                </html>
                `);
                res.end();
            };

            if(conservation !== undefined) donations.push(conservation);
            if(outreach !== undefined) donations.push(outreach);
            if(education !== undefined) donations.push(education);
            if(research !== undefined) donations.push(research);

            const processDonation = (donationindex) => {
                const donationType = donations[donationindex]; // "Research", "Conservation", "..."

                db_con.query(`SELECT * FROM donation_report WHERE donationpurpose = ? AND donationdate BETWEEN ? AND ? ORDER BY donationdate`, [donationType, startDate, endDate], (err, result) => {
                    if (err) throw err;
                    else if (result.length === 0) {
                        console.log("ERROR IN DONATE REPORT")
                    }
                    else {
                        console.log(result); 
                        db_con.query(`SELECT SUM(donationamount) AS subtotal FROM donation_report WHERE donationpurpose = ? AND donationdate BETWEEN ? AND ?`, [donationType, startDate, endDate], (err, sumResult) => {
                            if (err) throw err;
                            else if (sumResult.length === 0) {
                                console.log("Subtotal Not Found");
                            }
                            else {
                                

                                const tableHtml = 
                                    `
                                    <div class="container">
                                    <table border="1">
                                    <tr>
                                        <th class="">Donor ID</th>
                                        <th class="">Donation ID</th>
                                        <th class="">Donor First Name</th>
                                        <th class="">Donor Last Name</th>
                                        <th class="">Donation Purpose</th>
                                        <th class="">Donation Date</th>
                                        <th class="">Donation</th>
                                    </tr>` +
                                        result.map (
                                        row => 
                                        `<tr>
                                            <td class="">${row.guestid}</td>
                                            <td class="">${row.donationid}</td>
                                            <td class="">${row.name_firstname}</td>
                                            <td class="">${row.name_lastname}</td>
                                            <td class="">${row.donationpurpose}</td>
                                            <td class="">${row.donationdate}</td>
                                            <td class="">$${row.donationamount}</td>
                                        </tr>`).join('') + `</table> <div class="subtotal"><strong>Donations Subtotal: $${sumResult[0].subtotal}</strong></div>
                                        </div>`;

                                htmlTables.push(tableHtml);

                                if(donationindex + 1 < donations.length) {
                                    processDonation(donationindex + 1);
                                } 
                                else {
                                    renderHtml();
                                }
                            }
                        }); 
                    }
                });
            }

            processDonation(0);
        });
    }
    else if(req.url ==="/admin_health_rep" && req.method === 'GET'){
        displayPage("./public/admin_health_rep.html",res)
    }
    else if(req.url ==="/admin_rev_rep"&& req.method === 'GET'){
        displayPage("./public/admin_revenue_rep.html",res)
    }
    else if(req.url === "/admin_rev_rep" && req.method === 'POST'){
        collectinput(req, parsedata => {
            const outlets = [];
            const htmlTables = [];

            const safari = parsedata.safaritreasures;
            const trinkets = parsedata.trinketscharms;
            const creature = parsedata.creaturecuisine;
            const lions = parsedata.lionslollipops;

            const startDate = parsedata.revenuestartdate;
            const endDate = parsedata.revenueenddate;

            //const currentDate = new Date().toDateString();

            /*
            const currentDate = new Date();
            const year = currentDate.getFullYear();
            const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are zero-based
            const day = String(currentDate.getDate()).padStart(2, '0');

            const formattedDate = `${year}-${month}-${day}`;
            console.log(startDate);
            console.log(formattedDate);
            */

            const renderHtml = () => {
                const responseHtml = htmlTables.join('');
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.write(`
                <html>
                    <head>
                        <link rel="stylesheet" href="../revenue_rep.css">
                    </head>
                    <body>
                        <header>
                            <a href="/admin">Home</a>
                        </header>
                        ${responseHtml}
                    </body>
                </html>
                `);
                res.end();
            };

            if(safari !== undefined) outlets.push(safari);
            if(trinkets !== undefined) outlets.push(trinkets);
            if(creature !== undefined) outlets.push(creature);
            if(lions !== undefined) outlets.push(lions);

            const processOutlet = (outletIndex) => {
                const outletId = outlets[outletIndex];

                db_con.query(`SELECT * FROM revenue_report WHERE outletid = ? AND revenuedate BETWEEN ? AND ?`, [outletId, startDate, endDate], (err, result) => {
                    if (err) throw err;
                    else if (result.length === 0) {
                        htmlTables.push(`<p>No data found for Outlet ${outletId}</p>`);
                    } else {
                        db_con.query(`SELECT SUM(revenueamount) AS subtotal FROM revenue_report WHERE outletid = ? AND revenuedate BETWEEN ? AND ?`, [outletId, startDate, endDate], (err, sumResult) => {
                            if (err) throw err;
                            else if (sumResult.length === 0) {
                                console.log("Subtotal Not Found");
                            } else {
                                const tableHtml = 
                                    `
                                    <div class="container">
                                    <table border="1">
                                    <tr>
                                        <th class="outletid-col">Outlet ID</th>
                                        <th class="outletname-col">Outlet Name</th>
                                        <th class="outlettype-col">Outlet Type</th>
                                        <th class="revenuedate-col">Date of Sales</th>
                                        <th class="revenueamount-col">Sales Amount</th>
                                    </tr>` +
                                        result.map (
                                        row => 
                                        `<tr>
                                            <td class="outletid-col">${row.outletid}</td>
                                            <td class="outletname-col">${row.outletname}</td>
                                            <td class="outlettype-col">${row.outlettype}</td>
                                            <td class="revenuedate-col">${row.revenuedate}</td>
                                            <td class="revenueamount-col">$${row.revenueamount}</td>
                                        </tr>`).join('') + `</table> <div class="subtotal"><strong>Revenue Subtotal: $${sumResult[0].subtotal}</strong></div>
                                        </div>`;

                                htmlTables.push(tableHtml);

                                if (outletIndex + 1 < outlets.length) {
                                    processOutlet(outletIndex + 1);
                                } 
                                else {
                                    renderHtml();
                                }
                            }
                        });
                    }   
                });
            };

            processOutlet(0);
        })
    }



    else if(req.url === "/test" && req.method === 'GET') {
        
        //! ALL QUERIES OF THIS KIND MUST INCLUDE "WHERE deleted = 0"
        db_con.query(`SELECT * FROM animals WHERE deleted = 0`, (err, result) => {
            if(err) throw err;
            else {
                displayView("./views/test.ejs",res, result);
            }
        });

        
    }
    else if(req.url === "/test/edit" && req.method === 'POST') {
        collectinput(req, parsedata => {
            const animalclass = parsedata.editclass;
            console.log(animalclass);
        })
    }



//? Read CSS and JPEG files
    else if(req.url.match("\.css$")){
        var cssPath = path.join(__dirname,'src', req.url);
        var fileStream = fs.createReadStream(cssPath);
        res.writeHead(200, {"Content-Type": "text/css"});
        fileStream.pipe(res);
    }
    else if(req.url.match("\.jpeg$")){
        var jpegPath = path.join(__dirname,'assets', req.url);
        var fileStream = fs.createReadStream(jpegPath);
        res.writeHead(200, {"Content-Type": "image/jpeg"});
        fileStream.pipe(res);
    }
    else{
        res.writeHead(404, {"Content-Type": "text/html"});
        res.end("No Page Found");
    }
})


const PORT = process.env.PORT || 5050;
server.listen(PORT, () => console.log(`Sever running on port ${PORT}`))