/** GmailToTrello Application
 */

var GmailToTrello = GmailToTrello || {}; // Namespace initialization

GmailToTrello.App = function() {
    this.popupView = new GmailToTrello.PopupView(this);
    this.gmailView = new GmailToTrello.GmailView(this);
    this.data = new GmailToTrello.Model(this);
    
    this.bindEvents();
};

GmailToTrello.App.prototype.bindEvents = function() {
   var self = this;
    
    /*** Data's events binding ***/
    
    this.data.event.addListener('onBeforeAuthorize', function() {
        self.popupView.showMessage(self, 'Authorizing...');    
    });
    
    this.data.event.addListener('onAuthenticateFailed', function() {
        self.popupView.showMessage(self, 'Trello authorization failed');    
    });
    
    this.data.event.addListener('onAuthorized', function() {
        log('GmailToTrello.onAuthorized()');
        log("Status: " + Trello.authorized().toString());
    });
    
    this.data.event.addListener('onBeforeLoadTrello', function() {
        self.popupView.showMessage(self, 'Loading Trello data...');
    });
    
    this.data.event.addListener('onTrelloDataReady', function() {
        self.popupView.$popupContent.show();
        self.popupView.hideMessage();

        self.popupView.bindData(self.data);
    });
    
    this.data.event.addListener('onLoadTrelloListSuccess', function() {
        self.popupView.updateLists();
        self.popupView.validateData();
    });
    
    this.data.event.addListener('onLoadTrelloLabelsSuccess', function() {
        self.popupView.updateLabels();
        self.popupView.validateData();
    });

    this.data.event.addListener('onCardSubmitComplete', function(target, params) {
        self.data.newCard.url = params.data.url;
        self.data.newCard.id = params.data.id;
        self.data.event.fire('onSubmitAttachments', {data:self.data, attachments:params.attachments});
    });

    this.data.event.addListener('onCardSubmitFail', function(target, params) {
        self.popupView.displaySubmitFailedForm(params);
    });

    this.data.event.addListener('onSubmitAttachments', function(target, params) {
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
                    self.popupView.displaySubmitFailedForm(data);
                });
            }
        } else { // Done with attach list
            self.popupView.displaySubmitCompleteForm();
        }
    });

    /*** PopupView's events binding ***/

    this.popupView.event.addListener('onPopupVisible', function() {
        var data = self.data;
        if (!data.isInitialized) {
            self.popupView.showMessage(self, 'Initializing...');
            self.popupView.$popupContent.hide();
            data.init();
        }
        else {
            self.popupView.reset();
        }
        data.gmail = self.gmailView.parseData();
        self.popupView.bindGmailData(data.gmail);
        //else log('GTT::Initializer closing:Data is already initialized');

    });

    this.popupView.event.addListener('onBoardChanged', function(target, params) {
        var boardId = params.boardId;
        if (boardId !== "_" && boardId !== "" && boardId!==null) {
            self.data.loadTrelloLists(boardId);
            self.data.loadTrelloLabels(boardId);
        }
    });
    
    this.popupView.event.addListener('onSubmit', function() {
        self.data.submit();
    });

    this.popupView.event.addListener('onRequestUpdateGmailData', function() {
        self.data.gmail = self.gmailView.parseData();
        self.popupView.bindGmailData(self.data.gmail);
    });
  
    this.gmailView.event.addListener('onDetected', function(){
        self.popupView.$toolBar = self.gmailView.$toolBar;
        self.popupView.$toolBarHolder = self.gmailView.$toolBarHolder;
        self.popupView.init();

    });

};

GmailToTrello.App.prototype.initialize = function() {
    this.data.isInitialized = false;
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
 * Markdownify a text block
 */
 GmailToTrello.App.prototype.markdownify = function($emailBody, features) {
    if (!$emailBody || $emailBody.length < 1) {
        log('markdownify requires emailBody');
        return;
    }
    var self = this;

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

    var uriForDisplay = function(uri) {
        var uri_display = uri;
        if (uri.length > 20) {
            var re = RegExp("^\\w+:\/\/([\\w\\.\/_]+).*?([\\w\\.]+)$");
            var matched = uri.match(re);
            if (matched && matched.length > 1) {
                uri_display = matched[1] + ':' + matched[2]; // Make a nicer looking visible text. [0] = text
            }
        }
        return uri_display;
    }

    var body = $emailBody.innerText;
    var $html = $emailBody.innerHTML;

    var seen_already = {};
    // links:
    // a -> [text](html)
    if (processThisMarkdown('a')) {
        $('a', $html).each(function(index, value) {
            var text = $(this).text().trim();
            if (text && text.length > 4) { // Only replace links that have a chance of being unique in the text (x.dom):
                var replace = text;
                var uri = $(this).attr("href");
                var uri_display = uriForDisplay(uri);
                var comment = ' "' + text + ' via ' + uri_display + '"';
                if (seen_already[text] !== 1) {
                    seen_already[text] = 1;
                    if (text == uri) {
                        comment = ' "Open ' + uri_display + '"';
                    }
                    var re = new RegExp(self.escapeRegExp(text), "gi");
                    var replaced = body.replace(re, "[" + replace + "](" + uri + comment + ')');
                    body = replaced;
                }
            }
        });
    }

    /* DISABLED (Ace, 16-Jan-2017): Images kinda make a mess, until requested lets not markdownify them:
    // images:
    // img -> ![alt_text](html)
    if (processThisMarkdown('img')) {
        $('img', $html).each(function(index, value) {
            var text = $(this).attr("alt") || '<no-text>';
            var uri = $(this).attr("src") || '<no-uri>';
            var uri_display = uriForDisplay(uri);
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
            var text = $(this).text().trim();
            var re = new RegExp(self.escapeRegExp(text), "gi");
            var replaced = body.replace(re, "\n * " + text + "\n");
            body = replaced;
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
            var text = $(this).text().trim();
            var nodeName = $(this).prop("nodeName") || "";
            var x = '0' + nodeName.substr(-1);
            var re = new RegExp(self.escapeRegExp(text), "gi");
            var replaced = body.replace(re, "\n" + ('#'.repeat(x)) + " " + text + "\n");
            body = replaced;
        });
    }

    // bold: b -> **text**
    if (processThisMarkdown('b')) {
            $('b', $html).each(function(index, value) {
            var text = $(this).text().trim();
            var re = new RegExp(self.escapeRegExp(text), "gi");
            var replaced = body.replace(re, " **" + text + "** ");
            body = replaced;
        });
    }

    // minimize newlines:
    var replaced = body.replace(/\s{2,}/g, function(str) {
        if (str.indexOf("\n\n\n") !== -1)
            return "\n\n";
        else if (str.indexOf("\n") !== -1)
            return "\n";
        else
            return ' ';
    });

    return replaced;
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
