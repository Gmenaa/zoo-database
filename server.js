const http = require('http');
const fs = require('fs');
const path = require('path');
const bcrypt = require("bcrypt")
const db_con = require('./models/db')
const {displayPage} = require('./utils')
//Helper function to display all the page
const {collectinput} = require('./utils')
const {generatetoken} = require('./auth')
const {verifytoken} = require('./auth')
const {storeJWTcookie} = require('./auth')
const cookie = require('cookie');
const { parseArgs } = require('util');

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
            console.log(userId);
            console.log(userFirstName);

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
                <div class="hero">
                    
                    <header>
                        <div class="links header-links">
                            <a href="/tickets">Tickets</a>
                            <a href="">Our Animals</a>
                            <a href="">Stores</a>
                            <a href="/donations">Donate</a>
                        </div>
                    </header>
                    
                    <div class="hero-text button-field">
                        <h1><span>Welcome, ${userFirstName}</span></h1> 
                        <button>Sign out</button>
                        <!-- <button onclick="document.location='/'">Sign out</button> -->
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
    else if(req.url==='/tickets'&& req.method === 'GET'){
        displayPage("./public/tickets.html",res)
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
                            //! loook here
                            userId = result[0].guestid
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

//Manager page and subpages
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
            displayPage("./public/manager.html",res)
        }
        else{
            res.writeHead(302, {Location: './emplogin'});
            res.end('Unauthorised')
        }
    }
    else if(req.url === "/man_em_rep" && req.method === 'GET'){
        displayPage("./public/manager_employee_rep.html",res)
    }
    else if(req.url === "/man_mod_emp" && req.method === 'GET'){
        displayPage("./public/manager_mod_employee.html",res)
    }
    else if(req.url ==="/man_rev_rep" && req.method === 'GET'){
        displayPage("./public/manager_revenue_rep.html",res)
    }

//Veterinarian page and subpages
    else if(req.url ==="/vet_health_rep" && req.method === 'GET'){
        displayPage("./public/vet_health_rep.html",res)
    }
    else if(req.url ==="/vet_mod_health" && req.method === 'GET'){
        displayPage("./public/vet_mod_healthrecord.html",res)
    }
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
            displayPage("./public/vet.html",res)
        }
        else{
            res.writeHead(302, {Location: './emplogin'});
            res.end('Unauthorised')
        }
        displayPage("./public/vet.html",res)
    }

//Admin page and subpages
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
        else if (verify){
            displayPage("./public/admin.html",res)
        }
        else{
            res.writeHead(302, {Location: './emplogin'});
            res.end('Unauthorized')
        }
    }
    else if(req.url ==="/admin_donor_rep" && req.method === 'GET'){
        displayPage("./public/admin_donor_rep.html",res)
    }
    else if(req.url ==="/admin_emp_rep" && req.method === 'GET'){
        displayPage("./public/admin_employee_rep.html",res)
    }
    else if(req.url ==="/admin_health_rep" && req.method === 'GET'){
        displayPage("./public/admin_health_rep.html",res)
    }
    else if(req.url ==="/admin_mod_animal" && req.method === 'GET'){
        displayPage("./public/admin_mod_animal.html",res)
    }
    else if(req.url ==="/admin_rev_rep"&& req.method === 'GET'){
        displayPage("./public/admin_revenue_rep.html",res)
    }

//Read CSS and JPEG files
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