/**
This file manages comment actions
It contains the following features:
  getComment by article ID
  createComment with article ID, content
  editComment with comment ID, content
  deleteComment by comment ID
*/
var sessionManager = require("./session-manager");
var promise = require('bluebird');
var sanitizer = require('sanitize-html');

//if article exists or not
function checkArticle(aid, pool, callback){
    pool.one("SELECT * FROM sudocode.articles WHERE id = $1", [aid])
      .then(function(result){
        callback(true);
      })
      .catch(function(error){
        console.log(error.toString());
        callback(false);
      });
}

function insertComment(obj, callback){
  obj.pool.none("INSERT INTO sudocode.comments(aid, uid, content) VALUES ($1, $2, $3)", [obj.aid, obj.uid, obj.content])
    .then(function(){
      callback(true);
    })
    .catch(function(error){
      console.log(error.toString());
      callback(false);
    });
}

function updateComment(obj, callback){
  obj.pool.none("UPDATE sudocode.comments	SET content=$1, lastmodified=now()::timestamp WHERE id = $2", [obj.content, obj.cid])
    .then(function(){
      callback(true);
    })
    .catch(function(error){
      console.log(error.toString());
      callback(false);
    });
}

function checkComment(obj, callback){
  obj.pool.one("SELECT uid FROM sudocode.comments WHERE id = $1", [obj.cid])
    .then(function(result){
      callback(result.uid);
    })
    .catch(function(error){
      callback(false);
    });
}

function getComments(aid, pool, callback){
  pool.any("SELECT * FROM sudocode.comments WHERE aid = $1 ORDER BY datetime DESC", [aid])
    .then(function(results){
      callback(results);
    })
    .catch(function(error){
      console.log(error.toString());
      callback("error");
    });
}

exports.getCommentsById = function(aid, pool, callback){
  getComments(aid, pool, function(results){
    callback(results);
  });
}

exports.createComment = function(req, res, pool){
  sessionManager.checkLoginf(req, pool, function(isLogged){
    if(isLogged=="false")
      res.status(403).send("Login to comment");
    else if(isLogged=="error")
      res.status(500).send("Error");
    else{
      //Create comment
      var uid = req.session.auth.userId;
      var aid = req.body.articleId;
      var content = sanitize(req.body.content, {allowedTags: []});
      if(aid==undefined||content.trim()=="")
        res.status(500).send("Bad request");
      else
        checkArticle(aid, pool, function(articleExists){
          if(!articleExists)
            res.status(500).send("article not found");
          else{
            var obj = {uid: uid, aid: aid, content: content, pool: pool};
            insertComment(obj, function(result){
              if(result)
                res.status(200).send("comment created successfully");
              else
                res.status(500).send("Error");
            });
          }
        });
    }
  });
}

exports.editComment = function(req, res, pool){
  sessionManager.checkLoginf(req, pool, function(isLogged){
    if(isLogged=="false")
      res.status(403).send("Login to edit comment");
    else if(isLogged=="error")
      res.status(500).send("Error");
    else{
      //Create comment
      var uid = req.session.auth.userId;
      var cid = req.body.commentId;
      var content = sanitize(req.body.content, {allowedTags: []});
      if(cid==undefined||content.trim()=="")
        res.status(500).send("Bad request");
      else
        checkComment({pool: pool, cid: cid}, function(commentExists){
          if(!commentExists)
            res.status(500).send("comment not found");
          else{
              if(commentExists==uid){
                var obj = {cid: cid, content: content, pool: pool};
                updateComment(obj, function(result){
                  if(result)
                    res.status(200).send("comment updated successfully");
                  else
                    res.status(500).send("Error");
                });
              }else
                res.status(403).send("Comment doesn't belong to you!");
            }
        });
    }
  });
}

exports.getComment = function(req, res, pool){
  sessionManager.checkLoginf(req, pool, function(isLogged){
    if(isLogged=="false")
      res.status(403).send("Login to get comments");
    else if(isLogged=="error")
      res.status(500).send("Error");
    else{
      aid = req.query.articleId;
      getComments(aid, pool, function(comments){
        if(comments=="error")
          res.status(500).send("Error");
        else
          res.status(200).send(comments);
      });
    }
  });
}

exports.deleteComment = function(req, res, pool){
  sessionManager.checkLoginf(req, pool, function(isLogged){
    if(isLogged=="false")
      res.status(403).send("Login to delete comment");
    else if(isLogged=="error")
      res.status(500).send("Error");
    else{
      uid = req.session.auth.userId;
      cid = req.query.id;
      pool.result("DELETE FROM sudocode.comments WHERE id = $1 and uid = $2", [cid,uid])
        .then(function(result){
          if(result.rowCount==0){
            var obj = {pool: pool, cid: cid};
            checkComment(obj, function(check){
                if(check)
                  res.status(403).send("Comment doesn't belong to you.");
                else
                  res.status(403).send("Comment doesn't exist.");
            });
          }
          else
            res.status(200).send("Comment " + cid + " successfully deleted!");
        })
        .catch(function(error){
          console.log(error.toString());
          res.status(500).send("Error");
        });
    }
  });
}

exports.getNumberOfComments = function(aid, pool, callback){
  getComments(aid, pool, function(comments) {
    callback(comments.length);
  });
}
