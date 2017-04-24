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

    // init Trello
    this.initTrello();

};

GmailToTrello.Model.prototype.initTrello = function() {
    log("GTT::initTrelloData()");

    var self = this;

    this.trello.user = null;
    this.trello.orgs = null;
    this.trello.boards = null;

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
                log('Trello authorization successful');
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
    log("GTT:deauthorizeTrello");

    Trello.deauthorize();
    this.isInitialized = false;
};

GmailToTrello.Model.prototype.makeAvatarUrl = function(avatarHash) {
    var retn = '';
    if (avatarHash && avatarHash.length > 0) {
        retn = 'https://trello-avatars.s3.amazonaws.com/' + avatarHash + '/30.png';
    }
    return retn;
}

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

GmailToTrello.Model.prototype.loadTrelloCards = function(listId) {
    log('loadTrelloCards');

    var self = this;
    this.trello.cards = null;

    Trello.get('lists/' + listId + '/cards', {fields: "name,pos"}, function(data) {
        self.trello.cards = data;
        self.event.fire('onLoadTrelloCardsSuccess');
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
        self.event.fire('onLoadTrelloLabelsSuccess');
    }, function failure(data) {
        self.event.fire('onAPIFailure', {data:data});
    });
};

GmailToTrello.Model.prototype.loadTrelloMembers = function(boardId) {
    log('loadTrelloMembers');

    var self = this;
    this.trello.members = null;

    Trello.get('boards/' + boardId + '/members', {fields: "fullName,username,initials,avatarHash"}, function(data) {
        var me = self.trello.user;
        // Remove this user from the members list:
        self.trello.members = $.map(data, function (item, iter) {
            return (item.id !== me.id ? item : null);
        });
        // And shove this user in the first position:
        self.trello.members.unshift({
            'id': me.id,
            'username': me.username,
            'initials': me.initials,
            'avatarHash': me.avatarHash,
            'fullName': me.fullName
        });
        self.event.fire('onLoadTrelloMembersSuccess');
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

    var post = 'cards';
    
    var idMembers = null;
    
    var text = this.parent.truncate((data.title && data.title.length > 0 ? data.title + '\n' : '')
            + data.description, this.parent.popupView.MAX_BODY_SIZE, '...');

    var desc = this.parent.truncate(data.description, this.parent.popupView.MAX_BODY_SIZE, '...');
    
    //submit data
    var trelloPostableData = {
        name: data.title, 
        desc: desc,
        idList: data.listId
    };

    if (data && data.membersId && data.membersId.length > 1) {
        trelloPostableData.idMembers = data.membersId;
    }

    // NOTE (Ace, 10-Jan-2017): Can only post valid labels, this can be a comma-delimited list of valid label ids, will err 400 if any label id unknown:
    if (data && data.labelsId && data.labelsId.length > 1 && data.labelsId.indexOf('-1') === -1) { // Will 400 if we post invalid ids (such as -1):
        trelloPostableData.idLabels = data.labelsId;
    }

    if (data && data.due_Date && data.due_Date.length > 1) { // Will 400 if not valid date:
        /* Workaround for quirk in Date object,
         * See: http://stackoverflow.com/questions/28234572/html5-datetime-local-chrome-how-to-input-datetime-in-current-time-zone
         * Was: dueDate.replace('T', ' ').replace('-','/')
         */
        var due = data.due_Date.replace('-', '/');

        if (data.due_Time && data.due_Time.length > 1) {
            due += ' ' + data.due_Time;
        } else {
            due += ' 00:00'; // Must provide time
        }
        trelloPostableData.due = new Date(due).toISOString();
        /* (NOTE (Ace, 27-Feb-2017): When we used datetime-local object, this was:
        trelloPostableData.due = new Date(data.dueDate.replace('T', ' ').replace('-','/')).toISOString();
        */
    }

    if (data && data.position) {
        switch (data.position) {
            case 'above':
                trelloPostableData.pos = 'top'; // Bottom is default, only need to indicate top
                if (data.cardPos && data.cardPos > 0) {
                    trelloPostableData.pos = data.cardPos-1;
                }
                break;
            case 'below':
                if (data.cardPos && data.cardPos > 0) {
                    trelloPostableData.pos = data.cardPos+1;
                }
                break;
            case 'to':
                if (data.cardId && data.cardId.length > 0) {
                    post = 'cards/' + data.cardId + '/actions/comments';
                    trelloPostableData = {'text': text};
                    // TODO (Ace, 2017.04.23): Due date, labels, members, all have to be called separately
                }
                break;
            default:
                log('ERROR: Got unknown case: ' + data.position);
        }
    }


    Trello.post(post, trelloPostableData, function success(data) {
        self.event.fire('onCardSubmitComplete', {data:data, images:self.newCard.images, attachments:self.newCard.attachments});
        log(data);
        //setTimeout(function() {self.popupNode.hide();}, 10000);
    }, function failure(data) {
        self.event.fire('onAPIFailure', {data:data});
    });
};

// End, model.js