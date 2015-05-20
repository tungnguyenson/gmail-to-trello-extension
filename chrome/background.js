/* Detect GMail's URL
 */
chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    console.log(changeInfo.status);
    if (changeInfo.status === "complete") {
        checkForValidUrl(tab);
    }
});

chrome.tabs.onSelectionChanged.addListener(function(tabId, selectInfo) {
    chrome.tabs.getSelected(null, function(tab) {
        //checkForValidUrl(tab);
    });
});

/* Manage storage between ext & content script
 */
chrome.extension.onMessage.addListener(function(request, sender, sendResponse) {
    // local storage request
    if (request.storage) {
        if (typeof request.value !== 'undefined') {
            localStorage[request.storage] = request.value;
            console.log(localStorage);
        }
        sendResponse({storage: localStorage[request.storage]});
    } else {
        sendResponse({});
    }
});

function checkForValidUrl(tab) {
    if (tab.url.indexOf('https://mail.google.com/') == 0) {
        chrome.pageAction.show(tab.id);

        console.log(tab.url);

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
