var CLEAR_EXT_BROWSING_DATA = 'clearExtensionBrowsingData';

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
 * Manage local storage between extension & content script
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
    } else if (request.hasOwnProperty(CLEAR_EXT_BROWSING_DATA) && request[CLEAR_EXT_BROWSING_DATA]=== true) {
        gtt_clearExtensionBrowsingData(sendResponse);
        return true; // Asynchronous
    } else {
        sendResponse({});
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
 * Call console.log if in DEBUG mode only
 */
function logbs(data) {
    chrome.storage.sync.get('debugMode', function(response) {
        if (response.debugMode) {
            console.log(data);
        }
    });
}