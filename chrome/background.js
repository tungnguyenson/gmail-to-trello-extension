/**
 * Detect GMail's URL everytimes a tab is reloaded or openned
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
        sendResponse({storage: localStorage[request.storage]});
    } else {
        sendResponse({});
    }
});

/**
 * Correctly escape RegExp
 */
chrome.extension.prototype.escapeRegExp = function (str) {
    return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

/**
 * Utility routine to replace variables
 */
chrome.extension.prototype.replacer = function(text, dict) {
  var self = this;
  
  if (!text || text.length < 1) {
    console.log('Require text!');
    return;
  } else if (!dict || dict.length < 2) {
    console.log('Require dictionary!');
    return;
  }
  
  $.each(dict, function (key, value) {
    var re = new RegExp('%' + self.escapeRegExp(key) + '%', "gi");
    var new_text = text.replace(re, value);
    text = new_text;
  });
  
  return text;
} 
 
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
                {message: "initialize"},
                //Optional callback function
                function(response) {
                    //console.log(response);
                    //update panel status
                    //app.tabs[tab.id].panel.visible = response.status;
                    //updateIconStatus(tab.id) 
                }
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