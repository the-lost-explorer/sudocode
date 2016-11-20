var crypto = require('crypto');

function hash(input, salt) {
    var hashed = crypto.pbkdf2Sync(input, salt, 10000, 512, 'sha512');
    return ["pbkdf2", "10000", salt, hashed.toString('hex')].join('$').toString('hex')  ;
}

function isLogged(req, pool, callback){
  if(req.session && req.session.auth && req.session.auth.userId){
    pool.query('SELECT * FROM sudocode.users WHERE id = $1', [req.session.auth.userId], function(err, result){
      if(err){
        if(callback){ callback("error");}
      } else{
        if(callback){ callback(result.rows[0].username);}
      }
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

exports.login =  function(req, res, pool) {
   var username = req.body.username;
   var password = req.body.password;
   pool.query('SELECT * FROM sudocode.users WHERE username = $1', [username], function (err, result) {
      if (err) {
          res.status(500).send(err.toString());
      } else {
          if (result.rows.length === 0) {
              res.status(403).send('username/password is invalid');
          } else {
              // Match the password
              var dbString = result.rows[0].password;
              var salt = dbString.split('$')[2];
              var hashedPassword = hash(password, salt); // Creating a hash based on the password submitted and the original salt
              if (hashedPassword === dbString) {
                // Set the session
                req.session.auth = {userId: result.rows[0].id};
                // set cookie with a session id
                res.send('credentials correct!');
              } else {
                res.status(403).send('username/password is invalid');
              }
          }
      }
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
