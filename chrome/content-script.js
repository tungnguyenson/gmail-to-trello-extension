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

var globalInit = false;
var logEnabled = false;

function log(data) {
    if (logEnabled)
        console.log(data);
};


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

var GmailToTrello = GmailToTrello || {};

var app = new GmailToTrello.App();

/*
 *  UNIT TEST
 */

