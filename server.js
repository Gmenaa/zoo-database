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
const {yyyymmdd} = require('./utils')
const {generatetoken} = require('./auth')
const {verifytoken} = require('./auth')
const {storeJWTcookie} = require('./auth')
const cookie = require('cookie');
const { parseArgs } = require('util');
const { start } = require('repl');
const { col } = require('sequelize');

let userId = "";
let empWorksAt;
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
                        <a href="/guest">Home</a>
                        <a href="/tickets">Order Tickets</a>
                        <a href="/view_ticket">My Tickets</a>
                        <a href="/animals">Our Animals</a>
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
        const referer = req.headers.referer || '';
        const cameFromticket= referer.endsWith('/tickets');   
        if (cameFromticket){
            res.write('<script>alert("Your tickets were succesfully booked!");</script>');
        }

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
                if(err) {
                    console.log(err)

                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`<!DOCTYPE html>
                    <html>
                    <body>
                    <script>alert("An error has occured."); window.location.href="/tickets";</script>
                    </body>
                    </html>`);

                }
                console.log('Last ticket insert ID:', result.insertId);
                res.writeHead(302, {Location: './tickets'});
                res.end('Tickets Booked')
            });

        })
    }

    // ? Guest view/edit tickets
    else if(req.url==='/view_ticket'&& req.method === 'GET'){
        console.log(userId);
        db_con.query(`SELECT * FROM tickets WHERE guestid = ? AND deleted =0;`, [userId], (err, result) => {
            if (err){
                console.log(err)
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`<!DOCTYPE html>
                    <html>
                    <body>
                    <script>alert("Something went wrong, please go back."); window.location.href="/view_ticket";</script>
                    </body>
                    </html>`);
            }
            result.forEach(row => {
                row.visitdate = yyyymmdd(row.visitdate)
            });

            displayView("./views/mod_ticket.ejs", res, { result });
        })
    }
    else if(req.url === "/view_ticket/edit" && req.method === 'POST'){
        collectinput(req, parsedata => {
            const ticketid = parsedata.id_edit;
            const regular_ticket = parsedata.editregular;
            const child_ticket = parsedata.editchild;
            const elder_ticket = parsedata.editelder;
            const infant_ticket = parsedata.editinfant;
            const student_ticket = parsedata.editstudent;
            const visit_date= parsedata.editvisit;
            const pricetotal = (regular_ticket*18+child_ticket*14+elder_ticket*11.50)
            if (regular_ticket=='') regular_ticket = null;
            if (child_ticket=='') child_ticket = null;
            if (elder_ticket=='') elder_ticket = null;
            if (infant_ticket=='') infant_ticket = null;
            if (student_ticket=='') student_ticket = null;
            if (visit_date=='') visit_date = null;

            const edit_ticket = db_con.query('UPDATE tickets SET no_regular = ?, no_child = ?, no_elder = ?, no_infant = ?, no_student = ?, totalprice = ?, visitdate = ? WHERE ticketid = ?', [regular_ticket, child_ticket, elder_ticket, infant_ticket, student_ticket, pricetotal, visit_date, ticketid], (err, result) => {
                if (err){
                    console.log(err)
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("Something went wrong, please go back."); window.location.href="/view_ticket";</script>
                        </body>
                        </html>`);
                }
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("Your ticket is succesfully updated"); window.location.href="/view_ticket";</script>
                        </body>
                        </html>`); 
            })
        })
    }
    else if (req.url === "/view_ticket/delete" && req.method === 'POST'){
        collectinput(req, parsedata => {
            const ticketid = parsedata.id_delete;
            const delete_ticket = db_con.query('UPDATE tickets SET deleted = 1 WHERE ticketid = ?', [ticketid], (err, result) => {
                if (err){
                    console.log(err)
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("Something went wrong, please go back."); window.location.href="/view_ticket";</script>
                        </body>
                        </html>`);
                }
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("Your ticket is succesfully deleted"); window.location.href="/view_ticket";</script>
                        </body>
                        </html>`); 
            })
        })
    }


    // ? Guest animals page
    else if(req.url==='/animals' && req.method === 'GET') {
        displayPage("./public/animals.html",res)
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
                        if (err){
                            console.log(err)
                            res.writeHead(200, { 'Content-Type': 'text/html' });
                            res.end(`<!DOCTYPE html>
                                <html>
                                <body>
                                <script>alert("Something went wrong, please go back."); window.location.href="/stores;</script>
                                </body>
                                </html>`);
                        }
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
                        if (err) {
                            console.log(err)
                            res.writeHead(200, { 'Content-Type': 'text/html' });
                            res.end(`<!DOCTYPE html>
                                <html>
                                <body>
                                <script>alert("Something went wrong, please go back."); window.location.href="/stores";</script>
                                </body>
                                </html>`);
                        }

                        console.log(`Updated revenue for outlet ${outletid}`);
                    }
                );
            };

            const checkRevenueExists = (outletid, callback) => {
                db_con.query(
                    'SELECT * FROM revenue WHERE outletid = ? AND revenuedate = ?',
                    [outletid, date],
                    (err, result) => {
                        if (err){
                            console.log(err)
                            res.writeHead(200, { 'Content-Type': 'text/html' });
                            res.end(`<!DOCTYPE html>
                                <html>
                                <body>
                                <script>alert("Something went wrong, please go back."); window.location.href="/stores";</script>
                                </body>
                                </html>`);
                        }
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

            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`<!DOCTYPE html>
                                <html>
                                <body>
                                <script>alert("Your purchase was sucessful and your items will be ready for pickup."); window.location.href="/stores";</script>
                                </body>
                                </html>`);

        });
    }

    // ? Guest donations page
    else if(req.url==='/donations'&& req.method === 'GET'){
        const referer = req.headers.referer || '';
        const cameFromdonation = referer.endsWith('/donations');   
        if (cameFromdonation){
            res.write('<script>alert("Your Donation was a success! Thank You! :)");</script>');
        }

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
                if (err){
                    console.log(err)
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("Something went wrong, please go back."); window.location.href="/donations";</script>
                        </body>
                        </html>`);
                }
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
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("Something went wrong, please go back."); window.location.href="/register";</script>
                        </body>
                        </html>`);
                }
                else{
                    const query = db_con.query('INSERT INTO guests(password,email,phonenumber,name_firstname,name_middlename,name_lastname) VALUES (?,?,?,?,?,?)', [hash,email,phonenumber,firstname,middlename,lastname], (err, res) => {
                        if(err) throw err;
                        console.log('Last insert ID:', res.insertId);
                    
                    })
                }
            })
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("You have been registered! "); window.location.href="/login";</script>
                        </body>
                        </html>`);
        })
    }
    else if (req.url === "/login" && req.method === 'POST'){
        collectinput(req,parsedata=>{
            console.log(parsedata)
            const email =parsedata.email
            const plainpassword = parsedata.password
            db_con.query('SELECT * FROM guests WHERE email = ?',[email],(err,result)=>{
                if (err){
                    console.log(err)
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("Something went wrong, please go back."); window.location.href="/login";</script>
                        </body>
                        </html>`);
                }
                else if (result.length === 0){
                    console.log("Email Not Found")
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("No email found"); window.location.href="/login";</script>
                        </body>
                        </html>`);
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
                            res.writeHead(200, { 'Content-Type': 'text/html' });
                            res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("Wrong password"); window.location.href="/login";</script>
                        </body>
                        </html>`);
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
            const employee_email = parsedata.employee_email
            const password = parsedata.password
            db_con.query('SELECT * FROM employees WHERE employee_email = ?',[employee_email],(err,result)=>{
                if (err){
                    console.log(err)
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("Something went wrong, please go back."); window.location.href="/emplogin";</script>
                        </body>
                        </html>`);
                }
                else if (result.length === 0){
                    console.log(result)
                    console.log("ID Not Found")
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("ID Not Found"); window.location.href="/emplogin";</script>
                        </body>
                        </html>`)
                }
                else{
                    console.log(result)
                    if (password ===result[0].password){
                        // ! declaring employee info
                        userId = result[0].employeeid;
                        empWorksAt = result[0].worksat;
                        userFirstName = result[0].name_firstname;
                        if (result[0].position === "manager"){
                            const token = generatetoken({employee_email})
                            storeJWTcookie(res,token)
                            res.writeHead(302, {Location: './manager'})
                            res.end('Check login')
                        }
                        else if (result[0].position === "admin"){
                            const token = generatetoken({employee_email})
                            storeJWTcookie(res,token)
                            res.writeHead(302, {Location: './admin'})
                            res.end('Check login')
                        }
                        else if (result[0].position === "veterinarian"){
                            const token = generatetoken({employee_email})
                            storeJWTcookie(res,token)
                            res.writeHead(302, {Location: './vet'})
                            res.end('Check login')
                        }   
                    } 
                    else{
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(`<!DOCTYPE html>
                    <html>
                    <body>

                    <script>alert("Wrong password! Please enter your password again"); window.location.href="/emplogin";</script>
                    </body>
                    </html>`);
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
                            <a href='./man_notif'>Notifications Center</a>  
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
    else if(req.url ==="/man_rev_rep" && req.method === 'GET'){
        displayPage("./public/manager_revenue_rep.html",res)
    }
    else if(req.url ==="/man_rev_rep" && req.method === 'POST'){
        console.log(userId);
        collectinput(req, parsedata => {
            const htmlTables = [];

            const startDate = parsedata.revenuestartdate;
            const endDate = parsedata.revenueenddate;

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
                            <div class="links header-links">
                                <a href="../manager" class="manager-portal">Manager Portal</a>
                                <a href="../man_rev_rep">Revenue Reports</a>
                                <a href="./man_notif">Notifications Center</a>
                            </div>
                        </header>
                        ${responseHtml}
                    </body>
                </html>
                `);
                res.end(); 
            };


            db_con.query(`SELECT * FROM revenue_report WHERE outletid = ? AND revenuedate BETWEEN ? AND ?`, [empWorksAt, startDate, endDate], (err, result) => {
                if (err) {
                    console.log(err)
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("Something went wrong, please go back."); window.location.href="/man_rev_rep";</script>
                        </body>
                        </html>`);
                }
                else if (result.length === 0) {
                    htmlTables.push(`<p>No data found for Outlet ${empWorksAt}</p>`);
                }
                else {
                    db_con.query(`SELECT SUM(revenueamount) AS subtotal, MIN(revenueamount) AS minProfit, MAX(revenueamount) AS maxProfit FROM revenue_report WHERE outletid = ? AND revenuedate BETWEEN ? AND ?`, [empWorksAt, startDate, endDate], (err, sumResult) => {
                        if (err){
                            console.log(err)
                            res.writeHead(200, { 'Content-Type': 'text/html' });
                            res.end(`<!DOCTYPE html>
                                <html>
                                <body>
                                <script>alert("Something went wrong, please go back."); window.location.href="/man_rev_rep";</script>
                                </body>
                                </html>`);
                        }
                        else if (sumResult.length === 0) {
                            console.log("Subtotal Not Found");
                        } else {
                            let subtotalValue = sumResult[0].subtotal;

                            const minProfit = sumResult[0].minProfit;
                            const maxProfit = sumResult[0].maxProfit;

                            // Find the dates corresponding to the least and most profit
                            const leastProfitableDateRow = result.find(row => row.revenueamount === minProfit);
                            const mostProfitableDateRow = result.find(row => row.revenueamount === maxProfit);

                            const leastProfitableDate = leastProfitableDateRow ? yyyymmdd(leastProfitableDateRow.revenuedate) : 'N/A';
                            const mostProfitableDate = mostProfitableDateRow ? yyyymmdd(mostProfitableDateRow.revenuedate) : 'N/A';

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
                                        <td class="revenuedate-col">${yyyymmdd(row.revenuedate)}</td>
                                        <td class="revenueamount-col">$${(row.revenueamount).toFixed(2)}</td>
                                    </tr>`).join('') 
                                + `</table> 
                                <div class = "results">
                                    <div class="subtotal">
                                        <strong> <span style="text-decoration: underline;">Revenue Subtotal</span>: $${(sumResult[0].subtotal).toFixed(2)}</strong>
                                    </div>
                                    <div class="most-profitable">
                                        <strong> <span style="text-decoration: underline;">Most Profitable Date</span>: ${mostProfitableDate}:  ($${(maxProfit).toFixed(2)}) </strong>
                                    </div>
                                    <div class="least-profitable">
                                        <strong> <span style="text-decoration: underline;">Least Profitable Date</span>: ${leastProfitableDate}:  ($${(minProfit).toFixed(2)}) </strong>
                                    </div>
                                    <div class="avg-daily">
                                        <strong> <span style="text-decoration: underline;">Average Daily Revenue</span>: $${(sumResult[0].subtotal / result.length).toFixed(2)} </strong>
                                    </div>
                                    </div>
                                </div>`;

                            htmlTables.push(tableHtml);      
                            renderHtml(); 
                        }
                    });
                }
            });
        })
    }
    else if(req.url ==="/man_notif" && req.method === 'GET') {
        db_con.query(`SELECT * FROM notifications WHERE employeeid = ? AND to_notify = 1 `, [userId], (err, result) => {
            if (err) {
                console.error(err);
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Internal Server Error');
                return;
            }
    
            //! the manager has no notifications
            if (result.length === 0) {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`<!DOCTYPE html>
                    <html>
                    <body>
                    <script>alert("You have no notifications"); window.location.href="/manager";</script>
                    </body>
                    </html>`);
            } 
            //! the manager HAS notifications
            else {
                console.log(result);
                res.writeHead(200, { 'Content-Type': 'text/html' });

                for (const notification of result) {
                    res.write(`<script>alert("${notification.notificationcontent}");</script>`);
                }

                db_con.query('DELETE FROM notifications WHERE employeeid = ? AND to_notify = 1', [userId], (deleteErr, deleteResult) => {
                    if (deleteErr) {
                        console.error(deleteErr);
                        res.write('<script>alert("Error deleting notifications");</script>');
                    } else {
                        res.write('<script>alert("Clearing all notifications...");</script>');
                    }

                    res.write('<script>window.location.href="/manager";</script>');
                    res.end('</body></html>');
                });
            }
        })
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
                            <a href='../vet_expense_rep'>Veterinary Expenses Reports</a>  
                        </div> 
                    </div>


                    <h1 class="sidebar-header">Veterinary</h1>
                    <div class="subsection admin-subsection">
                        <div class="sidebar-link"> 
                            <a href='../mod_health'>Modify Health Records</a>  
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
    else if(req.url ==="/vet_expense_rep" && req.method === 'GET'){
        displayPage("./public/vet_expense_rep.html",res)
    }
    else if(req.url ==="/vet_expense_rep" && req.method === 'POST'){
        collectinput(req, parsedata => {
            const reasons = [];
            const htmlTables = []
            let subtotals = [];

            const surgery = parsedata.surgery;
            const injury = parsedata.injury;
            const routine = parsedata.routine;
            const infectiondisease = parsedata.infectiondisease;

            const startDate = parsedata.visitstartdate;
            const endDate = parsedata.visitenddate;

            const renderHtml = () => {
                const responseHtml = htmlTables.join('');
                const totalSum = subtotals.reduce((acc, subtotal) => acc + subtotal, 0);


                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.write(`
                <html>
                    <head>
                        <link rel="stylesheet" href="../expense_rep.css">
                    </head>
                    <body>
                        <header>
                            <div class="links header-links">
                                <a href="../vet" class="vet-portal">Veterinarian Portal</a>
                                <a href="../vet_expense_rep">Veterinary Expenses Reports</a>
                                <a href="../mod_health">Modify Health Records</a>
                            </div>
                        </header>
                        ${responseHtml}
                        <div class="total-sum"><strong> <span style="text-decoration: underline;">Total Veterinary Expenses</span>: $${(totalSum).toFixed(2)}</strong></div> 
                    </body>
                </html>
                `);
                res.end(); 
            };

            if(surgery !== undefined) reasons.push(surgery);
            if(injury !== undefined) reasons.push(injury);
            if(routine !== undefined) reasons.push(routine);
            if(infectiondisease !== undefined) reasons.push(infectiondisease);


            const processReason = (reasonIndex) => {
                const reason = reasons[reasonIndex]; // "Injury", "Surgery", "..."
                let maxTreatmentCost = 0;
                let mostExpensiveTreatment = '';

                db_con.query(`SELECT * FROM vetexpense_report WHERE visitreason = ? AND visit_date BETWEEN ? AND ? ORDER BY visit_date DESC`, [reason, startDate, endDate], (err, result) => {
                    if (err){
                        console.log(err)
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(`<!DOCTYPE html>
                            <html>
                            <body>
                            <script>alert("Something went wrong, please go back."); window.location.href="/vet_expense_rep";</script>
                            </body>
                            </html>`);
                    }
                    else if (result.length === 0) {
                        console.log("ERROR IN EXPENSE REPORT")
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(`<!DOCTYPE html>
                            <html>
                            <body>
                            <script>alert("ERROR IN EXPENSE REPORT"); window.location.href="/vet_expense_rep";</script>
                            </body>
                            </html>`);
                    }
                    else {
                        console.log(result); 
                        db_con.query(`SELECT SUM(cost) AS subtotal FROM vetexpense_report WHERE visitreason = ? AND visit_date BETWEEN ? AND ?`, [reason, startDate, endDate], (err, sumResult) => {
                            if (err){
                                console.log(err)
                                res.writeHead(200, { 'Content-Type': 'text/html' });
                                res.end(`<!DOCTYPE html>
                                    <html>
                                    <body>
                                    <script>alert("Something went wrong, please go back."); window.location.href="/vet_expense_rep";</script>
                                    </body>
                                    </html>`);
                            }
                            else if (sumResult.length === 0) {
                                console.log("Subtotal Not Found");
                            }
                            else {
                                let subtotalValue = sumResult[0].subtotal;


                                result.forEach(row => {
                                    subtotalValue += row.cost;
                    
                                    // Check if the current treatment is more expensive
                                    if (row.cost > maxTreatmentCost) {
                                        maxTreatmentCost = row.cost;
                                        mostExpensiveTreatment = row.treatment;
                                    }
                                });
                    


                                subtotals.push(subtotalValue);

                                const tableHtml = 
                                    `
                                    <div class="container">
                                    <table border="1">
                                    <tr>
                                        <th class="animalname">Animal Name</th>
                                        <th class="species">Species</th>
                                        <th class="visitdate">Visit Date</th>
                                        <th class="reason">Visit Reason</th>
                                        <th class="diagnosis">Diagnosis</th>
                                        <th class="treatment">Treatment</th>
                                        <th class="notes">Notes</th>
                                        <th class="cost">Cost</th>
                                    </tr>` +
                                        result.map (
                                            
                                        row => 
                                        
                                        `<tr>
                                            <td class="">${row.animal_name}</td>
                                            <td class="">${row.animal_species}</td>
                                            <td class="">${yyyymmdd(row.visit_date)}</td>
                                            <td class="">${row.visitreason}</td>
                                            <td class="">${row.diagnosis}</td>
                                            <td class="">${row.treatment}</td>
                                            <td class="">${row.notes !== null ? row.notes : ''}</td>
                                            <td class="">$${(row.cost).toFixed(2)}</td>
                                        </tr>`).join('') 
                                    + `</table> 
                                    <div class = "results">
                                        
                                        <div class="subtotal"><strong> <span style="text-decoration: underline;">Zoo Veterinary Expense</span>:  -$${(sumResult[0].subtotal).toFixed(2)}</strong></div>
                                        <div class="subtotal"><strong> <span style="text-decoration: underline;">Most expensive treatment</span>: $${(maxTreatmentCost).toFixed(2)} - ${mostExpensiveTreatment}</strong></div>
                                        
                                        </div>
                                    </div>`;
                                    

                                htmlTables.push(tableHtml);

                                if(reasonIndex + 1 < reasons.length) {
                                    processReason(reasonIndex + 1);
                                } 
                                else {
                                    renderHtml();
                                }
                            }
                        }); 
                    }
                });
            }

            processReason(0);
        })
    }
    else if(req.url ==="/mod_health" && req.method === 'GET'){
        console.log(userId);

        db_con.query(`SELECT h.*, a.name AS animal_name, e.name_firstname AS vet_fname, e.name_lastname AS vet_lname
        FROM health_records AS h
        LEFT JOIN animals AS a ON h.animalid = a.animalid
        LEFT JOIN employees AS e ON h.veterinarianid = e.employeeid
        WHERE h.deleted = 0
        ORDER BY h.visitdate DESC;`, (err, result) => {
            if (err){
                console.log(err)
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`<!DOCTYPE html>
                    <html>
                    <body>
                    <script>alert("Something went wrong, please go back."); window.location.href="/mod_health";</script>
                    </body>
                    </html>`);
            }
            else {
                
                result.forEach(row => {
                    row.visitdate = yyyymmdd(row.visitdate)
                });

                db_con.query(`SELECT * FROM animals WHERE deleted = 0`, [], (err, animalsResult) => {
                    if (err){
                        console.log(err)
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(`<!DOCTYPE html>
                            <html>
                            <body>
                            <script>alert("Something went wrong, please go back."); window.location.href="/mod_health";</script>
                            </body>
                            </html>`);
                    }
                    displayView("./views/mod_health.ejs", res, { result, animalsResult });
                })

                

                
            }
        })
    }
    else if(req.url ==="/mod_health/add" && req.method === 'POST'){
        

        collectinput(req, parsedata => {
            console.log("from post: " + userId);
            
            const animal = parsedata.addanimalname;
            const visitreason = parsedata.addvisitreason;
            const visitdate = parsedata.addvisitdate
            const diagnosis = parsedata.adddiagnosis;
            const treatment = parsedata.addtreatment;
            let notes = parsedata.addnotes;
            const cost = parsedata.addcost;

            if(notes === '') notes = null;

            db_con.query(`INSERT INTO health_records (animalid, veterinarianid, visitreason, visitdate, diagnosis, treatment, notes, cost) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, [animal, userId, visitreason, visitdate, diagnosis, treatment, notes, cost], (err, result) => {
                if (err){
                    console.log(err)
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("Something went wrong, please go back."); window.location.href="/mod_health";</script>
                        </body>
                        </html>`);
                }
                else {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("The record has been inserted."); window.location.href="/mod_health";</script>
                        </body>
                        </html>`);
                }
            })
        })
    }
    else if(req.url ==="/mod_health/edit" && req.method === 'POST'){
        collectinput(req, parsedata => {
            const recordid = parsedata.recordid_edit;
            const vetid = parsedata.vetid_edit;
            
            const animal = parsedata.editanimalname;
            const visitreason = parsedata.editvisitreason;
            const visitdate = parsedata.editvisitdate
            const diagnosis = parsedata.editdiagnosis;
            const treatment = parsedata.edittreatment;
            let notes = parsedata.editnotes;
            const cost = parsedata.editcost;

            if(notes === '') notes = null;

            db_con.query(`UPDATE health_records SET animalid = ?, veterinarianid = ?, visitreason = ?, visitdate = ?, diagnosis = ?, treatment = ?, notes = ?, cost = ? WHERE recordid = ?`, [animal, vetid, visitreason, visitdate, diagnosis, treatment, notes, cost, recordid], (err, result) => {
                if (err){
                    console.log(err)
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("Something went wrong, please go back."); window.location.href="/mod_health";</script>
                        </body>
                        </html>`);
                }
                else {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("The record has been updated."); window.location.href="/mod_health";</script>
                        </body>
                        </html>`);
                }
            })
        })
    }
    else if(req.url ==="/mod_health/delete" && req.method === 'POST'){
        collectinput(req, parsedata => {
            const recordid = parsedata.id_delete;
            
            db_con.query(`UPDATE health_records SET deleted = 1 WHERE recordid = ?`, [recordid], (err, result) => {
                if (err){
                    console.log(err)
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("Something went wrong, please go back."); window.location.href="/mod_health";</script>
                        </body>
                        </html>`);
                }
                else {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("Your record is deleted."); window.location.href="/mod_health";</script>
                        </body>
                        </html>`);
                }
            })
        })
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
                            <a href='./admin_expense_rep'>Veterinary Expenses Reports</a>  
                        </div> 
                        <div class="sidebar-link"> 
                            <a href='./admin_donor_rep'>Donation Reports</a> 
                        </div> 
                        
                    </div>


                    <h1 class="sidebar-header">Administration</h1>
                    <div class="subsection admin-subsection">

                        <!--! since triggers rely on animal insertions and we mmust present triggers live, this is priority others are not! -->
                        <div class="sidebar-link"> 
                            <a href='./mod_animal'>Modify Animals</a>  
                        </div> 

                        
                        <div class="sidebar-link"> 
                            <a href='./mod_enclosure'>Modify Enclosures</a>  
                        </div> 


                        <div class="sidebar-link"> 
                            <a href='./mod_employee'>Modify Employees</a>  
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
            let subtotals = [];

            const conservation = parsedata.wildlifeconservation;
            const outreach = parsedata.communityoutreach;
            const education = parsedata.educationprograms;
            const research = parsedata.researchprograms;

            const startDate = parsedata.donationstartdate;
            const endDate = parsedata.donationenddate;

            const renderHtml = () => {
                const responseHtml = htmlTables.join('');
                const totalSum = subtotals.reduce((acc, subtotal) => acc + subtotal, 0);
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.write(`
                <html>
                    <head>
                        <link rel="stylesheet" href="../donation_rep.css">

                        <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
                    </head>
                    <body>
                        <header>
                            <div class="links header-links">
                                <a href="../admin" class="admin-portal">Admin Portal</a>
                                <a href="../admin_rev_rep">Revenue Reports</a>
                                <a href="../admin_expense_rep">Veterinary Expenses Reports</a>
                                <a href="../admin_donor_rep">Donation Reports</a>
                                <a href="../mod_animal">Modify Animals</a>
                                <a href="../mod_enclosure">Modify Enclosures</a>
                                <a href="../mod_employee">Modify Employees</a>
                            </div>
                        </header>
                        ${responseHtml}
                        <div class="total-sum"><strong> <span style="text-decoration: underline;">Total Donations Pool</span>: $${totalSum.toFixed(2)}</strong></div>

                        
                        <div id="pieChartContainer" style="width: 650px; height: 650px; margin: 0 auto; text-align: center;"">
                            <canvas id="donationPieChart" ></canvas>
                        </div>


                        <script>
                            function renderPieChart(donations, subtotals) {
                                var ctx = document.getElementById('donationPieChart').getContext('2d');
                                var pieChart = new Chart(ctx, {
                                    type: 'pie',
                                    data: {
                                        labels: donations,
                                        datasets: [{
                                            data: subtotals,
                                            backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4CAF50'],
                                        }]
                                    },
                                    options: {
                                        title: {
                                            display: true,
                                            text: 'Donation Distribution'
                                        }
                                    }
                                });
                            }

                            renderPieChart(${JSON.stringify(donations)}, ${JSON.stringify(subtotals)});
                        </script>


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
                    if (err){
                        console.log(err)
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(`<!DOCTYPE html>
                            <html>
                            <body>
                            <script>alert("Something went wrong, please go back."); window.location.href="/admin_donor_rep";</script>
                            </body>
                            </html>`);
                    }
                    else if (result.length === 0) {
                        console.log("ERROR IN DONATE REPORT")
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(`<!DOCTYPE html>
                            <html>
                            <body>
                            <script>alert("ERROR IN DONATE REPORT"); window.location.href="/admin_donor_rep";</script>
                            </body>
                            </html>`);
                    }
                    else {
                        console.log(result); 
                        db_con.query(`SELECT COUNT(DISTINCT guestid) AS uniqueDonors, SUM(donationamount) AS subtotal FROM donation_report WHERE donationpurpose = ? AND donationdate BETWEEN ? AND ?`, [donationType, startDate, endDate], (err, sumResult) => {
                            if (err){
                                console.log(err)
                                res.writeHead(200, { 'Content-Type': 'text/html' });
                                res.end(`<!DOCTYPE html>
                                    <html>
                                    <body>
                                    <script>alert("Something went wrong, please go back."); window.location.href="/admin_donor_rep";</script>
                                    </body>
                                    </html>`);
                            }
                            else if (sumResult.length === 0) {
                                console.log("Subtotal Not Found");
                            }
                            else {
                                let subtotalValue = sumResult[0].subtotal;
                                subtotals.push(subtotalValue);

                                const tableHtml = 
                                    `
                                    <div class="container">
                                    <table border="1">
                                    <tr>
                                        <th class="">Donor ID</th>
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
                                            <td class="">${row.name_firstname}</td>
                                            <td class="">${row.name_lastname}</td>
                                            <td class="">${row.donationpurpose}</td>
                                            <td class="">${yyyymmdd(row.donationdate)}</td>
                                            <td class="">$${(row.donationamount).toFixed(2)}</td>
                                        </tr>`).join('') 
                                    + `</table> 
                                    <div class = "results">
                                        <div class="subtotal"><strong> <span style="text-decoration: underline;">Total Donations</span>:  ${result.length}</strong></div>
                                        <div class="subtotal"><strong> <span style="text-decoration: underline;">Total Unique Donations</span>:  ${sumResult[0].uniqueDonors}</strong></div>
                                        <div class="subtotal"><strong> <span style="text-decoration: underline;">Donations Subtotal</span>: $${(sumResult[0].subtotal).toFixed(2)}</strong></div>
                                        
                                        </div>
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
    else if(req.url ==="/admin_expense_rep" && req.method === 'GET'){
        displayPage("./public/admin_expense_rep.html",res)
    }
    else if(req.url ==="/admin_expense_rep" && req.method === 'POST'){
        collectinput(req, parsedata => {
            const reasons = [];
            const htmlTables = []
            let subtotals = [];

            const surgery = parsedata.surgery;
            const injury = parsedata.injury;
            const routine = parsedata.routine;
            const infectiondisease = parsedata.infectiondisease;

            const startDate = parsedata.visitstartdate;
            const endDate = parsedata.visitenddate;

            const renderHtml = () => {
                const responseHtml = htmlTables.join('');
                const totalSum = subtotals.reduce((acc, subtotal) => acc + subtotal, 0);


                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.write(`
                <html>
                    <head>
                        <link rel="stylesheet" href="../expense_rep.css">
                    </head>
                    <body>
                        <header>
                            <div class="links header-links">
                                <a href="../admin" class="admin-portal">Admin Portal</a>
                                <a href="../admin_rev_rep">Revenue Reports</a>
                                <a href="../admin_expense_rep">Veterinary Expenses Reports</a>
                                <a href="../admin_donor_rep">Donation Reports</a>
                                <a href="../mod_animal">Modify Animals</a>
                                <a href="../mod_enclosure">Modify Enclosures</a>
                                <a href="../mod_employee">Modify Employees</a>
                            </div>
                        </header>
                        ${responseHtml}
                        <div class="total-sum"><strong> <span style="text-decoration: underline;">Total Veterinary Expenses</span>: $${(totalSum).toFixed(2)}</strong></div> 
                    </body>
                </html>
                `);
                res.end(); 
            };

            if(surgery !== undefined) reasons.push(surgery);
            if(injury !== undefined) reasons.push(injury);
            if(routine !== undefined) reasons.push(routine);
            if(infectiondisease !== undefined) reasons.push(infectiondisease);


            const processReason = (reasonIndex) => {
                const reason = reasons[reasonIndex]; // "Injury", "Surgery", "..."
                let maxTreatmentCost = 0;
                let mostExpensiveTreatment = '';

                db_con.query(`SELECT * FROM vetexpense_report WHERE visitreason = ? AND visit_date BETWEEN ? AND ? ORDER BY visit_date DESC`, [reason, startDate, endDate], (err, result) => {
                    if (err){
                        console.log(err)
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(`<!DOCTYPE html>
                            <html>
                            <body>
                            <script>alert("Something went wrong, please go back."); window.location.href="/admin_expense_rep";</script>
                            </body>
                            </html>`);
                    }
                    else if (result.length === 0) {
                        console.log("ERROR IN EXPENSE REPORT")
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(`<!DOCTYPE html>
                            <html>
                            <body>
                            <script>alert("ERROR IN EXPENSE REPORT"); window.location.href="/admin_expense_rep";</script>
                            </body>
                            </html>`);
                    }
                    else {
                        console.log(result); 
                        db_con.query(`SELECT SUM(cost) AS subtotal FROM vetexpense_report WHERE visitreason = ? AND visit_date BETWEEN ? AND ?`, [reason, startDate, endDate], (err, sumResult) => {
                            if (err){
                                console.log(err)
                                res.writeHead(200, { 'Content-Type': 'text/html' });
                                res.end(`<!DOCTYPE html>
                                    <html>
                                    <body>
                                    <script>alert("Something went wrong, please go back."); window.location.href="/admin_expense_rep";</script>
                                    </body>
                                    </html>`);
                            }
                            else if (sumResult.length === 0) {
                                console.log("Subtotal Not Found");
                            }
                            else {
                                let subtotalValue = sumResult[0].subtotal;


                                result.forEach(row => {
                                    subtotalValue += row.cost;
                    
                                    // Check if the current treatment is more expensive
                                    if (row.cost > maxTreatmentCost) {
                                        maxTreatmentCost = row.cost;
                                        mostExpensiveTreatment = row.treatment;
                                    }
                                });
                    


                                subtotals.push(subtotalValue);

                                const tableHtml = 
                                    `
                                    <div class="container">
                                    <table border="1">
                                    <tr>
                                        <th class="animalname">Animal Name</th>
                                        <th class="species">Species</th>
                                        <th class="visitdate">Visit Date</th>
                                        <th class="reason">Visit Reason</th>
                                        <th class="diagnosis">Diagnosis</th>
                                        <th class="treatment">Treatment</th>
                                        <th class="notes">Notes</th>
                                        <th class="cost">Cost</th>
                                    </tr>` +
                                        result.map (
                                            
                                        row => 
                                        
                                        `<tr>
                                            <td class="">${row.animal_name}</td>
                                            <td class="">${row.animal_species}</td>
                                            <td class="">${yyyymmdd(row.visit_date)}</td>
                                            <td class="">${row.visitreason}</td>
                                            <td class="">${row.diagnosis}</td>
                                            <td class="">${row.treatment}</td>
                                            <td class="">${row.notes !== null ? row.notes : ''}</td>
                                            <td class="">$${(row.cost).toFixed(2)}</td>
                                        </tr>`).join('') 
                                    + `</table> 
                                    <div class = "results">
                                        
                                        <div class="subtotal"><strong> <span style="text-decoration: underline;">Zoo Veterinary Expense</span>:  -$${(sumResult[0].subtotal).toFixed(2)}</strong></div>
                                        <div class="subtotal"><strong> <span style="text-decoration: underline;">Most Expensive treatment</span>: $${(maxTreatmentCost).toFixed(2)} - ${mostExpensiveTreatment}</strong></div>
                                        
                                        </div>
                                    </div>`;
                                    

                                htmlTables.push(tableHtml);

                                if(reasonIndex + 1 < reasons.length) {
                                    processReason(reasonIndex + 1);
                                } 
                                else {
                                    renderHtml();
                                }
                            }
                        }); 
                    }
                });
            }

            processReason(0);
        })
    }
    else if(req.url ==="/admin_rev_rep"&& req.method === 'GET'){
        displayPage("./public/admin_revenue_rep.html",res)
    }
    else if(req.url === "/admin_rev_rep" && req.method === 'POST'){
        collectinput(req, parsedata => {
            const outlets = [];
            const htmlTables = [];
            let subtotals = [];

            const safari = parsedata.safaritreasures;
            const trinkets = parsedata.trinketscharms;
            const creature = parsedata.creaturecuisine;
            const lions = parsedata.lionslollipops;

            const startDate = parsedata.revenuestartdate;
            const endDate = parsedata.revenueenddate;

            const renderHtml = () => {
                const responseHtml = htmlTables.join('');
                const totalSum = subtotals.reduce((acc, subtotal) => acc + subtotal, 0);
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.write(`
                <html>
                    <head>
                        <link rel="stylesheet" href="../revenue_rep.css">
                    </head>
                    <body>
                        <header>
                            <div class="links header-links">
                                <a href="../admin" class="admin-portal">Admin Portal</a>
                                <a href="../admin_rev_rep">Revenue Reports</a>
                                <a href="../admin_expense_rep">Veterinary Expenses Reports</a>
                                <a href="../admin_donor_rep">Donation Reports</a>
                                <a href="../mod_animal">Modify Animals</a>
                                <a href="../mod_enclosure">Modify Enclosures</a>
                                <a href="../mod_employee">Modify Employees</a>
                            </div>
                        </header>
                        ${responseHtml}
                        <div class="total-sum"><strong> <span style="text-decoration: underline;">Total Generated Revenue</span>: $${(totalSum).toFixed(2)}</strong></div> 
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
                    if (err){
                        console.log(err)
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(`<!DOCTYPE html>
                            <html>
                            <body>
                            <script>alert("Something went wrong, please go back."); window.location.href="/admin_rev_rep";</script>
                            </body>
                            </html>`);
                    }
                    else if (result.length === 0) {
                        htmlTables.push(`<p>No data found for Outlet ${outletId}</p>`);
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(`<!DOCTYPE html>
                            <html>
                            <body>
                            <script>alert("No data found for Outlet ${outletId}"); window.location.href="/admin_rev_rep";</script>
                            </body>
                            </html>`);
                    } else {
                        db_con.query(`SELECT SUM(revenueamount) AS subtotal, MIN(revenueamount) AS minProfit, MAX(revenueamount) AS maxProfit FROM revenue_report WHERE outletid = ? AND revenuedate BETWEEN ? AND ?`, [outletId, startDate, endDate], (err, sumResult) => {
                            if (err){
                                console.log(err)
                                res.writeHead(200, { 'Content-Type': 'text/html' });
                                res.end(`<!DOCTYPE html>
                                    <html>
                                    <body>
                                    <script>alert("Something went wrong, please go back."); window.location.href="/admin_rev_rep";</script>
                                    </body>
                                    </html>`);
                            }
                            else if (sumResult.length === 0) {
                                console.log("Subtotal Not Found");
                            } else {
                                let subtotalValue = sumResult[0].subtotal;
                                subtotals.push(subtotalValue);

                                const minProfit = sumResult[0].minProfit;
                                const maxProfit = sumResult[0].maxProfit;

                                // Find the dates corresponding to the least and most profit
                                const leastProfitableDateRow = result.find(row => row.revenueamount === minProfit);
                                const mostProfitableDateRow = result.find(row => row.revenueamount === maxProfit);

                                const leastProfitableDate = leastProfitableDateRow ? yyyymmdd(leastProfitableDateRow.revenuedate) : 'N/A';
                                const mostProfitableDate = mostProfitableDateRow ? yyyymmdd(mostProfitableDateRow.revenuedate) : 'N/A';

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
                                            <td class="revenuedate-col">${yyyymmdd(row.revenuedate)}</td>
                                            <td class="revenueamount-col">$${(row.revenueamount).toFixed(2)}</td>
                                        </tr>`).join('') 
                                    + `</table> 
                                    <div class = "results">
                                        <div class="subtotal">
                                            <strong> <span style="text-decoration: underline;">Revenue Subtotal</span>: $${(sumResult[0].subtotal).toFixed(2)}</strong>
                                        </div>
                                        <div class="most-profitable">
                                            <strong> <span style="text-decoration: underline;">Most Profitable Date</span>: ${mostProfitableDate}:  ($${(maxProfit).toFixed(2)}) </strong>
                                        </div>
                                        <div class="least-profitable">
                                            <strong> <span style="text-decoration: underline;">Least Profitable Date</span>: ${leastProfitableDate}:  ($${(minProfit).toFixed(2)}) </strong>
                                        </div>
                                        <div class="avg-daily">
                                            <strong> <span style="text-decoration: underline;">Average Daily Revenue</span>: $${(sumResult[0].subtotal / result.length).toFixed(2)} </strong>
                                        </div>
                                        </div>
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

    // ADMIN mod animal
    else if(req.url === "/mod_animal" && req.method === 'GET') {
        //! ALL QUERIES OF THIS KIND MUST INCLUDE "WHERE deleted = 0"
        
        db_con.query(`SELECT * FROM animals AS a
                    LEFT JOIN enclosures AS e ON a.enclosureid = e.enclosureid
                    WHERE a.deleted = 0 AND e.deleted = 0
                    ORDER BY a.species`, (err, result) => { 
            if (err) throw err;
            else {
                // Extracting all unique enclosureids from the result set
                //? const enclosureIds = result.map(row => row.enclosureid);
        
                // Fetching enclosure names for all unique enclosureids
                db_con.query(`SELECT * FROM enclosures WHERE deleted = 0`, [], (err, enclosureResults) => {
                    if (err) throw err;
        
                    // Creating a map for quick lookup of enclosure names based on enclosureid
                    const enclosureMap = {};
                    enclosureResults.forEach(enclosureRow => {
                        enclosureMap[enclosureRow.enclosureid] = enclosureRow.enclosurename;
                    });
        
                    // Updating the result with enclosure names
                    result.forEach(row => {
                        if (row.birthdate !== null) {
                            row.birthdate = yyyymmdd(row.birthdate);
                        }
                        row.arrivaldate = yyyymmdd(row.arrivaldate);
                        row.enclosurename = enclosureMap[row.enclosureid];
                    });
        
                    displayView("./views/mod_animal.ejs", res, { result, enclosureResults });
                });
            }
        });
    }
    else if (req.url === "/mod_animal/add" && req.method === 'POST') {
        collectinput(req, parsedata => {
            const animal_class = parsedata.addclass;
            const species = parsedata.addspecies;
            const name = parsedata.addname;
            var birthdate = parsedata.addbirthdate;
            const arrival = parsedata.addarrival;
            const sex = parsedata.addsex;
            const enclosure = parsedata.addenclosure;

            if(animal_class === '') animal_class = null;
            if(species === '') species = null;
            if(name === '') name = null;
            if(birthdate === '') birthdate = null;
            if(arrival === '') arrival = null;
            if(sex === '') sex = null;
            if(enclosure === '') enclosure = null;

            const insert_animal = db_con.query('INSERT into animals(class,species,name,birthdate,arrivaldate,sex,enclosureid) VALUES (?,?,?,?,?,?,?)',[animal_class,species,name,birthdate,arrival,sex,enclosure], (err, result) => {
                if(err){
                    if(err == "Error: Animal and enclosure species does not match."){
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("Animal insertion failed. The ${species} species doesn't belong to the ${enclosure} enclosure. Please try again."); window.location.href="/mod_animal";</script>
                        </body>
                        </html>`);
                    }
                    else if(err == "Error: Cannot insert into that enclosure."){
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("Animal insertion failed. The ${enclosure} enclosure is full. Please remove animal or increase the capacity and try again."); window.location.href="/mod_animal";</script>
                        </body>
                        </html>`);
                    }
                }

                //if no error, then animal is inserted
                else {
                    console.log('Last animal insert ID:', result.insertId);
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <h1>Your animal is succesfully added!</h1>
                        <script>alert("Animal insertion is sucessful."); window.location.href="/mod_animal";</script>
                        </body>
                        </html>`);
                }
                
            });
            //res.writeHead(302, {Location: '/mod_animal'});
            //res.end('Animal added')
        }) 
    }
    else if(req.url === "/mod_animal/edit" && req.method === 'POST') {
        collectinput(req, parsedata => {
            const animalid = parsedata.id_edit;
            var animalclass = parsedata.editclass;
            var species = parsedata.editspecies;
            var name = parsedata.editname;
            var birthday = parsedata.editbirth;
            var arrival = parsedata.editarrival;
            var sex = parsedata.editsex;
            var enclosure = parsedata.editenclosure;

            //? else there will be an insertion error
            if(animalclass === '') animalclass = null;
            if(species === '') species = null;
            if(birthday === '') birthday = null;
            if(name === '') name = null;
            if(birthday === '') birthday = null;
            if(arrival === '') arrival = null;
            if(sex === '') sex = null;
            if(enclosure === '') enclosure = null;

            db_con.query(`UPDATE animals SET class = ?, species = ?, name = ?, birthdate = ?, arrivaldate = ?, sex = ?, enclosureid = ? WHERE animalid = ?`, [animalclass, species, name, birthday, arrival, sex, enclosure, animalid], (err, result) => {
                if (err){
                    console.log(err)
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("${err}. Please go back."); window.location.href="/mod_animal";</script>
                        </body>
                        </html>`);
                }
                else {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("Your animal is updated."); window.location.href="/mod_animal";</script>
                        </body>
                        </html>`);
                    
                }
            })
        })
    }
    else if(req.url === "/mod_animal/delete" && req.method === 'POST') {
        collectinput(req, parsedata => {
            const animalid = parsedata.id_delete;
            
            db_con.query(`UPDATE animals SET deleted = 1 WHERE animalid = ?`, [animalid], (err, result) => {
                if (err){
                    console.log(err)
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("${err}. Please go back."); window.location.href="/mod_animal";</script>
                        </body>
                        </html>`);
                }
                else {
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("Your animal is deleted."); window.location.href="/mod_animal";</script>
                        </body>
                        </html>`);
                }
            })
        })
    }

    // ADMIN mod enclosure
    else if (req.url === "/mod_enclosure" && req.method ==='GET'){
        db_con.query(`SELECT * FROM enclosures AS e
                        WHERE e.deleted =0;`, (err, result) => {
            if (err) throw err;
            else {
                displayView("./views/mod_enclosure.ejs", res, { result });     
            }
        })
    }
    else if (req.url ==="/mod_enclosure/add" && req.method === 'POST'){
        collectinput(req, parsedata => {
            const enclosurename = parsedata.addname;
            const enclosuretype = parsedata.addtype;
            const enclosurecapacity = parsedata.addcapacity;
            const enclosurestatus = parsedata.addstatus;

            if (enclosurename === '') enclosurename = null;
            if (enclosuretype === '') enclosuretype = null; 
            if (enclosurecapacity === '') enclosurecapacity = null;
            if (enclosurestatus === '') enclosurestatus = null;

            const insert_enclosure = db_con.query('INSERT into enclosures(enclosurename,enclosuretype,capacity,status) VALUES (?,?,?,?)',[enclosurename,enclosuretype,enclosurecapacity,enclosurestatus], (err, result) => {
                if(err){
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("Something went wrong. Please try again."); window.location.href="/mod_enclosure";</script>
                        </body>
                        </html>`);
                }
                console.log('Last enclosure insert ID:', result.insertId);
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("Your enclosure is sucessfully inserted!!"); window.location.href="/mod_enclosure";</script>
                        </body>
                        </html>`);
            });
        })
    }
    else if (req.url ==="/mod_enclosure/edit" && req.method === 'POST'){
        collectinput(req,parsedata =>{
            const enclosureid = parsedata.id_edit;
            const enclosurename = parsedata.editname;
            const enclosuretype = parsedata.edittype;
            const enclosurecapacity = parsedata.editcapacity;
            const enclosurestatus = parsedata.editstatus;
            if (enclosurename === '') enclosurename = null;
            if (enclosuretype === '') enclosuretype = null; 
            if (enclosurecapacity === '') enclosurecapacity = null;
            if (enclosurestatus === '') enclosurestatus = null;
            const update_enclosure = db_con.query('UPDATE enclosures SET enclosurename = ?, enclosuretype = ?, capacity = ? ,status = ? WHERE enclosureid = ?', [enclosurename,enclosuretype,enclosurecapacity,enclosurestatus,enclosureid], (err, result) => {
            if (err){
                console.log(err);
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("Something went wrong. Please try again."); window.location.href="/mod_enclosure";</script>
                        </body>
                        </html>`);
                }
            else{
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("Your enclosure is sucessfully updated!!"); window.location.href="/mod_enclosure";</script>
                        </body>
                        </html>`);
            }
            })
        })
    }
    else if (req.url ==="/mod_enclosure/delete" && req.method === 'POST'){
        collectinput(req,parsedata =>{
            const enclosureid = parsedata.id_delete;
            const delete_enclosure = db_con.query('UPDATE enclosures SET deleted = 1 WHERE enclosureid = ?', [enclosureid],(err,result)=>{
                if(err){
                    console.log(err)
                    res.writeHead(200, {'Content-Type': 'text/html'});
                    res.end(`<!DOCTYPE html>
                    <html>
                    <body>
                    <script>alert("Something went wrong. Please try again."); window.location.href="/mod_enclosure";</script>
                    </body>
                    </html>`)
                }
                res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("Your enclosure is sucessfully deleted!!"); window.location.href="/mod_enclosure";</script>
                        </body>
                        </html>`)
            })
        })
    }
    
    // ADMIN mod employee
    else if(req.url === "/mod_employee" && req.method === 'GET') {

        db_con.query(`SELECT e.*, o.outletname, o.outletid, m.name_firstname AS manager_firstname, m.name_lastname AS manager_lastname
                    FROM employees AS e
                    LEFT JOIN outlets AS o ON e.worksat = o.outletid
                    LEFT JOIN employees AS m ON e.managerid = m.employeeid AND m.deleted = 0
                    WHERE e.deleted = 0 AND o.deleted = 0
                    ORDER BY FIELD(e.position, 'manager', 'cashier', 'veterinarian', 'zookeeper');` , (err, result) => {
                        
            if(err) {
                console.log(err)
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(`<!DOCTYPE html>
                <html>
                <body>
                <script>alert("An error has occured."); window.location.href="/mod_employee";</script>
                </body>
                </html>`);   
            }
  

            const outletIds = result.map(row => row.worksat);

            db_con.query(`SELECT * from outlets WHERE outletid IN (?) AND deleted = 0`, [outletIds], (err, outletResults) => {
                if(err) {
                    console.log(err)
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`<!DOCTYPE html>
                    <html>
                    <body>
                    <script>alert("An error has occured."); window.location.href="/mod_employee";</script>
                    </body>
                    </html>`);   
                }

                result.forEach(row => {
                    row.hiredate = yyyymmdd(row.hiredate)

                    row.managerid = row.managerid || ""; //? Handle the case where there may not be a manager
                    row.manager_name = `${row.manager_firstname} ${row.manager_lastname}` || "";
                });
    
                displayView("./views/mod_employee.ejs",res, {result, outletResults});
            })
            
        }) 
    }
    else if(req.url === "/mod_employee/add" && req.method === 'POST') {
        collectinput(req, parsedata => {
            const email = parsedata.addemail;
            const worksat = parsedata.addworksat;  // 1, 2, 3, 4, 5, 6
            const fname = parsedata.addfname;
            let mname = parsedata.addmname;
            const lname = parsedata.addlname;
            const position = parsedata.addposition;
    
            // Check if there is already a manager for the specified outlet
            if (position === 'manager') {
                db_con.query(`SELECT * FROM employees WHERE worksat = ? AND position = 'manager' AND deleted = 0`, [worksat], (err, managerResult) => {
                    if (err) {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(`<!DOCTYPE html>
                            <html>
                            <body>
                            <script>alert("An error has occured."); window.location.href="/mod_employee";</script>
                            </body>
                            </html>`);
                    }
    
                    if(managerResult.length > 0) {
                        // There is already a manager for the outlet
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(`<!DOCTYPE html>
                            <html>
                            <body>
                            <script>alert("A manager already exists for this outlet!"); window.location.href="/mod_employee";</script>
                            </body>
                            </html>`);
                    }
                    else {
                        // No manager exists for the outlet, proceed with adding the manager
                        const password = parsedata.addpassword;
                        const hiredate = parsedata.addhiredate;
                        const schedule = parsedata.addschedule; // "MON-THU"...
                        const salary = parsedata.addsalary;

                        // const manager = managerResult[0].employeeid;
    
                        if(mname === '') mname = null;
    
                        //! UPDATE OTHER EMPLOYEES MANAGERID TO NEW MANAFER
                        

                        db_con.query(`INSERT INTO employees(employee_email, password, position, hiredate, worksat, name_firstname, name_middlename, name_lastname, workschedule, salary, managerid) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [email, password, position, hiredate, worksat, fname, mname, lname, schedule, salary, null], (err, result) => {
                            if (err) {
                                res.writeHead(200, { 'Content-Type': 'text/html' });
                                res.end(`<!DOCTYPE html>
                                    <html>
                                    <body>
                                    <script>alert("An error has occured."); window.location.href="/mod_employee";</script>
                                    </body>
                                    </html>`);
                            }
                            else {
                                db_con.query(`SELECT * FROM employees WHERE worksat = ? AND position = 'manager' AND deleted = 0`, [worksat], (err, managerresult) => {
                                    if(err) {
                                        console.log(err)
                                        res.writeHead(200, { 'Content-Type': 'text/html' });
                                        res.end(`<!DOCTYPE html>
                                        <html>
                                        <body>
                                        <script>alert("An error has occured."); window.location.href="/mod_employee";</script>
                                        </body>
                                        </html>`);   
                                    }

                                    db_con.query(`UPDATE employees SET managerid = ? WHERE worksat = ? AND position <> 'manager'`, [managerresult[0].employeeid, worksat], (err, result) =>{
                                        if(err) {
                                            res.writeHead(200, { 'Content-Type': 'text/html' });
                                            res.end(`<!DOCTYPE html>
                                            <html>
                                            <body>
                                            <script>alert("An error has occured."); window.location.href="/mod_employee";</script>
                                            </body>
                                            </html>`);
                                        }
                                        else {
                                            res.end(`<!DOCTYPE html>
                                            <html>
                                            <body>
                                            <script>alert("A manager was added"); window.location.href="/mod_employee";</script>
                                            </body>
                                            </html>`);
                                        }
                                    })
                                })   
                            }     
                        });
                    }
                });
            } 
            // If the position is not 'Manager', proceed with adding the employee
            else {
                const password = parsedata.addpassword;
                const hiredate = parsedata.addhiredate;
                const schedule = parsedata.addschedule; // "MON-THU"...
                const salary = parsedata.addsalary;
    
                if(mname === '') mname = null;

                db_con.query(`SELECT * FROM employees WHERE worksat = ? AND position = 'manager' AND deleted = 0`, [worksat], (err, managerResult) => {
                    if(err) {
                        console.log(err)
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("An error has occured."); window.location.href="/mod_employee";</script>
                        </body>
                        </html>`);   
                    }
                    else {
                        db_con.query(`UPDATE employees SET managerid = ? WHERE worksat = ? AND position <> 'manager'`, [managerResult[0].employeeid, worksat], (err, result) => {
                            if(err) {
                                console.log(err)
                                res.writeHead(200, { 'Content-Type': 'text/html' });
                                res.end(`<!DOCTYPE html>
                                <html>
                                <body>
                                <script>alert("An error has occured."); window.location.href="/mod_employee";</script>
                                </body>
                                </html>`);   
                            }
        
                            else {
                                const manager = managerResult[0].employeeid;
                                db_con.query(`INSERT INTO employees(employee_email, password, position, hiredate, worksat, name_firstname, name_middlename, name_lastname, workschedule, salary, managerid) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [email, password, position, hiredate, worksat, fname, mname, lname, schedule, salary, manager], (err, result) => {
                                    if (err) throw err;
                                    else {
                                        res.writeHead(302, {Location: '/mod_employee'});
                                        res.end('Employee Added');
                                    }
                                });
                            }   
                        })
                    }
                })     
            }
        });
    }
    else if(req.url === "/mod_employee/edit" && req.method === 'POST') {
        collectinput(req, parsedata => {
            const empid = parsedata.id_edit;

            const email = parsedata.editemail;
            const password = parsedata.editpassword;
            let position = parsedata.editposition;
            const hiredate = parsedata.edithiredate;
            let worksat = parsedata.editworksat;  // 1, 2, 3, 4, 5, 6
            const fname = parsedata.editfname;
            let mname = parsedata.editmname;
            const lname = parsedata.editlname;
            const schedule = parsedata.editschedule; // "MON-THU"...
            const salary = parsedata.editsalary;

            console.log("Editing employee: "+ empid);
            console.log(email);
            console.log(password);
            console.log(position);
            console.log(hiredate);
            console.log(worksat);
            console.log(fname);
            console.log(mname);
            console.log(lname);
            console.log(schedule);
            console.log(salary);

            if(mname === '') mname = null;
            if(Array.isArray(position)) {
                position = position[0];
            }
            if(Array.isArray(worksat)) {
                worksat = worksat[0];
            }

            db_con.query(`SELECT * FROM employees WHERE managerid IS NULL AND worksat = ? AND deleted = 0`, [worksat], (err, result) => {
                if(err) {
                    console.log(err)
                    res.writeHead(200, { 'Content-Type': 'text/html' });
                    res.end(`<!DOCTYPE html>
                    <html>
                    <body>
                    <script>alert("An error has occured."); window.location.href="/mod_employee";</script>
                    </body>
                    </html>`);   
                }
                
                const manager = result[0].employeeid;
                console.log("Maanager id: " + manager);

                // updating a manager
                if(manager == empid) {
                    db_con.query(`UPDATE employees SET employee_email = ?, password = ?, position = ?, hiredate = ?, worksat = ?, name_firstname = ?, name_middlename = ?, name_lastname = ?, workschedule = ?, salary = ?, managerid = null WHERE employeeid = ?`, [email, password, position, hiredate, worksat, fname, mname, lname, schedule, salary, empid], (err, result) => {
                        if(err) {
                            console.log(err)
                            res.writeHead(200, { 'Content-Type': 'text/html' });
                            res.end(`<!DOCTYPE html>
                            <html>
                            <body>
                            <script>alert("An error has occured."); window.location.href="/mod_employee";</script>
                            </body>
                            </html>`);   
                        }
                        else {
                            res.writeHead(200, { 'Content-Type': 'text/html' });
                            res.end(`<!DOCTYPE html>
                            <html>
                            <body>
                            <script>alert("Manager edited."); window.location.href="/mod_employee";</script>
                            </body>
                            </html>`);  
                        }
                    })
                }

                // updating everyone else
                else {
                    
                    db_con.query(`UPDATE employees SET employee_email = ?, password = ?, position = ?, hiredate = ?, worksat = ?, name_firstname = ?, name_middlename = ?, name_lastname = ?, workschedule = ?, salary = ?, managerid = ? WHERE employeeid = ?`, [email, password, position, hiredate, worksat, fname, mname, lname, schedule, salary, manager, empid], (err, result) => {
                        if(err) {
                            console.log(err)
                            res.writeHead(200, { 'Content-Type': 'text/html' });
                            res.end(`<!DOCTYPE html>
                            <html>
                            <body>
                            <script>alert("An error has occured."); window.location.href="/mod_employee";</script>
                            </body>
                            </html>`);   
                        }
                        else {
                            res.writeHead(200, { 'Content-Type': 'text/html' });
                            res.end(`<!DOCTYPE html>
                            <html>
                            <body>
                            <script>alert("Employee edited."); window.location.href="/mod_employee";</script>
                            </body>
                            </html>`);  
                        }
                    })
                }
            })
        })
    }
    else if(req.url === "/mod_employee/delete" && req.method === 'POST') {
        collectinput(req, parsedata => {
            const employeeid = parsedata.id_delete;
            const worksat = parsedata.id_workat_delete;
            const position = parsedata.id_positon_delete;

            if(position === 'manager') {
                db_con.query(`UPDATE employees SET managerid = null WHERE worksat = ?`, [worksat], (err, manaresult) => {
                    if(err) {
                        console.log(err)
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("An error has occured."); window.location.href="/mod_employee";</script>
                        </body>
                        </html>`);   
                    }
                    else {
                        db_con.query(`UPDATE employees SET deleted = 1 WHERE employeeid = ?`, [employeeid], (err, result) => {
                            //! one of six unhandled errors
                            if (err) {
                                console.log(err)
                                res.writeHead(200, { 'Content-Type': 'text/html' });
                                res.end(`<!DOCTYPE html>
                                <html>
                                <body>
                                <script>alert("An error has occured."); window.location.href="/mod_employee";</script>
                                </body>
                                </html>`); 
                            }
                            else {
                                res.writeHead(200, { 'Content-Type': 'text/html' });
                                res.end(`<!DOCTYPE html>
                                <html>
                                <body>
                                <script>alert("The manager was deleted."); window.location.href="/mod_employee";</script>
                                </body>
                                </html>`);  
                            }
                        })
                    }
                })
            }
            else {
                db_con.query(`UPDATE employees SET deleted = 1 WHERE employeeid = ?`, [employeeid], (err, result) => {
                    if(err) {
                        console.log(err)
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("An error has occured."); window.location.href="/mod_employee";</script>
                        </body>
                        </html>`);   
                    }
                    else {
                        //res.writeHead(302, {Location: '/mod_employee'});
                        //res.end('Employee deleted')
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(`<!DOCTYPE html>
                        <html>
                        <body>
                        <script>alert("The employee was deleted."); window.location.href="/mod_employee";</script>
                        </body>
                        </html>`);  
                    }
                })
            }

            

            
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