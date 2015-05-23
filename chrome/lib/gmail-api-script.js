var gmail;


function refresh(f) {
  if( (/in/.test(document.readyState)) || (undefined === Gmail) ) {
    setTimeout('refresh(' + f + ')', 10);
  } else {
    f();
  }
}


var main = function(){
  // NOTE: Always use the latest version of gmail.js from
  // https://github.com/KartikTalwar/gmail.js
  gmail = new Gmail();
  // console.log('Hello,', gmail.get.user_email());
  
  gmail.observe.on("open_email", function(emailId) {
	// console.log("E-Mail opened");
	var emailData = gmail.get.email_data(emailId);
	//console.log(emailData);
	window.postMessage({ type: "GTT_openEmail", emailData:emailData }, "*");
		
  });
  
  
}


refresh(main);

