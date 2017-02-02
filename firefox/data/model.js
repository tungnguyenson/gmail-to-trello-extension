var GmailToTrello = GmailToTrello || {};

GmailToTrello.Model = function() {
    this.trello = {
        apiKey: 'c50413b23ee49ca49a5c75ccf32d0459',
        user: null,
        orgs: null,
        boards: null
    };
    this.settings = {};
    this.isInitialized = false;
    this.event = new EventTarget();
    this.newCard = null;
};

GmailToTrello.Model.prototype.retrieveSettings = function() {
  var settingsJson = localStorage["userSettings"];

  if (!settingsJson) {
    return {};
  }

  return JSON.parse(settingsJson);
};

GmailToTrello.Model.prototype.initTrello = function() {
    log("GTT::initTrelloData()");

    var self = this;

    this.trello.user = this.trello.orgs = this.trello.boards = null;

    Trello.setKey(this.trello.apiKey);
    Trello.authorize({
        interactive: false,
        success: function() {
            self.event.fire('onAuthorized');
            self.loadTrelloData();
        }
    });

    if (!Trello.authorized()) {

        this.event.fire('onBeforeAuthorize');

        Trello.authorize({
            type: 'popup',
            name: "Gmail to Trello",
            persit: true,
            scope: {read: true, write: true},
            expiration: 'never',
            success: function(data) {
                log('Trello authorization successfully');
                log(data);
                self.event.fire('onAuthorized');
                self.loadTrelloData();
            },
            error: function() {
                self.event.fire('onAuthenticateFailed');
            }
        });

    }
    else {
        //log(Trello);
        //log(Trello.token());
    }
};

GmailToTrello.Model.prototype.loadTrelloData = function() {
    log('loading trello data');

    this.event.fire('onBeforeLoadTrello');
    this.trello.user = null;


    var self = this;

    // get user's info
    log('Getting user info');
    Trello.get('members/me', {}, function(data) {
        data.avatarUrl = data.avatarSource === 'upload' ? 'https://trello-avatars.s3.amazonaws.com/' + data.avatarHash + '/30.png' : null;
        //log(data);
        self.trello.user = data;

        if (!data || !data.hasOwnProperty('id'))
            return false;

        // get user orgs
        self.trello.orgs = [{id: -1, displayName: 'My Boards'}];
        if (data.hasOwnProperty('idOrganizations') && data.idOrganizations.length > 0) {
            log('Getting user orgs');
            Trello.get('members/me/organizations', {fields: "displayName"}, function(data) {
                log(data);
                for (var i = 0; i < data.length; i++) {
                    self.trello.orgs.push(data[i]);
                }
                self.checkTrelloDataReady();
            });

        }

        // get boards list, including orgs
        if (data.hasOwnProperty('idBoards') && data.idBoards.length > 0) {
            log('Getting user boards');
            self.trello.boards = null;
            Trello.get('members/me/boards', {fields: "closed,name,idOrganization"}, function(data) {
                for (var i = 0; i < data.length; i++) {
                    if (data[i].idOrganization === null)
                        data[i].idOrganization = -1;
                }
                log(data);
                self.trello.boards = data;
                self.checkTrelloDataReady();
            });
        }

        self.checkTrelloDataReady();
    });




};

GmailToTrello.Model.prototype.checkTrelloDataReady = function() {
    if (this.trello.user !== null &&
            this.trello.orgs !== null &&
            this.trello.boards !== null) {
        // yeah! the data is ready
        //log('checkTrelloDataReady: YES');
        //log(this);
        this.event.fire('onTrelloDataReady');

    }
    //else log('checkTrelloDataReady: NO');
};


GmailToTrello.Model.prototype.loadTrelloLists = function(boardId) {
    log('loadTrelloLists');

    var self = this;
    this.trello.lists = null;

    Trello.get('boards/' + boardId, {lists: "open", list_fields: "name"}, function(data) {
        /*
         var saveSettingId = null;
         var saveSettingFound = false;
         
         if (self.userSettings !== null) {
         saveSettingId = self.userSettings.listId;
         log('Found userSettings.listId');
         log(saveSettingId);
         }
         */
        self.trello.lists = data.lists;
        self.event.fire('onLoadTrelloListSuccess');

//        listNode.html(strOptions).show();
//        msgNode.hide();

//        if (saveSettingFound)
//            listNode.val(saveSettingId);
//        listNode.change();

        //self.validateData();
    });
};

GmailToTrello.Model.prototype.submit = function() {
    var self = this;
    if (this.newCard === null) {
        log('Submit data is empty');
        return false;
    }
    var data = this.newCard;

    if (data.useBacklink) {
        var email = this.userEmail.replace('@', '\\@');
        var txtDirect = "["+email+"](" + document.location.href + " \"Direct link to creator's email, not acccessible from anyone else\")";

        //subject = subject.replace('"', '');
        //subject = subject.replace(' ', '+');
        // https://mail.google.com/mail/u/1/#advanced-search/subset=all&has=Bug&within=1d&date=nov+14?compose=14269f3a0707acb9
        // <span id=":1v" class="g3" title="Mon, Nov 18, 2013 at 11:20 AM" alt="Mon, Nov 18, 2013 at 11:20 AM">11:20 AM (2 hours ago)</span>
        // //*[@id=":1v"]
        var subject = encodeURIComponent(data.title);

        //parse date
        log('parsing time');
        log(data.timeStamp);
        var dateSearch = (data.timeStamp) ? data.timeStamp.replace('at', '').trim() : null;
        dateSearch = (dateSearch) ? Date.parse(dateSearch) : null;
        dateSearch = (dateSearch) ? dateSearch.toString('MMM d, yyyy') : null;
        log(dateSearch);

        var txtSearch = '';
        if (dateSearch) {
            data.date = dateSearch;
            dateSearch = encodeURIComponent(dateSearch);
            txtSearch += "[Search](https://mail.google.com/mail/#advanced-search/subset=all&has=" + subject + "&within=1d&date=" + dateSearch + " \"Advance search by email subject and time\")";

        }
        else
            txtSearch += "[Search](https://mail.google.com/mail/#search/" + subject + " \"Search by email subject\")";

        data.description += "\n\n---\nImported from Gmail: " + txtDirect + " | " + txtSearch;
        //after:2013/11/17 before:2013/11/20
        //#advanced-search/subset=all&has=bug&within=1d&date=Nov+18%2C+2013
        //
        //log(this.data.desc);
        //https://mail.google.com/mail/u/1/#advanced-search/subset=all&has=%5BTiki.vn+Bug&within=1d&date=nov+18%2C+2013


    }

    //save settings
    localStorage['userSettings'] = JSON.stringify({
            orgId: data.orgId,
            boardId: data.boardId,
            listId: data.listId,
            useBacklink: data.useBacklink,
            selfAssign: data.selfAssign
        });

    var idMembers = null;
    if (data.selfAssign) {
        idMembers = this.trello.user.id;  
    }
    //
    //submit data
    var card = {
        name: data.title,
        desc: data.description,
        idList: data.listId,
        idMembers:idMembers
    };
    if (data.due)
        card.due = data.due;
    Trello.post('cards', card, function(data) {
        self.event.fire('onSubmitComplete', {data:data});
        log(data);
        //setTimeout(function() {self.popupNode.hide();}, 10000);
    }
    );

//    log(data);
};

GmailToTrello.Model.prototype.init = function() {
    var self = this;

    this.isInitialized = true;

    // load user settings
    self.settings = this.retrieveSettings();
    logEnabled = true;
    if (self.settings) {
        if (self.settings.orgId == '-1')
            self.settings.orgId = 'all';
        log('Here are user settings:');
        log(self.settings);
    }
    // init Trello
    this.initTrello();

    return true
};
