var crypto = require('crypto');

function hash(input, salt) {
    var hashed = crypto.pbkdf2Sync(input, salt, 10000, 512, 'sha512');
    return ["pbkdf2", "10000", salt, hashed.toString('hex')].join('$').toString('hex')  ;
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

exports.checkLoginf = function(req, pool){
  isLogged(req, pool, function(result){
    if(result=="false"){
      return "false";
    }else if(result=="error"){
      return "error";
    }else{
      return result;
    }
  });
}

exports.login =  function(req, res, pool) {
   var username = req.body.username;
   var password = req.body.password;
   pool.task(function(t){
     return t.batch([t.one('SELECT * FROM sudocode.users WHERE username = $1', [username]),
                     t.none('UPDATE sudocode.users set state=$1 where username = $2', [true,username])
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
