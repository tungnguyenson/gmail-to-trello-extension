var GmailToTrello = GmailToTrello || {};

GmailToTrello.PopupView = function(parent) {

    this.parent = parent;
    this.event = new EventTarget();
    this.isInitialized = false;

    this.data = {settings:{}};
    
    this.size_k = {
        'width': {
            'min': 450,
            'max': 1400
        },
        'height': {
            'min': 530,
            'max': 1400
        },
        'text': {
            'min': 111
        }
    };

    // process
    this.waitingHiddenThread = false;
    this.waitingHiddenThreadProcId = null;
    
    // html pieces
    this.html = {};

    this.MAX_BODY_SIZE = 16384;

    this.position = {
        'bottom': parent.decodeEntities('&rarrb;'),
        'top': parent.decodeEntities('&larrb;')
    };
};

GmailToTrello.PopupView.prototype.init = function() {
    log('GTT::view::initializing...');
    var self = this;

    //check if already init
    if (this.detectPopup()) 
        return true;

    // inject a button & a popup

    if (this.html && this.html['add_to_trello'] && this.html['add_to_trello'].length > 1) {
       log('add_to_trello_html already exists');
    } else {
        var img = 'GtT';
        
        if ($('div.asl.T-I-J3.J-J5-Ji', this.$toolBar).length > 0) {
            img = '<img class="f tk3N6e-I-J3" height="13" width="13" src="'
              + chrome.extension.getURL('images/icon-13.jpg')
              + '" />';
        }

        this.html['add_to_trello'] =
            '<div id="gttButton" class="T-I J-J5-Ji ar7 nf T-I-ax7 L3"'
              + 'data-tooltip="Add this Gmail to Trello">'
              + '<div aria-haspopup="true" role="button" class="J-J5-Ji W6eDmd L3 J-J5-Ji Bq L3" tabindex="0">'
              + img
              + '<div class="G-asx T-I-J3 J-J5-Ji">&nbsp;</div></div></div>';
    }
    this.$toolBar.append(this.html['add_to_trello']);

    if (this.html && this.html['popup'] && this.html['popup'].length > 1) {
        this.$toolBar.append(this.html['popup']);
        this.parent.loadSettings(this);
    } else {
        $.get(chrome.extension.getURL('views/popupView.html'), function(data) {
            data = self.parent.replacer(data, {'jquery-ui-css': chrome.extension.getURL('lib/jquery-ui-1.12.1.min.css')});
            self.html['popup'] = data;
            self.$toolBar.append(data);
            self.parent.loadSettings(self);
        });
    }
};

/** 
 * Set the initial width by measuring from the left corner of the
 * "Add card" button to the edge of the window and then center that under the "Add card" button:
 */
GmailToTrello.PopupView.prototype.centerPopup = function(useWidth) {
    var addCardLeft = this.$gttButton.position().left;
    var addCardCenter = addCardLeft + (this.$gttButton.outerWidth() / 2);
    
    var parent = this.$gttButton.offsetParent();
    var parentRight = parent.position().left + parent.width();

    // We'll make our popup 1.25x as wide as the button to the end of the window up to max width:
    var newPopupWidth = this.size_k.width.min;
    if (useWidth && useWidth > 0) {
        newPopupWidth = useWidth; // May snap to min if necessary
        addCardCenter = this.$popup.position().left;
        addCardCenter += this.$popup.width() / 2;
    } else if (this.data && this.data.settings && this.data.settings.popupWidth && this.data.settings.popupWidth.length > 0) {
        newPopupWidth = parseFloat(this.data.settings.popupWidth, 10 /* base 10 */);
    } else {
        newPopupWidth = 1.25*(parentRight - addCardLeft); // Make popup 1.25x as wide as the button to the end of the window up to max width
    }

    if (newPopupWidth < this.size_k.width.min) {
        newPopupWidth = this.size_k.width.min;
    } else if (newPopupWidth > this.size_k.width.max) {
        newPopupWidth = this.size_k.width.max;
    }
    
    this.$popup.css('width', newPopupWidth + 'px');

    var newPopupLeft = addCardCenter - (newPopupWidth / 2);

    this.$popup.css('left', newPopupLeft + 'px')

    this.onResize();
};

GmailToTrello.PopupView.prototype.init_popup = function() {
    this.$gttButton = $('#gttButton', this.$toolBar);
    this.$popup = $('#gttPopup', this.$toolBar);

    this.$popupMessage = $('.popupMsg', this.$popup);
    this.$popupContent = $('.content', this.$popup);
    
    this.centerPopup();

    this.bindEvents();

    this.isInitialized = true;
};

GmailToTrello.PopupView.prototype.detectPopup = function() {
    //detect duplicate toolBar
    var $button = $('#gttButton');
    var $popup = $('#gttPopup');
    if ($button.length>0) {
        log('GTT::Found Button at:');log($button);
        if ($button[0].clientWidth <= 0) {
            log('GTT::Button is in an inactive region. Moving...');
            //relocate
            $button.appendTo(this.$toolBar);
            $popup.appendTo(this.$toolBar);

        }
            // update when visible
        if ($popup[0].clientWidth > 0) {
            //log($popup[0]);
            //log($popup[0].clientWidth);
            this.event.fire('onRequestUpdateGmailData');
        }
        return true;
    }
    else
        return false;

    //return $('#gttPopup').length>0;
};

// NOTE (Ace, 15-Jan-2017): This resizes all the text areas to match the width of the popup:
GmailToTrello.PopupView.prototype.onResize = function() {
    var origWidth = this.$popup.width();
    var textWidth = origWidth - this.size_k.text.min;
    $('input[type=text],textarea,#gttAttachments,#gttImages,#gttLabels,#gttMembers', this.$popup).css('width', textWidth + 'px');
    this.validateData(); // Assures size is saved
};

GmailToTrello.PopupView.prototype.bindEvents = function() {
    // bind events
    var self = this;

    /** Popup's behavior **/

    this.$popup.draggable();

    //slider (blue bar on left side of dialog to resize)
    var $slider = $("#gttPopupSlider", this.$popup);
    var constraintRight = $(window).width() - this.size_k.width.min;

    $slider.draggable({axis: "x", containment: [0, 0, constraintRight, 0],
        stop: function(event, ui) {
            var distance = ui.position.left - ui.originalPosition.left;
            var newWidth = self.$popup.width()-distance;
            // self.$popup.css('width', newWidth + 'px');
            $slider.css('left', '0');
            self.centerPopup(newWidth);
        }
    });

    // TODO (Ace, 16-Jan-2017): jQueryUI has a more elegant right-lower-corner resize experience, this is the start:
    this.$popupContent.resizable({
        minHeight: self.size_k.height.min,
        minWidth: self.size_k.width.min,
        maxHeight: self.size_k.height.max,
        maxWidth: self.size_k.width.max
/*        stop: function(event, ui) {
            var constraintRight = $(window).width() - self.size_k.width.min;
            var distance = ui.position.left - ui.originalPosition.left;
            var newWidth = self.$popup.width()-distance;
            // self.$popup.css('width', newWidth + 'px');
            $slider.css('left', '0');
            self.centerPopup(newWidth);
        }
*/
    });
    //

    $('#close-button', this.$popup).click(function() {
        self.$popup.hide();
    });

    $('#gttPosition', this.$popup).click(function() {
        var pos = $(this).prop('value');
        if (pos == 'top') {
            pos = 'bottom';
        } else {
            pos = 'top';
        }

        $(this)
            .prop('title', 'Add to ' + pos)
            .prop('value', pos)
            .text(self.position[pos]);

        self.validateData();
    });



    /** Add Card Panel's behavior **/

    this.$gttButton.click(function() {
        self.$popup.toggle();
        if (self.$popup.css('display') === 'block')
            self.event.fire('onPopupVisible');
        else {
            self.stopWaitingHiddenThread();
        }
    }).hover(function() { // This is a google class that on hover highlights the button and arrow, darkens the background:
        $(this).addClass('T-I-JW');
    }, function() {
        $(this).removeClass('T-I-JW');
    });

    $('#gttOrg', this.$popup).change(function() {
        //log(boardId);
        self.updateBoards();
    });

    var $board = $('#gttBoard', this.$popup);
    $board.change(function() {
        var boardId = $board.val();

        var $list = $('#gttList', self.$popup);
        var $labels = $('#gttLabels', self.$popup);
        var $members = $('#gttMembers', self.$popup);
        var $labelsMsg = $('#gttLabelsMsg', self.$popup);
        var $membersMsg = $('#gttMembersMsg', self.$popup);

        if (boardId === '_') {
            $board.val('');
        }

        if (boardId === "_" || boardId === "" || boardId !== self.data.settings.boardId) {
            $membersMsg.text('...please pick a board...').show();
            $labelsMsg.text('...please pick a board...').show();
            $members.html('').hide(); // clear it out
            $labels.html('').hide(); // clear it out
            $list.html($('<option value="">...please pick a board...</option>')).val('');
            self.data.settings.labelsId = '';
            self.data.settings.listId = '';
            self.data.settings.membersId = '';
        } else {
            $labelsMsg.text('Loading...').show();
            $membersMsg.text('Loading...').show();
        }

        self.event.fire('onBoardChanged', {boardId: boardId});

        self.validateData();
    });

    $('#gttList', this.$popup).change(function() {
        self.validateData();
    });

    var update_body = function() {
        var useBackLink = $('#chkBackLink', self.$popup).is(':checked');
        var markdown = $('#chkMarkdown', self.$popup).is(':checked');
        var $gttDesc = $('#gttDesc', self.$popup);

        var body_raw = $gttDesc.attr('gmail-body-raw');
        var body_md = $gttDesc.attr('gmail-body-md');
        var link_raw = $gttDesc.attr('gmail-link-raw');
        var link_md = $gttDesc.attr('gmail-link-md');
        
        var body = markdown ? body_md : body_raw;
        var link = useBackLink ? (markdown ? link_md : link_raw) : '';

        var desc = self.parent.truncate(body, self.MAX_BODY_SIZE - link.length, '...');

        $gttDesc.val(desc + link);
        $gttDesc.change();        
    };

    $('#chkBackLink', this.$popup).change(function() {
        update_body();
    });

    $('#chkMarkdown', this.$popup).change(function() {
        update_body();
    });

    $('#addToTrello', this.$popup).click(function() {
        if (self.validateData()) {
            //$('#addToTrello', this.$popup).attr('disabled', 'disabled');
            self.$popupContent.hide();
            self.showMessage(self, 'Submiting to Trello...');
            self.event.fire('onSubmit');
        }
    });


    //this.bindEventHiddenEmails();

};

GmailToTrello.PopupView.prototype.bindData = function(data) {
    var self = this;

    if (!data) {
        log('bindData missing data!');
        return;
    }

    // Need to keep this from getting blown over if it exists:
    var settings = this.data && this.data.settings && this.data.settings.boardId ? this.data.settings : '';
    this.data = data;
    
    if (data && data.settings && data.settings.boardId) {
        // leave settings that came in, they look valid
    } else if (settings) {
        this.data.settings = settings;
    }
    
    this.$popupMessage.hide();
    this.$popupContent.show();

    //bind trello data
    var me = data.trello.user; // First member is always this user
    var avatarSrc = self.parent.model.makeAvatarUrl(me.avatarHash);
    var avatarText = '';

    if (!avatarSrc) {
        var initials = '?';
        if (me.initials && me.initials.length > 0) {
            initials = me.initials;
        } else if (me.fullName && me.fullName.length > 1) {
            var matched = me.fullName.match(/^(\w).*?[\s\\W]+(\w)\w*$/);
            if (matched && matched.length > 1) {
                initials = matched[1] + matched[2]; // 0 is whole string            
            }
        } else if (me.username && me.username.length > 0) {
            initials = me.username.slice(0,1);
        }

        avatarText = initials.toUpperCase();
    }

    // NOTE (Ace, 6-Feb-2017): Assigning .userInfo to a variable and then updating it doesn't work right, so refer explicitly to item:
    $('#gttAvatarURL', this.$popup).attr('href', me.url);
    $('#gttAvatarText', this.$popup).text(avatarText);
    $('#gttAvatarImg', this.$popup).attr('src', avatarSrc);
    $('#gttUsername', this.$popup).attr('href', me.url).text(me.username || '?');

    $('#gttSignOutButton', this.$popup).click(function() {
        $.get(chrome.extension.getURL('views/signOut.html'), function(data) {
            self.showMessage(self, data);
            self.event.fire('onRequestDeauthorizeTrello');
        })
    });
    
    var orgs = data.trello.orgs;
    var $org = $('#gttOrg', this.$popup);
    $org.append($('<option value="all">All</option>'));
    for (var i = 0; i < orgs.length; i++) {
        var item = orgs[i];
        $org.append($('<option>').attr('value', item.id).append(item.displayName));
    }
    $org.val('all');
/* NOTE (Ace, 15-Jan-2017): This sets Org to 'All' and lists all boards for all orgs. Uncomment if you want org selection:
    if (this.data.settings.orgId) {
        var settingId = this.data.settings.orgId;
        for (var i = 0; i < data.trello.orgs.length; i++) {
            var item = data.trello.orgs[i];
            if (item.id == settingId) {
                $org.val(settingId);
                break;
            }
        }
    }
*/
    this.updateBoards();
    
    if (data.settings.hasOwnProperty('useBackLink')) {
        $('#chkBackLink', this.$popup).prop('checked', data.settings.useBackLink);
    }

    if (data.settings.hasOwnProperty('markdown')) {
        $('#chkMarkdown', this.$popup).prop('checked', data.settings.markdown);
    }

    if (data.settings.hasOwnProperty('position')) {
        var pos = data.settings.position || 'bottom';
        $('#gttPosition', this.$popup)
            .prop('title', 'Add to ' + pos)
            .prop('value', pos)
            .text(this.position[pos]);
    }
};
    
GmailToTrello.PopupView.prototype.bindGmailData = function(data) {
    var self = this;
    //auto bind gmail data
    var markdown = $('#chkMarkdown', this.$popup).is(':checked');
    var useBackLink = $('#chkBackLink', this.$popup).is(':checked');

    $('#gttTitle', this.$popup).val(data.subject);

    var body = markdown ? data.body_md : data.body_raw;
    var link = useBackLink ? (markdown ? data.link_md : data.link_raw) : '';
    var desc = self.parent.truncate(body, self.MAX_BODY_SIZE - link.length, '...');

    $('#gttDesc', this.$popup)
        .val(desc + link)
        .attr('gmail-body-raw', data.body_raw)
        .attr('gmail-body-md', data.body_md)
        .attr('gmail-link-raw', data.link_raw)
        .attr('gmail-link-md', data.link_md);
    
    var mime_html = function(tag, isImage) {
        var html = '';
        var img = '';
        const domTag_k = '#gtt' + tag[0].toUpperCase() + tag.substring(1);
        var $domTag = $(domTag_k, self.$popup);
        
        if (isImage && isImage === true) {
            img = '<img src="%url%" alt="%name%" height="32" width="32" /> '; // See style.css for #gttImage img style
        }

        $.each(data[tag], function(iter, item) {
            var dict = {
              'url': item.url,
              'name': item.name,
              'mimeType': item.mimeType
            };

            html += self.parent.replacer (
              '<label><input type="checkbox" mimeType="%mimeType%" name="%name%" url="%url%" /> ' + img + '%name%</label><br />\n', /* checked="checked" */
              dict
            );
        });

        $domTag.html(html);

        if (isImage && isImage === true) {
            $('img', $domTag).on('error', function() {
                $(this).attr('src', chrome.extension.getURL('images/doc-question-mark-512.png'));
            });
        }
    };

    mime_html('attachments');
    mime_html('images', true /* isImage */);

    this.dataDirty = false;

};

GmailToTrello.PopupView.prototype.showMessage = function(self, text) {
    this.$popupMessage.html(text);
    // Attach hideMessage function to hideMsg class if in text:
    $('.hideMsg', this.$popupMessage).click(function() {
        self.hideMessage();
    });
    this.$popupMessage.show();
};

GmailToTrello.PopupView.prototype.hideMessage = function() {
     if (this.$popupContent.is(':hidden')) { // Rest of box is hidden so close it all:
        this.$popup.hide(); // Parent is popup, so hide the whole thing
    } else {
        this.$popupMessage.hide();
   }
};

GmailToTrello.PopupView.prototype.clearBoard = function() {
    var $gtt = $('#gttBoard', this.$popup);
    $gtt.html(''); // Clear it.

    $gtt.append($('<option value="">Select a board....</option>'));
    
    $gtt.change();
};

GmailToTrello.PopupView.prototype.updateBoards = function() {
    var $org = $('#gttOrg', this.$popup);
    var orgId = $org.val();

    var orgs = this.data.trello.orgs;
    var filteredOrgs = [];

    if (orgId === 'all')
        filteredOrgs = orgs;
    else {
        for (var i = 0; i < orgs.length; i++) {
            if (orgs[i].id == orgId)
                filteredOrgs.push(orgs[i]);
        }
    }

    var boards = this.data.trello.boards;
    var newBoards = {};

    for (var i = 0; i < filteredOrgs.length; i++) {
        var orgItem = filteredOrgs[i];
        // This is unnessessary because a "please select" option is already shown above
        // if (i > 0 && filteredOrgs.length > 1)
        //     $board.append($('<option value="_">-----</option>'));
        for (var j = 0; j < boards.length; j++) {
            if (boards[j].idOrganization == orgItem.id) {
                var item = boards[j];
                var display = orgItem.displayName + ' &raquo; ' + item.name;
                newBoards[display.toLowerCase()] = {'id': item.id, 'display': display}; // For sorting later
            }
        }
    }

    var settings = this.data.settings;
    var settingId = 0;
    if (settings.orgId && settings.orgId == orgId && settings.boardId) {
        settingId = settings.boardId;
    }

    var $gtt = $('#gttBoard', this.$popup);
    $gtt.html(''); // Clear it.

    $gtt.append($('<option value="">Select a board....</option>'));
    
    $.each(Object.keys(newBoards).sort(), function(iter, item) {
        var id = newBoards[item].id;
        var display = newBoards[item].display;
        var selected = (id == settingId);
        $gtt.append($('<option>').attr('value', id).prop('selected', selected).append(display));
    });

    $gtt.change();
};

GmailToTrello.PopupView.prototype.updateLists = function() {
    var lists = this.data.trello.lists;
    
    var settings = this.data.settings;
    var orgId = $('#gttOrg', this.$popup).val();
    var boardId = $('#gttBoard', this.$popup).val();
    var settingId = (lists[0] ? lists[0].id : '0'); // Default to first item
    if (settings.orgId && settings.orgId == orgId && settings.boardId && settings.boardId == boardId && settings.listId) {
        settingId = settings.listId;
    }

    var $gtt = $('#gttList', this.$popup);
    $gtt.html('');

    $.each(lists, function(iter, item) {
        var id = item.id;
        var display = item.name;
        var selected = (id == settingId);
        $gtt.append($('<option>').attr('value', id).prop('selected', selected).append(display));
    });

    $gtt.change();
};

GmailToTrello.PopupView.prototype.updateLabels = function() {
    var self = this;
    var labels = this.data.trello.labels;
    var $gtt = $('#gttLabels', this.$popup);
    $gtt.html(''); // Clear out

    for (var i = 0; i < labels.length; i++) {
        var item = labels[i];
        if (item.name && item.name.length > 0) {
            var $color = $("<div id='gtt_temp'>").css('color', item.color);
            var bkColor = self.parent.luminance($color.css('color')); // If you'd like to determine whether to make the background light or dark
            $gtt.append($('<li>')
                .attr('trelloId-label', item.id)
                .css('border-color', item.color)
                .css('background-color', bkColor)
                .append(item.name)
            )
        }
    }
    
    $('#gttLabelsMsg', this.$popup).hide();

    var control = new MenuControl({'selectors': '#gttLabels li', 'nonexclusive': true});
    control.event.addListener('onMenuClick', function(e, params) {
        self.validateData();
    });

    var settings = this.data.settings;
    var orgId = $('#gttOrg', this.$popup).val();
    var boardId = $('#gttBoard', this.$popup).val();
    if (settings.orgId && settings.orgId == orgId && settings.boardId && settings.boardId == boardId && settings.labelsId) {
        var settingId = settings.labelsId;
        for (var i = 0; i < labels.length; i++) {
            var item = labels[i];
            // var settingId = settings.labelsId[item.id] || '0';
            if (settingId.indexOf(item.id) !== -1) {
                $('#gttLabels li[trelloId-label="' + item.id + '"]').click();
            }
        }
    } else {
        settings.labelsId = ''; // Labels do not have to be set, so no default.
    }

    $gtt.show();
};

GmailToTrello.PopupView.prototype.updateMembers = function() {
    var self = this;
    var members = this.data.trello.members;
    var $gtt = $('#gttMembers', this.$popup);
    $gtt.html(''); // Clear out

    for (var i = 0; i < members.length; i++) {
        var item = members[i];
        if (item && item.id) {
            var txt = item.initials || item.username || '?';
            var avatar = self.parent.model.makeAvatarUrl(item.avatarHash || '');
            const size_k = 20;
            $gtt.append($('<li>')
                .attr('trelloId-member', item.id)
                .attr('title', item.fullName + ' @' + item.username || '?')
                .append($('<img>')
                    .attr('src', avatar)
                    .attr('width', size_k)
                    .attr('height', size_k)
                ).append(' ' + txt)
            )
        }
    }
    
    $('#gttMembersMsg', this.$popup).hide();

    var control = new MenuControl({'selectors': '#gttMembers li', 'nonexclusive': true});
    control.event.addListener('onMenuClick', function(e, params) {
        self.validateData();
    });

    var settings = this.data.settings;
    var orgId = $('#gttOrg', this.$popup).val();
    var boardId = $('#gttBoard', this.$popup).val();
    if (settings.orgId && settings.orgId == orgId && settings.boardId && settings.boardId == boardId && settings.membersId) {
        var settingId = settings.membersId;
        for (var i = 0; i < members.length; i++) {
            var item = members[i];
            if (settingId.indexOf(item.id) !== -1) {
                $('#gttMembers li[trelloId-member="' + item.id + '"]').click();
            }
        }
    } else {
        settings.membersId = ''; // Members do not have to be set, so no default.
    }

    $gtt.show();
};

GmailToTrello.PopupView.prototype.stopWaitingHiddenThread = function() {
    if (this.waitingHiddenThreadProcId !== null) {
        this.waitingHiddenThread = false;
        this.waitingHiddenThreadRetries = 0;
        clearInterval(this.waitingHiddenThreadProcId);
    }
};

GmailToTrello.PopupView.prototype.bindEventHiddenEmails = function() {
    var self = this;
    // update gmail thread on click
    $('#gttTitle', this.$popup).change(function() {
        self.dataDirty = true;
    });
    $('#gttDesc', this.$popup).change(function() {
        self.dataDirty = true;
    });

    log('debug hidden threads');
    this.$expandedEmails.parent().find('> .kx,> .kv,> .kQ,> .h7').click(function() {
        if (self.$popup.css('display') === 'none')
            return;

        log('Hidden email thread clicked');
        log(this.classList);
        if (self.dataDirty)
            return;

        if (this.classList.contains('kx') || this.classList.contains('kQ'))
            return;
        else
            self.parseData();

        self.waitingHiddenThreadRetries = 10;
        self.waitingHiddenThreadElement = this;

        if (!self.waitingHiddenThread) {
            //loading, give it a change 
            self.waitingHiddenThread = true;
            self.waitingHiddenThreadProcId = setInterval(function() {
                log('waitingHiddenThread. round ' + self.waitingHiddenThreadRetries);
                var elm = self.waitingHiddenThreadElement;
                if (elm.classList.contains('h7') || elm.classList.contains('kv')) {
                    self.stopWaitingHiddenThread();
                    self.parseData();
                }
                if (self.waitingHiddenThreadRetries > 0)
                    self.waitingHiddenThreadRetries--;
                else
                    self.stopWaitingHiddenThread();
            }, 1000);
        }
    });
    $(this.selectors.hiddenEmails).click(function() {
        log(this.classList);
        if (!self.dataDirty)
            self.parseData();
    });
};

GmailToTrello.PopupView.prototype.validateData = function() {
    var self = this;
    var newCard = {};
    var orgId = $('#gttOrg', this.$popup).val();
    var boardId = $('#gttBoard', this.$popup).val();
    var listId = $('#gttList', this.$popup).val();
    var due_Date = $('#gttDue_Date', this.$popup).val();
    var due_Time = $('#gttDue_Time', this.$popup).val();
    var title = $('#gttTitle', this.$popup).val();
    var description = $('#gttDesc', this.$popup).val();
    var useBackLink = $('#chkBackLink', this.$popup).is(':checked');
    var markdown = $('#chkMarkdown', this.$popup).is(':checked');
    var position = $('#gttPosition', this.$popup).prop('value');
    var timeStamp = $('.gH .gK .g3:first', this.$visibleMail).attr('title');
    var popupWidth = this.$popup.css('width');
    var labelsId = $('#gttLabels li.active', this.$popup).map(function(iter, item) {
            var val = $(item).attr('trelloId-label');
            return val;
        }).get().join();
    var labelsCount = $('#gttLabels li', this.$popup).length;

    if (!labelsCount && labelsId.length < 1 && this.data && this.data.settings && this.data.settings.labelsId) {
        labelsId = this.data.settings.labelsId; // We're not yet showing labels so override labelsId with settings
    }

    var membersId = $('#gttMembers li.active', this.$popup).map(function(iter, item) {
            var val = $(item).attr('trelloId-member');
            return val;
        }).get().join();
    var membersCount = $('#gttMembers li', this.$popup).length;

    if (!membersCount && membersId.length < 1 && this.data && this.data.settings && this.data.settings.labelsId) {
        membersId = this.data.settings.membersId; // We're not yet showing labels so override labelsId with settings
    }

    var mime_array = function (tag) {
        var $jTag = $('#' + tag + ' input[type="checkbox"]', self.$popup);
        var array = [];

        $.each($jTag, function() {
            array.push({
                'url': $(this).attr('url'),
                'name': $(this).attr('name'),
                'mimeType': $(this).attr('mimeType'),
                'checked': $(this).is(':checked')
            });
        });

        return array;
    };

    var attachments = mime_array('gttAttachments');
    var images = mime_array('gttImages');
    
    var validateStatus = (boardId && listId && title); // Labels are not required
    log('validateData: ' + boardId + ' - ' + listId + ' - ' + title);

    if (validateStatus) {
        newCard = {
            orgId: orgId,
            boardId: boardId,
            listId: listId,
            labelsId: labelsId,
            membersId: membersId,
            due_Date: due_Date,
            due_Time: due_Time,
            title: title,
            description: description,
            attachments: attachments,
            images: images,
            useBackLink: useBackLink,
            markdown: markdown,
            popupWidth: popupWidth,
            position: position,
            timeStamp: timeStamp
        };
        this.data.newCard = newCard;
        $.extend(this.data.settings, newCard);
        this.parent.saveSettings();
    }
    $('#addToTrello', this.$popup).attr('disabled', !validateStatus);

    return validateStatus;
};

GmailToTrello.PopupView.prototype.reset = function() {
    this.$popupMessage.hide();
    this.$popupContent.show();
};

GmailToTrello.PopupView.prototype.displaySubmitCompleteForm = function() {
    var self = this;
    var data = this.data.newCard;
    log(this.data);

    // NB: this is a terrible hack. The existing showMessage displays HTML by directly substituting text strings.
    // This is very dangerous (very succeptible to XSS attacks) and generally bad practice.  It should be either 
    // switched to a templating system, or changed to use jQuery. For now, I've used this to fix
    // vulnerabilities without having to completely rewrite the substitution part of this code.
    // TODO(vijayp): clean this up in the future
    var jQueryToRawHtml = function(jQueryObject) {
        return jQueryObject.prop('outerHTML');
    }
    this.showMessage(self, '<a class="hideMsg" title="Dismiss message">&times;</a>Trello card created: ' + 
        jQueryToRawHtml($('<a>')
            .attr('href', data.url)
            .attr('target', '_blank')
            .append(data.title))
        );
    this.$popupContent.hide();
};

GmailToTrello.PopupView.prototype.displayAPIFailedForm = function(response) {
    var self = this;
    
    var resp = {};
    if (response && response.data) {
        resp = response.data;
    }

    if (this.data && this.data.newCard) {
        resp.title = this.data.newCard.title; // Put a temp copy of this over where we'll get the other data
    }

    var dict = {
        'title': resp.title || '?',
        'status': resp.status || '?',
        'statusText': resp.statusText || '?',
        'responseText': resp.responseText || '?'
    };

    $.get(chrome.extension.getURL('views/error.html'), function(data) {
        self.showMessage(self, self.parent.replacer(data, dict));
        self.$popupContent.hide();
        if (resp.status && resp.status === '401') { // Invalid token, so deauthorize Trello
            self.event.fire('onRequestDeauthorizeTrello');
        }
    });
};

// End, popupView.js