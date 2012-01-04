var jPlugins = jPlugins || {};

jPlugins.sliders = [];

/* Constructor */
jPlugins.StretchySlider = function (container, options) {
    var widget = this,
        debug = true;

    /* This plugin requires jQuery */
    if (!jQuery) {
        if (console && debug) {
            console.error("This plugin requires jQuery");
        }
        return;
    }

    widget.mover = jQuery(container);
    widget.options = jQuery.extend({}, widget.defaults, options);
    widget.items = jQuery(widget.options.items, widget.mover);
    widget.pics = jQuery(widget.options.resizeImg, widget.items);

    widget.setup();
};

/* Prototype methods */
jPlugins.StretchySlider.prototype = {
    defaults : {
        items : "> *",
        prefix : "slider",
        resizeImg : "img.stretch-resize",
        ratio : 0.6,
        minus : 0,
        resize : true
    },

    setup : function () {
        var widget = this;

        // normalise item widths
        widget.items.each(function () {
            var computedWidth = (window.getComputedStyle) ? parseFloat(window.getComputedStyle(jQuery(this).get(0)).width, 10) : jQuery(this).width(); // width calculated by jQuery is rounded down and therefore adds up lower than expected
            
            jQuery(this).css({"display" : "block", "width" : Math.ceil(computedWidth)});        
        });
        
        // stretch mover to fit contents
        widget.moverWidth = widget.getMoverWidth();
        widget.mover.width(widget.moverWidth).css("position", "absolute").addClass(widget.defaults.prefix + "-mover");

        // create viewport and hide overflow
        widget.viewport = widget.mover.wrap("<div class='" + widget.defaults.prefix + "-viewport'>").parent();
        widget.viewport.css({"height" : widget.mover.outerHeight() + "px", "overflow" : "hidden", "position" : "relative"});

         // create container
        widget.container = widget.viewport.wrap("<div class='" + widget.defaults.prefix + "-container'>").parent();

        // create slider els and append
        widget.slideTrack = jQuery(document.createElement("div")).addClass(widget.defaults.prefix + "-track").css({"position" : "relative", "clear" : "both"}).appendTo(widget.container);
        widget.slideScrubber = jQuery(document.createElement("span")).addClass(widget.defaults.prefix + "-scrubber").css({"cursor" : "pointer", "position" : "absolute"}).attr({"role" : "scrollbar", "tabindex" : "1"}).html("scrubber").appendTo(widget.slideTrack);

        // save info about slider in memory
        widget.sliderInfo = {};
        widget.sliderInfo.scrubberWidth = widget.slideScrubber.outerWidth();
        widget.sliderInfo.scrubberOffset = widget.sliderInfo.scrubberWidth / 2;
        widget.sliderInfo.scrubberOffsetX = 0;
        widget.sliderInfo.scrubberPosPc = 0;
        
        // resize pics
        widget.resize();

        // attach events
        widget.attach();

        // check width
        widget.checkWidth();
    },

    checkWidth : function () {
        var widget = this;

        if (widget.moverWidth <= widget.viewport.outerWidth()) {
            if (widget.slideTrack.is(":visible")) {
                widget.slideTrack.hide();
                widget.slideScrubber.hide();
            }
            widget.mover.css("left", "0px");
            return false;
        } else if (widget.moverWidth > widget.viewport.outerWidth()) {
            if (widget.slideTrack.is(":hidden")) {
                widget.slideTrack.show();
                widget.slideScrubber.show();
            }
            return true;
        }
    },
    
    getMoverWidth : function () {
        var widget = this,
            width = 0;
            
        widget.items.each(function () {
            width += jQuery(this).outerWidth(true);
        });
        return width;       
    },
    
    resize : function () {
        var widget = this,
            winY = jQuery(window).height(),
            width;
        
        if (widget.options.resize && widget.pics.length > 0) {
            widget.pics.attr({"height" : Math.floor((winY - widget.options.minus) * widget.options.ratio)}).removeAttr("width");
            widget.items.each(function (index, item) {
                jQuery(this).width(widget.pics.eq(index).width());
            });
            width = widget.getMoverWidth();            
            widget.moverWidth = width;
            widget.mover.width(width);
            widget.viewport.css({"height" : widget.mover.outerHeight() + "px"});
        }
    },

    sliderMove : function (clientx) {
        var widget = this,
            suggestedLeft = clientx - widget.sliderInfo.scrubberOffsetX,
            actualTrackWidth = widget.slideTrack.outerWidth() - widget.sliderInfo.scrubberWidth,
            usableTrackWidth = actualTrackWidth - 2,
            scrubLeftPos;

        if (suggestedLeft <= 0) {
            scrubLeftPos = 1;
        } else if (suggestedLeft >= actualTrackWidth) {
            scrubLeftPos = actualTrackWidth - 1;
        } else {
            scrubLeftPos = suggestedLeft;
        }

        widget.sliderInfo.scrubberPosPc = (scrubLeftPos - 1) / usableTrackWidth;
        widget.sliderReposition();
    },

    sliderReposition : function (passedTrackWidth) {
        var widget = this,
            trackWidth = passedTrackWidth || widget.slideTrack.outerWidth(),
            scrubPos = (trackWidth - widget.sliderInfo.scrubberWidth) * widget.sliderInfo.scrubberPosPc,
            moverPos = (widget.viewport.outerWidth() - widget.moverWidth) * widget.sliderInfo.scrubberPosPc;

        widget.slideScrubber.css("left", scrubPos + "px");
        widget.mover.css("left", moverPos + "px");
    },

    attach : function () {
        var widget = this;

        widget.slideScrubber.bind({
            "mousedown.Slider" : function (e) {
                e.preventDefault();
                jQuery("body").css("cursor", "pointer");
                widget.sliderInfo.active = 1;
                widget.container.addClass(widget.defaults.prefix + "-active");
                widget.slideScrubber.trigger("activate");
                widget.sliderInfo.scrubberOffsetX = e.clientX - widget.slideScrubber.get(0).offsetLeft;
            }
        });

        jQuery(document).bind({
            "mouseup.Slider" : function (e) {
                e.preventDefault();
                jQuery("body").css("cursor", "");
                if (widget.sliderInfo.active) {
                    widget.slideScrubber.trigger("deactivate");
                    widget.container.removeClass(widget.defaults.prefix + "-active");
                }
                widget.sliderInfo.active = 0;
            },
            "mousemove.Slider" : function (e) {
                if (widget.sliderInfo.active) {
                    e.preventDefault();
                    widget.sliderMove(e.clientX);
                }
            },
            "onselectstart.Slider" : function () {
                return false; // prevent text selection in IE
            }
        });

        jQuery(window).bind({
            "resize.Slider" : function () {
                var slide;

                widget.resize();
                slide = widget.checkWidth();
                if (slide) {
                    widget.sliderReposition();
                }
            }
        });
    },

    destroy : function () {
        var widget = this;

        // unbind events
        widget.slideScrubber.unbind(".Slider");
        jQuery(document).unbind(".Slider");
        jQuery(window).unbind(".Slider");

        // reset margin on items
        widget.items.css("margin", "");

        // reset mover styles
        widget.mover.css({"position" : "", "width" : ""}).removeClass(widget.defaults.prefix + "-mover");

        // remove container
        widget.viewport.unwrap();

        // remove viewport
        widget.mover.unwrap();

        // remove slider els
        widget.slideTrack.remove();
        widget.slideScrubber.remove();
    }
};

// extend jQuery
jQuery.fn.sliderify = function (options) {
    this.each(function (index, element) {
        jPlugins.sliders[index] = new jPlugins.StretchySlider(element, options);
    });
    return this;
};