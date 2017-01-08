
//checking user
$(document).ready(function(){

var submit = $('#button');

submit.click (function(){
  var checklogger = new XMLHttpRequest();
  checklogger.onload = function(){
    console.log('done1')
    if(checklogger.readystate = XMLHttpRequest.DONE){
      console.log('done2');
        if(checklogger.status===403){
          id = document.getElementById('id').value;
          document.getElementById('userid').innerHTML = id;
          //Make request
        //  console.log('click')
          var request_id = new XMLHttpRequest();
          //request.responseType = "text";
          //Response;
          request_id.onload = function(){
            console.log('done1')
            if(request_id.readystate = XMLHttpRequest.DONE){
              console.log('done2');
                if(request_id.status===200){
                  var username = request_id.responseText;
                //console.log(request_id.responseText);
                document.getElementById('label').innerHTML = '<span id="un">'+request_id.responseText+'</span>'+ ',<span id="txt"> Enter your password.<br></span>';
                $('#loginform').load('http://localhost:8082/ui/loginpsk.html');
                document.getElementById('userid').innerHTML = id;
                $("#userid").hide();

                }
                else{
                    document.getElementById('label').innerHTML ='<span style="color:red">Enter valid ID</span>';
                }

            }
          }



          console.log(id);
          request_id.open('GET','http://localhost:8082/checkId/?id='+id,true);
          request_id.send(null);
        }

        else if(checklogger.status===500){
          document.getElementById('dashmsg').innerHTML = 'Server Error';
        }


        else{
            $('#loginscreen').load('http://localhost:8082/ui/dashboard.html');
            $('#menu').html(' <span class="dropdown"><i class="fa fa-user-o" aria-hidden="true" id="logout" id="dLabel" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" class="dropdown-menu-left"></i><span class="dropdown-menu" aria-labelledby="dLabel"> <span id="settings">Settings</span><br> <span id="logoutbtn">Logout</span></span>  <i class="fa fa-home" aria-hidden="true" id="home"></i>  <i class="fa fa-coffee" aria-hidden="true" id="categories"></i>')
        }

    }

}
    checklogger.open('GET','http://localhost:8082/check-login/',true);
    checklogger.send(null);


});

//logging in
var login = $('#loginbutton');

login.click(function(){

  console.log('loginclick');
  var request_login = new XMLHttpRequest();
  request_login.onload = function(){
    console.log('done_login1')
    if(request_login.readystate = XMLHttpRequest.DONE){
      console.log('done_login2');
        if(request_login.status===200){

        //  console.log(request_login.responseText);
        $('#label').hide();
        document.getElementById('loginbox').innerHTML = request_login.responseText;
        $('#loginscreen').fadeTo('slow',0);
        $('#loginscreen').load('http://localhost:8082/ui/dashboard.html');
        $('#menu').html(' <span class="dropdown"><i class="fa fa-user-o" aria-hidden="true" id="logout" id="dLabel" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false" class="dropdown-menu-left" data-toggle="tooltip" data-placement="bottom" title="Profile"></i><span class="dropdown-menu" aria-labelledby="dLabel"> <span id="settings">Settings</span><br> <span id="logoutbtn">Logout</span></span>  <i class="fa fa-home" aria-hidden="true" id="home" data-toggle="tooltip" data-placement="bottom" title="Home"></i>  <i class="fa fa-coffee" aria-hidden="true" id="categories" data-toggle="tooltip" data-placement="bottom" title="Categories"></i>')
        $('#loginscreen').fadeTo('slow',100);

        }
        else if(request_login.status===403){

        document.getElementById('txt').innerHTML = '<span style="color:red"> Enter a valid Password.</span>';
        }
        else if(request_login.status===500){
        //console.log(id);
        document.getElementById('loginbox').innerHTML = request_login.responseText;
        }

    }
  }

  var password = document.getElementById('password').value;
//  hashedpsk = getHash(password);
  //var id = document.getElementById('userid').value;  do not uncomment this line.
  console.log(id);
  //console.log(hashedpsk);
  request_login.open('POST', 'http://localhost:8082/login', true);
  request_login.setRequestHeader('Content-Type', 'application/json');
  request_login.send(JSON.stringify({id: id, password: password}));
});

//loggin the user in.
setInterval(function(){
  $('blink').fadeIn('slow');
  $('blink').fadeOut('slow');}
  ,400);
});
