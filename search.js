/**
This file manages the search operations
It only contains one method:
  searchQuery
*/

var sessionManager = require("./session-manager");
var sanitizer = require('sanitize-html');

exports.searchQuery = function(req, res, pool){
  sessionManager.checkLoginf(req,pool,function(isLogged){
    if(isLogged=="false")
      res.status(403).send("Login to search");
    else if(isLogged=="error")
      res.status(500).send("Error");
    else if(sanitizer(req.query.q).trim()=="")
      res.status(500).send("Bad request");
    else{
      var query = sanitizer(req.query.q);
      //we will search in users, article content and article title
      var results = {users: [], articles: []};
      searchUsers(query, pool, function(userList){
        searchArticles(query, pool, function(articleList){
          if(userList=="error"||articleList=="error")
            res.status(500).send("Error");
          else{
            if(userList.length>10)
              userList = userList.slice(0,10);
            if(articleList.length>10)
              articleList = articleList.slice(0,10);
            results.users = userList; results.articles = articleList;
            res.status(200).send(results);
          }
        });
      });
    }
  });
}

function searchUsers(query, pool, callback){
  query = '%' + query.toLowerCase() + '%';
  pool.any("SELECT username FROM sudocode.users WHERE LOWER(username) LIKE $1", [query])
  .then(function(data){
    callback(data);
  })
  .catch(function(err){
    console.log(err.toString());
    callback("error");
  });
}

function searchArticles(query, pool, callback){
  query = query.replace(' ', '&');
  pool.any(`SELECT id, title, content
            FROM sudocode.articles
            WHERE to_tsvector(title||' '||content)@@to_tsquery($1);`, [query])
  .then(function(data){
    callback(data);
  })
  .catch(function(err){
    console.log(err.toString());
    callback("error");
  });
}
