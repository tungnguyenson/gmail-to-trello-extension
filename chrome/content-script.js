/*
 Flows:
    + 1st loading (onDocumentReady)
        - loadUserSettings()
        - initPopup() // html, data binding & event binding
        - initTrelloData()
        - extractData()
 
    + 2nd loading (onButtonToggle)
        - initTrelloData()
        - extractData()
 */

/**
 * Turn on/off debug mode with logging
 */
var logEnabled = false;

/**
 * Variable for debugging purpose only
 */
var globalInit = false;


/**
 * Global log. A wrapper for console.log, depend on logEnabled flag
 * @param  {any} data data to write log
 */
function log(data) {
    if (logEnabled)
        console.log(data);
};


/**
 * Handle request from background.js
 * @param  request      Request object, contain parameters
 * @param  sender       
 * @param  sendResponse Callback function
 */
function requestHandler(request, sender, sendResponse) {
    switch (request.message) {
        case "initialize":
            log('GTT::GlobalInit: '+globalInit.toString());
            globalInit = true;
            // enough delay for gmail finishes rendering
            log('GTT::tabs.onUpdated - complete');
            setTimeout(function() {
                jQuery(document).ready(function() {                    
                    log('GTT::document.ready');
                    getGmailObject();
                    app.initialize();
                });
            }, 1000);
            
            /**/
            break;
    }
}

chrome.extension.onMessage.addListener(requestHandler);

var GmailToTrello = GmailToTrello || {}; // Namespace initialization
var app = new GmailToTrello.App();

function getGmailObject() {
    // Inject code: for accessing Gmail's GLOBALS object
    // reference: http://stackoverflow.com/questions/9602022/chrome-extension-retrieving-gmails-original-message
    document.addEventListener('GTT_connectExtension', function(e) {
        //console.log(e.detail);
        app.data.userEmail = e.detail[10];
    //    console.log(app.data);
    });

    var actualCode = ['setTimeout(function() {', 
        'document.dispatchEvent(new CustomEvent("GTT_connectExtension", { ',
        '    detail: GLOBALS',
        '}));}, 0);'].join('\n');

    var script = document.createElement('script');
    script.textContent = actualCode;
    (document.head||document.documentElement).appendChild(script);
    script.parentNode.removeChild(script);


}

// Inject gmail.js
var j = document.createElement('script');
j.src = chrome.extension.getURL('lib/jquery.min.js');
(document.head || document.documentElement).appendChild(j);

var g = document.createElement('script');
g.src = chrome.extension.getURL('lib/gmail.js');
(document.head || document.documentElement).appendChild(g);

var s = document.createElement('script');
s.src = chrome.extension.getURL('lib/gmail-api-script.js');
(document.head || document.documentElement).appendChild(s);


// Listen, if a Gmail mail is opened
window.addEventListener("message", function(event) {
    // We only accept messages from ourselves
    if (event.source != window)
        return;

    if (event.data.type && (event.data.type == "GTT_openEmail")) {
        //console.log("Content script received");
        //console.log(event.data.emailData);

        app.gmailView.gmailEmailData = event.data.emailData;
        //console.log(app.gmailView.gmailEmailData);
    }
}, false);



/*
 *  UNIT TESTS GOES HERE. AFFECT TO EVERY PAGES
 */

