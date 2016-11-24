var sessionManager = require("./session-manager");
var promise = require('bluebird');
var async = require('async');

function getUser(status, uid, title, content, categories, pool, callback){
  //async.apply(getUser, uid, title, content, categories)
  //SELECT username
  var user;
  pool.task(function(t){
    return t.one("SELECT * FROM sudocode.users WHERE id = $1", [uid])
      .then(function(data){
        user = data.username;
        callback(null, status, uid, title, content, categories, user, pool);
      });
  });
}

function checkArticle(status, uid, title, content, categories, user, pool, callback){
  //CHECK if article already exists
  pool.task(function(t){
    return t.any("SELECT COUNT (*) FROM sudocode.articles WHERE \"user\" = $1 and title = $2 and \"content\" = $3", [user, title, content])
    .then(function(data){
      if(data[0].count!=0){
        status = 417;
      }
      if(callback){
      callback(null, status, uid, title, content, categories, pool, user);
      }
    });
  });
}

function checkCategories(status, uid, title, content, categories, pool, user, callback){
  //check if all the categories are correct
  pool.tx(function(t){
    var queries = [];
    for(var x=0; x<categories.length; x++){
      queries.push(this.one("SELECT id FROM sudocode.categories WHERE name = $1", [categories[x]]));
    }
    return this.batch(queries);
  })
    .then(function(data){
        callback(null, status, uid, title, content, categories, pool, user);
    })
    .catch(function(err){
      callback(null, 203, uid, title, content, categories, pool, user);
    });
}

function insertArticle(status, uid, title, content, categories, pool, user, callback){
  if(status==200){
    pool.tx(function(t){
      return t.one("INSERT INTO sudocode.articles(\"user\",title,content) VALUES($1,$2,$3) RETURNING id",[user,title,content])
      .then(function(data){
          var queries = [];
          for(var x=0;x<categories.length;x++){
            queries.push(t.none('INSERT INTO sudocode.\"article-categories\"(aid, category) VALUES($1, $2)', [data.id,categories[x]]));
          }
          return promise.all(queries)
          .then(function(){
            return promise.resolve(data.id);
          })
          .catch(function(error){
            console.log(error.toString());
          })
      });
    })
    .then(function(result){
      callback(null, status);
    });
  }else{
    callback(null,status);
  }
}

exports.createArticle = function(req, res, pool){
    var result = sessionManager.checkLoginf(req, pool);
    if(result=="false"){
      res.status(403).send("Log in to create article!");
    }else if(result=="error"){
      res.status(500).send("error");
    }else{
      /**
      We will be using a new approach for asynchronous calls
      async.waterfall to the rescue!
      The functions called will be select users, check categories, create article and create article-categories value
      */
      var uid = req.session.auth.userId;
      var title = req.body.title;
      var content = req.body.content;
      var categories = JSON.parse(req.body.categories);
      async.waterfall([async.apply(getUser, 200, uid, title, content, categories, pool),
         checkArticle,
         checkCategories,
         insertArticle,
        ], function(err, result){
        if(err){
          console.log(err.toString());
        }else{
            if(result==200){
              res.status(200).send("article created successfully");
            }else if(result==403){
              res.status(403).send("forbidden");
            }else if(result==417){
              res.status(200).send("article already exists");
            }else if (result==203){
              res.status(203).send("invalid categories");
            }else{
              res.status(500).send("error");
            }
        }
      });
    }
}
