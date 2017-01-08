var minHeight = 30;

var resizeMiddle = function() {
    var h = $('#text').height() - $('#header').height() - $('#footer').height();
    h = h > minHeight ? h : minHeight;
    $('#text').height(h);
};





$(document).ready(function(){

resizeMiddle('#text');
$(window).resize(resizeMiddle);

$('#login').click(function(){
//  $('#login').fadeTo('slow',0);

  $('#login').fadeTo('slow',0);
  $('#text').load('http://localhost:8082/ui/login.html');
  $('#login').remove();
  $('#menu').html('<i class="fa fa-home" aria-hidden="true" id="home"></i>');
  $('#home').click(function(){
    window.location.href = 'http://localhost:8082/';
  });
});

$('#logoutbtn').click(function(){
  var logout = new XMLHttpRequest();
  logout.onload = function(){
    console.log('done1')
    if(logout.readystate = XMLHttpRequest.DONE){
      console.log('done2');
        if(logout.status===403){
          document.getElementById('dashmsg').innerHTML = logout.responseText;
        }
        else if(logout.status===500){
          document.getElementById('dashmsg').innerHTML = 'Server Error try again.';
        }

        else if(logout.status===200){
          console.log("logoutclick")
        window.location.href = 'http://localhost:8082/ui/logout.html';

        }

    }

  }
    logout.open('GET','http://localhost:8082/logout',true);
    logout.send(null);

});

$('#home').click(function(){
  $('#text').load('http://localhost:8082/ui/dashboard.html')
});



	setInterval(function(){
		$('blink').fadeIn('slow');
		$('blink').fadeOut('slow');}
		,400);





 });
