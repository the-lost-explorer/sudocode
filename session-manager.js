/**
This file manages the session actions
It contains the following features:
  getHash with any string input
  checkLogin with auth cookie
  login with user ID and password
  logout with auth cookie
  checkId with user ID
*/
var crypto = require('crypto');
var path = require('path');

function hash(input, salt) {
    var hashed = crypto.pbkdf2Sync(input, salt, 10000, 512, 'sha512');
    return ["pbkdf2", "10000", salt, hashed.toString('hex')].join('$').toString('hex')  ;
}

exports.hash = function(input, salt){
    return hash(input, salt);
}

function isLogged(req, pool, callback){
  if(req.session && req.session.auth && req.session.auth.userId){
    pool.one('SELECT * FROM sudocode.users WHERE id = $1', [req.session.auth.userId])
      .then(function(data){
        //success
        if(callback){ callback(data.username);}
      })
      .catch(function(error){
        console.log(error + ' isLogged');
        if(callback){ callback("error");}
      });
  }else{
    if(callback){ callback("false");}
  }
}

exports.getHash = function(req, res){
  var input = req.params.input;
  var salt = crypto.randomBytes(128).toString('hex');
  var hashedString = hash(input, salt);
  res.send(hashedString);
}

exports.checkLogin = function(req, res, pool){
  isLogged(req, pool, function(result){
    if(result=="false"){
      res.status(403).send("false");
    }else if(result=="error"){
      res.status(500).send("error");
    }else{
      res.send(result);
    }
  });
}

exports.checkLoginf = function(req, pool, callback){
  isLogged(req, pool, function(result){
    if(result=="false"){
      callback("false");
    }else if(result=="error"){
      callback("error");
    }else{
      callback(result);
    }
  });
}

exports.login =  function(req, res, pool) {
   var id = req.body.id;
   var password = req.body.password;
   pool.task(function(t){
     return t.batch([t.one('SELECT * FROM sudocode.users WHERE id = $1', [id]),
                     t.none('UPDATE sudocode.users set state=$1 where id = $2', [true,id])
     ]);
   })
   .then(function(data){
     var dbString = data[0].password;
     var salt = dbString.split('$')[2];
     var hashedPassword = hash(password, salt);
     if(hashedPassword==dbString){
       req.session.auth = {userId: data[0].id};
       console.log(data[0].id + ' successfully logged in!');
       res.status(200).send('credentials correct!');
     }else{
       res.status(403).send('username/password is invalid');
     }
   })
   .catch(function(error){
      console.log(error.toString());
      res.status(500).send(error.toString());
   });
}

exports.logout = function(req, res, pool){
  isLogged(req, pool, function(result){
    if(result=="false"){
      res.status(403).send("First log in to logout!");
    }else if(result=="error"){
      res.status(500).send("Error in loggin out!");
    }else{
      var username = req.session.auth.userId;
      delete req.session.auth;
      res.status(200).send("Logged out - " + username + "!");
    }
  });
}

exports.checkId = function(req, res, pool){
  pool.one("SELECT * FROM sudocode.users WHERE id = $1", [req.query.id])
    .then(function(result){
      res.status(200).send(result.username);
    })
    .catch(function(error){
      res.status(500).send(false);
    });
}
