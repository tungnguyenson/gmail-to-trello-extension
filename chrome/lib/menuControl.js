/**
 * MenuControl
 * @depend eventTarget.js
 */

MenuControl = function(args) {
    if (!args || !args.selectors) {
        gtt_log('MenuControl missing required selectors');
        return;
    }

    this.items = jQuery(args.selectors);
    this.event = new EventTarget();
    this.nonexclusive = args.nonexclusive || false; // default to exclusive

    for (var i = 0; i < this.items.length; i++) {
        this.items[i].menuIndex = i;
    }

    //bind event
    var self = this;
    this.items.click(function() {
        var newIndex = this.menuIndex;
        
        if (self.nonexclusive === true) {
            $(this).toggleClass('active');
        } else {
            $(this).addClass('active').siblings().removeClass('active');
            /*
            var $current = self.items.parent().find('> .active:first');
            if ($current[0]) {
                if ($current[0].menuIndex === newIndex) {
                    //gtt_log('clicked on an active menu');
                    return;
                }
                $current[0].classList.remove('active');
            }
            this.classList.add('active');
            */
        }
        self.event.fire('onMenuClick', {target: this, index: newIndex});
    });
};

