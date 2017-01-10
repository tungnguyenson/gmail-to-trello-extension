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
var dateFormat = 'MMM d, yyyy';

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

    document.addEventListener('GTT_connectExtension', function(e) {
        app.data.userEmail = e.detail.userEmail; // Was: e.detail[10];
    // console.log(app.data);
    });

    /*
    var actualCode_ORIGINAL = ['setTimeout(function() {', 
        'document.dispatchEvent(new CustomEvent("GTT_connectExtension", { ',
        '    detail: GLOBALS',
        '}));}, 0);'].join('\n');
    */
    
    var actualCode = `
        function timeOutFxn() {
            var userEmail = 'dev@null.com';
            if (typeof GLOBALS !== "undefined") {
                userEmail = GLOBALS[10];
            } else if (typeof (window) !== "undefined" && window.opener !== null && typeof window.opener.GLOBALS !== "undefined") {
                userEmail = window.opener.GLOBALS[10];
            };

            var GTT_event = new CustomEvent ("GTT_connectExtension", { 'detail': { 'userEmail': userEmail } });

            document.dispatchEvent(GTT_event);
        };
        setTimeout(timeOutFxn, 0);
    `;
    
    var script = document.createElement('script');
    script.textContent = actualCode;
    (document.head||document.documentElement).appendChild(script);
    script.parentNode.removeChild(script);


}

/*
 *  UNIT TESTING GOES HERE. AFFECT TO EVERY PAGES
 */