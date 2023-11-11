const jwt = require('jsonwebtoken');
require('dotenv').config()
const cookie = require('cookie')
const secretkey = process.env.JWT_KEY

function generatetoken(data){
    const payload = {
        email : data.email
    }
    return jwt.sign(payload,secretkey,{expiresIn: '2h'})
}

function verifytoken(token){
    try{
        return jwt.verify(token,secretkey);
    }
    catch(error){
        return null
    }
}
function storeJWTcookie(res,token){
    res.setHeader('Set-Cookie',cookie.serialize('jwt',token,{
        httpOnly: true,
        maxAge:4000,
        samesite: 'strict',
        secure: process.env.NODE_ENV === 'production'
    }))
}

module.exports ={generatetoken,verifytoken, storeJWTcookie}