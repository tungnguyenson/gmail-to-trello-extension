/*
 Flows:
 1st loading (onDocumentReady)
 loadUserSettings()
 initPopup() // html, data binding & event binding
 initTrelloData()
 extractData()
 
 2nd loading (onButtonToggle)
 initTrelloData()
 extractData()
 */

/**
 * Debug variable
 */
var globalInit = false;

/**
 * Turn on/off debug mode with logging
 */
var logEnabled = false;


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

/*
 *  UNIT TEST GOES HERE
 */

