/*
 Flows:
    + 1st loading (onDocumentReady)
        - load user settings()
        - initPopup() // html, data binding & event binding
        - initTrelloData()
        - extractData()
 
    + 2nd loading (onButtonToggle)
        - initTrelloData()
        - extractData()
 */

/**
 * Variable for debugging purpose only
 */
var globalInit = false;

/**
 * Global log. A wrapper for console.log, depend on logEnabled flag
 * @param  {any} data data to write log
 */
function log(data) {
    chrome.storage.sync.get('debugMode', function(response) {
        if (response.debugMode) {
            console.log(data);
        }
    });
}

/**
 * Handle request from background.js
 * @param  request      Request object, contain parameters
 * @param  sender       
 * @param  sendResponse Callback function
 */
 function requestHandler(request, sender, sendResponse) {
    if (request && request.hasOwnProperty('message') && request.message === 'gtt:initialize') {
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
    }
}

// Register Handler
chrome.extension.onMessage.addListener(requestHandler);

var GmailToTrello = GmailToTrello || {}; // Namespace initialization
var app = new GmailToTrello.App();

/**
 * Inject code: for accessing Gmail's GLOBALS object
 * reference: http://stackoverflow.com/questions/9602022/chrome-extension-retrieving-gmails-original-message
 * and: https://github.com/KartikTalwar/gmail.js/blob/master/src/gmail.js
 * Note, the customEvent is expecting to transfer data in the 'detail' variable
 */

function getGmailObject() {
    document.addEventListener('gtt:connect_extension', function(e) {
        app.model.userEmail = e.detail.userEmail; // Was: e.detail[10];
    });

    ['inject.js'].forEach (function (item, iter) {
        var script = document.createElement('script');
        script.src = chrome.extension.getURL(item);
        (document.head || document.documentElement).appendChild(script);
        script.onload = function() {
            script.parentNode.removeChild(script);
        }
    });
}

/*
 *  UNIT TESTING GOES HERE. AFFECT TO EVERY PAGES
 */
