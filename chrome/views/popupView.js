var GmailToTrello = GmailToTrello || {};

GmailToTrello.PopupView = function(parent) {

    this.parent = parent;
    this.event = new EventTarget();
    this.isInitialized = false;

    this.data = {settings:{}};
    
    this.width_k = {
        'min': 450,
        'max': 1400
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

    if (this.html && this.html['add_card'] && this.html['add_card'].length > 1) {
	// intentionally blank
    } else {
		this.html['add_card'] =
			'<div id="gttButton" class="T-I J-J5-Ji ar7 nf T-I-ax7 L3"'
			  + 'data-tooltip="Add this email as a Trello card">'
			  + '<div aria-haspopup="true" role="button" class="J-J5-Ji W6eDmd L3 J-J5-Ji Bq L3" tabindex="0">'
			  + '<img class="f tk3N6e-I-J3" src="'
			  + chrome.extension.getURL('images/icon-13.jpg')
			  + '"><span class="button-text">Add card</span></div></div>';
    }
    this.$toolBar.append(this.html['add_card']); // + strPopupHtml);

    if (this.html && this.html['popup'] && this.html['popup'].length > 1) {
		this.$toolBar.append(this.html['popup']);
        this.parent.loadSettings(this);
		// this.init_popup();
	} else {
		$.get(chrome.extension.getURL('views/popupView.html'), function(data){
			self.html['popup'] = data;
			self.$toolBar.append(data);
			self.parent.loadSettings(self);
            // self.init_popup();
    	});
	}
};

GmailToTrello.PopupView.prototype.init_popup = function() {
    this.$addCardButton = $('#gttButton', this.$toolBar);
    this.$popup = $('#gttPopup', this.$toolBar);

    /* TODO (Ace, 16-Jan-2017): jQueryUI has a more elegant lower-corner resize experience, this is the start:
    this.$popup.resizable({
        maxHeight: self.width_k.max,
        maxWidth: self.width_k.max,
        minHeight: 150,
        minWidth: self.width_k.min,
        stop: function(event, ui) {
            var constraintRight = $(window).width() - self.width_k.min;
            var distance = ui.position.left - ui.originalPosition.left;
            self.$popup.css('width', self.$popup.width()-distance+'px');
            $slider.css('left', '0');
            //self.$popup.css('left', (self.$popup.position().left + distance) + 'px');
            //$slider.css('left', ui.originalPosition.left + 'px');
            self.onResize();
        }
    });
    */
    this.$popup.draggable();
    
    this.$popupMessage = $('.popupMsg', this.$popup);
    this.$popupContent = $('.content', this.$popup);
    
    // NOTE (Ace, 15-Jan-2017): TURN THIS INTO CALLABLE CENTERING ROUTINE?
    // Set the initial width by measuring from the left corner of the
    // "Add card" button to the edge of the window and then center that under the "Add card" button:
    var addCardLeft = this.$addCardButton.position().left;
    var addCardCenter = addCardLeft + (this.$addCardButton.outerWidth() / 2);
    
    var parent = this.$addCardButton.offsetParent();
    var parentRight = parent.position().left + parent.width();

    // We'll make our popup 1.25x as wide as the button to the end of the window up to max width:
    var newPopupWidth = 1.25*(parentRight - addCardLeft);
    if (this.data && this.data.settings && this.data.settings.popupWidth && this.data.settings.popupWidth.length > 0) {
        newPopupWidth = parseFloat(this.data.settings.popupWidth, 10 /* base 10 */);
    }
    if (newPopupWidth < this.width_k.min) {
        newPopupWidth = this.width_k.min;
    } else if (newPopupWidth > this.width_k.max) {
        newPopupWidth = this.width_k.max;
    }
    
    this.$popup.css('width', newPopupWidth + 'px');

    var newPopupLeft = addCardCenter - (newPopupWidth / 2);

    this.$popup.css('left', newPopupLeft + 'px')

    this.onResize();

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
    var textWidth = origWidth - 111;
    $('input[type=text],textarea,#gttAttachments', this.$popup).css('width', textWidth + 'px');
    this.validateData(); // Assures size is saved
};

GmailToTrello.PopupView.prototype.bindEvents = function() {
    // bind events
    var self = this;

    /** Popup's behavior **/

    //slider (blue bar on left side of dialog to resize)
    var $slider = $("#gttPopupSlider", this.$popup);
    var constraintRight = $(window).width() - this.width_k.min;

    $slider.draggable({axis: "x", containment: [0, 0, constraintRight, 0],
        stop: function(event, ui) {
            var distance = ui.position.left - ui.originalPosition.left;
            self.$popup.css('width', self.$popup.width()-distance+'px');
            $slider.css('left', '0');
            // TODO (Ace, 29-Jan-2017): Re-center after resizing
            self.onResize();
        }
    });

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

    this.$addCardButton.click(function() {
        self.$popup.toggle();
        if (self.$popup.css('display') === 'block')
            self.event.fire('onPopupVisible');
        else {
            self.stopWaitingHiddenThread();
        }
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
        var $labelsMsg = $('#gttLabelsMsg', self.$popup);

        $labels.html('').hide();

        if (boardId === '_') {
            $board.val("");
        }

        if (boardId === "_" || boardId === "") {
            $labelsMsg.text('...please pick a board...').show();
            $list.html($('<option value="">...please pick a board...</option>')).val("");
        } else {
            $labelsMsg.text('Loading...').show();
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

    $('#addTrelloCard', this.$popup).click(function() {
        if (self.validateData()) {
            //$('#addTrelloCard', this.$popup).attr('disabled', 'disabled');
            self.$popupContent.hide();
            self.showMessage(self, 'Submiting new card...');
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
    var user = data.trello.user;
    var $userAvatar = '';
    var userAvatarSrc = user.avatarUrl || '';
    var userAvatarText = '';
    if (userAvatarSrc.length < 1 && user.username && user.username.length > 1) {
        user.username.substr(0, 1).toUpperCase();
    }

    if (user.avatarUrl) {
        $userAvatar = $('<img class="member-avatar">').attr('src', user.avatarUrl);
    }
    else {
        var initials = user.username && user.username.length > 0 ? user.username.slice(0,1) : '?';
        if (user.fullName && user.fullName.length > 1) {
            var matched = user.fullName.match(/^(\w).*?[\s\\W]+(\w)\w*$/);
            if (matched && matched.length > 1) {
                initials = matched[1] + matched[2]; // 0 is whole string            
            }
        }
        $userAvatar = $('<span class="member-avatar">').text(initials.toUpperCase());

    }

    // NOTE (Ace, 6-Feb-2017): Assigning .userInfo to a variable and then updating it doesn't work right, so refer explicitly to item:
    $('#gttAvatarURL', this.$popup).attr('href', user.url);
    $('#gttAvatarText', this.$popup).text(userAvatarText);
    $('#gttAvatarImg', this.$popup).attr('src', userAvatarSrc);
    $('#gttUsername', this.$popup).attr('href', user.url).text(user.username || '?');

    $('#gttSignOutButton', this.$popup).click(function() {self.showMessage(self,
            '<a class="hideMsg" title="Dismiss message">&times;</a>Unimplemented. Try the following:<ol><li>Under menu "Chrome":</li>'
            + '<li>Select "Clear Browsing Data..."</li>'
            + '<li>Check "Clear data from hosted apps"</li>'
            + '<li>Press button "Clear browsing data"</li></ol>'
        );
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

    if (data.settings.hasOwnProperty('selfAssign')) {
        $('#chkSelfAssign', this.$popup).prop('checked', data.settings.selfAssign);
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
    
    var attachments = '';
    $.each(data.attachments, function(iter, item) {
        var dict = {
          'url': item.url,
          'name': item.name,
          'mimeType': item.mimeType
        };
        attachments += self.parent.replacer (
          '<label><input type="checkbox" mimeType="%mimeType%" name="%name%" url="%url%" /> %name%</label><br />\n', /* checked="checked" */
          dict);
    });
    
    $('#gttAttachments', this.$popup).html(attachments);
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
        // This is unnessessary because a "please select" option is already existed above
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
    } else {
        log('Board missing data!');
    }

    var $board = $('#gttBoard', this.$popup);
    $board.html(""); // Clear it.

    $board.append($('<option value="">Select a board....</option>'));
    
    $.each(Object.keys(newBoards).sort(), function(iter, item) {
        var id = newBoards[item].id;
        var display = newBoards[item].display;
        var selected = (id == settingId);
        $board.append($('<option>').attr('value', id).prop('selected', selected).append(display));
    });

    $board.change();
};

GmailToTrello.PopupView.prototype.updateLists = function() {
    var lists = this.data.trello.lists;
    
    var settings = this.data.settings;
    var orgId = $('#gttOrg', this.$popup).val();
    var boardId = $('#gttBoard', this.$popup).val();
    var settingId = lists[0].id; // Default to first item
    if (settings.orgId && settings.orgId == orgId && settings.boardId && settings.boardId == boardId && settings.listId) {
        settingId = settings.listId;
    }

    var $list = $('#gttList', this.$popup);
    $list.html("");

    $.each(lists, function(iter, item) {
        var id = item.id;
        var display = item.name;
        var selected = (id == settingId);
        $list.append($('<option>').attr('value', id).prop('selected', selected).append(display));
    });

    $list.change();
};

GmailToTrello.PopupView.prototype.updateLabels = function() {
    var self = this;
    var labels = this.data.trello.labels;
    var $gtt = $('#gttLabels', this.$popup);
    $gtt.html(""); // Clear out

    for (var i = 0; i < labels.length; i++) {
        var item = labels[i];
        if (item.name.length > 0) {
            var $color = $("<div id='gtt_temp'>").css('color', item.color);
            var bkColor = self.parent.luminance($color.css('color')); // If you'd like to determine whether to make the background light or dark
            $gtt.append($('<li>')
                .attr('trello-label-id', item.id)
                .css('border-color', item.color)
                .css('background-color', bkColor)
                .append(item.name)
            )
        }
    }
    
    $('#gttLabelsMsg', this.$popup).hide();

    var labelsControl = new MenuControl({'selectors': '#gttLabels li', 'nonexclusive': true});
    labelsControl.event.addListener('onMenuClick', function(e, params) {
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
                $('#gttLabels li[trello-label-id="' + item.id + '"]').click();
            }
        }
    } else {
        // Labels do not have to be set, so no default.
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
    var dueDate = $('#gttDueDate', this.$popup).val();
    var title = $('#gttTitle', this.$popup).val();
    var description = $('#gttDesc', this.$popup).val();
    var useBackLink = $('#chkBackLink', this.$popup).is(':checked');
    var selfAssign = $('#chkSelfAssign', this.$popup).is(':checked');
    var markdown = $('#chkMarkdown', this.$popup).is(':checked');
    var position = $('#gttPosition', this.$popup).prop('value');
    var timeStamp = $('.gH .gK .g3:first', this.$visibleMail).attr('title');
    var popupWidth = this.$popup.css('width');
    var labelsId = $('#gttLabels li.active', this.$popup).map(function(iter, item) {
            var val = $(item).attr('trello-label-id');
            return val;
        }).get().join();
    var labelsCount = $('#gttLabels li', this.$popup).length;

    if (!labelsCount && labelsId.length < 1 && this.data && this.data.settings && this.data.settings.labelsId) {
        labelsId = this.data.settings.labelsId; // We're not yet showing labels so override labelsId with settings
    }

    var $attachments = $('#gttAttachments input[type="checkbox"]', self.$popup);
    var attachments = [];
	
    $.each($attachments, function() {
	 attachments.push({
	   'url': $(this).attr('url'),
	   'name': $(this).attr('name'),
	   'mimeType': $(this).attr('mimeType'),
	   'checked': $(this).is(':checked')
	 });
    });

    var validateStatus = (boardId && listId && title); // Labels are not required
    log('validateData: ' + boardId + ' - ' + listId + ' - ' + title);

    if (validateStatus) {
        newCard = {
            orgId: orgId,
            boardId: boardId,
            listId: listId,
            labelsId: labelsId,
            dueDate: dueDate,
            title: title,
            description: description,
            attachments: attachments,
            useBackLink: useBackLink,
            selfAssign: selfAssign,
            markdown: markdown,
            popupWidth: popupWidth,
            position: position,
            timeStamp: timeStamp
        };
        this.data.newCard = newCard;
        $.extend(this.data.settings, newCard);
        this.parent.saveSettings();
    }
    $('#addTrelloCard', this.$popup).attr('disabled', !validateStatus);

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
    var data = this.data.newCard;
    var resp = response.data;

    var replacer = {
        'title': self.parent.bookend('dd', data.title || '?'),
        'status': self.parent.bookend('dd', resp.status || '?'),
        'responseText': self.parent.bookend('dd', resp.responseText || '?')
    }

    var style = 'float: left; clear: left; width: 90px; text-align: right; color: red;';
    
    var msg = '<a class="hideMsg" title="Dismiss message">&times;</a>ERROR: Trello API FAILURE! <dl style="font-weight: bold;">';
    
    $.each (['title', 'status', 'responseText'], function (iter, item) {
        msg += self.parent.bookend('dt', item + ':', style) + '%' + item + '%';
    });

    msg = self.parent.replacer(msg, replacer) + '</dl>';
    
    this.showMessage(self, msg);
    this.$popupContent.hide();
};
