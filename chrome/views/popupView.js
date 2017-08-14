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

    // html pieces
    this.html = {};

    this.chrome_access_token = '';

    this.dataDirty = true;
    this.posDirty = false;

    this.MAX_BODY_SIZE = 16384;

    this.mouseDownTracker = {};

    this.lastError = '';

    this.EVENT_LISTENER = '.gtt_event_listener';
};

GmailToTrello.PopupView.prototype.init = function() {
    gtt_log('PopupView:init');
    var self = this;

    //check if already init
    if (this.detectPopup()) 
        return true;

    if (!this.$toolBar) {
        return; // button not available yet
    }

    // inject a button & a popup

    if (this.html && this.html['add_to_trello'] && this.html['add_to_trello'].length > 1) {
       gtt_log('PopupView:init: add_to_trello_html already exists');
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
            // data = self.parent.replacer(data, {'jquery-ui-css': chrome.extension.getURL('lib/jquery-ui-1.12.1.min.css')}); // OBSOLETE (Ace@2017.06.09): Already loaded by manifest
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

    this.$popup.css('left', newPopupLeft + 'px');

    this.onResize();

    this.posDirty = !this.validateData() ? true : false;
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
        gtt_log('detectPopup: Found Button at: ' + JSON.stringify($button));
        if ($button[0].clientWidth <= 0) {
            gtt_log('detectPopup: Button is in an inactive region. Moving...');
            //relocate
            $button.appendTo(this.$toolBar);
            $popup.appendTo(this.$toolBar);

        }
            // update when visible
        if ($popup[0].clientWidth > 0) {
            gtt_log('detectPopup: popup width:' + $popup[0].clientWidth + ' visible:' + JSON.stringify($popup[0]));
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
        maxWidth: self.size_k.width.max,
        alsoResize: '#gttImages'
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
        var due_time = (due[1] || '');

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
            gtt_log('due_Shortcuts:change: Unknown due date shortcut: "' + due_date + '"');
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
            gtt_log('due_Shortcuts:change: Unknown due time shortcut: "' + due_time + '"');
        }

        $('#gttDue_Date', this.$popup).val(new_date || '');
        $('#gttDue_Time', this.$popup).val(new_time || '');

        self.validateData();
    });

    $('#gttTitle', this.$popup).change(function() { self.validateData() });
    $('#gttDesc', this.$popup).change(function() { self.validateData() });


    var update_body = function() {
        const useBackLink_k = $('#chkBackLink', self.$popup).is(':checked');
        const markdown_k = $('#chkMarkdown', self.$popup).is(':checked');
        var $gttDesc = $('#gttDesc', self.$popup);

        const body_raw_k = $gttDesc.attr('gmail-body-raw') || '';
        const body_md_k = $gttDesc.attr('gmail-body-md') || '';
        const link_raw_k = $gttDesc.attr('gmail-link-raw') || '';
        const link_md_k = $gttDesc.attr('gmail-link-md') || '';
        
        const body_k = markdown_k ? body_md_k : body_raw_k;
        const link_k = useBackLink_k ? ((markdown_k ? link_md_k : link_raw_k) + ' ') : '';

        const desc_k = self.parent.truncate(body_k, self.MAX_BODY_SIZE - link_k.length, '...');

        $gttDesc.val(link_k + desc_k);
        $gttDesc.change();        
    };

    $('#chkBackLink', this.$popup).change(function() {
        update_body();
    });

    $('#chkMarkdown', this.$popup).change(function() {
        update_body();
    });

    $('#addToTrello', this.$popup).click(function(event) {
        if (self.parent.modKey(event)) {
            self.displayAPIFailedForm();
        } else {
            self.submit();            
        }
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
    });
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

    if (self.$gttButton && self.$popup) {
        $(document).on('keydown' + self.EVENT_LISTENER, function keyboardTrap(event) {
            const periodASCII_k = 46,
                  periodNumPad_k = 110,
                  periodKeyCode_k = 190,
                  visible_k = self.popupVisible();
                  isEscape_k = event.which === $.ui.keyCode.ESCAPE,
                  isEnter_k = event.which === $.ui.keyCode.ENTER,
                  isPeriodASCII_k = event.which === periodASCII_k,
                  isPeriodNumPad_k = event.which === periodNumPad_k,
                  isPeriodKeyCode_k = event.which === periodKeyCode_k,
                  isPeriod_k = isPeriodASCII_k || isPeriodNumPad_k || isPeriodKeyCode_k,
                  isCtrlCmd_k = event.ctrlKey || event.metaKey,
                  isCtrlCmdPeriod_k = isCtrlCmd_k && isPeriod_k,
                  isCtrlCmdEnter_k = isCtrlCmd_k && isEnter_k;

            if (visible_k) {
                if (isEscape_k || isCtrlCmdPeriod_k) {
                    self.hidePopup();
                } else if (isCtrlCmdEnter_k) {
                    self.submit();
                }
                // To stop propagation: event.stopPropagation();
            }
        }).on('mouseup' + self.EVENT_LISTENER, function click(event) { // Click isn't always propagated on Mailbox bar, so using mouseup instead
            if ($(event.target).closest('#gttButton').length == 0
               && $(event.target).closest('#gttPopup').length == 0
               && self.mouseDownTracker.hasOwnProperty(event.target)
               && self.mouseDownTracker[event.target] === 1) {
                self.mouseDownTracker[event.target] = 0;
                self.hidePopup();
            }
        }).on('mousedown' + self.EVENT_LISTENER, function click(event) { // Click isn't always propagated on Mailbox bar, so using mouseup instead
            if ($(event.target).closest('#gttButton').length == 0
               && $(event.target).closest('#gttPopup').length == 0) {
                self.mouseDownTracker[event.target] = 1;
            }
        }).on('focusin' + self.EVENT_LISTENER, function focus(event) {
            if ($(event.target).closest('#gttButton').length == 0
               && $(event.target).closest('#gttPopup').length == 0) {
                self.hidePopup();
            }            
        });

        if (self.posDirty) {
            self.centerPopup();
        }

        self.mouseDownTracker = {};

        self.$popup.show();
        self.validateData();

        self.event.fire('onPopupVisible');
    }
};

GmailToTrello.PopupView.prototype.hidePopup = function() {
    var self = this;

    if (self.$gttButton && self.$popup) {
        $(document).off(self.EVENT_LISTENER); // Turns off everything in namespace
        self.$popup.hide();
    }
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
        gtt_log('bindData missing data!');
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
            // chrome.identity.removeCacheAuthToken({'token': self.chrome_access_token});
            self.event.fire('onRequestDeauthorizeTrello');
        });
    });

    // GET https://www.googleapis.com/chromewebstore/v1.1/items/oceoildfbiaeclndnjknjpfaoofeekgl/skus/gmail_to_trello_yearly_subscription_29_99
    $('#gttSubscribe', this.$popup).click(function() {
        $.get(chrome.extension.getURL('views/subscribe.html'), function(data) {
            self.showMessage(self, data);
            google.payments.inapp.getSkuDetails({ // getSkuDetails({
                  'parameters': {'env': 'prod'},
                  'sku': 'gmail_to_trello_yearly_subscription_29_99',
                  'success': function(response) {
                        // onLicenseUpdate
                    },
                  'failure': function(response) {
                        // onLicenseUpdateFail
                    }
                });
            /*
            chrome.identity.getAuthToken({'interactive': true}, function(token) {
                self.chrome_access_token = token;
            });
            */
        });
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

    // Attach reportError function to report id if in text:
    $('#report', this.$popup).click(function() {
        self.reset();

        const lastError_k = (self.lastError || '') + (self.lastError ? '\n' : '');

        const dl_k = self.parent.deep_link; // Pointer to function for expedience
        const data_k = dl_k(self, ['data']);
        const newCard_k = dl_k(data_k, ['newCard']);
        let newCard = $.extend({}, newCard_k);
        // delete newCard.title;
        delete newCard.description;
        const user_k = dl_k(data_k, ['trello', 'user']);
        const username_k = dl_k(user_k, ['username']);
        const fullname_k = dl_k(user_k, ['fullName']);
        const date_k = new Date().toISOString().substr(0,10);
        self.updateBoards('52e1397addf85d4751f99319'); // GtT board
        $('#gttDesc', self.$popup).val(lastError_k + JSON.stringify(newCard) + '\n' + gtt_log());
        $('#gttTitle', self.$popup).val('Error report card: ' + [fullname_k, username_k].join(' @') + ' ' + date_k);
        self.validateData();
    });


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

    if (!data) {
        return;
    }

    $('#gttTitle', this.$popup).val(data.subject);

    const markdown_k = $('#chkMarkdown', this.$popup).is(':checked');
    const useBackLink_k = $('#chkBackLink', this.$popup).is(':checked');

    const body_k = markdown_k ? data.body_md : data.body_raw;
    const link_k = useBackLink_k ? ((markdown_k ? data.link_md : data.link_raw) + ' ') : '';
    const desc_k = self.parent.truncate(body_k, self.MAX_BODY_SIZE - link_k.length, '...');

    $('#gttDesc', this.$popup)
        .val(link_k + desc_k)
        .attr('gmail-body-raw', data.body_raw || '')
        .attr('gmail-body-md', data.body_md || '')
        .attr('gmail-link-raw', data.link_raw || '')
        .attr('gmail-link-md', data.link_md || '');
    
    var mime_html = function(tag, isImage) {
        var html = '';
        var img = '';
        var img_big = '';
        const domTag_k = '#gtt' + tag.charAt(0).toUpperCase() + tag.slice(1).toLowerCase();
        var $domTag = $(domTag_k, self.$popup);
        
        if (isImage && isImage === true) {
            img = '<img src="%url%" alt="%name%" /> '; // See style.css for #gttImage img style REMOVED: height="32" width="32" 
        }

        $.each(data[tag], function(iter, item) {
            var dict = {
              'url': item.url,
              'name': item.name,
              'mimeType': item.mimeType,
              'img': img
            };

            html += self.parent.replacer (
              '<label title="%name%"><input type="checkbox" mimeType="%mimeType%" name="%name%" url="%url%" /> %img%%name%</label><br />\n',
              dict
            );
        });

        $domTag.html(html);

        if (isImage && isImage === true) {
            $('img', $domTag).each(function () {
                var $img = $(this);
                $img.on('error', function() {
                    $img.attr('src', chrome.extension.getURL('images/doc-question-mark-512.png'));
                }).tooltip({
                    'track': true,
                    'content': function() {
                        var dict = {
                            'src': $img.attr('src'),
                            'alt': $img.attr('alt')                        
                        };
                        return self.parent.replacer ('<img src="%src%"><br />%alt%', dict);
                    }
                });
            });
        }
    };

    mime_html('attachments');
    mime_html('images', true /* isImage */);

    this.dataDirty = false;
    self.validateData();
};

GmailToTrello.PopupView.prototype.showMessage = function(parent, text) {
    let self = this;
    this.$popupMessage.html(text);

    // Attach hideMessage function to hideMsg class if in text:
    $('.hideMsg', this.$popupMessage).click(function() {
        parent.hideMessage();
    });

    $('#clearCacheNow', this.$popupMessage).click(function() {
        chrome.browsingData.remove({
            "since": 0,
            "originTypes": {
                "extension": true
                }
            }, {
            "appcache": true,
            "cache": true,
            "cookies": true,
            "downloads": false,
            "fileSystems": false,
            "formData": false,
            "history": false,
            "indexedDB": false,
            "localStorage": false,
            "serverBoundCertificates": false,
            "pluginData": true,
            "passwords": false,
            "webSQL": false
            }, function() {
                alert('Cache cleared.');
                }
            );
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
        .attr('trelloId-position', 'below')
        .attr('title', 'New card below')
        .append('&#11015;'));

    var control = new MenuControl({'selectors': '#gttPosition li', 'nonexclusive': false});
    control.event.addListener('onMenuClick', function(e, params) {
        self.validateData();
    });

    var settings = this.data.settings;
    var settingId = settings.position || 'below';
    $('#gttPosition li[trelloId-position="' + settingId + '"]', self.$popup).click();
 
    $gtt.show();
};

GmailToTrello.PopupView.prototype.clearBoard = function() {
    var $gtt = $('#gttBoard', this.$popup);
    $gtt.html(''); // Clear it.

    $gtt.append($('<option value="">Select a board....</option>'));
    
    $gtt.change();
};

GmailToTrello.PopupView.prototype.updateBoards = function(tempBoardId) {
    var self = this;

    var boards = this.data.trello.boards;
    var newBoards = {};

    $.each(boards, function(iter, item) {
        const org_k =  item.hasOwnProperty('organization')
                    && item.organization.hasOwnProperty('displayName')
                    ?  item.organization.displayName + ' &raquo; '
                    :  '~ ';
        const display_k = org_k + item.name;
        newBoards[display_k.toLowerCase()] = {'id': item.id, 'display': display_k};
    });

    var settings = this.data.settings;
    var settingId = 0;
    if (settings.boardId) {
        settingId = settings.boardId;
    }

    if (tempBoardId) {
        settingId = tempBoardId;
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
        var display = self.parent.truncate(item.name, 80, '...');
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
    
    var validateStatus = boardId && listId && title && description ? true : false; // Labels are not required
    gtt_log('validateData: board:' + boardId + ' list:' + listId + ' title:' + title + ' desc:' + ((description || '') . length));

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
    $('#addToTrello', this.$popup).attr('disabled', validateStatus ? false : 'disabled');

    return validateStatus;
};

GmailToTrello.PopupView.prototype.reset = function() {
    this.$popupMessage.hide();
    this.$popupContent.show();
};

GmailToTrello.PopupView.prototype.displaySubmitCompleteForm = function() {
    var self = this;
    var data = this.data.newCard;
    gtt_log('displaySubmitCompleteForm: ' + this.data);

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

    const dict_k = {
        'title': resp.title || '?',
        'status': resp.status || '?',
        'statusText': resp.statusText || '?',
        'responseText': resp.responseText || JSON.stringify(response),
        'method': resp.method || '?',
        'keys': resp.keys || '?'
    };

    $.get(chrome.extension.getURL('views/error.html'), function(data) {
        const lastErrorHtml_k = self.parent.replacer(data, dict_k);
        self.showMessage(self, lastErrorHtml_k);
        self.lastError = JSON.stringify(dict_k);
        self.$popupContent.hide();
        if (resp.status && resp.status == 401) { // Invalid token, so deauthorize Trello
            self.event.fire('onRequestDeauthorizeTrello');
        }
    });
};

// End, popupView.js