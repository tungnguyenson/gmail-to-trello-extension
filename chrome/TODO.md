- [done] When popup is appeared, remember last choice
- [done] Link back to Gmail, can search
- [done] Detect most visible thread on screen
- [done] refactor
- [done] Check valid gmail's event (email thread mode)
- [done] attachments
- [done] add due date
- [done] Include "From <email> to Description"
- [done] Add attachments as files instead of links: https://github.com/KartikTalwar/gmail.js/issues/134
- [done] Add to an existing card
- [done] Remove console.log() to use our log()
- [done] Move attachment upload logic to model.js
- https://stackoverflow.com/questions/14149209/read-the-version-from-manifest-json: chrome.runtime.getManifest().version and ask to reload on new version
- https://developer.chrome.com/extensions/contextMenus
- https://github.com/brainbreaker/clearData-WebExtension-Demo
- https://github.com/bytepicker/Thrasher
- https://developer.chrome.com/extensions/management#method-getself

content-script.js:26 validateData: board:592d43422c9d39fe0cb22aea list:592d434b4eb392d5eb45535a title:[EXTERNAL] Re: Technischer Kundendienst / Tools für Entwickler - Integration [Incident: 170508-031288] [Incident: 170527-002190] desc:5041
content-script.js:26 parsing data...
content-script.js:26 [div.nH.aNW.apk.nn, prevObject: r.fn.init(1)]
content-script.js:26 time-debug: {"timeAttr_k":"29. Mai 2017 um 15:18","timeCorrected_k":"29. Mai 2017 15:18","timeParsed_k":null,"time_k":{"0":{},"length":1,"prevObject":{"0":{},"length":1}}}
content-script.js:26 validateData: board:592d43422c9d39fe0cb22aea list:592d434b4eb392d5eb45535a title:[EXTERNAL] Re: Technischer Kundendienst / Tools für Entwickler - Integration [Incident: 170508-031288] [Incident: 170527-002190] desc:5041
ci3.googleusercontent.com/proxy/HF4QiRBEq0qy_KSCeeLq2g9EKOCzik2IVXH_gexI3J6CndiQ9eNdUNMghMigNOilAN9LJlSQbxrCa58Td5Tm2ynGWFls7N1pc2ofr-8qYSIEs5CDbUs7sIlpZXFcsSIcOBq0=s0-d-e1-ft#https://ups1.custhelp.com/rd/CvPrVAo2Dv8M~fP7GsoJ~yAaqpkqaS75Mv8P~zj~PP~G.gif:1 GET https://ci3.googleusercontent.com/proxy/HF4QiRBEq0qy_KSCeeLq2g9EKOCzik2IVXH_gexI3J6CndiQ9eNdUNMghMigNOilAN9LJlSQbxrCa58Td5Tm2ynGWFls7N1pc2ofr-8qYSIEs5CDbUs7sIlpZXFcsSIcOBq0=s0-d-e1-ft 404 ()

http://cssglobe.com/lab/tooltip/02/:

this.imagePreview = function(){	
	/* CONFIG */
		
		xOffset = 10;
		yOffset = 30;
		
		// these 2 variable determine popup's distance from the cursor
		// you might want to adjust to get the right result
		
	/* END CONFIG */
	$("a.preview").hover(function(e){
		this.t = this.title;
		this.title = "";	
		var c = (this.t != "") ? "<br/>" + this.t : "";
		$("body").append("<p id='preview'><img src='"+ this.href +"' alt='Image preview' />"+ c +"</p>");								 
		$("#preview")
			.css("top",(e.pageY - xOffset) + "px")
			.css("left",(e.pageX + yOffset) + "px")
			.fadeIn("fast");						
    },
	function(){
		this.title = this.t;	
		$("#preview").remove();
    });	
	$("a.preview").mousemove(function(e){
		$("#preview")
			.css("top",(e.pageY - xOffset) + "px")
			.css("left",(e.pageX + yOffset) + "px");
	});			
};


// starting the script on page load
$(document).ready(function(){
	imagePreview();
});

p{
	clear:both;
	margin:0;
	padding:.5em 0;
}

#preview{
	position:absolute;
	border:1px solid #ccc;
	background:#333;
	padding:5px;
	display:none;
	color:#fff;
	}

pre{
	display:block;
	font:100% "Courier New", Courier, monospace;
	padding:10px;
	border:1px solid #bae2f0;
	background:#e3f4f9;	
	margin:.5em 0;
	overflow:auto;
	width:800px;
}
