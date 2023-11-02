const http = require('http');
const fs = require('fs');
const path = require('path');
const bcrypt = require("bcrypt")
const db_con = require('./models/db')
const {parse} = require('querystring')
//Helper function to display all the page
function displayPage(path,res){
    fs.readFile(path,function(err,data){
        console.log(data)
        res.end(data)
    })
}
function collectinput(request,callback){
    const FORM_URLENCODED = 'application/x-www-form-urlencoded';
    if (request.headers['content-type'] === FORM_URLENCODED){
        let body = '';
        request.on('data',chunk => {
            body += chunk.toString();
        });
        request.on('end',()=>{
            callback(parse(body));
        });
    }
}

const server = http.createServer(function(req, res){
    if(req.url === "/" && req.method === 'GET'){
        displayPage("./public/index.html",res)
    }
    else if(req.url==='/login'&& req.method === 'GET'){
        displayPage("./public/login.html",res)
    }
    else if(req.url==='/donations'&& req.method === 'GET'){
        displayPage("./public/donations.html",res)
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
            const query = db_con.query('SELECT * FROM guests WHERE email = ?',[email],(err,res)=>{
                if (err) throw err;
                else if (res.length === 0){
                    console.log("Email Not Found")
                }
                else{
                    bcrypt.compare(plainpassword,res[0].password,function(err,result){
                        if (err) throw err;
                        else{
                            if (result){
                                console.log("User Logged In")
                            }
                            else{
                                console.log("User Not Logged In")
                            }
                        }  
                    })
                }
            })
        })
    }
                        
                               
                           
    else if(req.url ==='/hello'){
        displayPage("./public/hello.html",res)
    }
    
    else if (req.url === "/register"){
        displayPage("./public/register.html",res)
    }
    else if (req.url ==="/passwordreset"){
        displayPage("./public/passwordreset.html",res)
    }
    else if (req.url ==="/emplogin"){
        displayPage("./public/emplogin.html",res)
    }
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