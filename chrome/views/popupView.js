var GmailToTrello = GmailToTrello || {};

GmailToTrello.PopupView = function(parent) {

    this.parent = parent;
    this.event = new EventTarget();
    this.isInitialized = false;

    this.data = {settings:{}};
    
    this.size_k = {
        'width': {
            'min': 620,
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
    if ($button.length > 0) {
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

    $('#close-button', this.$popup).click(function() {
        self.hidePopup();
    });

    /** Add Card Panel's behavior **/

    this.$gttButton.click(function(event) {
        if (self.parent.modKey(event)) {
            // TODO (Ace, 28-Mar-2017): Figure out how to reset layout here!
        } else {
            if (self.popupVisible()) {
                self.hidePopup();
            } else {
                self.showPopup();
            }
        }
    }).hover(function() { // This is a google class that on hover highlights the button and arrow, darkens the background:
        $(this).addClass('T-I-JW');
    }, function() {
        $(this).removeClass('T-I-JW');
    });

    var $board = $('#gttBoard', this.$popup);
    $board.change(function() {
        var boardId = $board.val();

        var $list = $('#gttList', self.$popup);
        var $card = $('#gttCard', self.$popup);
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
            $card.html($('<option value="">...please pick a list...</option>')).val('');
            self.data.settings.labelsId = '';
            self.data.settings.listId = '';
            self.data.settings.cardId = '';
            // self.data.settings.membersId = ''; // NOTE (Ace, 28-Mar-2017): Do NOT clear membersId, as we can persist selections across boards
        } else {
            $labelsMsg.text('Loading...').show();
            $membersMsg.text('Loading...').show();
        }

        self.event.fire('onBoardChanged', {boardId: boardId});

        self.validateData();
    });

    var $list = $('#gttList', this.$popup);
    $list.change(function() {
        var listId = $list.val();
        self.event.fire('onListChanged', {listId: listId});
        self.validateData();
    });

    $('#gttCard', this.$popup).change(function() {
        self.validateData();
    });

    $('#gttDue_Shortcuts', this.$popup).change(function() {
        const dayOfWeek_k = {
            'sun': 0, 'sunday': 0,
            'mon': 1, 'monday': 1,
            'tue': 2, 'tuesday': 2,
            'wed': 3, 'wednesday': 3,
            'thu': 4, 'thursday': 4,
            'fri': 5, 'friday': 5,
            'sat': 6, 'saturday': 6
        };
        const dom_date_format_k = 'yyyy-MM-dd';
        const dom_time_format_k = 'HH:mm';

        var due = $(this).val().split(' '); // Examples: d=monday am=2 | d+0 pm=3:00

        var d = new Date();

        var due_date = (due[0] || '');
        var due_time = due[1] || '';

        var new_date = '';
        var new_time = '';

        if (due_date.substr(1,1) === '+') {
            d.setDate(d.getDate() + parseInt(due_date.substr(2)), 10);
            new_date = d.toString(dom_date_format_k);
        } else if (due_date.substr(1,1) === '=') {
            d.setDate(d.getDate() + 1); // advance to tomorrow, don't return today for "next x"
            const weekday_k = due_date.substr(2).toLowerCase();
            if (weekday_k === '0') {
                new_date = '';
            } else {
                const weekday_num_k = dayOfWeek_k[weekday_k];
                while (d.getDay() !== weekday_num_k) {
                    d.setDate(d.getDate() + 1);
                }
                new_date = d.toString(dom_date_format_k);                
            }
        } else {
            log('Unknown due date shortcut: "' + due_date + '"');
        }

        if (due_time.substr(2,1) === '+') {
            d.setTime(d.getTime() + parseInt(due_time.substr(3)), 10);
            new_time = d.toString(dom_time_format_k);
        } else if (due_time.substr(2,1) === '=') {
            if (due_time.substr(3) === '0') {
                new_time = '';
            } else {
                const am_k = due_time.substr(0,1).toLowerCase() === 'a';
                const hhmm_k = due_time.substr(3).split(':');
                var hours = parseInt(hhmm_k[0], 10);
                // http://stackoverflow.com/questions/15083548/convert-12-hour-hhmm-am-pm-to-24-hour-hhmm:
                if (hours === 12) {
                    hours = 0;
                }
                if (!am_k) {
                    hours += 12;
                }
                new_time = ('0' + hours.toString()).substr(-2)
                    + ':' + ('0' + (hhmm_k[1] || 0).toString()).substr(-2);
            }
        } else {
            log('Unknown due time shortcut: "' + due_time + '"');
        }

        $('#gttDue_Date', this.$popup).val(new_date || '');
        $('#gttDue_Time', this.$popup).val(new_time || '');

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
       self.submit();
    });

    $('#gttLabelsHeader', this.$popup).click(function(event) {
        if (self.parent.modKey(event)) {
            self.clearLabels();
        }
    });

    $('#gttMembersHeader', this.$popup).click(function(event) {
        if (self.parent.modKey(event)) {
            self.clearMembers();
        }
    })
};

GmailToTrello.PopupView.prototype.submit = function() {
    var self = this;
    
    if (self.validateData()) {
        //$('#addToTrello', this.$popup).attr('disabled', 'disabled');
        self.$popupContent.hide();
        self.showMessage(self, 'Submiting to Trello...');
        self.event.fire('onSubmit');
    }
};

GmailToTrello.PopupView.prototype.showPopup = function() {
    var self = this;

    const periodASCII_k = 46;
    const periodNumPad_k = 110;
    const periodKeyCode_k = 190;

    if (self.$gttButton && self.$popup) {
        self.$popup.show();
        $(document).on('keydown', function(event) { // Have to use keydown otherwise cmd/ctrl let off late will hold processing
            var visible = self.popupVisible();
            var isEscape = event.which === $.ui.keyCode.ESCAPE;
            var isEnter = event.which === $.ui.keyCode.ENTER;
            var isPeriodASCII = event.which === periodASCII_k;
            var isPeriodNumPad = event.which === periodNumPad_k;
            var isPeriodKeyCode = event.which === periodKeyCode_k;
            var isPeriod = isPeriodASCII || isPeriodNumPad || isPeriodKeyCode;
            var isCtrlCmd = event.ctrlKey || event.metaKey;
            var isCtrlCmdPeriod = isCtrlCmd && isPeriod;
            var isCtrlCmdEnter = isCtrlCmd && isEnter;
            if (visible) {
                if (isEscape || isCtrlCmdPeriod) {
                    self.hidePopup();
                } else if (isCtrlCmdEnter) {
                    self.submit();
                }
                // To stop propagation: event.stopPropagation();
            }
        });
        self.event.fire('onPopupVisible');
    }
};

GmailToTrello.PopupView.prototype.hidePopup = function() {
    var self = this;

    if (self.$gttButton && self.$popup) {
        self.$popup.hide();
    }
    $(document).off('keydown');
    self.stopWaitingHiddenThread();
}

GmailToTrello.PopupView.prototype.popupVisible = function() {
    var self = this;
    var visible = false;
    if (self.$gttButton && self.$popup && self.$popup.css('display') === 'block') {
        visible = true;
    }

    return visible;
}

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
        
    if (data.settings.hasOwnProperty('useBackLink')) {
        $('#chkBackLink', this.$popup).prop('checked', data.settings.useBackLink);
    }

    if (data.settings.hasOwnProperty('markdown')) {
        $('#chkMarkdown', this.$popup).prop('checked', data.settings.markdown);
    }

    if (data.settings.hasOwnProperty('due_Date')) {
        $('#gttDue_Date', this.$popup).val(data.settings.due_Date);
    }

    if (data.settings.hasOwnProperty('due_Time')) {
        $('#gttDue_Time', this.$popup).val(data.settings.due_Time);
    }

    chrome.storage.sync.get('dueShortcuts', function(response) {
        // Borrowed from options file until this gets persisted everywhere:
        const dueShortcuts_k = JSON.stringify({
          "today": {
            "am": "d+0 am=9:00",
            "noon": "d+0 pm=12:00",
            "pm": "d+0 pm=3:00",
            "end": "d+0 pm=6:00",
            "eve": "d+0 pm=11:00"
          },
          "tomorrow": {
            "am": "d+1 am=9:00",
            "noon": "d+1 pm=12:00",
            "pm": "d+1 pm=3:00",
            "end": "d+1 pm=6:00",
            "eve": "d+1 pm=11:00"
          },
          "next monday": {
            "am": "d=monday am=9:00",
            "noon": "d=monday pm=12:00",
            "pm": "d=monday pm=3:00",
            "end": "d=monday pm=6:00",
            "eve": "d=monday pm=11:00"    
          },
          "next friday": {
            "am": "d=friday am=9:00",
            "noon": "d=friday pm=12:00",
            "pm": "d=friday pm=3:00",
            "end": "d=friday pm=6:00",
            "eve": "d=friday pm=11:00"    
          }
        });

        var due = JSON.parse(response.dueShortcuts || dueShortcuts_k);

        var $gtt = $('#gttDue_Shortcuts', this.$popup);
        $gtt.html(''); // Clear it.

        var opt = '<option value="d=0 am=0">--</option>';

        $.each(due, function(key, value) {
            if (typeof (value) === 'object') {
                opt += '<optgroup label="' + key + '">';
                $.each(value, function (key1, value1) {
                    opt += '<option value="' + value1 + '">' + key1 + '</option>';
                });
                opt += '</optgroup>';
            } else {
                opt += '<option value="' + value + '">' + key + '</option>';
            }
        });

        if (opt) {
            $gtt.append($(opt));
        }
    });

    this.initPosition();
    
    this.updateBoards();
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

GmailToTrello.PopupView.prototype.initPosition = function() {
    var self = this;
    var $gtt = $('#gttPosition', this.$popup);
    $gtt.html('');

    $gtt.append($("<li>")
        .attr('trelloId-position', 'to')
        .attr('title', 'Add to card')
//        .css('transform', 'rotate(0deg)')
//        .css('-webkit-transform', 'rotate(0deg)')
//        .css('-ms-transform', 'rotate(0deg)')
        .append('&#11013;'));

    $gtt.append($('<li>')
        .attr('trelloId-position', 'bottom')
        .attr('title', 'New card below')
        .append('&#11015;'));

    var control = new MenuControl({'selectors': '#gttPosition li', 'nonexclusive': false});
    control.event.addListener('onMenuClick', function(e, params) {
        self.validateData();
    });

    var settings = this.data.settings;
    var settingId = settings.position || 'bottom';
    $('#gttPosition li[trelloId-position="' + settingId + '"]', self.$popup).click();
 
    $gtt.show();
};

GmailToTrello.PopupView.prototype.clearBoard = function() {
    var $gtt = $('#gttBoard', this.$popup);
    $gtt.html(''); // Clear it.

    $gtt.append($('<option value="">Select a board....</option>'));
    
    $gtt.change();
};

GmailToTrello.PopupView.prototype.updateBoards = function() {
    var self = this;
    var orgs = this.data.trello.orgs;

    var boards = this.data.trello.boards;
    var newBoards = {};

    for (var iter = 0; iter < orgs.length; iter++) {
        var orgItem = orgs[iter];
        for (var iter2 = 0; iter2 < boards.length; iter2++) {
            if (boards[iter2].idOrganization == orgItem.id) {
                var item = boards[iter2];
                var display = orgItem.displayName + ' &raquo; ' + item.name;
                newBoards[display.toLowerCase()] = {'id': item.id, 'display': display}; // For sorting later
            }
        }
    }

    var settings = this.data.settings;
    var settingId = 0;
    if (settings.boardId) {
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
    var self = this;
    var lists = this.data.trello.lists;
    
    var settings = this.data.settings;
    var boardId = $('#gttBoard', this.$popup).val();
    var settingId = (lists[0] ? lists[0].id : '0'); // Default to first item
    if (settings.boardId && settings.boardId == boardId && settings.listId) {
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

GmailToTrello.PopupView.prototype.updateCards = function() {
    var self = this;

    const newcard_k = '<option value="-1">(new card)</option>';

    var cards = this.data.trello.cards;
    
    var settings = this.data.settings;
    var listId = $('#gttList', this.$popup).val();
    var settingId = 0; // (cards[0] ? cards[0].id : '0'); // Default to first item
    if (settings.listId && settings.listId == listId && settings.cardId) {
        settingId = settings.cardId;
    }

    var $gtt = $('#gttCard', this.$popup);
    $gtt.html(newcard_k);

    $.each(cards, function(iter, item) {
        var id = item.id;
        var display = item.name;
        var selected = (id == settingId);
        $gtt.append($('<option>')
            .attr('value', id)
            .prop('pos', item.pos)
            .prop('members', item.idMembers)
            .prop('labels', item.idLabels)
            .prop('selected', selected)
            .append(display));
    });

    $gtt.change();
};

GmailToTrello.PopupView.prototype.clearLabels = function() {
    this.data.settings.labelsId = '';
    this.updateLabels();
    this.validateData();
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
    var boardId = $('#gttBoard', this.$popup).val();
    if (settings.boardId && settings.boardId === boardId && settings.labelsId) {
        var settingId = settings.labelsId;
        for (var i = 0; i < labels.length; i++) {
            var item = labels[i];
            if (settingId.indexOf(item.id) !== -1) {
                $('#gttLabels li[trelloId-label="' + item.id + '"]', self.$popup).click();
            }
        }
    } else {
        settings.labelsId = ''; // Labels do not have to be set, so no default.
    }

    $gtt.show();
};

GmailToTrello.PopupView.prototype.clearMembers = function() {
    this.data.settings.membersId = '';
    this.updateMembers();
    this.validateData();
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
    if (settings.membersId && settings.membersId.length > 0) {
        var settingId = settings.membersId;
        for (var i = 0; i < members.length; i++) {
            var item = members[i];
            if (settingId.indexOf(item.id) !== -1) {
                $('#gttMembers li[trelloId-member="' + item.id + '"]', self.$popup).click();
            }
        }
    } else {
        settings.membersId = '';
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

GmailToTrello.PopupView.prototype.validateData = function() {
    var self = this;
    var newCard = {};
    var boardId = $('#gttBoard', this.$popup).val();
    var listId = $('#gttList', this.$popup).val();
    var $card = $('#gttCard', this.$popup).find(':selected').first();
    var cardId = $card.val() || '';
    var cardPos = $card.prop('pos') || '';
    var cardMembers = $card.prop('members') || '';
    var cardLabels = $card.prop('labels') || '';
    var due_Date = $('#gttDue_Date', this.$popup).val();
    var due_Time = $('#gttDue_Time', this.$popup).val();
    var title = $('#gttTitle', this.$popup).val();
    var description = $('#gttDesc', this.$popup).val();
    var useBackLink = $('#chkBackLink', this.$popup).is(':checked');
    var markdown = $('#chkMarkdown', this.$popup).is(':checked');
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

    if (!membersCount && membersId.length < 1 && this.data && this.data.settings && this.data.settings.membersId) {
        membersId = this.data.settings.membersId; // We're not yet showing members so override membersId with settings
    }

    var $position = $('#gttPosition li.active', this.$popup).first();
    var position = $position.attr('trelloId-position');

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
            boardId: boardId,
            listId: listId,
            cardId: cardId,
            cardPos: cardPos,
            cardMembers: cardMembers,
            cardLabels: cardLabels,
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
    this.showMessage(self, '<a class="hideMsg" title="Dismiss message">&times;</a>Trello card updated: ' + 
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
        'responseText': resp.responseText || JSON.stringify(response)
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