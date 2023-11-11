const fs = require('fs');
const {parse} = require('querystring')
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
module.exports = {displayPage, collectinput}