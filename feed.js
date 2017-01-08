/**
  This file manages articles on the dashboard
  Just like a timeline
  Sorting takes place on various factors like timing, popularity, comments, etc
*/
var commentManager = require("./comment-manager"); //getCommentsById
var categoryManager = require("./category-manager"); //getCategory
var voter = require("./voter"); //getPopularity
var sessionManager = require("./session-manager");
var async = require('async');

exports.getArticles = function(req, res, pool){
  sessionManager.checkLoginf(req, pool, function(isLogged){
    if(isLogged=="false")
      res.status(403).send("Login to get feed");
    else if(isLogged=="error")
      res.status(500).send("Error");
    else
      pool.any("SELECT a.*, b.username FROM sudocode.articles AS a JOIN sudocode.users AS b ON a.uid = b.id LIMIT 50")
      .then(function(results){
            async.map(results, function(result, callback){
              commentManager.getCommentsById(result.id, pool, function(res){
                result.comments = res;
                categoryManager.getCategoriesByArticle(result.id, pool, function(resX){
                  result.categories = resX;
                  callback(null, result)
                });
              });
            }, function(err, resultx){
              if(err)
                res.status(500).send("Error");
              else
              sort_handler(resultx, pool, function(handled){
                sort(handled, function(sorted){
                  res.status(200).send(JSON.stringify(sorted));
              });
            });
          });
      })
      .catch(function(error){
        console.log(error.toString());
        res.status(500).send("Error");
      });
  });
}

function sort_handler(data, pool, callback_sort){
  async.map(data, function(article, callback){
    //Here we have each article and we need to extract numberOfComments, time_creation and popularity
    commentManager.getNumberOfComments(article.id, pool, function(numberOfComments){
      voter.getPopularity(article.id, pool, function(popularity){
        pool.one("SELECT (EXTRACT(EPOCH FROM current_timestamp - $1))", [article.datetime])
        .then(function(time){
          generateScore(numberOfComments, time.date_part/3600000, popularity, function(score){
            article.score = score;
            callback(null, article);
          });
        })
        .catch(function(err){
          console.log(err.toString());
          callback(null, "error");
        });
      });
    });
  }, function(err, data){
    if(err){
      console.log(err.toString());
      callback("Error");
    } else
    callback_sort(data);
  });
}

function sort(data, callback){
  data.sort(function(a,b){
    return parseFloat(b.score)-parseFloat(a.score);
  });
  callback(data);
}

function generateScore(numberOfComments, time, popularity, callback){
  var Score = (numberOfComments/10+popularity+1)/Math.pow((time+2), 1.8);
  callback(Score);
}
