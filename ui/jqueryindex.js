$(document).ready(function(){
	setInterval(function(){
		if($('blink').css('visibility')=="hidden"){
			$('blink').css('visibility',"");
		}else{
			$('blink').css("visibility","hidden");
		}
	},500);
	
	 
});