var GmailToTrello = GmailToTrello || {};

GmailToTrello.GmailView = function() {

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

    this.parsingData = true;
    var startTime = new Date().getTime();
    var data = {};

    // subject
    this.$emailSubject = jQuery(this.selectors.emailSubject, this.$root);
    data.subject = this.$emailSubject.text().trim();

    // find active email
    if (this.layoutMode === this.LAYOUT_SPLIT)
        $viewport = jQuery(this.selectors.viewportSplit, this.$root);
    else
        $viewport = jQuery(this.selectors.viewport, this.$root);
    log($viewport);
    var y0 = $viewport.offset().top;
    //log(y0);
    var $visibleMail = null;
    // parse expanded emails again
    jQuery(this.selectors.expandedEmails, this.$root).each(function() {
//        log(this);
//        log(this.offsetTop + ':'+jQuery(this).offset().top);
        $this = jQuery(this);
        if ($visibleMail === null && $this.offset().top >= y0)
            $visibleMail = $this;
    });

    // email body
    var $emailBody = jQuery(this.selectors.emailBody, $visibleMail);
    data.body = $emailBody.text();
    /*
    data.body = "";
    var tmpText;
    var newLinesRegex = /\n/g;
    var nonWhiteSpaceRegex = /\S/;
    $emailBody.find('p.MsoNormal').each(function () {
        tmpText = $(this).text().replace(newLinesRegex, '')
        if (tmpText.match(nonWhiteSpaceRegex))
            data.body += tmpText + "\n\n";
    });
    */

    // timestamp
    var $time = jQuery(this.selectors.timestamp, $visibleMail);
    var timeValue = ($time) ? $time.attr('title') : '';
    timeValue = timeValue ? timeValue.replace('at', '') : '';
//    log(timeValue);
    if (timeValue !== '') {
        timeValue = Date.parse(timeValue);
//        log(timeValue);
        if (timeValue)
            timeValue = timeValue.toString('MMM d, yyyy');
    }

    data.time = timeValue;
    //log(data);

    var t = new Date().getTime();
    //log(data);
    //log('Elapsed: '+(t-startTime)/1000);
    this.parsingData = false;

    return data;
};
