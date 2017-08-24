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
function gtt_log(data) {
    if (!window.hasOwnProperty('gtt_log_g')) {
        window.gtt_log_g = {
            memory: [],
            count: 0,
            max: 1000,
            debugMode: false
        };
        chrome.storage.sync.get('debugMode', function(response) {
            if (response.debugMode) {
                window.gtt_log_g.debugMode = true;
            };
        });
    }

    var log_g = window.gtt_log_g;

    if (data) {
        const count_size_k = (log_g.max).toString().length;
        const counter_k = ('0'.repeat(count_size_k) + (log_g.count).toString()).slice(-count_size_k);
        const now_k = new Date().toISOString();

        if (typeof data !== 'string') {
            data = JSON.stringify(data);
        }

        data = now_k + '.' + counter_k + ' GtT::' + data;

        log_g.memory[log_g.count] = data;
        if (++log_g.count >= log_g.max) {
            log_g = 0;
        }
        if (log_g.debugMode) {
            console.log(data);
        }
    } else {
        return log_g.memory.slice(log_g.count).join('\n') + log_g.memory.slice(0,log_g.count).join('\n');
    }
}

/**
 * Handle request from background.js
 * @param  request      Request object, contain parameters
 * @param  sender       
 * @param  sendResponse Callback function
 */
 function requestHandler(request, sender, sendResponse) {
    if (request && request.hasOwnProperty('message') && request.message === 'gtt:initialize') {
        gtt_log('GlobalInit: '+globalInit.toString());
        globalInit = true;
        // enough delay for gmail finishes rendering
        gtt_log('tabs.onUpdated - complete');
        jQuery(document).ready(function() {                    
            gtt_log('document.ready');
            getGmailObject();
            app.initialize();
        });
        // Was:
        // setTimeout(function() {
        //     jQuery(document).ready(function() {                    
        //         gtt_log('document.ready');
        //         getGmailObject();
        //         app.initialize();
        //     });
        // }, 1000); // But now we're more resiliant with no data, so pop on immediately.
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
