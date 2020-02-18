var CLEAR_EXT_BROWSING_DATA = 'gtt:clear_extension_browsing_data';
var UPLOAD_ATTACH = 'gtt:upload_attach';
var UPLOAD_ATTACH_STORE = 'gtt:upload_attach_store';
var UPLOAD_ATTACH_RESULTS = 'gtt:upload_attach_results';
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
 * Assure all keys are present in a dict and have values
 * @param 'dict' dictionary/hash to iterate
 * @param 'keys' array of required keys
 * @return true if present with value, false if not
 */
 function gtt_hasAllKeys(dict, keys) {
    const size_k = keys.length;
    for (let iter = 0; iter < size_k; iter++) {
        if (!dict.hasOwnProperty(keys[iter]) || dict[keys[iter]].length < 1) {
            return false;
        }
    }
    return true;
}

/**
 * Upload/attach grab initial content
 * @param 'url' to grab
 * @return blob
 */
function gtt_uploadAttach(args, callback) {
    let callback_return = function(status='failure', data={}) {
        if (callback && typeof callback === 'function') {
            data[UPLOAD_ATTACH_RESULTS] = status;
            callback(data);
        } else {
            logbs('ERROR: gtt_uploadAttach callback failed data:' + JSON.stringify(data));
        }
    };

    let callback_failure = function(data={}) {
        callback_return('failure', data);
    };

    let callback_success = function(data={}) {
        callback_return('success', data);
    };

    if (!gtt_hasAllKeys(args, ['url_asset', 'filename', 'trello_key', 'trello_token', 'url_upload'])) {
        return callback_failure({'responseText': 'Missing keys in gtt_uploadAttach!'});
    }

    fetch(args['url_asset'])
        .then(response => response.blob())
        .then(blob => {
            const file_k = new File([blob], args['filename']);
            logbs('Attaching filename:"' + args['filename'] + '" size:' + file_k.size)
            if (!file_k.size) {
                msg = 'ERROR: Empty content! Filename:"' + args['filename'] + '"'
                logbs(msg)
                data = {
                    'status': 'size:0',
                    'statusText': msg,
                    'responseText': 'Attachment retrieval failure: Try creating/updating card again without attachment "' + filename_k + '"',
                    'keys': '<none>'
                }
                return callback_failure(data);
            }
            var form = new FormData();
            form.append('file', file_k);
            form.append('key', args['trello_key']);
            form.append('token', args['trello_token']);

            fetch(args['url_upload'], {
                method: 'POST',
                body: form
            })
            .then(response => response.json())
            .then(data => callback_success(data))
            .catch(error => callback_failure(error));
        })
        .catch(error => callback_failure(error));
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