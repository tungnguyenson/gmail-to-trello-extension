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

/*
 *  UNIT TEST GOES HERE
 */

