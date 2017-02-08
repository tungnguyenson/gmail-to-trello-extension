/** GmailToTrello Application
 */

var GmailToTrello = GmailToTrello || {}; // Namespace initialization

GmailToTrello.App = function() {
    this.popupView = new GmailToTrello.PopupView(this);
    this.gmailView = new GmailToTrello.GmailView(this);
    this.model = new GmailToTrello.Model(this);
    
    this.bindEvents();

    this.CHROME_SETTINGS_ID = 'gtt_user_settings';
};

GmailToTrello.App.prototype.bindEvents = function() {
   var self = this;
    
    /*** Data's events binding ***/
    
    this.model.event.addListener('onBeforeAuthorize', function() {
        self.popupView.showMessage(self, 'Authorizing...');    
    });
    
    this.model.event.addListener('onAuthenticateFailed', function() {
        self.popupView.showMessage(self, 'Trello authorization failed');    
    });
    
    this.model.event.addListener('onAuthorized', function() {
        log('GmailToTrello.onAuthorized()');
        log("Status: " + Trello.authorized().toString());
    });
    
    this.model.event.addListener('onBeforeLoadTrello', function() {
        self.popupView.showMessage(self, 'Loading Trello data...');
    });
    
    this.model.event.addListener('onTrelloDataReady', function() {
        self.popupView.$popupContent.show();
        self.popupView.hideMessage();

        self.popupView.bindData(self.model);
    });
    
    this.model.event.addListener('onLoadTrelloListSuccess', function() {
        self.popupView.updateLists();
        self.popupView.validateData();
    });
    
    this.model.event.addListener('onLoadTrelloLabelsSuccess', function() {
        self.popupView.updateLabels();
        self.popupView.validateData();
    });

    this.model.event.addListener('onCardSubmitComplete', function(target, params) {
        self.model.newCard.url = params.data.url;
        self.model.newCard.id = params.data.id;
        self.model.event.fire('onSubmitAttachments', {data:self.model, attachments:params.attachments});
    });

    this.model.event.addListener('onAPIFailure', function(target, params) {
        self.popupView.displayAPIFailedForm(params);
    });

    this.model.event.addListener('onSubmitAttachments', function(target, params) {
        var attach1 = params.attachments.shift();
        
        if (attach1) {
            if (!attach1.hasOwnProperty('checked') || attach1.checked !== true) { // Skip this attachment
                params.data.event.fire('onSubmitAttachments', {data:params.data, attachments:params.attachments});
            } else {
                var trello_attach = {'mimeType': attach1.mimeType, 'name': attach1.name, 'url': attach1.url};
                // self.Model.submitAttachments(params.data.newCard.id, params.attachments);
                Trello.post('cards/' + params.data.newCard.id + '/attachments', trello_attach, function success(data) {
                    params.data.event.fire('onSubmitAttachments', {data:params.data, attachments:params.attachments});
                }, function failure(data) {
                    self.popupView.displayAPIFailedForm(data);
                });
            }
        } else { // Done with attach list
            self.popupView.displaySubmitCompleteForm();
        }
    });

    /*** PopupView's events binding ***/

    this.popupView.event.addListener('onPopupVisible', function() {
        var model = self.model;
        if (!model.isInitialized) {
            self.popupView.showMessage(self, 'Initializing...');
            self.popupView.$popupContent.hide();
            model.init();
        }
        else {
            self.popupView.reset();
        }
        model.gmail = self.gmailView.parseData();
        self.popupView.bindGmailData(model.gmail);
        //else log('GTT::Initializer closing:Data is already initialized');

    });

    this.popupView.event.addListener('onBoardChanged', function(target, params) {
        var boardId = params.boardId;
        if (boardId !== "_" && boardId !== "" && boardId!==null) {
            self.model.loadTrelloLists(boardId);
            self.model.loadTrelloLabels(boardId);
        }
    });
    
    this.popupView.event.addListener('onSubmit', function() {
        self.model.submit();
    });

    this.popupView.event.addListener('onRequestUpdateGmailData', function() {
        self.model.gmail = self.gmailView.parseData();
        self.popupView.bindGmailData(self.model.gmail);
    });
  
    this.gmailView.event.addListener('onDetected', function(){
        self.popupView.$toolBar = self.gmailView.$toolBar;
        self.popupView.$toolBarHolder = self.gmailView.$toolBarHolder;
        self.popupView.init();

    });

};

GmailToTrello.App.prototype.initialize = function() {
    this.model.isInitialized = false;
    this.gmailView.detect();

    service = analytics.getService('gmail_to_trello');

    // Get a Tracker using your Google Analytics app Tracking ID.
    tracker = service.getTracker('UA-8469046-1');

    // Record an "appView" each time the user launches your app or goes to a new
    // screen within the app.
    tracker.sendAppView('PopupView');

};

/**
 * Correctly escape RegExp
 */
GmailToTrello.App.prototype.escapeRegExp = function (str) {
    return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
};

/**
 * Utility routine to replace variables
 */
GmailToTrello.App.prototype.replacer = function(text, dict) {
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
};

/**
 * Make displayable URI
 */
GmailToTrello.App.prototype.uriForDisplay = function(uri) {
    var uri_display = uri || '';
    if (uri_display && uri_display.length > 30) {
        var re = RegExp("^\\w+:\/\/([\\w.\/_]+).*?([\\w._]*)$");
        var matched = uri_display.match(re);
        if (matched && matched.length > 0) {
            uri_display = matched[1] + (matched[2] && matched[2].length > 0 ? ':' + matched[2] : ''); // Make a nicer looking visible text. [0] = text
        }
    }
    return uri_display;
};

/**
 * Markdownify a text block
 */
GmailToTrello.App.prototype.markdownify = function($emailBody, features, preprocess) {
    if (!$emailBody || $emailBody.length < 1) {
        log('markdownify requires emailBody');
        return;
    }
    var self = this;

    const min_text_length_k = 4;
    const regexp_k = {
        'begin': '(^|\\s+|<|\\[|\\()',
        'end': '(>|\\]|\\)|\\s+|$)'
    };

    var processThisMarkdown = function(elementTag) { // Assume TRUE to process, unless explicitly restricted:
        if (typeof features === 'undefined') {
            return true;
        }
        if (features === false) {
            return false;
        }
        if (!features.hasOwnProperty(elementTag)) {
            return true;
        }
        if (features[elementTag] !== false) {
            return true;
        }
        return false;
    };

    var body = $emailBody.innerText;
    var $html = $emailBody.innerHTML;

    // Replace hr:
    var replaced = body.replace(/\s*-{3,}\s*/g, "--\n");
    body = replaced;

    // Convert crlf x 2 (or more) to paragraph markers:
    replaced = body.replace(/\s*[\n\r]+\s*[\n\r]+\s*/g, ' <p />\n');
    body = replaced;

    // links:
    // a -> [text](html)
    if (processThisMarkdown('a')) {
        var anchors = preprocess.a ||{};
        $('a', $html).each(function(index, value) {
            var text = ($(this).text() || "").trim();
            var uri = ($(this).attr("href") || "").trim();
            if (uri && text && text.length > min_text_length_k) {
                anchors[text.toLowerCase()] = {'text': text, 'uri': uri}; // Intentionally overwrites duplicates                
            }
        });
        $.each(Object.keys(anchors).sort(function(a, b){ // Go by order of largest to smallest
            return b.length - a.length;
        }), function(index, value) {
            var text = anchors[value].text;
            var uri = anchors[value].uri;
            var uri_display = self.uriForDisplay(uri);
            /*
            var comment = ' "' + text + ' via ' + uri_display + '"';
            var re = new RegExp(self.escapeRegExp(text), "i");
            if (uri.match(re)) {
                comment = ' "Open ' + uri_display + '"';
            }
            */
            var re = new RegExp(regexp_k.begin + '(' + self.escapeRegExp(value) + ')' + regexp_k.end, "gi");
            var replaced = body.replace(re, " [" + text + "](" + uri /* + comment */ + ') '); // Comment seemed like too much extra text
            body = replaced;
        });
    }

    /* DISABLED (Ace, 16-Jan-2017): Images kinda make a mess, until requested lets not markdownify them:
    // images:
    // img -> ![alt_text](html)
    if (processThisMarkdown('img')) {
        $('img', $html).each(function(index, value) {
            var text = ($(this).attr("alt") || "").trim();
            var uri = ($(this).attr("src") || "").trim();
            if (uri && text && text.length > min_text_length)
            var uri_display = self.uriForDisplay(uri);
            var re = new RegExp(text, "gi");
            var replaced = body.replace(re, "![" + text + "](" + uri + ' "' + text + ' via ' + uri_display + '"');
            body = replaced;
        });
    }
    */

    // bullet lists:
    // li -> " * "
    if (processThisMarkdown('li')) {
        $('li', $html).each(function(index, value) {
            var text = ($(this).text() || "").trim();
            if (text && text.length > min_text_length_k) {
                var re = new RegExp(regexp_k.begin + self.escapeRegExp(text) + regexp_k.end, "gi");
                var replaced = body.replace(re, " <p />* " + text + "<p /> ");
                body = replaced;
            }
        });
    }

    // headers:
    // H1 -> #
    // H2 -> ##
    // H3 -> ###
    // H4 -> ####
    // H5 -> #####
    // H6 -> ######
    if (processThisMarkdown('h')) {
        $(':header', $html).each(function(index, value) {
            var text = ($(this).text() || "").trim();
            var nodeName = $(this).prop("nodeName");
            if (nodeName && text && text.length > min_text_length_k) {
                var x = '0' + nodeName.substr(-1);
                var re = new RegExp(regexp_k.begin + self.escapeRegExp(text) + regexp_k.end, "gi");
                var replaced = body.replace(re, "\n" + ('#'.repeat(x)) + " " + text + "\n");
                body = replaced;
            }
        });
    }

    // bold: b -> **text**
    if (processThisMarkdown('b')) {
            $('b', $html).each(function(index, value) {
            var text = ($(this).text() || "").trim();
            if (text && text.length > min_text_length_k) {
                var re = new RegExp(regexp_k.begin + self.escapeRegExp(text) + regexp_k.end, "gi");
                var replaced = body.replace(re, " **" + text + "** ");
                body = replaced;
            }
        });
    }

    // Minimize newlines:
    replaced = body.replace(/\s*[\n\r]+\s*/g, '\n');
    body = replaced;

    replace = body.replace(/\s{2,}/g, ' ');
    body = replaced;

    replaced = body.replace(/\s*<p \/>\s*/g, '\n\n');
    body = replaced;

    replaced = body.replace(/\n{3,}/g, '\n\n');
    body = replaced;

    return body;
};

/**
 * Determine luminance of a color so we can augment with darker/lighter background
 */
GmailToTrello.App.prototype.luminance = function(color){
    var bkColorLight = 'lightGray'; // or white
    var bkColorDark = 'darkGray'; // 'gray' is even darker
    var bkColorReturn = bkColorLight;

    var re = new RegExp ("rgb\\D+(\\d+)\\D+(\\d+)\\D+(\\d+)");
    var matched = color.match(re, "i");
    if (matched && matched.length > 2) { // 0 is total string:
        var r = matched[1];
        var g = matched[2];
        var b = matched[3];
        // var 1 = matched[4]; // if alpha is provided

        var luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; // per ITU-R BT.709

        if (luma < 40) {
            bkColorReturn = bkColorDark;
        } else {
            bkColorReturn = bkColorLight;
        }
    } else {
        bkColorReturn = bkColorLight; // RegExp failed, assume dark color
    }

    return 'inherit'; // Use: bkColorReturn if you want to adjust background based on text perceived brightness
};

/**
 * HTML bookend a string
 */
GmailToTrello.App.prototype.bookend = function(bookend, text, style) {
    return '<' + bookend + (style ? ' style="' + style + '"' : '') + '>' + (text || "") + '</' + bookend + '>';
};

/**
 * Get selected text
 * http://stackoverflow.com/questions/5379120/get-the-highlighted-selected-text
 */
GmailToTrello.App.prototype.getSelectedText = function() {
    var text = "";
    var activeEl = document.activeElement;
    var activeElTagName = activeEl ? activeEl.tagName.toLowerCase() : null;
    if (
      (activeElTagName == "textarea" || activeElTagName == "input") &&
      /^(?:text|search|password|tel|url)$/i.test(activeEl.type) &&
      (typeof activeEl.selectionStart == "number")
    ) {
        text = activeEl.value.slice(activeEl.selectionStart, activeEl.selectionEnd).trim();
    } else if (document.selection) {
        text = document.selection.createRange().text.trim();
    } else if (document.getSelection){
        text = document.getSelection().toString().trim();
    } else if (window.getSelection) {
        text = window.getSelection().toString().trim();
    }
    return text;
};

/**
 * Truncate a string
 */
GmailToTrello.App.prototype.truncate = function(text, max, add) {
    var retn = text || "";
    const add_k = add || "";
    const max_k = max - add_k.length;

    if (text && text.length > max_k) {
        retn = text.slice(0, max_k) + add_k;
    }
    return retn;
};

/**
 * Load settings
 */
GmailToTrello.App.prototype.loadSettings = function(popup) {
    var self = this;
    const setID = this.CHROME_SETTINGS_ID;
    chrome.storage.sync.get(setID, function(response) {
        if (response && response.hasOwnProperty(setID)) {
            $.extend(self.popupView.data.settings, JSON.parse(response[setID])); // NOTE (Ace, 7-Feb-2017): Might need to store these off the app object
        }
        if (popup) { 
            popup.init_popup(); 
        }
    });
};

/**
 * Save settings
 */
GmailToTrello.App.prototype.saveSettings = function() {
    const setID = this.CHROME_SETTINGS_ID;
    const settings = this.popupView.data.settings;
    
    // Delete large, potentially needing secure, data bits:
    settings.description = '';
    settings.title = '';
    settings.attachments = [];

    const hash = {};
    hash[setID] = JSON.stringify(settings);
    chrome.storage.sync.set(hash);  // NOTE (Ace, 7-Feb-2017): Might need to store these off the app object
};

