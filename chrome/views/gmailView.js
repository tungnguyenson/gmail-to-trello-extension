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
        emailBody: '.adO:first',
        emailAttachments: '.aZo', // Was: '.aQy',
        viewport: '.aeJ:first',
        viewportSplit: '.aNW:first', //reading panel
        expandedEmails: '.h7',
        hiddenEmails: '.kv',
        emailInThreads: '.kv,.h7',
        timestamp: '.gH .gK .g3:first'
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

    this.parsingData = true;
    var startTime = new Date().getTime();
    var data = {};

    // subject
    this.$emailSubject = $(this.selectors.emailSubject, this.$root);
    data.subject = this.$emailSubject.text().trim();

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

    // email name
    var emailName = $(this.selectors.emailName, $visibleMail).attr('name').trim();
    var emailAddress = $(this.selectors.emailAddress, $visibleMail).attr('email').trim();
    var emailAttachments = $(this.selectors.emailAttachments, $visibleMail).map(function() {
        var item = $(this).attr('download_url');
        if (item && item.length > 0) {
            var attachment = item.match(/^([^:]+)\s*:\s*([^:]+)\s*:\s*(.+)$/);
            if (attachment && attachment.length > 3) {
                return {'mimeType': attachment[1], 'name': decodeURIComponent(attachment[2]), 'url': attachment[3], 'checked': 'false'}; // [0] is the whole string
            }
        }
    });
    
    // timestamp
    var $time = $(this.selectors.timestamp, $visibleMail);
    var timeValue = ($time) ? $time.attr('title') : '';
    timeValue = timeValue ? timeValue.replace(' at ', ' ') : ''; // BUG (Ace, 29-Jan-2017): Replacing 'at' without spaces will mess up "Sat" which will then cause Date.parse to fail.
    if (timeValue !== '') {
        timeValue = Date.parse(timeValue);
    }

    data.time = timeValue ? timeValue.toString(this.dateFormat || 'MMM d, yyyy') : 'recently';

    data.from_raw = emailName + ' <' + emailAddress + '> on ' + data.time;
    data.from_md = '[' + emailName + '](mailto:' + emailAddress + ' "Email ' + emailAddress + '") on ' + // FYI (Ace, 10-Jan-2017): [name](url "comment") is markdown syntax
        data.time;

    var email = emailAddress.replace('@', '\\@');
    var txtDirect = "["+email+"](" + document.location.href + " \"Direct link to creator's email\")";

    var subject = encodeURIComponent(data.subject);

    var dateSearch = encodeURIComponent(data.time);
    var txtDirect_raw = "https://mail.google.com/mail/#advanced-search/subset=all&has=" + subject + "&within=1d&date=" + dateSearch;
    var txtDirect_md = "[Search:Time](" + txtDirect_raw + " \"Advanced search email subject + time\")";
    var txtSearch_raw = "https://mail.google.com/mail/#search/" + subject;
    var txtSearch_md = "[Search:Subject](" + txtSearch_raw + " \"Search email subject\")";

    data.link_raw = "\n---\nGmail import: " + txtDirect_raw + " | " + txtSearch_raw;
    data.link_md = "\n---\nGmail import: " + txtDirect_md + " | " + txtSearch_md;

    
    // email body
    var $emailBody = $(this.selectors.emailBody, $visibleMail);
    
    data.body_raw =  data.from_raw + ":\n\n" + this.parent.markdownify($emailBody[0], false);
    data.body_md = data.from_md + ":\n\n" + this.parent.markdownify($emailBody[0]);

    data.attachments = emailAttachments;

    var t = new Date().getTime();
    
    //log('Elapsed: '+(t-startTime)/1000);
    this.parsingData = false;

    return data;
};
