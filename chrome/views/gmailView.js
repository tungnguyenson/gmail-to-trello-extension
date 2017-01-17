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

GmailToTrello.GmailView.prototype.replaceHtml = function(text, delimiter, param, replacement) {
    if (text.length < 1) {
        log("replaceHtml requires text");
        return;
    } else if (delimiter.length < 1) {
        log("replaceHtml requires delimiter");
        return;
    }

    replacement = replacement || ''; // Assure it's not undefined
    param = param || ''; // Assure it's not undefined

    var re = new RegExp("<" + delimiter + "\\s*?" + param + "[^>]*?>([^<]*?)", "gi");
    var re_end = new RegExp("<\/" + delimiter + "[^>]*?>")

    var newText = text.replace(re, replacement);
    text = newText;
    newText = text.replace(re_end, replacement.length < 2 ? replacement : '');
    return newText;
}

GmailToTrello.GmailView.prototype.htmlToMarkdown = function(text) {
    var newText;
    newText = this.replaceHtml(text, 'div', '', '');
    text = newText;
    newText = this.replaceHtml(text, 'span', '', '');
    text = newText;
    newText = this.replaceHtml(text, 'br', '', '\n');
    text = newText;
    newText = this.replaceHtml(text, 'b', '', '*');
    text = newText;
    newText = this.replaceHtml(text, 'li', '', ' * $1');
    text = newText;
    newText = this.replaceHtml(text, 'a', '[^>]*?href\\s*=\\s*"([^"]+)"', '[$2]($1)');
    text = newText;
    newText = this.replaceHtml(text, '\\w+', '', '');
    text = newText;
    newText = this.replaceHtml(text, '\/[^>]*?>', '', '');
    text = newText;

    $.each({
        '&amp;': '&', 
        '&lt;': '<',
        '&gt;': '>',
        '&quot;': '"',
        '&nbsp;': ' '
        }, function (key, value) {
            var re = new RegExp(key, "gi");
            newText = text.replace(re, value);
            text = newText;
    });
    newText = text.replace(/\s{2,}/g, function(str) {
        if (str.indexOf("\n\n\n") !== false)
            return "\n\n";
        else if (str.indexOf("\n") !== false)
            return "\n";
        else
            return ' ';
    });
    text = newText;

    return text;
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

    // email body
    var $emailBody = $(this.selectors.emailBody, $visibleMail);
    var bodyText = this.htmlToMarkdown($emailBody[0].innerHTML);

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
    
    var t = new Date().getTime();
    
    //log('Elapsed: '+(t-startTime)/1000);
    this.parsingData = false;

    return data;
};