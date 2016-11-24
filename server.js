var express = require('express');
var morgan = require('morgan');
var path = require('path');
var pgp = require('pg-promise')();
var bodyParser = require('body-parser');
var session = require('express-session');
var sessionManager = require('./session-manager.js');
var articleManager = require('./article-manager.js');

var config = {
    user: 'postgres',
    database: 'postgres',
    host: '127.0.0.1',
    port: '5432',
    password: process.env.DB_PASSWORD
};
var pool = pgp(config);

var app = express();
app.use(morgan('combined'));
  app.use(bodyParser.json());
app.use(session({
    secret: 'someRandomSecretValue',
    cookie: {maxAge: 1000*60*60}
}));

app.get('/', function(req,res){
  res.sendFile(path.join(__dirname, 'ui', 'index.html'));
});

//client script and css
app.get('/ui/:fileName', function (req, res) {
  res.sendFile(path.join(__dirname, 'ui', req.params.fileName));
});

//jquery
app.get('/jquery/jquery-2.2.0.min.js', function(req,res){
  res.sendFile(path.join(__dirname,'jquery','jquery-2.2.0.min.js'));
});
app.get('/jquery-ui/jquery-ui.min.js', function(req, res){
  res.sendFile(path.join(__dirname,'jquery-ui','jquery-ui.min.js'));
});

//hashing
app.get('/hash/:input', function(req, res) {
  sessionManager.getHash(req, res);
});

//session management
app.get('/check-login', function(req, res){
   sessionManager.checkLogin(req,res,pool);
});

app.post('/login', function(req, res){
   sessionManager.login(req,res,pool);
});

app.get('/logout', function(req, res){
  sessionManager.logout(req,res,pool);
});

//article management
app.post('/create-article', function(req, res){
  articleManager.createArticle(req,res,pool);
});

var port = 8082;
app.listen(port, function(){
  console.log('CHATBOT up and running on 8082!');
});
