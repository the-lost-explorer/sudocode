/**
This file manages category actions
It contains the following features:
  getCategory
*/
var sessionManager = require("./session-manager");
var sanitizer = require('sanitize-html');

exports.getCategory = function(req, res, pool){
  sessionManager.checkLoginf(req, pool, function(isLogged){
      if(isLogged=='false')
        res.status(403).send("Login to get categories");
      else if(isLogged=="error")
        res.status(500).send("Error");
      else{
        pool.any("SELECT name FROM sudocode.categories ORDER BY name ASC")
          .then(function(results){
            var categories = []
            for(var x=0;x<results.length;x++){
              categories.push(results[x].name);
            }
            res.status(200).send(JSON.stringify(categories));
          })
          .catch(function(error){
            console.log(error.toString());
            res.status(500).send("error");
          });
      }
  });
}

exports.getCategoriesByArticle = function(aid, pool, callback){
  pool.many("SELECT category FROM sudocode.\"article-categories\" WHERE aid=$1", aid)
    .then(function(results){
      var response = [];
      for(var x=0;x<results.length;x++)
        response.push(results[x].category);
      callback(response);
    })
    .catch(function(err){
      console.log(err.toString());
      callback("error");
    });
}

exports.getAllowedTags = function(req, res, pool){
  sessionManager.checkLoginf(req, pool, function(isLogged){
      if(isLogged=='false')
        res.status(403).send("Login to get tags");
      else if(isLogged=="error")
        res.status(500).send("Error");
      else{
        var obj = {tags: sanitizer.defaults.allowedTags, attrib: sanitizer.defaults.allowedAttributes};
        res.status(200).send(obj);
      }
  });
}
