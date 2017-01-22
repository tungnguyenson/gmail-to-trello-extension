/** GmailToTrello Application
 */

var GmailToTrello = GmailToTrello || {}; // Namespace initialization

GmailToTrello.App = function() {
    this.popupView = new GmailToTrello.PopupView();
    this.gmailView = new GmailToTrello.GmailView();
    this.data = new GmailToTrello.Model();
    
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

    this.data.event.addListener('onSubmitAttachments', function(target, params) {
        var attach1;

        while (attach1 = params.attachments.shift() && attach1.checked !== true) {
            /* intentionally blank */
        }
        
        if (attach1) {
            // self.Model.submitAttachments(params.data.newCard.id, params.attachments);
            Trello.post('cards/' + params.data.newCard.id + '/attachments', attach1, function(data) {
                params.data.event.fire('onSubmitAttachments', {data:params.data, attachments:params.attachments});
            });
        } else {
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
