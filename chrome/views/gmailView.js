var GmailToTrello = GmailToTrello || {};

GmailToTrello.GmailView = function(parent) {
    var self = this;
    
    this.parent = parent;

    this.LAYOUT_DEFAULT = 0;
    this.LAYOUT_SPLIT   = 1;
    this.layoutMode = this.LAYOUT_DEFAULT;
    
    this.event = new EventTarget();
    this.data = null;

    this.$root = null;

    this.parsingData = false;

    this.selectors = {
        /* selectors mapping, modify here when gmail's markup changes */
        toolbarButton: '.G-Ni:first',
        emailName: '.gD',
        emailAddress: '.gD', // Was: '.go', now using same name property
        emailSubject: '.hP',
        emailBody: '.adn.ads .gs:first .a3s.aXjCH', // Was: "div[dir='ltr']:first", // Was: '.adP:first', // Was: '.adO:first'
        emailAttachments: '.aZo', // Was: '.aQy',
        emailThreadID: '.a3s.aXjCH',
        viewport: '[role="main"]',
        viewportSplit: '.aNW:first', //reading panel
        expandedEmails: '.h7',
        hiddenEmails: '.kv',
        emailInThreads: '.kv,.h7',
        timestamp: '.gH .gK .g3:first',
        messageTimes: '.g3',
        host: "span[dir='ltr']:first" // Was: 'a.gb_b.gb_eb.gb_R'
    };
};

GmailToTrello.GmailView.prototype.preDetect = function() {
    var self = this;
    // gtt_log('GmailView:preDetect');

    var $activeGroup = $('.BltHke[role="main"]');
    
    if ($activeGroup.find('.apv').length > 0) {
        gtt_log('detect: Detected SplitLayout');
        this.layoutMode = this.LAYOUT_SPLIT;
        this.$root = $activeGroup;
    } else {
        this.layoutMode = this.LAYOUT_DEFAULT;
        this.$root = $('body');
    }

    return this.detectToolbar();
};

GmailToTrello.GmailView.prototype.detect = function() {
    var self = this;
    // gtt_log('GmailView:detect');

    const pre_k = this.preDetect();

    if (pre_k) {
        this.event.fire('onDetected');
    } else {
        this.detectEmailOpeningMode();
    }
};

GmailToTrello.GmailView.prototype.detectToolbar = function() {
    // gtt_log('GmailView:detectToolbar');

    var $toolBar = $("[gh='mtb']", this.$root) || null;
    
    while($($toolBar).children().length === 1){
        $toolBar = $($toolBar).children().first();
    }

    this.$toolBar = $toolBar;
    
    const haveToolBar_k = $toolBar && $toolBar.length > 0
                        ? true : false;

    return haveToolBar_k;
};

GmailToTrello.GmailView.prototype.detectEmailOpeningMode = function() {
    var self = this;
    this.$expandedEmails = this.$root.find(this.selectors.expandedEmails);
    
    var result = this.$toolBar && this.$toolBar.length > 0
              && this.$expandedEmails && this.$expandedEmails.length > 0;
    if (result) {
        // gtt_log('detectEmailOpeningMode: Detected an email is opening: ' + JSON.stringify(this.$expandedEmails));
        
        //bind events
        var counter = 0;
        this.$root.find('.kv:not([gtt_event]), .h7:not([gtt_event]), .kQ:not([gtt_event]), .kx:not([gtt_event])').each(function() {
            counter++;
            $(this).attr('gtt_event', 1).click(function(){
                WaitCounter.start('emailclick', 500, 5, function() {
                    if (self.detectEmailOpeningMode()) {
                        //this.event.fire('onEmailChanged');
                        WaitCounter.stop('emailclick');
                    }
                });
            });
        });
        gtt_log('detectEmailOpeningMode: Binded email threads click events: ' + counter + ' items');

        this.event.fire('onDetected');
    }
    return result;
};

GmailToTrello.GmailView.prototype.parseData = function() {
    // gtt_log('parseData');
    if (this.parsingData) {
        return;
    }

    var self = this;
    var data = {};

    // find active email
    if (this.layoutMode === this.LAYOUT_SPLIT) {
        $viewport = $(this.selectors.viewportSplit, this.$root);
    } else {
        $viewport = $(this.selectors.viewport, this.$root);
    }
    gtt_log('parseData::viewport: ' + JSON.stringify($viewport));
    if ($viewport.length == 0) {
        return;
    }

    var y0 = $viewport.offset().top;
    //gtt_log(y0);
    var $visibleMail = null;
    // parse expanded emails again
    $(this.selectors.expandedEmails, this.$root).each(function() {
        var $this = $(this);
        if ($visibleMail === null && $this.offset().top >= y0)
            $visibleMail = $this;
    });
    
    if (!$visibleMail) {
        return;
    }

    // Check for email body first. If we don't have this, then bail.
    var $emailBody = $(this.selectors.emailBody, $visibleMail);
    var $emailBody1 = $emailBody[0];
    if (!$emailBody1) {
        return;
    }

    this.parsingData = true;
    // var startTime = new Date().getTime();
    
    // host name
    var $host = $(this.selectors.host, $visibleMail);
    var hostName = ($host.attr('name') || '').trim();
    var hostEmail = ($host.attr('email') || '').trim();
    /*
    var title  = ($host.attr('title') || "").trim();
    var matched = title.match(/[^:]+:\s+([^\(]+)\(([^\)]+)\)/);
    var hostName = 'unknown';
    var hostEmail = 'unknown@dot.com';
    if (matched && matched.length > 1) {
        hostName = matched[1].trim();
        hostEmail = matched[2].trim();
    }
    */

    // email name
    var emailName = ($(this.selectors.emailName, $visibleMail).attr('name') || "").trim();
    var emailAddress = ($(this.selectors.emailAddress, $visibleMail).attr('email') || "").trim();
    var emailAttachments = $(this.selectors.emailAttachments, $visibleMail).map(function() {
        var item = $(this).attr('download_url');
        if (item && item.length > 0) {
            var attachment = item.match(/^([^:]+)\s*:\s*([^:]+)\s*:\s*(.+)$/);
            if (attachment && attachment.length > 3) {
                const name_k = self.parent.decodeEntities(attachment[2]); // was: decodeURIComponent
                const url_k = attachment[3]; // Was: self.parent.midTruncate(attachment[3], 50, '...');
                var add = '&';
                if (url_k.indexOf('?') === -1) {
                    add = '?';
                }
                return {
                   'mimeType': attachment[1],
                   'name': name_k,
                    // NOTE (Ace@2017-04-20): Adding this explicitly at the end of the URL so it'll pick up the "filename":
                   'url': url_k + add + self.parent.UNIQUE_URI_VAR + '=/' + name_k,
                   'checked': 'false'
                }; // [0] is the whole string
            }
        }
    });

    // email thread id
    /* Was:
    var emailId = 0;
    var class1 = '';
    var classnames = ($(this.selectors.emailThreadID, $visibleMail).attr('class') || "").split(' ');
    while ((class1 = classnames.pop()) && emailId === 0) {
        if (class1 && class1.indexOf('m') === 0) {
            emailId = class1.substr(1);
        }
    }
    */
    var emailId = ($emailBody1.classList[$emailBody1.classList.length-1] || '00') . substr(1); // Get last item, hopefully 'm' + long id
    
    // timestamp
    const $time_k = $(this.selectors.timestamp, $visibleMail);
    const timeAttr_k = (($time_k.length > 0) ? ($time_k.attr('title') || $time_k.text() || $time_k.attr('alt')) : '').trim();
    
    /* Used to do this to convert to a true dateTime object, but there is too much hassle in doing so:
    const timeCorrected_k = self.parent.parseInternationalDateTime(timeAttr_k);
    const timeAsDate_k = (timeCorrected_k !== '' ? new Date (timeCorrected_k) : '');
    const timeAsDateInvalid_k = timeAsDate_k ? isNaN (timeAsDate_k.getTime()) : true;

    data.time = (timeAsDateInvalid_k ? 'recently' : timeAsDate_k.toString(this.dateFormat || 'MMM d, yyyy'));
    */

    data.time = timeAttr_k || 'recently';

    if (data.time === 'recently') {
        gtt_log('time-debug: ' + JSON.stringify({
            'timeAttr_k': timeAttr_k,
            /*
            'timeCorrected_k': timeCorrected_k,
            'timeAsDate_k': timeAsDate_k,
            'timeAsDateInvalid_k': timeAsDateInvalid_k,
            */
            'time_k': $time_k
        }));
    }

    var from_raw = emailName + ' <' + emailAddress + '> ' + data.time;
    var from_md = '[' + emailName + '](' + emailAddress + ') ' + data.time;  // FYI (Ace, 10-Jan-2017): [name](url "comment") is markdown syntax

    // all message times in this thread
    data.messageTimes = [];
    $(this.selectors.messageTimes, $viewport).each(function () {
        data.messageTimes.push(Date.parse($(this).attr('title').replace(' at ', ' ')).getTime());
    });

    // subject
    data.subject = ($(this.selectors.emailSubject, $viewport).text() || '').trim();

    var subject = encodeURIComponent(data.subject);
    var dateSearch = encodeURIComponent(data.time);
    
    var txtAnchor = 'Search';
    var txtDirect = 'https://mail.google.com/mail/#search/' + subject;
    var txtDirectComment = 'Search by subject';

    if (emailId && emailId.length > 1) {
        txtAnchor = 'Id';
        txtDirect = 'https://mail.google.com' + window.location.pathname /* /mail/u/0/ */ + '#all/' + emailId;
        txtDirectComment = 'Open by id';
    }
   
    var txtSearch = 'https://mail.google.com/mail/#advanced-search/subset=all&has=' + subject + '&within=1d&date=' + dateSearch;
    
    data.link_raw = '(<' + txtDirect + '> | <' + txtSearch + '>)';
    data.link_md = '('
        + self.parent.anchorMarkdownify(txtAnchor, txtDirect, txtDirectComment).trim() // don't need leading and trailing spaces
        + ' | '
        + self.parent.anchorMarkdownify("Time", txtSearch, "Search by subject + time").trim() // don't need leading and trailing spaces
        + ')';
        
    
    // email body
    var make_preprocess_mailto = function (name, email) {
        var forms = [
            '%name% <%email%>',
            '%name% (%email%)',
            '%name% %email%',
            '"%name%" <%email%>',
            '"%name%" (%email%)',
            '"%name%" %email%'
        ];
        
        const dict = {
            'name': name,
            'email': email
        };

        var anchor_md = self.parent.anchorMarkdownify(name, email); // Don't need to add 'mailto:'

        var retn = {};

        $.each(forms, function(iter, item) {
            var item1 = self.parent.replacer(item, dict);
            retn[item1.toLowerCase()] = anchor_md;
        });

        return retn;
    }

    var preprocess = {'a':{}};
    $.extend(preprocess['a'], make_preprocess_mailto(emailName, emailAddress), make_preprocess_mailto(hostName, hostEmail));
    
    var selectedText = this.parent.getSelectedText();

    data.body_raw =  from_raw + ':\n\n' + (selectedText || this.parent.markdownify($emailBody1, false, preprocess));
    data.body_md = from_md + ':\n\n' + (selectedText || this.parent.markdownify($emailBody1, true, preprocess));

    data.attachments = emailAttachments;

    var emailImages = {};

    $('img', $emailBody1).each(function(index, value) {
        var href = ($(this).prop("src") || '').trim(); // Was attr
        var text = self.parent.midTruncate(($(this).prop("alt") || self.parent.uriForDisplay(href) || '').trim(), 50, '...');
        var type = ($(this).prop("type") || "text/link").trim(); // Was attr
        if (href.length > 0 && text.length > 0) { // Will store as key/value pairs to automatically overide duplicates
            emailImages[href] = {'mimeType': type, 'name': self.parent.decodeEntities(text), 'url': href, 'checked': 'false'};
        }
    });

    data.images = Object.values(emailImages);

    //var t = (new Date()).getTime();
    //gtt_log('Elapsed: '+(t-startTime)/1000);
    this.parsingData = false;

    return data;
};
