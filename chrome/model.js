var GmailToTrello = GmailToTrello || {};

GmailToTrello.Model = function(parent) {
    this.trello = {
        apiKey: 'c50413b23ee49ca49a5c75ccf32d0459',
        user: null,
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
    // gtt_log("Model:initTrello");

    var self = this;

    self.trello.user = null;
    self.trello.boards = null;

    Trello.setKey(self.trello.apiKey);
    self.checkTrelloAuthorized();
};

GmailToTrello.Model.prototype.checkTrelloAuthorized = function() {
    // gtt_log("checkTrelloAuthorized");

    var self = this;

    // Assures there's a token or not:
    Trello.authorize({
        interactive: false,
        success: function(data) {
            self.event.fire('onAuthorized');
            self.loadTrelloData();
        },
        error: function(data) {
            if (!Trello.authorized()) { // Assure token is invalid
                self.event.fire('onBeforeAuthorize');
                Trello.authorize({
                    type: 'popup',
                    name: "Gmail-to-Trello",
                    interactive: true,
                    persit: true,
                    scope: {read: true, write: true},
                    expiration: 'never',
                    success: function(data) {
                        gtt_log('checkTrelloAuthorized: Trello authorization successful');
                        // gtt_log(data);
                        self.event.fire('onAuthorized');
                        self.loadTrelloData();
                    },
                    error: function(data) {
                        self.event.fire('onAuthorizeFail');
                    }
                });
            } else {
                gtt_log('Model:checkTrelloAuthorized: failed');
                // We have a valid token, so...how did we get here?
                // self.event.fire('onAuthorized');
                // self.loadTrelloData();
                // gtt_log(Trello);
                // gtt_log(Trello.token());
            }
        }
    });
};

GmailToTrello.Model.prototype.deauthorizeTrello = function() {
    gtt_log("deauthorizeTrello");

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
    // gtt_log('loadTrelloData');

    this.event.fire('onBeforeLoadTrello');
    this.trello.user = null;


    var self = this;

    // get user's info
    // gtt_log('loadTrelloData: User info');
    Trello.get('members/me', {}, function(data) {
        if (!data || !data.hasOwnProperty('id')) {
            return false;
        }

        self.trello.user = data;

        // gtt_log('loadTrelloData: User boards');
        self.trello.boards = null;
        Trello.get('members/me/boards', {
                'organization': 'true',
                'organization_fields': 'displayName',
                'filter': 'open',
                'fields': 'name' /* "name,closed" */
            }, function(data) {
                var validData = Array();
                for (var i = 0; i < data.length; i++) {
                    // if (data[i].idOrganization === null)
                    //   data[i].idOrganization = '-1';

                    // Only accept opening boards
                    if (i==0) {
                        // gtt_log(JSON.stringify(data[i]));
                    }
                    if (data[i].closed != true) {
                        validData.push(data[i]);
                    }
                }
                // gtt_log('loadTrelloData: Boards data');
                // gtt_log(JSON.stringify(data));
                // gtt_log(JSON.stringify(validData));
                self.trello.boards = validData;
                self.checkTrelloDataReady();
            }, function failure(data) {
            self.event.fire('onAPIFailure', {data:data});
            }
        );
        self.checkTrelloDataReady();
    }, function failure(data) {
        self.event.fire('onAPIFailure', {data:data});
    });
};

GmailToTrello.Model.prototype.checkTrelloDataReady = function() {
    if (this.trello.user !== null &&
        this.trello.boards !== null) {
        // yeah! the data is ready
        //gtt_log('checkTrelloDataReady: YES');
        //gtt_log(this);
        this.event.fire('onTrelloDataReady');

    }
    //else gtt_log('checkTrelloDataReady: NO');
};


GmailToTrello.Model.prototype.loadTrelloLists = function(boardId) {
    // gtt_log('loadTrelloLists');

    var self = this;
    this.trello.lists = null;

    Trello.get('boards/' + boardId, {lists: "open", list_fields: "name"}, function(data) {
        self.trello.lists = data.lists;
        // gtt_log('loadTrelloLists: lists:' + JSON.stringify(self.trello.lists));
        self.event.fire('onLoadTrelloListSuccess');
    }, function failure(data) {
            self.event.fire('onAPIFailure', {data:data});
    });
};

GmailToTrello.Model.prototype.loadTrelloCards = function(listId) {
    // gtt_log('loadTrelloCards');

    var self = this;
    this.trello.cards = null;

    Trello.get('lists/' + listId + '/cards', {fields: "name,pos,idMembers,idLabels"}, function(data) {
        self.trello.cards = data;
        // gtt_log('loadTrelloCards: cards:' + JSON.stringify(self.trello.cards));
        self.event.fire('onLoadTrelloCardsSuccess');
    }, function failure(data) {
            self.event.fire('onAPIFailure', {data:data});
    });
};

GmailToTrello.Model.prototype.loadTrelloLabels = function(boardId) {
    // gtt_log('loadTrelloLabels');

    var self = this;
    this.trello.labels = null;

    Trello.get('boards/' + boardId + '/labels', {fields: "color,name"}, function(data) {
        self.trello.labels = data;
        // gtt_log('loadTrelloLabels: labels:' + JSON.stringify(self.trello.labels));
        self.event.fire('onLoadTrelloLabelsSuccess');
    }, function failure(data) {
        self.event.fire('onAPIFailure', {data:data});
    });
};

GmailToTrello.Model.prototype.loadTrelloMembers = function(boardId) {
    // gtt_log('loadTrelloMembers');

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

        // gtt_log('loadTrelloMembers: members:' + JSON.stringify(self.trello.members));

        self.event.fire('onLoadTrelloMembersSuccess');
    }, function failure(data) {
        self.event.fire('onAPIFailure', {data:data});
    });
};

GmailToTrello.Model.prototype.Uploader = function(args) {
    if (!args || !args.hasOwnProperty('parent')) {
        return;
    }

    this.parent = args.parent;

    this.data = [];
    
    this.cardId = args.cardId || '';

    this.pos = this.translatePosition({'position': args.position || '', 'cardPos': args.cardPos || ''});

    if (this.pos !== 'at') {
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
            if (this.pos !== 'at' && args.property !== this.attachments) { // It's a new card so add to the existing hash:
                this.data[0][args.property] = args.value;
            } else {
                const cardId_k = (this.pos === 'at' ? this.cardId : '%cardId%'); // Won't know until we store the initial card
                args.property = 'cards/' + cardId_k + '/' + args.property;
                this.data.push(args);
            }
        }
        return this;
    },

    'translatePosition': function(args) {
        let pos = 'bottom';
        
        const position_k = args.position || 'below';
        const cardPos_k = parseInt(args.cardPos || 0, 10);

        switch (position_k) {
            case 'below':
                if (cardPos_k) {
                    pos = cardPos_k + 1;
                } else {
                    // pos = 'bottom';
                }
                break;
            case 'to':
                if (!this.cardId || this.cardId.length < 1 || this.cardId === '-1') {
                    pos = 'top';
                } else {
                    pos = 'at';
                }
                break;
        default:
            gtt_log('submit: ERROR: Got unknown case: ' + position_k || '<empty position>');
        }

        return pos;
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
        
        const UPLOAD_ATTACH = 'gtt:upload_attach';
        const trello_url_k = 'https://api.trello.com/1/';
        const param_k = upload1.value;

        // NOTE (Ace, 2020-02-15): We have a funny problem with embedded images so breaking this up:
        // Was: const filename_k = (param_k.split('/').pop().split('#')[0].split('?')[0]) || upload1.name || param_k || 'unknown_filename'; // Removes # or ? after filename
        // Remove # or ? afer filename. Could do this as a regex, but this is a bit faster and more resiliant:
        const slash_split_k = param_k.split('/') // First split by directory slashes
        const end_slash_split_k = slash_split_k[slash_split_k.length - 1] // Take last slash section
        const hash_split_k = end_slash_split_k.split('#') // Split by hash so we can split it off
        const begin_hash_split_k = hash_split_k[0] // Take first hash
        const question_split_k = begin_hash_split_k.split('?') // Now split by question mark to remove variables
        const begin_question_split_k = question_split_k[0] // Take content ahead of question mark
        const filename_k = begin_question_split_k || upload1.name || param_k || 'unknown_filename' // Use found string or reasonable fallbacks

        var xhr = new XMLHttpRequest();
        xhr.open('get', param_k);
        xhr.responseType = 'blob'; // Use blob to get the mimetype
        xhr.onload = function() {
            var fileReader = new FileReader();
            fileReader.onload = function() {
                const file_k = new File([this.result], filename_k);
                gtt_log('Attaching filename:"' + filename_k + '" size:' + file_k.size)
                if (!file_k.size) {
                    msg = 'ERROR: Empty content! Filename:"' + filename_k + '"'
                    gtt_log(msg)
                    data = {
                        'status': 'size:0',
                        'statusText': msg,
                        'responseText': 'KNOWN PROBLEM WITH NEW CHROME BROWSER SECURITY [FIX IN PROGRESS]: Try creating/updating card again without attachment "' + filename_k + '"',
                        'keys': '<none>'
                    }
                    return error(data);
                }
                var form = new FormData();
                form.append('file', file_k);
                form.append('key', Trello.key())
                form.append('token', Trello.token());
                gtt_log(JSON.stringify(form);
                    
                let body = new URLSearchParams()
                body.append('file', file_k);
                body.append('key', Trello.key())
                body.append('token', Trello.token());
                fetch(trello_url_k + property, {
                    method: 'POST',
                    // headers: {'Content-Type': 'application/x-www-form-urlencoded' },
                    body: body
                })
                .then(response => response.json())
                .then(data => success(data))
                .catch(err => error(err));
                /*
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
                */
            };
            fileReader.readAsArrayBuffer(xhr.response); // Use filereader on blob to get content
        };
        xhr.send();
    },

    'attach_new': function(method, property, upload1, success, error) {
        if (!property || property.length < 6 || !upload1 || !upload1.value || upload1.value.length < 6) return;
        
        const UPLOAD_ATTACH = 'gtt:upload_attach';
        const trello_url_k = 'https://api.trello.com/1/';
        const param_k = upload1.value;

        // NOTE (Ace, 2020-02-15): We have a funny problem with embedded images so breaking this up:
        // Was: const filename_k = (param_k.split('/').pop().split('#')[0].split('?')[0]) || upload1.name || param_k || 'unknown_filename'; // Removes # or ? after filename
        // Remove # or ? afer filename. Could do this as a regex, but this is a bit faster and more resiliant:
        const slash_split_k = param_k.split('/') // First split by directory slashes
        const end_slash_split_k = slash_split_k[slash_split_k.length - 1] // Take last slash section
        const hash_split_k = end_slash_split_k.split('#') // Split by hash so we can split it off
        const begin_hash_split_k = hash_split_k[0] // Take first hash
        const question_split_k = begin_hash_split_k.split('?') // Now split by question mark to remove variables
        const begin_question_split_k = question_split_k[0] // Take content ahead of question mark
        const filename_k = begin_question_split_k || upload1.name || param_k || 'unknown_filename' // Use found string or reasonable fallbacks

        let error_empty = function(filename, error_fxn) {
            msg = 'ERROR: Empty content! Filename:"' + filename + '"'
            gtt_log(msg)
            data = {
                'status': 'size:0',
                'statusText': msg,
                'responseText': 'KNOWN PROBLEM WITH NEW CHROME BROWSER SECURITY [FIX IN PROGRESS]: Try creating/updating card again without attachment "' + filename_k + '"',
                'keys': '<none>'
            }
            return error_fxn(data);
        };

        let file_processor = function(storage_key) {
            if (!storage_key) {
                return error_empty(filename_k, error);
            }
            chrome.storage.local.get([storage_key], function(response) {
                if (response.hasOwnProperty(storage_key) && response[storage_key]) {
                    const file_k = response[storage_key]['file'];
                    if (!file_k.size) {
                        return error_empty(filename_k, error);
                    }
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
                } else {
                    return error_empty(filename_k, error);
                }
            });
        };
    
        let hash = {}
        hash[UPLOAD_ATTACH] = {
            'url': upload1.value,
            'filename': filename_k
        }
        
        chrome.runtime.sendMessage(hash, file_processor);
    },

    'attach_original': function(method, property, upload1, success, error) {
        if (!property || property.length < 6 || !upload1 || !upload1.value || upload1.value.length < 6) return;
        
        const UPLOAD_ATTACH = 'gtt:upload_attach';
        const trello_url_k = 'https://api.trello.com/1/';
        const param_k = upload1.value;

        // NOTE (Ace, 2020-02-15): We have a funny problem with embedded images so breaking this up:
        // Was: const filename_k = (param_k.split('/').pop().split('#')[0].split('?')[0]) || upload1.name || param_k || 'unknown_filename'; // Removes # or ? after filename
        // Remove # or ? afer filename. Could do this as a regex, but this is a bit faster and more resiliant:
        const slash_split_k = param_k.split('/') // First split by directory slashes
        const end_slash_split_k = slash_split_k[slash_split_k.length - 1] // Take last slash section
        const hash_split_k = end_slash_split_k.split('#') // Split by hash so we can split it off
        const begin_hash_split_k = hash_split_k[0] // Take first hash
        const question_split_k = begin_hash_split_k.split('?') // Now split by question mark to remove variables
        const begin_question_split_k = question_split_k[0] // Take content ahead of question mark
        const filename_k = begin_question_split_k || upload1.name || param_k || 'unknown_filename' // Use found string or reasonable fallbacks

        let hash = {}
        hash[UPLOAD_ATTACH] = {
            'url': upload1.value,
            'filename': filename_k
        }
        
        chrome.runtime.sendMessage(hash, function() {
            window.alert('Done!');
        });

        var xhr = new XMLHttpRequest();
        xhr.open('get', param_k);
        xhr.responseType = 'blob'; // Use blob to get the mimetype
        xhr.onload = function() {
            var fileReader = new FileReader();
            fileReader.onload = function() {
                const file_k = new File([this.result], filename_k);
                gtt_log('Attaching filename:"' + filename_k + '" size:' + file_k.size)
                if (!file_k.size) {
                    msg = 'ERROR: Empty content! Filename:"' + filename_k + '"'
                    gtt_log(msg)
                    data = {
                        'status': 'size:0',
                        'statusText': msg,
                        'responseText': 'KNOWN PROBLEM WITH NEW CHROME BROWSER SECURITY [FIX IN PROGRESS]: Try creating/updating card again without attachment "' + filename_k + '"',
                        'keys': '<none>'
                    }
                    return error(data);
                }
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
        if (!upload1) {
            this.event.fire('onCardSubmitComplete');
        } else {
            let generateKeysAndValues = function(object) {
                let keysAndValues = [];
                $.each(object, function(key, value) {
                    keysAndValues.push(key + ' (' + (value || '').toString().length + ')');
                });
                return keysAndValues.sort().join(' ');
            };

            const dict_k = {'cardId': this.cardId || ''};

            let method = upload1.method || 'post';
            let property = this.parent.parent.replacer(upload1.property, dict_k);
            delete upload1.method;
            delete upload1.property;

            const fn_k = property.endsWith(this.attachments) ? this.attach : Trello.rest;

            let self = this;
            fn_k(method, property, upload1, function success(data) {
                $.extend(data, {'method': method + ' ' + property, 'keys': generateKeysAndValues(upload1)});
                self.process_response(data);
                if (self.data && self.data.length > 0) {
                    self.upload();
                } else {
                    self.parent.event.fire('onCardSubmitComplete', {data: data});
                }
            }, function failure(data) {
                $.extend(data, {'method': method + ' ' + property, 'keys': generateKeysAndValues(upload1)});
                self.parent.event.fire('onAPIFailure', {data: data});
            });
        }
    }

};

GmailToTrello.Model.prototype.submit = function() {
    let self = this;
    if (self.newCard === null) {
        gtt_log('submit: data is empty');
        return false;
    }

    self.parent.saveSettings();

    var data = self.newCard;
    
    var text = data.title || '';
    if (text.length > 0) {
        if (data.markdown) {
            text = '**' + text + '**\n\n';
        }
    }
    text += data.description;

    text = self.parent.truncate(text, self.parent.popupView.MAX_BODY_SIZE, '...');

    var desc = self.parent.truncate(data.description, self.parent.popupView.MAX_BODY_SIZE, '...');

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
        due_text = (new Date(due)).toISOString();
        /* (NOTE (Ace, 27-Feb-2017): When we used datetime-local object, this was:
        trelloPostableData.due = (new Date(data.dueDate.replace('T', ' ').replace('-','/'))).toISOString();
        */
    }

    let uploader = new this.Uploader({
        'parent': self, 
        'cardId': data.cardId,
        'position': data.position,
        'cardPos': data.cardPos
    });

    const pos_k = uploader.pos;

    if (pos_k === 'at') {
        uploader.add({'property': 'actions/comments', 'text': text});
    } else {
        uploader
            .add({'property': 'pos', 'value': pos_k})
            .add({'property': 'name', 'value': data.title})
            .add({'property': 'desc', 'value': desc})
            .add({'property': 'idList', 'value': data.listId});
    }

    uploader
        .add({'property': 'idMembers', 'value': uploader.exclude(data.membersId, data.cardMembers)})
        .add({'property': 'idLabels', 'value': uploader.exclude(data.labelsId, data.cardLabels)})
        .add({'property': 'due', 'value': due_text, 'method': 'put'})

    let imagesAndAttachments = (data.images || []).concat(data.attachments || []);

    $.each(imagesAndAttachments, function(iter, item) {
        if (item.hasOwnProperty('checked') && item.checked && item.url && item.url.length > 5) {
            uploader.add({'property': uploader.attachments, 'value': item.url, 'name': item.name});
        }
    });

  uploader.upload();
};

// End, model.js