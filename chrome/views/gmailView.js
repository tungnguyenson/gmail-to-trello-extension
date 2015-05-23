var GmailToTrello = GmailToTrello || {};

GmailToTrello.GmailView = function() {
    
    this.LAYOUT_DEFAULT = 0;
    this.LAYOUT_SPLIT   = 1;
    this.layoutMode = this.LAYOUT_DEFAULT;
    
    this.event = new EventTarget();
    this.data = null;
    this.gmailEmailData = null; // GMail API email data

    this.$root = null;

    this.parsingData = false;

    
    this.selectors = {
        /* selectors mapping, modify here when gmail's markup changes */
        toolbarButton: '.G-Ni:first',
        toolBarHolder: '.G-atb',
        emailSubject: '.hP',
        emailBody: '.adO:first',
        viewport: '.aeJ:first',
        viewportSplit: '.aNW:first', //reading panel
        expandedEmails: '.h7',
        hiddenEmails: '.kv',
        emailInThreads: '.kv,.h7',
        timestamp: '.gH .gK .g3:first'
    };
    
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

GmailToTrello.GmailView.prototype.parseData = function() {
    log('Gtt::parsing data...');
    if (this.parsingData)
        return;

    var data = {};

    //console.log("parseData");
    //console.log(this.gmailEmailData);
    // Last mail in thread
    var lastMail = this.gmailEmailData.threads[this.gmailEmailData.last_email];

    data.subject = lastMail.subject;
    data.timestamp = lastMail.timestamp;
    data.time = new Date(data.timestamp).toString('dd.MM.yyyy HH:mm');
    data.date = new Date(data.timestamp).toString('dd.MM.yyyy');

    var bodyText = lastMail.content_html.trim();
    bodyText = bodyText.replace(/<br[\w\/]*>/ig, "\n");
    bodyText = bodyText.replace(/<\/div>/ig, "</div>\n");
    bodyText = bodyText.replace(/<\/p>/ig, "</p>\n\n");
    bodyText = $("<html>"+bodyText+"</html>");
    bodyText = bodyText.text();

    // replace more than two newlines
    bodyText = bodyText.replace(/\n\n+/g, "\n\n");

    data.body = bodyText.trim();
    data.from = lastMail.from;

    //console.log(data);

    this.parsingData = false;

    return data;
};