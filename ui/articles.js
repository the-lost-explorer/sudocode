

//Document on ready function
$(document).ready(function(){



dashboard();

//Get feed
  function dashboard(){
    console.log('feed_function');
    var feed = new XMLHttpRequest();
    feed.onload = function(){
      if(feed.readystate=XMLHttpRequest.DONE){
        if(feed.status===200){
          feedposts = JSON.parse(feed.responseText);
          for(var i=0;i<feedposts.length;i++){
            $('#dashbody').append('<div class="article" id='+feedposts[i].id+'><div class="username">'+feedposts[i].username+'</div><div class="history"><div class="datetime">'+feedposts[i].datetime+'</div><div class="lastmodified">last modified: '+feedposts[i].lastmodified+'</div></div><br><br><hr><div class="articletitle">'+feedposts[i].title+'</div><br><br><div class="articlecontent">'+feedposts[i].content+'</div><hr><div id="myCarousel" class="carousel slide" data-ride="carousel" id="comments"><div class="carousel-inner" role="listbox"> </div><button class="commentbutton">Have some thoughts?</button></div></div><br>');
            }
        }
        else if(feed.status===500){

        }
      }


  }
  feed.open('GET','http://localhost:8082/get-feed',true);
  feed.send(null);
}



//Create Article
 $('#postbutton').click(function(){
   var request_post = new XMLHttpRequest();
   request_post.onload = function(){
     if(request_post.readystate=XMLHttpRequest.DONE){
       if(request_post.status===200){
        // $('#dashbody').prepend('DONE');
        $('#dashbody').html('<br>');
        dashboard();
       }
       else if(request_post.status===500){
         $('#dashbody').prepend(request_post.responseText);
       }
     }
   }

   var title = document.getElementById('title').value;
   var content = document.getElementById('postinput').value;
   var temp = categories;

   $('#title').val("");
   $('#postinput').val("");
   $('#categorydiv').html("");
   request_post.open('POST', 'http://localhost:8082/create-article', true);
   request_post.setRequestHeader('Content-Type', 'application/json');
   request_post.send(JSON.stringify({title: title, content:content, categories:JSON.stringify(temp)}));
   categories = [];
 });



});

//Create comment
