var GmailToTrello = GmailToTrello || {};

GmailToTrello.Model = function(parent) {
    this.trello = {
        apiKey: 'c50413b23ee49ca49a5c75ccf32d0459',
        user: null,
        orgs: null,
        boards: null
    };
    this.parent = parent;
    this.settings = {};
    this.isInitialized = false;
    this.event = new EventTarget();
    this.newCard = null;
};

GmailToTrello.Model.prototype.init = function() {
    var self = this;

    this.isInitialized = true;

    // load user settings
    if (self.settings.orgId == '-1')
        self.settings.orgId = 'all';

    // init Trello
    this.initTrello();

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

GmailToTrello.Model.prototype.deauthorizeTrello = function() {
    log("GTT:deauthorizeTrello()");

    Trello.deauthorize();
    this.isInitialized = false;
};

GmailToTrello.Model.prototype.loadTrelloData = function() {
    log('loading trello data');

    this.event.fire('onBeforeLoadTrello');
    this.trello.user = null;


    var self = this;

    // get user's info
    log('Getting user info');
    Trello.get('members/me', {}, function(data) {
        if (!data || !data.hasOwnProperty('id')) {
            return false;
        }

        data.avatarUrl = null;
        if (data && data.avatarSource !== 'none' && data.avatarHash && data.avatarHash.length > 0) {
            data.avatarUrl = 'https://trello-avatars.s3.amazonaws.com/' + data.avatarHash + '/30.png';
        }

        self.trello.user = data;

        // get user orgs
        self.trello.orgs = [{id: -1, displayName: 'My Boards'}];
        if (data && data.hasOwnProperty('idOrganizations') && data.idOrganizations && data.idOrganizations.length > 0) {
            log('Getting user orgs');
            Trello.get('members/me/organizations', {fields: "displayName"}, function(data) {
                log(data);
                for (var i = 0; i < data.length; i++) {
                    self.trello.orgs.push(data[i]);
                }
                self.checkTrelloDataReady();
            }, function failure(data) {
                self.event.fire('onAPIFailure', {data:data});
            });

        }

        // get boards list, including orgs
        if (data && data.hasOwnProperty('idBoards') && data.idBoards && data.idBoards.length > 0) {
            log('Getting user boards');
            self.trello.boards = null;
            Trello.get('members/me/boards', {fields: "closed,name,idOrganization"}, function(data) {
                var validData = Array();
                for (var i = 0; i < data.length; i++) {
                    if (data[i].idOrganization === null)
                        data[i].idOrganization = -1;

                    // Only accept opening boards
                    if (i==0) {
                        log(data[i]);
                    }
                    if (data[i].closed != true) {
                        validData.push(data[i]);
                    }
                }
                log('Boards data:');
                log(data);
                log(validData);
                self.trello.boards = validData;
                self.checkTrelloDataReady();
            }, function failure(data) {
                self.event.fire('onAPIFailure', {data:data});
            });
        }
        self.checkTrelloDataReady();
    }, function failure(data) {
        self.event.fire('onAPIFailure', {data:data});
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
        self.trello.lists = data.lists;
        self.event.fire('onLoadTrelloListSuccess');
    }, function failure(data) {
            self.event.fire('onAPIFailure', {data:data});
    });
};

GmailToTrello.Model.prototype.loadTrelloLabels = function(boardId) {
    log('loadTrelloLabels');

    var self = this;
    this.trello.labels = null;

    Trello.get('boards/' + boardId + '/labels', {fields: "color,name"}, function(data) {
        self.trello.labels = data;
        // If you want to add a "none" label, do:
        // self.trello.labels.unshift ({color:'gray', name:'none', id:'-1'});
        self.event.fire('onLoadTrelloLabelsSuccess');
    }, function failure(data) {
        self.event.fire('onAPIFailure', {data:data});
    });
};

GmailToTrello.Model.prototype.submit = function() {
    var self = this;
    if (this.newCard === null) {
        log('Submit data is empty');
        return false;
    }
    var data = this.newCard;

    this.parent.saveSettings();
    /* OLD save settings
    chrome.storage.sync.set({storage: self.CHROME_SETTINGS_ID, value: JSON.stringify({
        orgId: data.orgId,
        boardId: data.boardId,
        listId: data.listId,
        labelsId: data.labelsId,
        dueDate: data.dueDate,
        title: data.title,
        desc: data.description,
        attachments: data.attachments,
        useBackLink: data.useBackLink,
        selfAssign: data.selfAssign,
        markdown: data.markdown
    })});
    */

    var idMembers = null;
    if (data.selfAssign) {
        idMembers = this.trello.user.id;  
    }
    
    var desc = this.parent.truncate(data.description, this.parent.popupView.MAX_BODY_SIZE, '...');
    
    //submit data
    var trelloPostableData = {name: data.title, 
        desc: desc,
        idList: data.listId, idMembers:idMembers
    };

    // NOTE (Ace, 10-Jan-2017): Can only post valid labels, this can be a comma-delimited list of valid label ids, will err 400 if any label id unknown:
    if (data && data.labelsId && data.labelsId.length > 1 && data.labelsId.indexOf('-1') === -1) { // Will 400 if we post invalid ids (such as -1):
        trelloPostableData.idLabels = data.labelsId;
    }

    if (data && data.dueDate && data.dueDate.length > 1) { // Will 400 if not valid date:
        trelloPostableData.due = new Date(data.dueDate.replace('T', ' ').replace('-','/')).toISOString();
        /* Replaces work around quirk in Date object, see: http://stackoverflow.com/questions/28234572/
        html5-datetime-local-chrome-how-to-input-datetime-in-current-time-zone */
    }

    if (data && data.position && data.position == 'top') {
        trelloPostableData.pos = 'top'; // Bottom is default, only need to indicate top
    }

    Trello.post('cards', trelloPostableData, function success(data) {
        self.event.fire('onCardSubmitComplete', {data:data, attachments:self.newCard.attachments});
        log(data);
        //setTimeout(function() {self.popupNode.hide();}, 10000);
    }, function failure(data) {
        self.event.fire('onAPIFailure', {data:data});
    });
};
