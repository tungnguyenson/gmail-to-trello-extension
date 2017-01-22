var GmailToTrello = GmailToTrello || {};

GmailToTrello.GmailView = function() {
    var self = this;

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
    
    var result = this.$toolBar && this.$toolBarHolder && this.$toolBar.length > 0 && this.$expandedEmails.length > 0 && this.$toolBarHolder !== null;
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

GmailToTrello.GmailView.prototype.escapeRegExp = function (str) {
    return str.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
}

GmailToTrello.GmailView.prototype.markdownify = function($emailBody) {
    if ($emailBody.length < 1) {
        log('markdownify requires emailBody');
        return;
    }
    var self = this;
    var body = $emailBody.innerText;
    var $html = $emailBody.innerHTML;

    var seen_already = {};
    // links:
    // a -> [text](html)
    $('a', $html).each(function(index, value) {
        var text = $(this).text();
        if (text.length > 4) { // Only replace links that have a chance of being unique in the text (x.dom):
            var replace = text;
            var uri = $(this).attr("href");
            var comment = ' "' + text + ' via ' + uri + '"';
            if (seen_already[text] !== 1) {
                seen_already[text] = 1;
                if (text == uri) {
                    comment = ' "Open ' + uri + '"';
                    var re = RegExp("^\\w+:\/\/([\\w\\.]+).*?([\\w\\.]+)$");
                    var matched = text.match(re);
                    if (matched.length > 1) {
                        replace = matched[1] + ':' + matched[2]; // Make a nicer looking visible text. [0] = text
                    }
                }
                var re = new RegExp(self.escapeRegExp(text), "gi");
                var replaced = body.replace(re, "[" + replace + "](" + uri + comment + ')');
                body = replaced;
            }
        }
    });

    /* DISABLED (Ace, 16-Jan-2017): Images kinda make a mess, until requested lets not markdownify them:
    // images:
    // img -> ![alt_text](html)
    $('img', $html).each(function(index, value) {
        var text = $(this).attr("alt") || '<no-text>';
        var uri = $(this).attr("src") || '<no-uri>';
        var re = new RegExp(text, "gi");
        var replaced = body.replace(re, "![" + text + "](" + uri + ' "' + text + ' via ' + uri + '"');
        body = replaced;
    });
    */

    // bullet lists:
    // li -> " * "
    $('li', $html).each(function(index, value) {
        var text = $(this).text();
        var re = new RegExp(self.escapeRegExp(text), "gi");
        var replaced = body.replace(re, "\n * " + text + "\n");
        body = replaced;
    });

    // headers:
    // H1 -> #
    // H2 -> ##
    // H3 -> ###
    // H4 -> ####
    // H5 -> #####
    // H6 -> ######
     $(':header', $html).each(function(index, value) {
        var text = $(this).text();
        var nodeName = $(this).prop("nodeName") || "";
        var x = '0' + nodeName.substr(-1);
        var re = new RegExp(self.escapeRegExp(text), "gi");
        var replaced = body.replace(re, "\n" + ('#'.repeat(x)) + " " + text + "\n");
        body = replaced;
    });

    // bold: b -> **text**
     $('b', $html).each(function(index, value) {
        var text = $(this).text();
        var re = new RegExp(self.escapeRegExp(text), "gi");
        var replaced = body.replace(re, " **" + text + "** ");
        body = replaced;
    });

    // minimize newlines:
    var replaced = body.replace(/\s{2,}/g, function(str) {
        if (str.indexOf("\n\n\n") !== -1)
            return "\n\n";
        else if (str.indexOf("\n") !== -1)
            return "\n";
        else
            return ' ';
    });

    return replaced;
}

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
    var $emailName = $(this.selectors.emailName, $visibleMail).attr('name').trim();
    var $emailAddress = $(this.selectors.emailAddress, $visibleMail).attr('email').trim();
    var emailAttachments = $(this.selectors.emailAttachments, $visibleMail).map( function() {
        var item = $(this).attr('download_url');
        if (item.length > 0) {
            var attachment = item.match(/^([^:]+)\s*:\s*([^:]+)\s*:\s*(.+)$/);
            if (attachment.length > 3) {
                return {'mimeType': attachment[1], 'name': decodeURIComponent(attachment[2]), 'url': attachment[3], 'checked': 'false'}; // [0] is the whole string
            }
        }
    });
    // var $emailAttachments = $(this.selectors.emailAttachments, $visibleMail).attr('download_url');

    // email body
    var $emailBody = $(this.selectors.emailBody, $visibleMail);
    var bodyText = this.markdownify($emailBody[0]);

    // timestamp
    var $time = $(this.selectors.timestamp, $visibleMail);
    var timeValue = ($time) ? $time.attr('title') : '';
    timeValue = timeValue ? timeValue.replace('at', '') : '';
    if (timeValue !== '') {
        timeValue = Date.parse(timeValue);
    }

    data.time = timeValue ? timeValue.toString(this.dateFormat || 'MMM d, yyyy') : '';

    data.body = '[' + $emailName + '](mailto:' + $emailAddress + ' "Email ' + $emailName + ' <' + $emailAddress + '>") on ' + // FYI (Ace, 10-Jan-2017): [name](url) is markdown syntax
        data.time + ":\n\n" + bodyText.trim();
    
    data.attachments = emailAttachments;

    var t = new Date().getTime();
    
    //log('Elapsed: '+(t-startTime)/1000);
    this.parsingData = false;

    return data;
};