/**
This file manages article actions
It contains the following features:
  getArticle with either category name or user ID
  createArticle with title, content
  editArticle with article ID, title, content
  deleteArticle with article ID
*/
var sessionManager = require("./session-manager");
var sanitize = require('sanitize-html');
var categoryManager = require("./category-manager")
var commentManager = require("./comment-manager");
var promise = require('bluebird');
var async = require('async');

function getArticle(condition, pool, callback){
  pool.task(function(t){
    return t.any("SELECT a.*, b.username FROM sudocode.articles AS a JOIN sudocode.users AS b ON a.uid = b.id WHERE " + condition.one, [condition.two]);
  })
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
        callback("error");
      else
        callback(resultx);
    });
  })
  .catch(function(error){
    console.log(error.toString());
    callback("error");
  })
}

function getArticleByCategory(category, pool, callback){
  pool.any("SELECT aid FROM sudocode.\"article-categories\" WHERE lower(category) = $1", category.toLowerCase())
  .then(function(result){
    if(result.length==0)
      callback("empty");
    else{
      for(var x=0;x<result.length;x++){
          result[x] = parseInt(result[x].aid, 10);
      }
      var condition = {one:"a.id = ANY($1) ORDER BY datetime DESC", two: result};
      getArticle(condition, pool, function(resultx){
        callback(resultx);
      });
    }
  })
  .catch(function(error){
    console.log(error.toString());
    callback("error");
  });
}

function checkArticle(obj, callback){
  var condition = "title = '" + obj.title + "' and content = '" + obj.content + "' and uid = '" + obj.uid + "'";
  obj.pool.task(function(t){
    return t.any("SELECT uid, title, content, datetime, lastmodified FROM sudocode.articles WHERE " + condition);
  })
  .then(function(results){
    if(results=="error")
      obj.status = 500;
    else if(results.length==0)
      obj.status = 200;
    else
      obj.status = 417;
    //console.log(results);
    callback(null, obj);
  })
  .catch(function(error){
    obj.status = 500;
    callback(null, obj);
  });
}

function checkCategories(obj, callback){
  obj.pool.tx(function(t){
    var queries = [];
    for(var x=0; x<obj.categories.length; x++){
      queries.push(this.one("SELECT id FROM sudocode.categories WHERE name = $1", [obj.categories[x]]));
    }
    return this.batch(queries);
  })
  .then(function(result){
      //All okay
      callback(null, obj);
  })
  .catch(function(error){
    console.log(error.toString());
    if(obj.status==200) obj.status = 203;
    callback(null, obj);
  });
}

function insertArticle(obj, callback){
  if(obj.status==200){
    obj.pool.tx(function(t){
        return t.one("INSERT INTO sudocode.articles(uid,title,content) VALUES($1,$2,$3) RETURNING id",[obj.uid, obj.title, obj.content])
        .then(function(data){
            var queries = [];
            for(var x=0;x<obj.categories.length;x++)
              queries.push(t.none('INSERT INTO sudocode.\"article-categories\"(aid, category) VALUES($1, $2)', [data.id ,obj.categories[x]]));
            return promise.all(queries)
              .then(function(){
                return promise.resolve(data.id);
              })
              .catch(function(err){
                console.log(err.toString());
              });
        });
    })
    .then(function(result){
      callback(null, obj.status);
    })
    .catch(function(error){
      obj.status = 500;
      console.log(error.toString());
      callback(null, obj.status);
    });
  }else{
    callback(null, obj.status);
  }
}

function updateArticle(obj, callback){
  if(obj.status==200){
    obj.pool.tx(function(t){
        return t.none("UPDATE sudocode.articles SET title=$1, content=$2, lastmodified=now()::timestamp WHERE id=$3;",[obj.title, obj.content, obj.id])
        .then(function(){
            var queries = [];
            queries.push(t.none('DELETE FROM sudocode.\"article-categories\" WHERE aid = $1', [obj.id]));
            for(var x=0;x<obj.categories.length;x++)
              queries.push(t.none('INSERT INTO sudocode.\"article-categories\"(aid, category) VALUES($1, $2)', [obj.id ,obj.categories[x]]));
            return promise.all(queries)
              .then(function(){
                return promise.resolve(obj.id);
              });
        });
    })
    .then(function(result){
      callback(null, obj.status);
    })
    .catch(function(error){
      obj.status = 500;
      console.log(error.toString());
      callback(null, obj.status);
    });
  }else{
    callback(null, obj.status);
  }
}

function deleteArticleWithCategories(pool, id, callback){
  pool.task(function(t){
    return t.batch([
        t.none("DELETE FROM sudocode.\"article-categories\" WHERE aid= $1", [id]),
        t.none("DELETE FROM sudocode.articles WHERE id=$1",[id])
    ])
  })
  .then(function(){
      callback("done");
  })
  .catch(function(error){
    callback("error");
  });
}

exports.createArticle = function(req, res, pool){
  sessionManager.checkLoginf(req, pool, function(isLogged){
    if(isLogged=="false")
      res.status(403).send("Login to create article");
    else if(isLogged=="error")
      res.status(500).send("Error");
    else {
      //Create article
      var uid = req.session.auth.userId;
      var title = sanitize(req.body.title.trim());
      var content = sanitize(req.body.content.trim());
      var categories = JSON.parse(req.body.categories);
      if(title.trim()==""||content.trim()==""||categories.length==0||categories.constructor!== Array)
        res.status(500).send("Bad request");
      else{
        var obj = {title: title, content: content, uid: uid, pool: pool, categories: categories, status: 200};
        async.waterfall([async.apply(checkArticle, obj), checkCategories, insertArticle,],
          function(err, result){
            if(err){
              console.log(err.toString());
              res.status(500).send("error");
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
  });
}

//can be done with both category and userId
exports.getArticle = function(req, res, pool){
  sessionManager.checkLoginf(req, pool, function(isLogged){
    if(isLogged=="false")
      res.status(403).send("Login to view the articles");
    else if(isLogged=="error")
      res.status(500).send("error");
    else{
        var category = req.query.category;
        var uid = req.query.userId;
        if(category === undefined && uid === undefined){
          res.status(500).send("bad request");
        }
        else if(uid === undefined){
          getArticleByCategory(category, pool, function(results){
            if(results=="error")
              res.status(500).send("Error");
            else if(results=="empty")
              res.status(200).send("Articles or category not found");
            else
              res.status(200).send(results);
          });
        }
        else{
          var condition = {one: "a.uid = $1 ORDER BY datetime DESC", two: uid};
          getArticle(condition, pool, function(results){
            if(results=="error")
              res.status(500).send("Error");
            else{
              if(results.length==0)
                res.status(200).send("Articles or user not found!");
              else
                res.status(200).send(results);
            }
          });
        }
     }
  });
}

exports.getArticleByUser = function(userId, pool, callback){
  var condition = {one: "uid = $1 ORDER BY datetime DESC", two: userId};
  getArticle(condition, pool, function(results){
    callback(results);
  });
}

exports.deleteArticle = function(req, res, pool){
  sessionManager.checkLoginf(req,pool,function(result){
    if(result=="false")
      res.status(403).send("Login to delete article!")
    else if(result=="error")
      res.status(500).send("error");
    else{
      var aid = req.query.id;
      var uid = req.session.auth.userId;
      pool.task(function(t){
        return t.any("SELECT uid FROM sudocode.articles WHERE id=$1", [aid])
      })
      .then(function(resultx){
          if(resultx[0].uid==uid){
                if(resultx.length==0)
                    res.status(500).send("Article doesn't exist");
                else
                  deleteArticleWithCategories(pool, aid, function(message){
                      if(message=="error")
                        res.status(500).send("error");
                      else
                        res.status(200).send("Article " + aid + " successfully deleted");
                    });
          }
          else
            res.status(403).send("Article doesn't belong to you!")
      })
      .catch(function(error){
          console.log(error.toString());
          res.status(500).send("Error");
      });
    }
  });
}

exports.editArticle = function(req, res, pool){
    sessionManager.checkLoginf(req, pool, function(isLogged){
      if(isLogged=="false")
        res.status(403).send("Login to edit article");
      else if(isLogged=="error")
        res.status(500).send("Error");
      else{
        var aid = req.body.id;
        var uid = req.session.auth.userId;
        pool.task(function(t){
          return t.any("SELECT uid FROM sudocode.articles WHERE id=$1", [aid])
        })
        .then(function(resultx){
            if(resultx[0].uid==uid){
                  //edit
                  title = sanitize(req.body.title);
                  content = sanitize(req.body.content);
                  categories = JSON.parse(req.body.categories);
                  if(title.trim()==""||content.trim()==""||categories.length==0)
                    res.status(500).send("Bad request");
                  else{
                    //we will check if the article already exists
                    var obj = {id: aid, title: title, content: content, uid: uid, pool: pool, categories: categories, status: 200};
                    async.waterfall([async.apply(checkArticle, obj), checkCategories, updateArticle,],
                      function(err, result){
                        if(err){
                          console.log(err.toString());
                          res.status(500).send("error");
                        }else{
                            if(result==200){
                              res.status(200).send("article updated successfully");
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
            else
              res.status(403).send("Article doesn't belong to you!")
        })
        .catch(function(error){
            console.log(error.toString());
            res.status(500).send("Error");
        });
      }
    });
}
