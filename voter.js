/**
  This file manages voting operations
  It contains the following functions:
    vote: requires aid and vote(boolean)
    delete-vote: requires aid
    get-vote: get the total votes on a particular article(aid)
*/

var sessionManager = require("./session-manager");

exports.vote = function(req, res, pool){
  sessionManager.checkLoginf(req, pool, function(isLogged){
    if(isLogged=="false")
      res.status(403).send("Login to vote");
    else if(isLogged=="error")
      res.status(500).send("Error");
    else{
      //voting action
      //if the record already exists, we need to update the record
      var aid = req.query.aid;
      var value = JSON.parse(req.query.value);
      if(aid==undefined||value==undefined||typeof value!='boolean')
        res.status(500).send("Bad request");
      else
      pool.none(`INSERT INTO sudocode.votes as vote (uid, aid, value)
                 VALUES ($1,$2,$3)
                 ON CONFLICT (uid, aid)
                 DO UPDATE SET value = $3
                 where vote.uid = $1 and vote.aid = $2;`,[req.session.auth.userId, aid, value])
      .then(function() {
        res.status(200).send("vote updated");
      })
      .catch(function(){
        res.status(500).send("Error");
      });
    }
  });
}

exports.deleteVote = function(req, res, pool){
  sessionManager.checkLoginf(req, pool, function(isLogged){
    if(isLogged=="false")
      res.status(403).send("Login to delete vote");
    else if(isLogged=="error")
      res.status(500).send("Error");
    else{
      var aid = req.query.aid;
      if(aid==undefined)
        res.status(500).send("Bad request");
      else
      pool.result(`DELETE FROM sudocode.votes WHERE uid=$1 AND aid=$2`,[req.session.auth.userId, aid])
      .then(function(result) {
        if(result.rowCount==0)
          res.status(500).send("Vote does not exist");
        else
          res.status(200).send("vote deleted");
      })
      .catch(function(){
        res.status(500).send("Error");
      });
    }
  });
}

exports.getVote = function(req, res, pool){
  sessionManager.checkLoginf(req, pool, function(isLogged){
    if(isLogged=="false")
      res.status(403).send("Login to get votes");
    else if(isLogged=="error")
      res.status(500).send("Error");
    else{
      var aid = req.query.aid;
      if(aid==undefined)
        res.status(500).send("Bad request");
      else{
          /**
            result set contains the following info
            total votes
            users who voted
            net votes
          */
          pool.any("SELECT uid, value FROM sudocode.votes WHERE aid = $1", [aid])
          .then(function(data){
            var total_votes = data.length;
            var upvotes = 0;
            var userList = {upvoter: [], downvoter: []};
            for(var i = 0;i<total_votes;i++){
              if(data[i].value == true){
                userList.upvoter.push(data[i].uid);
                upvotes++;
              }else
                userList.downvoter.push(data[i].uid);
            }
            var send = {upvotes: upvotes, downvotes: (total_votes-upvotes), users: userList};
            res.status(200).send(send);
          })
          .catch(function(err){
            console.log(err.toString());
            res.status(500).send("Error");
          });
      }
    }
  });
}

exports.getPopularity = function(aid, pool, callback){
  pool.any("SELECT uid, value FROM sudocode.votes WHERE aid = $1", [aid])
  .then(function(data){
    var total_votes = data.length;
    var upvotes = 0;
    for(var i = 0;i<total_votes;i++)
      if(data[i].value == true)
        upvotes++;
    var net_votes = upvotes - (total_votes-upvotes);
    callback(net_votes);
  })
  .catch(function(err){
    console.log(err.toString());
    callback("Error");
  });
}
