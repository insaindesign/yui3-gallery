/**
 * Create an shuffle plugin for the Carousel widget.
 *
 * @class ShufflerPlugin
 * @extends Plugin.Base
 * @param config {Object} Configuration options for the widget
 * @constructor
 */
function ShufflerPlugin() {
    ShufflerPlugin.superclass.constructor.apply(this, arguments);
}
// Some useful abbreviations
var JS = Y.Lang,
    HOST = "host",
    CONTENT_BOX = "contentBox",
    ANIMATION = "animation",
    EXTRAS = "extras",
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
 * @property ShufflerPlugin.NAME
 * @type String
 * @default "ShufflerPlugin"
 * @readOnly
 * @protected
 * @static
 */
ShufflerPlugin.NAME = "ShufflerPlugin";
/**
 * The namespace for the plugin.
 *
 * @property ShufflerPlugin.NS
 * @type String
 * @default "anim"
 * @readOnly
 * @protected
 * @static
 */
ShufflerPlugin.NS = "shuffler";
/**
 * Static property used to define the default attribute configuration of the
 * plugin.
 *
 * @property ShufflerPlugin.ATTRS
 * @type Object
 * @protected
 * @static
 */
ShufflerPlugin.ATTRS = {
    /**
     * The configuration of the animation attributes for the Carousel. The
     * speed attribute takes the value in seconds; the effect attribute is used
     * to set one of the Animation Utility's built-in effects
     * (like YAHOO.util.Easing.easeOut)
     */
    animation: {
        validator: "_validateAnimation",
        value: {
            speed: 0,
            effect: Y.Easing.easeOut
        }
    },
    img: {
        value: '.img-cont'
    },
    txt: {
        value: '.abstract'
    },
    extras: {
        value: 2
    },
    overflow: {
        value: 20
    },
    height: {
        value: 310
    },
    width: {
        value: 550
    }
};
Y.ShufflerPlugin = Y.extend(ShufflerPlugin, Y.Plugin.Base, {
    /**
     * Initialize the Animation plugin and plug the necessary events.
     *
     * @method initializer
     * @protected
     */
    initializer: function (config) {
        var self = this,
            carousel = self.get(HOST);
        Y.log("initialised", "info", ShufflerPlugin.NAME);
        carousel.set("numVisible", 1);
        carousel.after("numItemsChange", self.updateItems, self);
        self.beforeHostMethod("scrollTo", self.shuffleTo);
        self.beforeHostMethod("syncUI", self.syncUI);
        self.beforeHostMethod("renderUI", self.renderUI);
    },
    renderUI: function () {
        var self = this,
			carousel = self.get(HOST);
        Y.log("renderUI invoked", "info", ShufflerPlugin.NAME);
        if (!carousel.get("hidePagination")) {
            carousel._renderNavigation();
        }
        self.updateItems();
        return new Y.Do.Prevent();
    },
    syncUI: function () {
        var self = this,
			carousel = self.get(HOST),
            middle = self.get(EXTRAS) + 1,
            dx = self.get("overflow"),
            width = self.get("width"),
            height = self.get("height"),
            i, il, delta;
        Y.log("syncUI invoked", "info", ShufflerPlugin.NAME);
        for (i = 0, il = middle * 2 + 1; i < il; i += 1) {
            delta = (i > middle) ? il - i - 1 : i;
            self._sizes[i] = {
                width: Math.floor(width - Math.floor(dx * 4 * (middle - delta))),
                height: Math.floor(height - Math.floor(dx * 4 * (middle - delta))),
                zIndex: Math.floor(il * delta / middle) || 1,
                opacity: (1 * delta / middle)
            };
            if (self._sizes[i].width < 1) {
                self._sizes[i].width = 1;
            }
            if (self._sizes[i].height < 1) {
                self._sizes[i].height = 1;
            }
            if (carousel.get("isVertical")) {
                self._sizes[i].left = (width - self._sizes[i].width) / 2;
                self._sizes[i].top = (i > middle) ? -((middle - delta) * dx) : height + (dx * (middle - delta)) - self._sizes[i].height;
            } else {
                self._sizes[i].left = (i > middle) ? width - self._sizes[delta].left - self._sizes[delta].width : (i * dx) - (dx * middle);
                self._sizes[i].top = height - self._sizes[i].height - Math.floor(dx * (middle - delta));
            }
        }
        self._jumpTo(carousel.getFirstVisible());
    },
    updateItems: function () {
        var self = this,
			carousel = self.get(HOST),
            cb = carousel.get(CONTENT_BOX);
        Y.log("update items invoked", "info", ShufflerPlugin.NAME);
        self._imgs = cb.all(self.get("img"));
        self._txts = cb.all(self.get("txt"));
    },
    /**
     * Animate and scroll the Carousel widget to make the item at index
     * visible.
     *
     * @method shuffleTo
     * @param {Number} index The index to be scrolled to
     * @public
     */
    shuffleTo: function (index) {
        var self = this,
            carousel = self.get(HOST),
            animation = self.get(ANIMATION),
            cb = carousel.get(CONTENT_BOX),
            numItems = carousel.get("numItems"),
            circular = carousel.get("isCircular"),
            from = carousel.getFirstVisible(),
            eventObj;
        if (circular) {
            index = (index < 0) ? numItems + index : (index >= numItems) ? index - numItems : index;
        } else {
            index = (index <= 0) ? 0 : (index >= numItems) ? numItems - 1 : index;
        }
        //there is no difference between then and now so abort
        if (from === index) {
            return;
        }
        eventObj = {
            first: index,
            last: index + carousel.get("numVisible")
        };
        Y.log("from(" + from + ") shuffleTo(" + index + ")", "info", ShufflerPlugin.NAME);
        carousel.fire(BEFORESCROLL_EVENT, eventObj);
        //should we be animating or jumping?
        if (animation.speed) {
            self._animateTo(index, from);
        } else {
            self._jumpTo(index);
        }
        carousel.fire(AFTERSCROLL_EVENT, eventObj);
        carousel.set("selectedItem", index);
        return new Y.Do.Prevent();
    },
    _jumpTo: function (index) {
        var self = this,
            carousel = self.get(HOST),
            circular = carousel.get("isCircular"),
            ln = self._imgs.size(),
			ex = self.get(EXTRAS) + 1,
			bdelta = index - ex,
			adelta = index + ex;
        self._imgs.each(function (item, i) {
            var index = (circular) ? (bdelta < 0 && i > adelta) ? i - ln : (adelta >= ln - 1 && i < bdelta) ? ln + i : i : i,
				size = (index < bdelta) ? 0 : (index > adelta) ? self._sizes.length - 1 : index - bdelta; // left : right, center
            item.setStyles(self._sizes[size]);
		}, self);
        self._txts.each(function (item, i) {
            item.setStyle('display', (i === index) ? 'block' : 'none');
            item.setStyle('opacity', (i === index) ? 1 : 0);
        }, self);
    },
    _animateTo: function (to, from) {
        var self = this,
            carousel = self.get(HOST),
			cb = carousel.get('contentBox'),
            animation = self.get(ANIMATION),
            circular = carousel.get("isCircular"),
            ex = self.get(EXTRAS) + 1,
            bdelta = to - ex,
            adelta = to + ex,
            ln = self._imgs.size(),
            dir = (to > from) ? -1 : 1,
            txtOn = {
                opacity: 1
            },
            txtOff = {
                opacity: 0
            },
            duration = animation.speed;
			
        if (circular) {
            if (to === ln - 1 && from === 0 || from === ln - 1 && to === 0) {
                dir = -dir;
            }
        }
		//scroll the biache
        self._imgs.each(function (item, i) {
			var index = (circular) ? (bdelta < 0 && i > adelta) ? i - ln : (adelta >= ln - 1 && i < bdelta) ? ln + i : i : i,
				size = (index < bdelta) ? 0 : (index > adelta) ? self._sizes.length - 1 : index - bdelta, // left : right, in range
				prev = (size > 0) ? size - dir : 0,
				toObj = self._sizes[size], 
				anim = new Y.Anim({
					node: item,
					to: toObj,
					duration: duration,
					easing: animation.effect
				});
		
			if (size === ex) {
				item.setStyles(self._sizes[prev]);
				item.setStyle("z-index", self._sizes[size].zIndex);		
				toObj = {
					height : toObj.height,
					width : toObj.width,
					opacity : toObj.opacity,
					curve : [[cb.getX() - (dir * self.get("width") * 3/4), cb.getY() + self.get("overflow")], [cb.getX(), cb.getY()]]
				};
				if (carousel.get("isVertical")) {
					toObj.curve = [[cb.getX() - self.get("overflow"), cb.getY() + (dir * self.get("height"))], [cb.getX(), cb.getY()]];	
				}
				anim.set("to", toObj);/*
				anim.on("tween", function (e) { 
					console.warn(e);
					console.warn(this);
					//console.log(e.get("iteration"));
					//console.log(e.get("node"));
					
				});*/
			}
			if (prev === ex) {
				item.setStyle("z-index", self._sizes[size].zIndex);	
				toObj = {
					height : toObj.height,
					width : toObj.width,
					opacity : toObj.opacity,
					zIndex : toObj.zIndex,
					curve : [[cb.getX() + (dir * self.get("width") * 3/4), cb.getY() - self.get("overflow")], [cb.getX() + toObj.left, cb.getY() + toObj.top]]
				};
				if (carousel.get("isVertical")) {
					toObj.curve = [[cb.getX() + self.get("overflow"), cb.getY() - (dir * self.get("height"))], [cb.getX() + toObj.left, cb.getY() + toObj.top]];	
				}
				anim.set("to", toObj);
			}
            anim.run();
        }, self);
        //fade text in and out
        self._txts.each(function (item, i) {
            var anim = new Y.Anim({
                node: item,
                from: txtOn,
                to: txtOff,
                duration: duration,
                easing: animation.effect
            });
            item.setStyle('display', 'block');
            //in the range
            if (i === to) {
                anim.set("from", txtOff);
                anim.set("to", txtOn);
                anim.run();
            } else if (i === from) {
                anim.run();
            } else {
                item.setStyle('display', 'none');
                item.setStyles(txtOff);
            }
        }, self);
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
        Y.log("_validateAnimation called with " + config, "info", ShufflerPlugin.NAME);
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
    _sizes: [],
    _imgs: [],
    _txts: []
});