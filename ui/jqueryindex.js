<<<<<<< HEAD
$(document).ready(function(){

	setInterval(function(){
		$('blink').fadeIn('slow');
		$('blink').fadeOut('slow');}
		,400);


});
=======
$(document).ready(function(){

	setInterval(function(){
		if($('blink').css('visibility')=="hidden"){
			$('blink').css('visibility',"");
		}else{
			$('blink').css("visibility","hidden");
		}
	},500);

			$('#login').click(function(){
				$('#text').load("login.html #text");
			});

});
>>>>>>> 2f12b4e36d88d5797a0247a554623c75530fde7c
