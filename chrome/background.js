/**
 * Detect Gmail's URL everytimes a tab is reloaded or openned
 */
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    log(changeInfo.status);
    if (changeInfo.status === "complete") {
        checkForValidUrl(tab);
    }
});

/**
 * Manage local storage between extension & content script
 */
chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    // local storage request
    if (request.storage) {
        if (typeof request.value !== 'undefined') {
            localStorage[request.storage] = request.value;
            log(localStorage);
        }
        sendResponse({'storage': localStorage[request.storage]});
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

 
/**
 * Check if current URL is on Gmail
 * @param  https://developer.chrome.com/extensions/tabs#type-Tab tab Tab to check
 * @return bool     Return True if you're on Gmail
 */
function checkForValidUrl(tab) {
    if (tab.url.indexOf('https://mail.google.com/') == 0) {
        chrome.pageAction.show(tab.id);

        log(tab.url);

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
function log(data) {
    chrome.storage.sync.get('debugMode', function(response) {
        if (response.debugMode) {
            console.log(data);
        }
    });
}