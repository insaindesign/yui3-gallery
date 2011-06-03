"use strict";
/**
 * Create an shuffle plugin for the Carousel widget.
 *
 * @class Shuffler
 * @extends Y.Carousel
 * @param config {Object} Configuration options for the widget
 * @constructor
 */
function Shuffler() {
    Shuffler.superclass.constructor.apply(this, arguments);
}
// Some useful abbreviations
var JS = Y.Lang,
    NAME = "shuffler",
    BOUNDING_BOX = "boundingBox",
    CONTENT_BOX = "contentBox",
    ANIMATION = "animation",
    NUMBER_VISIBLE = "numVisible",
    // Carousel custom events
    /**
     * @event afterScroll
     * @description          fires after the Carousel has scrolled its view
     *                       port.  The index of the first and last visible
     *                       items in the view port are passed back.
     * @param {Event}  ev    The <code>afterScroll</code> event
     * @param {Number} first The index of the first visible item in the view
     *                       port
     * @param {Number} last  The index of the last visible item in the view
     *                       port
     * @type Event.Custom
     */
    AFTERSCROLL_EVENT = "afterScroll",
    /**
     * @event beforeScroll
     * @description          fires before the Carousel scrolls its view port.
     *                       The index of the first and last visible items
     *                       in the view port are passed back.
     * @param {Event}  ev    The <code>afterScroll</code> event
     * @param {Number} first The index of the first visible item in the view
     *                       port
     * @param {Number} last  The index of the last visible item in the view
     *                       port
     * @type Event.Custom
     */
    BEFORESCROLL_EVENT = "beforeScroll";
/**
 * The identity of the plugin.
 *
 * @property Shuffler.NAME
 * @type String
 * @default "Shuffler"
 * @readOnly
 * @protected
 * @static
 */
Shuffler.NAME = NAME;
/**
 * The namespace for the plugin.
 *
 * @property Shuffler.NS
 * @type String
 * @default "anim"
 * @readOnly
 * @protected
 * @static
 */
Shuffler.NS = NAME;
/**
 * Static property used to define the default attribute configuration of the
 * plugin.
 *
 * @property Shuffler.ATTRS
 * @type Object
 * @protected
 * @static
 */
Shuffler.ATTRS = {
    /**
     * The configuration of the animation attributes for the Carousel. The
     * speed attribute takes the value in seconds; the effect attribute is used
     * to set one of the Animation Utility's built-in effects
     * (like YAHOO.util.Easing.easeOut)
     */
    animation: {
        validator: "_validateAnimation",
        value: {
            speed: 0
        }
    },
    autoPlayInterval : {
        value : 0    
    },
    height: {
        value: 310
    },
    hidePagnination : {
        value : false
    },
    img: {
        value: '.img-cont'
    },
    isVertical : {
        value : false
    },
    isCircular : {
        value : false
    },
    item : {
        value : 'li'
    },
    numVisible: {
        value: 2
    },
    overflow: {
        value: 20
    },
    selectedItem : {
        value : 0
    },
    txt: {
        value: '.abstract'
    },
    width: {
        value: 550
    }
};

Y.Shuffler = Y.extend(Shuffler, Y.Widget, {
    
    bindUI : function () {
        var self = this;
        Y.log("bindUI invoked", "info", NAME);
        if (self.get('autoPlayInterval')) {
            this.after("selectedItemChange", self._restartTimeout, self);
        }
        self._paginator.on("currentPageChange", self._goTo, self);
    },
    
    initializer : function () {
        var self = this;
        self._updateItems();
        if (self._items.size() - 2 < self.get("numVisible") * 2) {
            self.set("numVisible", Math.floor((self._items.size() - 2) / 2));
        }
    },
    
    renderUI: function () {
        var self = this;
        Y.log("renderUI invoked", "info", NAME);
        self._getSizes();
        self._paginator = new Y.Paginate({
            boundingBox : self.get(BOUNDING_BOX),
            isCircular : self.get("isCircular"),
            isVertical : self.get("isVertical"),
            recordsPerPage : 1,
            recordsTotal : self._items.size(),
            template : "{PreviousPageLink} {PageItems} {NextPageLink}"
        });
        self._paginator.render();
    },
    /**
     * The scroll manager to focus an item.
     *
     * @method shuffleTo
     * @param index {Number} The index to be scrolled to
     * @public
     */
    scrollTo: function (index) {
        var self = this,
            animation = self.get(ANIMATION),
            cb = self.get(CONTENT_BOX),
            numItems = self.get("numItems"),
            circular = self.get("isCircular"),
            from = self.get('selectedItem');
            
        Y.log("scrollTo invoked", "info", NAME);
            
        if (circular) {
            index = (index < 0) ? numItems + index : (index >= numItems) ? index - numItems : index;
        } else {
            index = (index <= 0) ? 0 : (index >= numItems) ? numItems - 1 : index;
        }
        //there is no difference between then and now so abort
        if (from === index) {
            return;
        }
        self.fire(BEFORESCROLL_EVENT, index);
        
        Y.log("from(" + from + ") shuffleTo(" + index + ")", "info", NAME);
        //should we be animating or jumping?
        if (animation.speed) {
            self._animateTo(index, from);
        } else {
            self._jumpTo(index);
        }
        self.fire(AFTERSCROLL_EVENT, index);
        self.set("selectedItem", index);
    },
    
    syncUI: function () {
        var self = this;        
        if (self.get('autoPlayInterval')) {
            self._restartTimeout();
        }
        self._jumpTo(self.get('selectedItem'));
    },
    /**
     * Animate to a spot with a smooth transition
     *
     * @method _animateTo
     * @param to {Number} the new selected item
     * @param from {Number} the previously selected item
     * @protected
     */
    _animateTo: function (to, from) {
        var self = this,
            cb = self.get('contentBox'),
            animation = self.get(ANIMATION),
            circular = self.get("isCircular"),
            ex = self.get(NUMBER_VISIBLE) + 1,
            bdelta = to - ex,
            adelta = to + ex,
            ln = self._imgs.size(),
            dir = (to > from) ? -1 : 1;
            
        if (circular) {
            if (to === ln - 1 && from === 0 || from === ln - 1 && to === 0) {
                dir = -dir;
            }
        }
        //scroll the images
        self._imgs.each(function (item, i) {
            var index = (circular) ? (bdelta < 0 && i > adelta) ? i - ln : (adelta >= ln - 1 && i < bdelta) ? ln + i : i : i,
                size = (index < bdelta) ? 0 : (index > adelta) ? self._sizes.length - 1 : index - bdelta, // left : right, in range
                prev = (size > -1) ? size - dir : 0, 
                mid;
            
            if (i === to || i === from) {
                mid = (i === from) ? 1 * dir : -1 * dir;
                item.transition(Y.merge(self._tweens[ex + (0.5 * mid)], {
                    duration : animation.speed / 2,
                    easing : 'ease-in',
                    left : (!self.get("isVertical")) ? (self._sizes[size].width / 3 * mid) + 'px' : self._tweens[ex + (0.5 * mid)].left,
                    top : (self.get("isVertical")) ? (self._sizes[size].height / 3 * -mid) + 'px' : self._tweens[ex + (0.5 * mid)].top,
                    opacity : 1
                }), function () {
                    item.setStyle('zIndex', (i === to) ? self._sizes[ex].zIndex : self._sizes[ex - 0.5].zIndex);
                    item.transition(Y.merge(self._tweens[size], {
                        duration : animation.speed / 2,
                        easing : 'ease-out'
                    }), function () {
                        item.setStyle('zIndex', self._sizes[size].zIndex);                        
                    });
                });                
            } else {
                item.transition(Y.merge(self._tweens[size], {
                    duration : animation.speed,
                    easing : 'ease-out'
                }), function () {
                    item.setStyle('zIndex', self._sizes[size].zIndex);    
                });
            }
        }, self);
        //fade text in and out
        self._txts.each(function (item, i) {
            var trans = {
                    duration : animation.speed,
                    easing : 'ease-out',
                    opacity : {
                        duration : animation.speed,
                        value : 0
                    }
                };
            //in the range
            if (i === to) {
                item.setStyle('display', 'block');
                item.setStyle('zIndex', '2');
                /*item.setStyle('opacity', '1');*/
                trans.opacity.delay = trans.opacity.duration;
                trans.opacity.value = 1;
                item.transition(trans);
            } else if (i === from) {
                item.setStyle('zIndex', '1');
                item.transition(trans, function () {
                    item.setStyle('display', 'none');    
                });
            }
        }, self);
    },
    
    _getSizes : function () {
        var self = this,
            middle = self.get(NUMBER_VISIBLE) + 1,
            dx = self.get("overflow"),
            width = self.get("width"),
            height = self.get("height"),
            selectedItem = self.get("selectedItem"),
            i, il, delta;
                
        Y.log("_getSizes invoked", "info", NAME);
        
        self._sizes.length = middle * 2 + 1;
        for (i = 0, il = self._sizes.length; i <= il - 1; i += 0.5) {
            delta = (i > middle) ? il - i - 1 : i;
            self._sizes[i] = {
                height: Math.floor(height - Math.floor(dx * 4 * (middle - delta))),
                opacity: 1 * delta / middle,
                zIndex: Math.floor((il * 2) - (2 * (middle - delta))) || 2
            };
            if (self._sizes[i].height < 5) {
                self._sizes[i].height = 9;
            }
            self._sizes[i].width = (self._sizes[i].height / height) * width;
            if (self.get("isVertical")) {
                self._sizes[i].left = (width - self._sizes[i].width) / 2;
                self._sizes[i].top = (i > middle) ? -((middle - delta) * dx) : height + (dx * (middle - delta)) - self._sizes[i].height;
            } else {
                self._sizes[i].left = (i > middle) ? width - self._sizes[delta].left - self._sizes[delta].width : (i * dx) - (dx * middle);
                self._sizes[i].top = height - self._sizes[i].height - Math.floor(dx * (middle - delta));
            }
            //with units and no zindex
            self._tweens[i] = {
                width : self._sizes[i].width + 'px',
                height : self._sizes[i].height + 'px',
                left : self._sizes[i].left + 'px',
                top : self._sizes[i].top + 'px',
                opacity : self._sizes[i].opacity
            };
        }        
    },
    /**
     * The event listener for when the pagination changes
     *
     * @method _goTo
     * @param {Object} config The animation configuration
     * @protected
     */
    _goTo : function (e) {
        var self = this;
        Y.log('go to invoked', 'log', NAME);
        self.scrollTo(e.newVal - 1);
    },
    /**
     * Jump to a spot
     *
     * @method _animateTo
     * @param to {Number} the new selected item
     * @protected
     */
    _jumpTo: function (to) {
        var self = this,
            circular = self.get("isCircular"),
            ln = self._imgs.size(),
            ex = self.get(NUMBER_VISIBLE) + 1,
            bdelta = to - ex,
            adelta = to + ex;
        self._imgs.each(function (item, i) {
            var index = (circular) ? (bdelta < 0 && i > adelta) ? i - ln : (adelta >= ln - 1 && i < bdelta) ? ln + i : i : i,
                size = (index < bdelta) ? 0 : (index > adelta) ? self._sizes.length - 1 : index - bdelta; // left : right, center
            item.setStyles(self._sizes[size]);
        }, self);
        self._txts.each(function (item, i) {
            item.setStyle('display', (i === to) ? 'block' : 'none');
            item.setStyle('opacity', (i === to) ? 1 : 0);
        }, self);
    },
    
    _paginator : null,
    
    _restartTimeout : function() {
        var self = this;
        clearTimeout(self.timeout);
        self.timeout = setTimeout(function () {
            self._paginator.getNextPage();
        }, self.get('autoPlayInterval'));
    },
    
    _timeout : null,
    
    /**
     * The item manager (fetches all the items, images and text nodes)
     *
     * @method _updateItems
     * @protected
     */
    _updateItems: function () {
        var self = this,
            cb = self.get(CONTENT_BOX);
        Y.log("update items invoked", "info", NAME);
        self._items = cb.all(self.get("item"));
        self._imgs = cb.all(self.get("img"));
        self._txts = cb.all(self.get("txt"));
    },
    /**
     * Validate the animation configuration attribute.
     *
     * @method _validateAnimation
     * @param {Object} config The animation configuration
     * @protected
     */
    _validateAnimation: function (config) {
        var rv = false;
        Y.log("_validateAnimation called with " + config, "info", NAME);
        if (JS.isObject(config)) {
            if (JS.isNumber(config.speed)) {
                rv = true;
            }
            if (!JS.isUndefined(config.effect) && !JS.isFunction(config.effect)) {
                rv = false;
            }
        }
        return rv;
    },
    
    /**
     * the sizes to jump between
     *
     * @property _sizes
     * @protected
     */
    _sizes: {},
    
    /**
     * the sizes to tween between
     *
     * @property _sizes
     * @protected
     */
    _tweens: {},
    _imgs: [],
    _txts: []
});