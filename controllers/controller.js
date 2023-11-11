const Register = require('../models/testmodel');
async function register(req,res){
    try{
        await Register.registerUser(res)
        res.writeHead(302, {Location: './login'});
        res.end('User Registered') 
    }
    catch(error){
        console.log(error)
    }
}
module.exports={register}