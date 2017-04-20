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
        toolBarHolder: '.G-atb',
        emailName: '.gD',
        emailAddress: '.gD', // Was: '.go', now using same name property
        emailSubject: '.hP',
        emailBody: '.adP:first', // Was: '.adO:first'
        emailAttachments: '.aZo', // Was: '.aQy',
        emailThreadID: '.a3s.aXjCH',
        viewport: '.aeJ:first',
        viewportSplit: '.aNW:first', //reading panel
        expandedEmails: '.h7',
        hiddenEmails: '.kv',
        emailInThreads: '.kv,.h7',
        timestamp: '.gH .gK .g3:first',
        host: 'a.gb_b.gb_eb.gb_R'
    };

    this.dateFormat = 'MMM d, yyyy';

    chrome.storage.sync.get('dateFormat', function(response) {
        // Have to use variable self pointing to parent's "this" otherwise "this" means local context:
        self.dateFormat = response.dateFormat || 'MMM d, yyyy';
    });
};

GmailToTrello.GmailView.prototype.detectToolbar = function() {
    var $toolBar = null;
    var $toolBarHolder = null;
    $(this.selectors.toolBarHolder, this.$root).each(function() {
        if (this.clientWidth > 0) {
            $toolBarHolder = $(this);
            //log(this);
        }
    });
    
    if ($toolBarHolder) {
        log('Gtt::Detected toolBarHolder at: ');log($toolBarHolder);
        var $button = $toolBarHolder.find(this.selectors.toolbarButton);
        $toolBar = $button.parent();
    }

    this.$toolBar = $toolBar;
    this.$toolBarHolder = $toolBarHolder;
    
    
    //log ($toolBarHolder);
    //log($toolBarHolder.find(this.selectors.toolbarButton));
    //log ($toolBar);  
    //return {toolBarHolder:$toolBarHolder, toolBar:$toolBar};
};

GmailToTrello.GmailView.prototype.detectSplitLayoutMode = function() {

    var self = this;

    var $activeGroup = $('.BltHke[role="main"]');
    
    if ($activeGroup.find('.apv').length>0) {
        log('Gtt::Detected SplitLayout');

        this.layoutMode = this.LAYOUT_SPLIT;
        this.$root = $activeGroup;
        this.detectToolbar();

        //bind events
        var counter = 0;
        $('.BltHke .apv:not([gtt_event])').each(function() {
            counter++;
            $(this).attr('gtt_event', 1).click(function(){
                WaitCounter.start('emailclick', 500, 5, function() {
                    if (self.detectEmailOpenningMode()) {
                        //this.event.fire('onEmailChanged');
                        WaitCounter.stop('emailclick');
                    }
                });
            });
        });
        log('Binded email list click events: '+counter+' items');
        
        return true;
    }

    return false;
};

GmailToTrello.GmailView.prototype.detectEmailOpenningMode = function() {
    
    var self = this;
    this.$expandedEmails = this.$root.find(this.selectors.expandedEmails);
    
    var result = this.$toolBar && this.$toolBar.length > 0
              && this.$expandedEmails && this.$expandedEmails.length > 0
              && this.$toolBarHolder && this.$toolBarHolder !== null;
    if (result) {
        log('Gtt::Detected an email is openning');
        log(this.$expandedEmails);
        
        //bind events
        var counter = 0;
        this.$root.find('.kv:not([gtt_event]), .h7:not([gtt_event]), .kQ:not([gtt_event]), .kx:not([gtt_event])').each(function() {
            counter++;
            $(this).attr('gtt_event', 1).click(function(){
                WaitCounter.start('emailclick', 500, 5, function() {
                    if (self.detectEmailOpenningMode()) {
                        //this.event.fire('onEmailChanged');
                        WaitCounter.stop('emailclick');
                    }
                });
            });
        });
        log('Binded email threads click events: '+counter+' items');

        this.event.fire('onDetected');
    }
    
    return result;
    
};

GmailToTrello.GmailView.prototype.detect = function() {
    //this.detectRoot();

    if (!this.detectSplitLayoutMode()) {
        this.$root = $('body');
        this.detectToolbar();
        this.detectEmailOpenningMode();
    }        

};

GmailToTrello.GmailView.prototype.parseData = function() {
    log('Gtt::parsing data...');
    if (this.parsingData)
        return;

    var self = this;

    this.parsingData = true;
    var startTime = new Date().getTime();
    var data = {};

    // subject
    data.subject = ($(this.selectors.emailSubject, this.$root).text() || "").trim();

    // find active email
    if (this.layoutMode === this.LAYOUT_SPLIT)
        $viewport = $(this.selectors.viewportSplit, this.$root);
    else 
        $viewport = $(this.selectors.viewport, this.$root);
    log($viewport);
    var y0 = $viewport.offset().top;
    //log(y0);
    var $visibleMail = null;
    // parse expanded emails again
    $(this.selectors.expandedEmails, this.$root).each(function() {
        var $this = $(this);
        if ($visibleMail === null && $this.offset().top >= y0)
            $visibleMail = $this;
    });

    // host name
    var $host = $(this.selectors.host);
    var title  = ($host.attr('title') || "").trim();
    var matched = title.match(/[^:]+:\s+([^\(]+)\(([^\)]+)\)/);
    var hostName = 'unknown';
    var hostEmail = 'unknown@dot.com';
    if (matched && matched.length > 1) {
        hostName = matched[1].trim();
        hostEmail = matched[2].trim();
    }

    // email name
    var emailName = ($(this.selectors.emailName, $visibleMail).attr('name') || "").trim();
    var emailAddress = ($(this.selectors.emailAddress, $visibleMail).attr('email') || "").trim();
    var emailAttachments = $(this.selectors.emailAttachments, $visibleMail).map(function() {
        var item = $(this).attr('download_url');
        if (item && item.length > 0) {
            var attachment = item.match(/^([^:]+)\s*:\s*([^:]+)\s*:\s*(.+)$/);
            if (attachment && attachment.length > 3) {
                var name = decodeURIComponent(attachment[2]);
                var add = '&';
                if (attachment[3].indexOf('?') === -1) {
                    add = '?';
                }
                return {
                   'mimeType': attachment[1],
                   'name': name,
                    // NOTE (Ace@2017-04-20): Adding this explicitly at the end of the URL so it'll pick up the "filename":
                   'url': attachment[3] + add + self.parent.UNIQUE_URI_VAR + '=/' + name,
                   'checked': 'false'
                }; // [0] is the whole string
            }
        }
    });

    // email thread id
    var emailId = 0;
    var class1 = '';
    var classnames = ($(this.selectors.emailThreadID, $visibleMail).attr('class') || "").split(' ');
    while ((class1 = classnames.pop()) && emailId === 0) {
        if (class1 && class1.indexOf('m') === 0) {
            emailId = class1.substr(1);
        }
    }
    
    // timestamp
    var $time = $(this.selectors.timestamp, $visibleMail);
    var timeValue = ($time) ? ($time.attr('title') || "") : '';
    timeValue = timeValue ? timeValue.replace(' at ', ' ') : ''; // BUG (Ace, 29-Jan-2017): Replacing 'at' without spaces will mess up "Sat" which will then cause Date.parse to fail.
    if (timeValue !== '') {
        timeValue = Date.parse(timeValue);
    }

    data.time = timeValue ? timeValue.toString(this.dateFormat || 'MMM d, yyyy') : 'recently';

    var from_raw = emailName + ' <' + emailAddress + '> on ' + data.time;
    var from_md = '[' + emailName + '](' /* mailto: */ + emailAddress /* Don't need 'mailto:' */
        /*  + ' "Email ' + emailAddress + '"' */ + ') on '
        + data.time;  // FYI (Ace, 10-Jan-2017): [name](url "comment") is markdown syntax

    var subject = encodeURIComponent(data.subject);
    var dateSearch = encodeURIComponent(data.time);
    
    var txtAnchor = 'Search';
    var txtDirect = "https://mail.google.com/mail/#search/" + subject;
    var txtDirectComment = "Search email subject";

    if (emailId && emailId.length > 1) {
        txtAnchor = 'Id';
        txtDirect = "https://mail.google.com" + window.location.pathname /* /mail/u/0/ */ + "#all/" + emailId;
        txtDirectComment = "Open via id";
    }
   
    var txtSearch = "https://mail.google.com/mail/#advanced-search/subset=all&has=" + subject + "&within=1d&date=" + dateSearch;
    
    data.link_raw = "\n\n---\nGmail: <" + txtDirect + "> | <" + txtSearch + '>';
    data.link_md = "\n\n---\nGmail: "
        + self.parent.anchorMarkdownify(txtAnchor, txtDirect, txtDirectComment)
        + " | "
        + self.parent.anchorMarkdownify("Time", txtSearch, "Advanced search email subject + time")
        
    
    // email body
    var $emailBody = $(this.selectors.emailBody, $visibleMail);
    var $emailBody1 = $emailBody[0];
    var selectedText = this.parent.getSelectedText();

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
    
    data.body_raw =  from_raw + ":\n\n" + (selectedText || this.parent.markdownify($emailBody1, false, preprocess));
    data.body_md = from_md + ":\n\n" + (selectedText || this.parent.markdownify($emailBody1, true, preprocess));

    data.attachments = emailAttachments;

    var emailImages = {};

    $('img', $emailBody1).each(function(index, value) {
        var href = ($(this).prop("src") || "").trim(); // Was attr
        var text = ($(this).prop("alt") || self.parent.uriForDisplay(href) || "").trim(); // Was attr
        var type = ($(this).prop("type") || "text/link").trim(); // Was attr
        if (href.length > 0 && text.length > 0) { // Will store as key/value pairs to automatically overide duplicates
            emailImages[href] = {'mimeType': type, 'name': decodeURIComponent(text), 'url': href, 'checked': 'false'};
        }
    });

    data.images = Object.values(emailImages);

    var t = new Date().getTime();
    
    //log('Elapsed: '+(t-startTime)/1000);
    this.parsingData = false;

    return data;
};
