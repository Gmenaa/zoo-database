## Project Description
Create a web application for a zoo, using Nodejs with HTTP module for our backend, utilizing JSON web token for to secure the login credential between the user and the database, as well as storing the credential key in the browser's cookie. Storing all the data in a database with mySQL.

## Installation via NPM 
1. In the project folder, run npm install and install all the packages, including:
* bcrypt: Hashing the user's password when they register.
* dotenv: Load .env file to process.env for us to use in our server. 
* mysql2: MySQL client for Node.js
* jsonwebtoken : An implementation of JSON Web Tokens
* nodemon : A tool that helps develop Node.js based applications by automatically restarting the node application when file changes in the directory are detected
* cookie: Basic HTTP cookie parser and serializer for HTTP servers.
* ejs: Embedded JavaScript for HTML 
```nodejs
npm install
npm install bcrypt
npm install dotenv
npm install mysql2
npm install jsonwebtoken
npm install -D nodemon
npm install cookie
npm install ejs
```
2. Using crypto.randomBytes(), we create our JWT secret key. Simply run this script on the terminal:
```
node -e 
"console.log(require('crypto').randomBytes(32).toString('hex'))"
```
3. Create a .env file where we store our information, which are database connection: host(i.e. localhost), username ,password, name of the database, port number(i.e. 5050) and our JWT secret key. 
```
DB_HOST = 
DB_USER = 
DB_PASSWORD =
DB_DATABASE =
JWT_KEY = 
PORT =
```

## Development
*  Modify package.json file by adding to the script the following line``"dev": "nodemon server.js"`` 
*  We then go to terminal to run the server, by typing 
   ``npm run dev``

## References
* [node.bcrypt.js](https://www.npmjs.com/package/bcrypt)
* [nodemon](https://www.npmjs.com/package//nodemon)
* [dotenv](https://www.npmjs.com/package/dotenv)
* [mysql2](https://www.npmjs.com/package/mysql2)
* [jsonwebtoken](https://www.npmjs.com/package/jsonwebtoken)
* [cookie](https://www.npmjs.com/package/cookie)
* [ejs](https://www.npmjs.com/package/ejs)