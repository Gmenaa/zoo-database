const fs = require('fs');
const ejs = require('ejs');

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

function getcurrentdate(){
    const currentDate = new Date();
    const year = currentDate.getFullYear();
    const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are zero-based
    const day = String(currentDate.getDate()).padStart(2, '0');

    const formattedDate = `${year}-${month}-${day}`;
    return formattedDate;
}

function yyyymmdd(long) {
  const dateObject = new Date(long);
  const dateFormatted = dateObject.toISOString().split('T')[0];

  return dateFormatted;
}


const displayView = (viewPath, res, data) => {
    ejs.renderFile(viewPath, { data }, (err, html) => {
      if (err) {
        console.error('EJS rendering error: ', err);
        
      } else {
        res.end(html);
      }
    });
  };

  function alerting(message) {
    alert(message);
  }




module.exports = {displayPage, collectinput, getcurrentdate, yyyymmdd, displayView, alerting}