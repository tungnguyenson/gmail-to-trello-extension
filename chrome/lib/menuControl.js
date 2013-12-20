/**
 * MenuControl
 * @depend eventTarget.js
 */

MenuControl = function(itemSelector) {
    this.items = jQuery(itemSelector);
    this.event = new EventTarget();

    for (var i = 0; i < this.items.length; i++) {
        this.items[i].menuIndex = i;
    }

    //bind event
    var self = this;
    this.items.click(function() {
        var $current = self.items.parent().find('> .active:first');
        var newIndex = this.menuIndex;
        //console.log('Menu Item click: ' + newIndex);
        //console.log(this);
        if ($current[0]) {
            if ($current[0].menuIndex === newIndex) {
                //console.log('clicked on an active menu');
                return;
            }
            $current[0].classList.remove('active');
        }
        this.classList.add('active');
        self.event.fire('onMenuClick', {target: this, index: newIndex});
    });
};
