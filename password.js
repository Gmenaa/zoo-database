const bcrypt = require("bcrypt");
const db_con = require('./models/db');


function registerUser(res) {
        const email = res.email;
        const plainpassword = res.password;
        const phonenumber = res.phonenumber;
        const firstname = res.firstname;
        const lastname = res.lastname;
        const middlename = res.middlename;
        bcrypt.hash(plainpassword, 5, function (err, hash) {
            if (err) {
                console.log(err);
            }
            else {
                const query = db_con.query('INSERT INTO guests(password,email,phonenumber,name_firstname,name_middlename,name_lastname) VALUES (?,?,?,?,?,?)', [hash, email, phonenumber, firstname, middlename, lastname], (err, res) => {
                    if (err) throw err;
                    console.log('Last insert ID:', res.insertId);
                });
            }
        });
    };


function loginUser(plainpassword, res) {
        const email = res.email;
        const query = db_con.query('SELECT * FROM guests WHERE email = ?', [email], (err, result) => {
            if (err) throw err;
            else if (result.length === 0) {
                console.log("Email Not Found");
            }
            else{
                const match=bcrypt.compareSync(plainpassword,result[0].password)
                if (match){
                    res.writeHead(302, {Location: './donations'});
                    res.end('User Logged In')
                }     
                else{
                    res.writeHead(302, {Location: './register'});
                    res.end('User Not Logged In')
                }    
            }
        })
}


module.exports = { registerUser, loginUser };
