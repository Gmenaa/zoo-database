const http = require('http');
const fs = require('fs');
const path = require('path');
const bcrypt = require("bcrypt")
const db_con = require('./models/db')

//Helper function to display all the page
function displayPage(path,res){
    fs.readFile(path,function(err,data){
        console.log(data)
        res.end(data)
    })
}
let insert= () =>{
    let query = `INSERT INTO guests VALUES (1,'somethin','asjdaskdjaksdjak','123456789')`
    db_con.execute(query)
    console.log('Insertion successful')
    db_con.end()
    console.log('Connection closed')
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
        insert()
        res.end('User registered')
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