/**
This file manages user operations
It contains the following features:
  setPhoto
  getPhoto
  removePhoto
  setUsername
  getUsername
  setBio
  getBio
  removeBio
  getUser
  deactivate //requires password
  changePassword
*/
var sessionManager = require("./session-manager");
var articleManager = require("./article-manager");
var sanitizer = require('sanitize-html');
var crypto = require('crypto');
var path = require('path');
var fs = require('file-system');
var imageParser = require('base64-img');

function checkUsernameAvailable(obj, callback){
  //obj has username and pool
  obj.pool.any("SELECT id from sudocode.users WHERE username = $1", [obj.username])
  .then(function(results){
    if(results.length==0)
      callback(true);
    else
      callback(results[0].id);
  })
  .catch(function(error){
    console.log(error.toString());
    callback("error");
  });
}

exports.setUsername = function(req, res, pool){
    sessionManager.checkLoginf(req, pool, function(isLogged){
        if(isLogged=="false")
          res.status(403).send("Login to set username");
        else if(isLogged=="error")
          res.status(500).send("Error");
        else if(req.body.username.trim()=="")
          res.status(500).send("Bad request");
        else{
          //now check if the username is taken by anyone else or not!
          var username = sanitizer(req.body.username, {allowedTags: []});
          var id = req.session.auth.userId;
          checkUsernameAvailable({username: username, pool: pool},function(available){
            if(available==true){
              //UPDATE username
              if(username.trim()=="")
                res.status(500).send("Empty username");
              else
              pool.none("UPDATE sudocode.users SET username = $1 WHERE id = $2", [username, id])
                .then(function(){
                  res.status(200).send("Updated successfully");
                })
                .catch(function(error){
                  console.log(error.toString());
                  res.status(500).send("Error");
                });
            }
            else if(available=="error")
              res.status(500).send("Error");
            else if(available==id)
              res.status(403).send("You already have this username");
            else
              res.status(403).send("Username already taken by someone!");
          });
        }
    });
}

exports.getUsername = function(req, res, pool){
  sessionManager.checkLoginf(req, pool, function(isLogged){
    if(isLogged=="false")
      res.status(403).send("Login to get username");
    else if(isLogged=="error")
      res.status(500).send("Error");
    else
      pool.one("SELECT username FROM sudocode.users WHERE id = $1", [req.session.auth.userId])
      .then(function(results){
        res.status(200).send(results.username);
      })
      .catch(function(error){
        console.log(error.toString());
        res.status(500).send("Error");
      });
  });
}

exports.setBio = function(req, res, pool){
  sessionManager.checkLoginf(req, pool, function(isLogged){
    if(isLogged=="false")
      req.status(403).send("Login to set Bio");
    else if(isLogged=="error")
      req.status(500).send("Error");
    else{
      var bio = sanitizer(req.body.bio);
      var id = req.session.auth.userId;
      if(bio.trim()=="")
        res.status(500).send("Empty bio");
      else
      pool.none("UPDATE sudocode.users SET bio = $1 WHERE id = $2", [bio, id])
        .then(function(){
          if(bio.trim()=="")
            res.status(200).send("Bio removed successfully");
          else
            res.status(200).send("Bio updated successfully");
        })
        .catch(function(error){
          console.log(error.toString());
          res.status(500).send("Error");
        });
    }
  });
}

exports.getBio = function(req, res, pool){
  sessionManager.checkLoginf(req, pool, function(isLogged){
    if(isLogged=="false")
      res.status(403).send("Login to get bio");
    else if(isLogged=="error")
      res.status(500).send("Error");
    else
      pool.one("SELECT bio FROM sudocode.users WHERE id = $1", [req.session.auth.userId])
      .then(function(results){
        res.status(200).send(results.bio);
      })
      .catch(function(error){
        console.log(error.toString());
        res.status(500).send("Error");
      });
  });
}

exports.removeBio = function(req, res, pool){
  sessionManager.checkLoginf(req, pool, function(isLogged){
    if(isLogged=="false")
      res.status(403).send("Login to remove bio");
    else if(isLogged=="error")
      res.status(500).send("Error");
    else
      pool.one("UPDATE sudocode.users SET bio = $1 WHERE id = $2 RETURNING id", [null, req.session.auth.userId])
      .then(function(results){
        res.status(200).send("Removed bio");
      })
      .catch(function(error){
        console.log(error.toString());
        res.status(500).send("Error");
      });
  });

}

exports.getUser = function(req, res, pool){
  sessionManager.checkLoginf(req, pool, function(isLogged){
    if(isLogged=="false")
      res.status(403).send("Login to get user details");
    else if(isLogged=="error")
      res.status(500).send("Error");
    else
      pool.one("SELECT id,username,bio FROM sudocode.users WHERE id = $1 AND state = true", [req.session.auth.userId])
      .then(function(results){
        articleManager.getArticleByUser(req.session.auth.userId, pool, function(articles){
          results.articles = articles;
          res.status(200).send(results);
        });
      })
      .catch(function(error){
        console.log(error.toString());
        res.status(500).send("Error");
      });
  });
}

exports.changePassword = function(req, res, pool){
  sessionManager.checkLoginf(req, pool, function(isLogged){
    if(isLogged=="false")
      res.status(403).send("Login to change password");
    else if(isLogged=="error")
      res.status(500).send("Error");
    else{
        //change password
        var old_password = sanitizer(req.body.old_password, {allowedTags: []});
        var new_password = sanitizer(req.body.new_password, {allowedTags: []});
        if(new_password==old_password)
          res.status(500).send("New password cannot be same as the old one.");
        else if(new_password.trim()=="" || old_password.trim()=="")
          res.status(500).send("Bad password");
        else{
          //check with the old password
          pool.one("SELECT * from sudocode.users WHERE id = $1", [req.session.auth.userId])
          .then(function(data){
            var password = data.password.toString();
            var salt = password.split('$')[2];
            var old_hashed_password = sessionManager.hash(old_password, salt);
            if(password!=old_hashed_password)
              res.status(500).send("Invalid old password");
            else{
              var new_salt = crypto.randomBytes(128).toString('hex');
              var new_hashed_password = sessionManager.hash(new_password, new_salt);
              pool.one('UPDATE sudocode.users SET "password" = $1 WHERE "id" = $2 AND "password" = $3 RETURNING "id"', [new_hashed_password, req.session.auth.userId, old_hashed_password])
              .then(function(data){
                res.status(200).send("Password changed successfully");
              })
              .catch(function(error){
                console.log(error.toString());
                res.status(500).send("Error");
              });
            }
          })
          .catch(function(error){
            console.log(error.toString());
            res.status(500).send("Error");
          });
        }
      }
  });
}

exports.deactivate = function(req, res, pool){
  sessionManager.checkLoginf(req, pool, function(isLogged){
    if(isLogged=="false")
      res.status(403).send("Login to deactivate");
    else if(isLogged=="error")
      res.status(500).send("Error");
    else{
      var password = req.body.password;
      console.log(password);
      if(password.trim()=="")
        res.status(500).send("Bad request");
      else{
        pool.one('SELECT * FROM sudocode.users WHERE id = $1', [req.session.auth.userId])
          .then(function(data){
            var dBPassword = data.password.toString();
            var salt = dBPassword.split('$')[2];
            var hashed_password = sessionManager.hash(password, salt);
            if(hashed_password==dBPassword)
              pool.one('UPDATE sudocode.users SET state = $1 WHERE id = $2 AND state = $3 RETURNING id', [false , req.session.auth.userId, true])
              .then(function(){
                res.status(200).send("Deactivated successfully");
              })
              .catch(function(error){
                //already deactivated
                console.log(error.toString());
                res.status(500).send("Already deactivated");
              });
            else
              res.status(500).send("Invalid password");
          })
          .catch(function(error){
            console.log(error.toString());
            res.status(500).send("Error");
          });
      }
    }
  });
}

exports.getPhoto = function(req, res, pool){
  sessionManager.checkLoginf(req, pool, function(isLogged){
    if(isLogged=="false")
      res.status(403).send("Login to get photo");
    else if(isLogged=="error")
      res.status(500).send("Error");
    else if(req.query.id==undefined){
        var fileName = req.session.auth.userId + ".jpg";
        res.sendFile(path.join(__dirname, 'profile', fileName), function(err){
          res.sendFile(path.join(__dirname, 'profile', 'default.jpg'));
        });
      }
    else{
      var fileName = req.query.id + ".jpg";
      res.sendFile(path.join(__dirname, 'profile', fileName), function(err){
        res.sendFile(path.join(__dirname, 'profile', 'default.jpg'));
      });
    }
  });
}

exports.setPhoto = function(req, res, pool){
  sessionManager.checkLoginf(req, pool, function(isLogged){
    if(isLogged=="false")
      res.status(403).send("Login to set photo");
    else if(isLogged=="error")
      res.status(500).send("Error");
    else{
      var path_write = path.join(__dirname, 'profile');
      var data = req.body.photo;
      var photo = imageParser.img(data, path_write, req.session.auth.userId, function(err, filepath){
      if(err){
        console.log(err.toString());
        res.status(500).send("Error");
      }else{
        res.status(200).send("UPDATED");
      }
    });
    }
  });
}

exports.removePhoto = function(req, res, pool){
  sessionManager.checkLoginf(req, pool, function(isLogged){
    if(isLogged=="false")
      res.status(403).send("Login to remove photo");
    else if(isLogged=="error")
      res.status(500).send("Error");
    else{
      var path_photo = path.join(__dirname, 'profile', req.session.auth.userId+".jpg");
      fs.unlink(path_photo, function(err){
        if(err){
          console.log(err.toString());
          res.status(500).send("Error");
        }else
        res.status(200).send("Removed");
      });
    }
  });
}
