var CLEAR_EXT_BROWSING_DATA = 'gtt:clear_extension_browsing_data';
var UPLOAD_ATTACH = 'gtt:upload_attach';
var UPLOAD_ATTACH_STORE = 'gtt:upload_attach_store';
var debugMode_g;

/**
 * Call console.log if in DEBUG mode only
 */
function logbs(data) {
    if (typeof debugMode_g === 'undefined') {
        chrome.storage.sync.get('debugMode', function(response) {
            if (response.hasOwnProperty('debugMode') && response['debugMode']) {
                debugMode_g = true;
            }
        });
    }

    if (debugMode_g) {
        console.log(data);
    }
}

/**
 * Detect Gmail's URL everytimes a tab is reloaded or openned
 */
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    logbs(changeInfo.status);
    if (changeInfo.status === "complete") {
        gtt_checkForValidUrl(tab);
    }
});

/**
 * Manage Keyboard Shortcut
 */
chrome.commands.onCommand.addListener(function(command) {
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {'message': 'gtt:keyboard_shortcut'}, function(response) {});
    });
});

function gtt_clearExtensionBrowsingData(callback) {
    logbs('gtt_clearExtensionBrowsingData');
    const opts_k = {
        "since": 0,
        "originTypes": {"extension": true}
    };
    if (chrome && chrome.browsingData && chrome.browsingData.remove) {
        logbs('gtt_clearExtensionBrowsingData: browsingData exists!');
        chrome.browsingData.remove(opts_k, {
            "appcache": true,
            "cache": true,
            "cookies": true,
            "downloads": false,
            "fileSystems": false,
            "formData": false,
            "history": false,
            "indexedDB": false,
            "localStorage": false,
            "serverBoundCertificates": false,
            "pluginData": true,
            "passwords": false,
            "webSQL": false
        }, callback);
    } else {
        logbs('gtt_clearExtensionBrowsingData: browsingData invalid!');
    }
}

/**
 * Check if current URL is on Gmail
 * @param  https://developer.chrome.com/extensions/tabs#type-Tab tab Tab to check
 * @return bool     Return True if you're on Gmail
 */
function gtt_checkForValidUrl(tab) {
    if (tab.url.indexOf('https://mail.google.com/') == 0) {
        chrome.pageAction.show(tab.id);

        logbs(tab.url);

        // Call content-script initialize function
        chrome.tabs.sendMessage(
            //Selected tab id
            tab.id,
            //Params inside a object data
            {'message': 'gtt:initialize'}
        );

    }
}

/**
 * Upload/attach grab initial content
 * @param 'url' to grab
 * @return blob
 */
function gtt_uploadAttach(args, callback) {
    if (!args.hasOwnProperty('url') || args.url.length < 5 || !args.hasOwnProperty('filename') || args.filename.lenth < 5) {
        return callback({});
    }
    const url_k = args['url'] || '';
    const filename_k = args['filename'] || '';
    let type = 'unknown';

    fetch(url_k)
        .then(response => response.blob())
        .then(blob => {
            const file_k = new File([blob], filename_k);
            const setID_k = UPLOAD_ATTACH_STORE;
            let hash = {};
            hash[setID_k] = {'test': 'a', 'file': file_k};
            chrome.storage.local.set(hash, function() {
                callback(setID_k);
            });
        })
        .catch(() => callback(''));
}
 
/**
 * Manage content script activities that for security reasons and otherwise need to beh andled in background script:
 */
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) { // Was: chrome.extension.onMessage.addListener
    // local storage request
    if (!request) {
        // Intentionally blank, don't do anything in this case
    } else if (request.hasOwnProperty('storage') && request.storage) { // OBSOLETE (Ace@2017.08.31): Not sure this is ever called anymore:
        if (typeof request.value !== 'undefined') {
            localStorage[request.storage] = request.value;
            logbs('backgroundOnMessage: storage requested!');
        }
        sendResponse({'storage': localStorage[request.storage]});
    } else if (request.hasOwnProperty(CLEAR_EXT_BROWSING_DATA) && request[CLEAR_EXT_BROWSING_DATA] === true) {
        gtt_clearExtensionBrowsingData(sendResponse);
        return true; // Asynchronous
    } else if (request.hasOwnProperty(UPLOAD_ATTACH)) {
        gtt_uploadAttach(request[UPLOAD_ATTACH], sendResponse);
        return true; // Asynchronous
    } else {
        sendResponse({});
    }
});

// End, background.js