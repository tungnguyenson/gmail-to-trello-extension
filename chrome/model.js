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

    Trello.get('lists/' + listId + '/cards', {fields: "name,pos,idMembers,idLabels"}, function(data) {
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

GmailToTrello.Model.prototype.Uploader = function(parent_in, cardId_in) {
    this.parent = parent_in;
    this.data = [];
    this.cardId = cardId_in && cardId_in !== '-1' ? cardId_in : '';
    if (!this.cardId) {
        this.data.push({'property': 'cards'}); // Seed array for new card
    } 
};

GmailToTrello.Model.prototype.Uploader.prototype = {
    'attachments': 'attachments',

    'exclude': function(list, exclude) {
        let list_new = [];
        $.each(list.split(','), function(iter, item) {
            if (exclude.indexOf(item) === -1) {
                list_new.push(item);
            }
        });
        return list_new.join(',');
    },
    
    'add': function(args) {
        if (this.parent.parent.validHash(args)) {
            if (!this.cardId && args.property !== this.attachments) { // It's a new card so add to the existing hash:
                this.data[0][args.property] = args.value;
            } else {
                args.property = 'cards/' + (this.cardId || '%cardId%') + '/' + args.property;
                this.data.push(args);
            }
        }
        return this;
    },
    
    'process_response': function(data_in) {
        const dl_k = this.parent.parent.deep_link; // Pointer to function for expedience

        const url_k = dl_k(data_in, ['url']);
        const id_k = dl_k(data_in, ['id']);
        const card_k = dl_k(data_in, ['data', 'card']);

        let shortLink = dl_k(card_k, ['shortLink']);
        if (shortLink && shortLink.length > 0) {
            shortLink = 'https://trello.com/c/' + shortLink;
        }
        
        const add_id_k = dl_k(card_k, ['id']);
        const add_title_k = dl_k(card_k, ['name']);

        const new_url_k = shortLink || url_k || '';
        const new_id_k = add_id_k || id_k || '';

        if (new_url_k && this.parent.newCard && !this.parent.newCard.url) {
            this.parent.newCard.url = new_url_k;
        }
        if (new_id_k && this.parent.newCard && !this.parent.newCard.id) {
            this.parent.newCard.id = new_id_k;
            this.cardId = new_id_k;
        }
        if (add_title_k && add_title_k.length > 0) {
            this.parent.newCard.title = add_title_k;
        }
    },

    'attach': function(method, property, upload1, success, error) {
        if (!property || property.length < 6 || !upload1 || !upload1.value || upload1.value.length < 6) return;
        
        const trello_url_k = 'https://api.trello.com/1/';
        const param_k = upload1.value;

        var xhr = new XMLHttpRequest();
        xhr.open('get', param_k);
        xhr.responseType = 'blob'; // Use blob to get the mimetype
        xhr.onload = function() {
            var fileReader = new FileReader();
            fileReader.onload = function() {
                const filename_k = (param_k.split('/').pop().split('#')[0].split('?')[0]) || uri || 'unknown_filename'; // Removes # or ? after filename
                const file_k = new File([this.result], filename_k);
                var form = new FormData();
                form.append('file', file_k);
                form.append('key', Trello.key())
                form.append('token', Trello.token());

                const opts_k = {
                    'url': trello_url_k + property,
                    'method': 'POST',
                    'data': form,
                    'dataType': 'json',
                    'success': success,
                    'error': error,
                    'cache': false,
                    'contentType': false,
                    'processData': false
                };
                return $.ajax(opts_k);
            };
            fileReader.readAsArrayBuffer(xhr.response); // Use filereader on blob to get content
        };
        xhr.send();
    },

    'upload': function() {
        let upload1 = this.data.shift();
        if (!upload1) this.event.fire('onCardSubmitComplete');

        const dict_k = {'cardId': this.cardId || ''};

        let method = upload1.method || 'post';
        let property = this.parent.parent.replacer(upload1.property, dict_k);
        delete upload1.method;
        delete upload1.property;

        const fn_k = property.endsWith(this.attachments) ? this.attach : Trello.rest;

        let self = this;
        fn_k(method, property, upload1, function success(data) {
            self.process_response(data);
            if (self.data && self.data.length > 0) {
                self.upload();
            } else {
                self.parent.event.fire('onCardSubmitComplete', {data: data});
            }
        }, function failure(data) {
            self.parent.event.fire('onAPIFailure', {data: data});
        });
    }
};

GmailToTrello.Model.prototype.submit = function() {
    let self = this;
    if (this.newCard === null) {
        log('Submit data is empty');
        return false;
    }

    this.parent.saveSettings();

    var data = this.newCard;

    let uploader = new this.Uploader(self, data.cardId);
    
    var text = data.title || '';
    if (text.length > 0) {
        if (data.markdown) {
            text = '**' + text + '**\n\n';
        }
    }
    text += data.description;

    text = this.parent.truncate(text, this.parent.popupView.MAX_BODY_SIZE, '...');

    var desc = this.parent.truncate(data.description, this.parent.popupView.MAX_BODY_SIZE, '...');

    var due_text = '';

    if (data.due_Date && data.due_Date.length > 1) { // Will 400 if not valid date:
        /* Workaround for quirk in Date object,
         * See: http://stackoverflow.com/questions/28234572/html5-datetime-local-chrome-how-to-input-datetime-in-current-time-zone
         * Was: dueDate.replace('T', ' ').replace('-','/')
         */
        let due = data.due_Date.replace('-', '/');

        if (data.due_Time && data.due_Time.length > 1) {
            due += ' ' + data.due_Time;
        } else {
            due += ' 00:00'; // Must provide time
        }
        due_text = new Date(due).toISOString();
        /* (NOTE (Ace, 27-Feb-2017): When we used datetime-local object, this was:
        trelloPostableData.due = new Date(data.dueDate.replace('T', ' ').replace('-','/')).toISOString();
        */
    }

    switch (data.position || 'below') {
        case 'below':
            let pos = parseInt(data.cardPos || 0, 10);
            if (pos) {
                pos++;
            } else {
                pos ='bottom';
            }
            uploader
                .add({'property': 'pos', 'value': pos})
                .add({'property': 'name', 'value': data.title})
                .add({'property': 'desc', 'value': desc})
                .add({'property': 'idList', 'value': data.listId});
            break;
        case 'to':
            if (!data.cardId || data.cardId.length < 1 || data.cardId === '-1') {
                uploader
                    .add({'property': 'pos', 'value': 'top'})
                    .add({'property': 'name', 'value': data.title})
                    .add({'property': 'desc', 'value': desc})
                    .add({'property': 'idList', 'value': data.listId});
            } else {
                uploader.add({'property': 'actions/comments', 'text': text});
            }
            break;
        default:
            log('ERROR: Got unknown case: ' + data.position || '<empty position>');
    }

    uploader
        .add({'property': 'idMembers', 'value': uploader.exclude(data.membersId, data.cardMembers)})
        .add({'property': 'idLabels', 'value': uploader.exclude(data.labelsId, data.cardLabels)})
        .add({'property': 'due', 'value': due_text, 'method': 'put'})


    let imagesAndAttachments = (data.images || []).concat(data.attachments || []);

    $.each(imagesAndAttachments, function(iter, item) {
        if (item.hasOwnProperty('checked') && item.checked && item.url && item.url.length > 5) {
            uploader.add({'property': uploader.attachments, 'value': item.url});
        }
    });

  uploader.upload();
};

// End, model.js