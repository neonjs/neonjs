/*

The Neon Javascript Library: core 
All of Neon's core functionality in a small package

Part of the Neon Javascript Library
Copyright (c) 2011, Thomas Rutter
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:
	* Redistributions of source code must retain the above copyright
		notice, this list of conditions and the following disclaimer.
	* Redistributions in binary form must reproduce the above copyright
		notice, this list of conditions and the following disclaimer in the
		documentation and/or other materials provided with the distribution.
	* Neither the name of the author nor the names of contributors may be used
		to endorse or promote products derived from this software without
		specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

--

See http://neonjs.com for documentation and examples of use.

*/

/*jslint browser:true,white:true,evil:true,sloppy:true,plusplus:true,bitwise:true,vars:true,regexp:true,confusion:true,unparam:true */
/*global neon:true,attachEvent,window,self,top,opera,ActiveXObject */

/**
@preserve The Neon Javascript Library
Copyright (c) Thomas Rutter 2011
http://neonjs.com
http://neonjs.com/license
*/

// overwrites any existing neon object
neon = (function() {

	// ##################################################################
	// PRIVATE VARIABLES
	
	var
		neon = {},
		loadstate = {}, // for each file, loadstate 1 = loading, 2 = loaded
		eventstore = {}, // remembering event handlers
		animations = [], // information about properties currently animating
		readyqueue = [], // just callbacks to execute when ready
		animationschedule, // next scheduled tick or 0/undefined if stopped
		ready = 0, // 0 = not ready, 1 = ready
		gid = 0;

	var getprevioussibling = function(element) {
	// find the previous sibling of this element which is an element node
		for (element = element.previousSibling; element;
			element = element.previousSibling) {
			if (element.nodeType === 1) {
				return element;
			}
		}
	};

	var checkinarray = {
		" " : function(elements, newelement) {
			var i;
			for (i = elements.length;i--;) {
				if (elements[i].compareDocumentPosition ?
						elements[i].compareDocumentPosition(newelement) & 16 :
						elements[i].contains(newelement) && elements[i] !== newelement) {
					return 1;
				}
			}
		},
		">" : function(elements, newelement) {
			var i;
			for (i = elements.length;i--;) {
				if (elements[i] === newelement.parentNode) {
					return 1;
				}
			}
		},
		"+" : function(elements, newelement) {
			var i;
			for (i = elements.length;i--;) {
				if (elements[i] === getprevioussibling(newelement)) {
					return 1;
				}
			}
		},
		"&" : function(elements, newelement) {
			var i;
			for (i = elements.length;i--;) {
				if (elements[i] === newelement) {
					return 1;
				}
			}
		}
	};

	var processreadyqueue;
	processreadyqueue = function() {
	// fairly straightforward.  runs every callback in the ready queue
	// and sets ready to 1
		var
			callback;
		for (callback = readyqueue.shift(); callback; callback = readyqueue.shift()) {
			// shift callback from array, and execute it at same time
			callback();
		}
		// unwatch these events - a potential memory leak breaker (and good hygeine)
		neon.select(document).unwatch("DOMContentLoaded", processreadyqueue);
		neon.select(window).unwatch("load", processreadyqueue);
		ready = 1;
	};

	var checkscroll;
	checkscroll = function() {
	// hack, intended only for IE, for checking when the DOM content is
	// loaded
		try {
			document.documentElement.doScroll("left");
			processreadyqueue();
		} catch (e) {
			if (!ready) {
				setTimeout(checkscroll, 16);
			}
		}
	};

	var compareattrib = function(element, name, attrcompare, attrvalue) {
		var
			tmp = name === "class" ? element.className : element.getAttribute(name);
		return attrcompare === "=" ? tmp === attrvalue :
			attrcompare === "~=" ? (" "+tmp+" ").indexOf(" "+attrvalue+" ") >= 0 :
			(tmp+"-").indexOf(attrvalue) === 0;
	};

	var myqueryselector = function(selector) {
	// css selector engine for neon.  returns array of elements according to
	// the given selector string.  as much of CSS 2.1 selector syntax as
	// possible is supported including A > B, A + B, A:first-child
	// processes the selector string as a CSS style selector and returns
	// just an array of elements matching.  for internal use - call
	// neon.select() in your own code.
		var
			i, len,
			parts,
			tmp,
			elements = [],
			collected = [],
			cascade,
			singleparent,
			searchwithin,
			pass,
			regex = /(([>+]?)\s*)([#.\[:]?)([*\w\-]+)(([|~]?=)("|'|)((\\.|[^\\])*?)\7\])?|,/g;

		selector += ","; // makes the loop with the regex easier

		// grab the parts of the selector one by one, and process it as we go.
		// whether there is whitespace before the part is significant
		for (parts = regex.exec(selector); parts; parts = regex.exec(selector)) {

			if (parts[4]) {
				// we have at least a name; this is part of a selector and not a comma or the end
				var
					// set these parts for readability, mostly
					//whitespace = parts[1],
					//combine = parts[2],
					type = parts[3],
					name = parts[4],
					attrcompare = parts[6],
					attrvalue = (parts[8]||"").replace(/\\(.)/g, "$1"), // strip slashes
					skipcascade = !cascade,
					skipfilter = 0,
					newelements = [];

				// the cascade is the way in which the new set of elements must relate
				// to the previous set.  >> is just a ancestor-descendent relationship
				// like a space in a CSS selector

				cascade = parts[2] || 
					(parts[1] && cascade ? " " :
					cascade);

				singleparent = elements.length===1 && (cascade === ">" || cascade === " ");
				searchwithin = singleparent ? elements[0] : document;

				// if we have no starting elements and this isn't the first run,
				// then don't bother
				if (elements.length || skipcascade) {

					// see if we can skip the cascade, narrow down only
					if (cascade === "&") {
						skipcascade = 1;
						newelements = elements.slice(0);
					}
					else {
						// see if we can narrow down.  in some cases if there's a single
						// parent we can still skip the cascade
						if (type === "#") {
							skipfilter = 1;
							// get element by ID (quick - there's only one!)
							tmp = document.getElementById(name);
							if (tmp) {
								newelements.push(tmp);
							}
						}
						else {
							// get element by tag name or get all elements (worst case, when comparing
							// attributes and there's no '&' cascade)
							if (type === "." && searchwithin.getElementsByClassName) {
								skipfilter = 1;
								tmp = searchwithin.getElementsByClassName(name);
							}
							else {
								skipfilter = !type;
								tmp = searchwithin.getElementsByTagName(type ? "*" : name);
							}
							for (i = 0, len = tmp.length; i < len;) {
								newelements.push(tmp[i++]);
							}
							if (singleparent && cascade === " ") {
								skipcascade = 1;
							}
						}
					}
					// now we do filtering and cascading in one big loop!  stand back!
					for (i = newelements.length; i--;) {

						// phase one, filtering of existing nodes to narrow down
						// selection
						pass = skipfilter ? 1 : 
							!type ? name === "*" || newelements[i].nodeName.toLowerCase() ===
								name.toLowerCase() :
							type === "#" ? newelements[i].id === name :
							type === "." ?
								(" "+newelements[i].className+" ").replace(/\s/g, " ")
								.indexOf(" "+name+" ") >= 0 :
							type === "[" ? (
								!attrcompare || !attrvalue ? newelements[i].hasAttribute(name) :
								compareattrib(newelements[i], name, attrcompare, attrvalue)) :
							name.toLowerCase() === "first-child" ? 
								!getprevioussibling(newelements[i]) :
							0;

						// phase two, filtering of nodes against the previously matched
						// set according to cascade type
						if (!pass ||
							(!skipcascade && !checkinarray[cascade](elements, newelements[i]))) {
							newelements.splice(i, 1);
						}
					}
					elements = newelements;
					cascade = "&";
				}
			}
			else {
				// if we have reached either a comma or the end of the selector
				for (tmp = elements.shift(); tmp; tmp = elements.shift()) {

					if (!checkinarray["&"](collected, tmp)) {
						// if elements[p] DOESN'T exist in newelement
						collected.push(tmp);
					}
				}
				cascade = 0;
			}
		}
		return collected;
	};

	var animationtick;
	animationtick = function() {
	// process a single frame for all registered animations.  Any
	// animation callback that returns false is deregistered, and when
	// there are no registered animations left this function stops
	// calling itself.
		var
			i = animations.length,
			anim, x,
			time = +new Date(),
			collect = [];

		animationschedule = !i ? 0 :
			time < animationschedule + 10 ? animationschedule + (50/3) :
			time + 4;

		if (animationschedule) {
			setTimeout(animationtick, animationschedule - time);
		}

		while (i--) {
			anim = animations[i];
			x = (time - anim[4]) / (anim[7]||400);
			if (x >= 1) {
				animations.splice(i, x = 1);
			}

			anim[0].style[anim[1]] = anim[6] + ((
				anim[8] === "lin"             ? x :
				anim[8] === "in"              ? x*x :
				anim[8] === "inout"           ? (1-Math.cos(Math.PI*x)) / 2 :
				anim[8] === "el"              ? ((2-x)*x-1) *
					Math.cos(Math.PI*x*3.5) + 1 :
				typeof anim[8] === "function" ? anim[8](x) :
				(2-x)*x // 'out' (default)
				) * anim[3] + anim[2]) + anim[5];

			// execute function after animation finishes?
			if (x === 1 && anim[9]) {
				collect.push(anim[0]);
				if (!i || animations[i-1][10] !== anim[10]) {
					anim[9].call(neon.select(collect));
					collect = [];
				}
			}

		}
	};

	var eventwrapIE = function(callback, element) {
	// wraps the given callback function in a function to emulate
	// a W3C event context when running in a IE event context.
	// element is needed to provide 'this' (and currentTarget)
		return function() {
			var
				evt = event,
				retval;

			evt.preventDefault = function() {
				evt.returnValue = false;
			};
			evt.stopPropagation = function() {
				evt.cancelBubble = true;
			};
			evt.which = 
				evt.button & 1 ? 1 :
				evt.button & 2 ? 3 :
				evt.button & 4 ? 2 : 
				evt.keyCode || evt.charCode;
			evt.pageX = evt.clientX + 
				(document.documentElement.scrollLeft || document.body.scrollLeft);
			evt.pageY = evt.clientY + 
				(document.documentElement.scrollTop || document.body.scrollTop);
			evt.currentTarget = element;
			evt.target = evt.srcElement;
			evt.relatedTarget = 
				evt.fromElement !== evt.target ? evt.fromElement : evt.toElement;
			retval = callback.call(element, evt);
			// try to solve memory leak in IE - do we need this? (investigate more)
			evt = null;
			return retval;
		};
	};

	var eventwrapfocus = function(callback) {
		// checks if the relatedtarget is within the target and only calls the
		// registered handler if it isn't.  suitable for implementing 
		// mouseenter/mouseleave
		return function(evt) {
			if (evt.currentTarget !== evt.relatedTarget &&
				!neon.select(evt.currentTarget).contains(
				evt.relatedTarget)) {
				callback.call(this, evt);
			}
		};
	};

	// ##################################################################
	// PUBLIC METHODS
	// call these methods using neon.methodname() eg neon.watch()
	
	neon.select = function(selector) {
	// main way of selecting elements in neon.  accepts a CSS selector
	// string, or a node or array of nodes.  also accepts the window object
	// returns a neon object with the given elements selected.
		var
			i,
			elements,
			newelement,
			/** @constructor */
			Constructor = function() {};
		
		Constructor.prototype = this;
		newelement = new Constructor();

		if (typeof selector !== "string") {
		// handle the case where no selector is given, or a node, window,
		// or array of nodes
			elements = !selector ? [] :
				selector.nodeType || selector.setTimeout ? [selector] :
				selector;

			for (i = newelement.length; --i >= elements.length;) {
				delete newelement[i];
			}
			for (newelement.length = i = elements.length; i--;) {
				newelement[i] = elements[i];
			}
			return newelement;
		}

		return this.select(document.querySelectorAll ?
			document.querySelectorAll(selector) :
			myqueryselector(selector));
	};

	neon.contains = function(what) {
	// returns true if ALL of the nodes in "what" are descendents of
	// any of the selected nodes
	// "what" can be a neon object containing one or more nodes,
	// a bare node, or anything that would otherwise be accepted as
	// an argument to neon.select()
	// note this is fastest when comparing one element with one element
		var
			i, j,
			stdcompare = !!document.compareDocumentPosition,
			found,
			mylist = neon.select(what);

		// the try/catch was protection against "what" sometimes being
		// a xul element or from some other context where walking up the tree
		// would raise exceptions
		for (j = mylist.length; j--;) {
			try {
				for (found = 0, i = this.length; !found && i--;) {
					found = stdcompare ?
						this[i].compareDocumentPosition(mylist[j]) & 16 :
						this[i].contains(mylist[j]) && this[i] !== mylist[j];
				}
			}
			catch (e) {}
			if (!found) {
				return false;
			}
		}
		return true;
	};

	neon.watch = function(eventname, callback) {
	// simple cross-platform event handling. registers the given callback
	// as an even handler for each currently selected element, for the event
	// named by eventname.  eventname should not include the "on" prefix.
	// intended to be cross platform.
	// The callback will be able to access the event object via the first
	// parameter, which will contain event.target, event.preventDefault()
	// and event.stopPropagation() across browsers.
		var
			i,
			hoverevent =
				eventname === 'mouseenter' ? 'mouseover' :
				eventname === 'mouseleave' ? 'mouseout' :
				null,
			captureevent =
				eventname === 'focusin' ? 'focus' :
				eventname === 'focusout' ? 'blur' :
				null,
			mycallback;

		callback.$neoni = callback.$neoni || ++gid;

		for (i = this.length; i--;) {

			mycallback = callback;

			if (this[i].addEventListener) {
				// other browsers
				this[i].addEventListener(hoverevent || captureevent || eventname,
					hoverevent ? (mycallback = eventwrapfocus(mycallback)) : mycallback, !!captureevent);
			} 
			else {
				// IE
				this[i].attachEvent("on"+eventname,
					(mycallback = eventwrapIE(mycallback, this[i])));
			}

			this[i].$neoni = this[i].$neoni || ++gid;
			eventstore[this[i].$neoni+eventname+callback.$neoni] = mycallback;
		}

	};

	neon.unwatch = function(eventname, callback) {
	// removes an event handler added with watch(). While neon can be mixed
	// with other frameworks and even with native browser calls, you need to
	// always un-register each event handler with the same framework/method
	// as the event was registered with.
		var
			i,
			hoverevent =
				eventname === 'mouseenter' ? 'mouseover' :
				eventname === 'mouseleave' ? 'mouseout' :
				null,
			captureevent =
				eventname === 'focusin' ? 'focus' :
				eventname === 'focusout' ? 'blur' :
				null;

		for (i = this.length; i--;) {

			if (this[i].$neoni && callback.$neoni &&
				eventstore[this[i].$neoni+eventname+callback.$neoni]) {

				if (this[i].addEventListener) {
					// other browsers
					this[i].removeEventListener(hoverevent || captureevent || eventname,
						eventstore[this[i].$neoni+eventname+callback.$neoni],
						!!captureevent);
				} 
				else {
					// IE
					this[i].detachEvent("on"+eventname,
						eventstore[this[i].$neoni+eventname+callback.$neoni]);
				}

				delete eventstore[this[i].$neoni+eventname+callback.$neoni];
			}

		}
		return this;
	};

	neon.ready = function(callback) {
	// specify a callback function that should be executed when the document is
	// ready, ie has fully loaded (not necessarily images, other external files)
	// will run instantly if the document is already ready.
	// call this as many times as you like.
		if (ready) {
			callback();
		} else {
			readyqueue.push(callback);
		}
		// ready asks for callback so don't chain
	};

	neon.loaddir = "";
	// any relative URLs passed to neon.load() will use this as a base.
	// if specified, this must contain the trailing slash of a directory.
	// it can be a full url like "http://example.org/dir/" or just the 
	// path like "/dir/", and so on.
	// It's suggested to set this to the base directory where all your
	// neon modules are located, so that you can have modules that
	// depend on other modules and can load them dynamically

	neon.load = function(urls, callback) {
	// dynamically load and execute other javascript urls asynchronously,
	// allowing the rest of the page to continue loading and the user to
	// interact with it while loading.  urls may be a single URL or an
	// array of URLs.  callback is optional, and if supplied the given
	// callback will be called once the given file is loaded.
	// There is no guarantee about the order in which different callbacks
	// are executed, except that a callback will only be called when all
	// specified files are loaded.
	// It's safe to call this many times with the same url, and it won't be
	// loaded again, as long as the url string is completely the same (not
	// just resolving to the same destination)
		var
			i,
			myurls = typeof urls === "string" ? [urls] : urls,
			mycallback = callback || function() {},
			that = this,
			loadid = ++gid,
			registerscript = function(url) {
				var
					myurl = (/^[^\/?#]+:|^\//).test(url) ? url : neon.loaddir+url,
					myscript = that.build({script:"",	$src:myurl}),
					gencallback;
				gencallback = function() {
					if (loadstate[url] !== 2 &&
						(!this.readyState || /loade|co/.test(this.readyState))) {
						loadstate[url] = 2;
						myscript.unwatch("load", gencallback).unwatch("readystatechange",
							gencallback).remove();
						if (!(--mycallback["$neonl"+loadid])) {
							// this callback is no longer waiting on any files, so call it
							mycallback();
							//delete mycallback["$neonl"+loadid];
						}
					}
				};
				loadstate[url] = 1;
				myscript.watch("load", gencallback);
				myscript.watch("readystatechange", gencallback);
				that.select(document.documentElement.childNodes[0]).append(myscript);
			};

		// store a count of how many files this callback (for this loadid)
		// is still "waiting on"
		mycallback["$neonl"+loadid] = 0;

		this.ready(function() {
			for (i = myurls.length; i--;) {
				if (!loadstate[myurls[i]]) {
					mycallback["$neonl"+loadid]++;
					registerscript(myurls[i]);
				}
			}
			if (!mycallback["$neonl"+loadid]) {
				mycallback();
			}
		});
	};

	neon.getStyle = function(style) {
	// fetches and returns the "computed"/"current" style value for
	// the given style, for the first selected element.
	// Note that this value may be returned in a range of different
	// notations, in particular in IE where it's as it was set eg.
	// "yellow" vs "rgb(255, 255, 0)" vs "#ffff00".  at this stage
	// neon doesn't normalise them
		var 
			val = !this.length ? undefined :
			document.defaultView && document.defaultView.getComputedStyle ?
				document.defaultView.getComputedStyle(this[0], null)[style] :
			this[0].currentStyle[style];

		if (val !== undefined) {
			return val;
		}
		if (style === "opacity") {
			val = /opacity=(\d+)/.exec(this.getStyle('filter'));
			return val ? (parseFloat(val[1]) / 100).toString() : undefined;
		}
		return style === "cssFloat" ? this.getStyle("styleFloat") :
			undefined;
	};

	neon.getPosition = function(relative) {
	// fetches the position of the first selected element and returns
	// it as an array with members left, top, right and bottom which
	// are relative to the client viewport
	// This is an extension of the browser's getBoundingClientRect()
	// and thus on inline elements it gives the rectangle that would
	// bound all lines, and the dimension includes element borders
	// but not margin.
	// If relative is given, the position is given relative to
	// the provided argument, which can be the document element,
	// a DOM element, or a selection using the same format as
	// neon.select() (if so, it uses the first match only).
	// To just get the height and width of the client viewport,
	// you could use neon.select(window).getPosition() and just
	// read the bottom and right properties.
		var
			rel = this.select(relative),
			pos = !this.length ? undefined :
				this[0] === window ? {left:0, top:0, 
					right: window.innerWidth || document.documentElement.clientWidth,
					bottom: window.innerHeight || document.documentElement.clientHeight
				} :
				this[0].getBoundingClientRect(),
			relpos;

		if (!rel.length || !pos || rel[0] === window) {
			return pos;
		}

		// some browsers (tested in FF3.5/linux) cannot write to these
		// so we clone them
		pos = {left:pos.left,right:pos.right,top:pos.top,bottom:pos.bottom};

		// document.body fallback should be necessary cos some browser modes
		// ie quirks mode scroll the 'body' rather than the document
		pos.left +=
			document.documentElement.scrollLeft || document.body.scrollLeft;
		pos.right +=
			document.documentElement.scrollLeft || document.body.scrollLeft;
		pos.top += 
			document.documentElement.scrollTop || document.body.scrollTop;
		pos.bottom += 
			document.documentElement.scrollTop || document.body.scrollTop;

		if (rel[0] !== document.documentElement) {
			relpos = rel.getPosition(document.documentElement);
			pos.left -= relpos.left;
			pos.right -= relpos.right;
			pos.top -= relpos.top;
			pos.bottom -= relpos.bottom;
		}
		return pos;
	};

	neon.setAttribute = function(attr, value) {
	// shortcut, for setting attribute on all selected elements
	// note that in this function, setting the value to "" (empty
	// string) removes that attribute.  handy for boolean attributes
	// like 'selected'
		var
			i = this.length,
			lower = attr.toLowerCase();
		for (;i--;) {
			// all the following exceptions except "style" are mainly just for IE6/7
			if (lower === "style") {
				this[i].style.cssText = value;
			}
			else if (lower === "class") {
				this[i].className = value;
			}
			else if (lower === "tabindex") {
				this[i].tabIndex = value;
				if (!value) {
					this[i].removeAttribute("tabIndex");
				}
			}
			else if (lower === "for" && this[i].htmlFor !== undefined) {
				this[i].htmlFor = value;
			}
			else if (value) {
				this[i].setAttribute(attr, value);
			}

			if (!value) {
				this[i].removeAttribute(attr);
			}
		}
		return this;
	};

	neon.removeAttribute = function(attr) {
		return this.setAttribute(attr, "");
	};

	neon.removeClass = function(myclass) {
	// removes the given class from all selected nodes.
	// it's assumed that classes are always separated by spaces
		var i = this.length;
		for (; i--;) {
			this[i].className =
				(" "+this[i].className+" ").replace(/\s/g, " ")
				.replace(" "+myclass+" ", " ").slice(1,-1);
		}
		return this;
	};

	neon.addClass = function(myclass) {
	// adds the given class to all selected nodes.
	// removes the class first if it's already there, to prevent
	// duplication
		var i = this.length;
		for (; i--;) {
			this[i].className =
				(" "+this[i].className+" ").replace(/\s/g, " ")
				.replace(" "+myclass+" ", " ").slice(1) + myclass;
		}
		return this;
	};

	neon.styleRule = function(selector, rules) {
	// inserts a rule into the page's stylesheet.  this is distinct
	// from setting an inline style on an element as it sets a global
	// style rule to be applied to current and future selector matches.
	// it's therefore preferable to inline styles in many situations
	// since they can be overridden by user stylesheets on the page.
	// however, these rules cannot be un-set (through neon) nor can
	// they be animated.  the same style shouldn't be set multiple
	// times.  certain browsers like IE also have a limit
	// (of a few thousand?) on the number of style rules in a
	// stylesheet
	// The document must have a head element when calling this.
		var
			style = this.select('#neon-styleRule-s');

		if (!style.length) {
			style = this.select('head').append({style:""})
				.setAttribute('id', 'neon-styleRule-s');
		}
		if (style[0].styleSheet) {
			// IE
			style[0].styleSheet.cssText += selector+"{"+rules+"}";
		}
		else {
			style.append(selector+"{"+rules+"}");
		}

		return this;
	};

	neon.style = function(style, value, lastval, duration, easing, endfunc) {
	// sets an inline style to the given value on all selected nodes.
	// if lastval is given, then after the style is initially set to
	// the first value, it is animated towards the last value.  easing,
	// msec and parm are all optional and specify parameters for the
	// animation; if they are not given, a fairly basic and short
	// animation is used by default.
		var
			i = this.length, j,
			time = +new Date(),
				// the following redundancy gzips well ;)
			parts     = /([^\d\.\-]*)([\d\.\-]*)([\d\D]*)/.exec(value),
			lastparts = /([^\d\.\-]*)([\d\.\-]*)([\d\D]*)/.exec(lastval),
			myval = parseFloat(parts[2]), // need to account for prefix
			mylastval = parseFloat(lastparts[2]),
			animated = !isNaN(myval) && !isNaN(mylastval), // NaN test
			prefix = parts[1],
			suffix = parts[3],
			that = this,
			endfuncid = endfunc && ++gid;

		var myendfunc = endfunc && function() {
			endfunc.call(that);
		};

		style = style.replace(/-(.)/g, function(a,b) { return b.toUpperCase(); });

		while (i--) {
			this[i].style[style] = value;

			// remove existing animations on same property
			for (j = animations.length; j--;) {
				if (animations[j][0] === this[i] &&
					animations[j][1] === style) {
					animations.splice(j, 1);
				}
			}

			// add this animation into the animation queue
			if (animated) {
				animations.push([
					this[i], style, myval, mylastval - myval,
					time, suffix, prefix, duration, easing,
					myendfunc, endfuncid
				]);
			}
		}

		if (style === 'cssFloat') {
			this.style('styleFloat', value);
		}

		if (style === 'opacity') {
			this.style('filter', 'alpha(opacity='+(100*myval)+')',
				animated && 100*mylastval, duration, easing, endfunc);
		}

		if (animated && !animationschedule) {
			animationtick();
		}

		return this;
	};

	neon.build = function(spec) {
	// builds one or more new nodes (elements/text nodes) according to
	// the given spec and returns a neon object with the new nodes
	// selected. this can be used to generate nodes for the document
	// without inserting them anywhere yet.
	// The spec is one of:
	// A string, in which case a text node is created with the text
	// An object of {elementname:contents[,$attrname:attrval,...]}
	//   where contents is another spec (which will be processed
	//   recursively).  Since objects are considered unsorted, the
	//   only reliable way to tell which property is the element name
	//   is that it is the only one that is a valid element name.
	//   Attributes have dollar signs added before them for this
	//   reason.
	// Or an array containing one or more strings or objects as above
		var
			tmp, len,
			element,
			attributes = [];
		if (spec === "" || spec === null || spec.length === 0) {
			return this.select([]);
		}
		if (spec.cloneNode && spec.nodeType) { // is a node
			return this.select(spec);
		}
		if (spec.length && spec[0] && typeof spec !== "string") { //arraylike
			element = document.createDocumentFragment();
			for (tmp = 0, len = spec.length; tmp < len;) {
				element.appendChild(this.build(spec[tmp++])[0]);
			}
			return this.select(element.childNodes);
		}
		if (typeof spec !== "object") {
			return this.select(document.createTextNode(spec));
		}
		for (tmp in spec) {
			if (spec.hasOwnProperty(tmp)) {
				if (tmp.slice(0,1) === "$") {
					attributes.push([tmp.slice(1),spec[tmp]]);
				}
				else {
					element = this.select(document.createElement(tmp));
					if (spec[tmp]) {
						element.append(spec[tmp]);
					}
				}
			}
		}
		for (tmp = attributes.length; tmp--;) {
			element.setAttribute(attributes[tmp][0], attributes[tmp][1]);
		}
		return this.select(element);
	};
	
	neon.append = function(spec) {
	// inserts a new element or array of elements into the document.
	// the parameter may be either a node, a spec as defined in build(),
	// or an array containing a mixture of such.
	// the new elements are appended to the child nodes of each currently
	// selected node.
		var
			i, j, len,
			elements = this.build(spec),
			element = elements.length && elements[0],
			instance,
			group,
			collected = [];
		
		if (element) {
			if (element.parentNode && element.parentNode.nodeType === 11) {
				element = element.parentNode;
			}
			for (i = this.length; i--;) {
				if (this[i].appendChild) {
					instance = i ? element.cloneNode(true) : element;
					group = instance.nodeType === 11 ? instance.childNodes : [instance];
					for (j = 0, len = group.length; j < len;) {
						collected.push(group[j++]);
					}
					this[i].appendChild(instance);
				}
			}
		}
		return this.select(collected);
	};

	neon.insert = function(spec) {
	// inserts a new element or array of elements into the document.
	// the parameter may be either a node, a spec as defined in build(),
	// or an array containing a mixture of such.
	// the new elements are inserted before each currently
	// selected node.
		var
			i, j, len,
			elements = this.build(spec),
			element = elements.length && elements[0],
			instance,
			group,
			collected = [];
		
		if (element) {
			if (element.parentNode && element.parentNode.nodeType === 11) {
				element = element.parentNode;
			}
			for (i = this.length; i--;) {
				if (this[i].parentNode) {
					instance = i ? element.cloneNode(true) : element;
					group = instance.nodeType === 11 ? instance.childNodes : [instance];
					for (j = 0, len = group.length; j < len;) {
						collected.push(group[j++]);
					}
					this[i].parentNode.insertBefore(instance, this[i]);
				}
			}
		}
		return this.select(collected);
	};

	neon.remove = function() {
	// removes the selected nodes from the document and all their contents.
		var i = this.length;
		for (; i--;) {
			if (this[i].parentNode) {
				this[i].parentNode.removeChild(this[i]);
			}
		}
		return this;
	};

	neon.empty = function() {
	// deletes the contents of the selected nodes, but not the nodes
	// themselves
		var i = this.length,
			tmp;
		for (; i--;) {
			for (tmp = this[i].lastChild; tmp; tmp = this[i].lastChild) {
				this[i].removeChild(tmp);
			}
		}
		return this;
	};

	neon.jsonDecode = function(json) {
	// unserialises the JSON string into the equivalent value.  Does a check
	// on the string that is only thorough enough to prevent arbitrary code
	// execution.
	
		/*
		var cx = /[\x00\u007f-\uffff]/g;
		json = json.replace(cx, function(ch) {
			return '\\u' + ('000' + ch.charCodeAt(0).toString(16)).slice(-4);
		});
		*/
		if (/^[\],:{}\s]+$/.test(
			json.replace(/\\["\\\/bfnrt]|\\u[0-9a-fA-F]{4}/g, "$")
			.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, "]")
			.replace(/(?:^|:|,)(?:\s*\[)+/g, ""))) {
			return this.$ev("("+json+")");
		}
	};

	neon.getHttp = function(url, callback, method, body, contenttype) {
	// places an HTTP request (using XMLHttpRequest) for the given URL.
	// method and body are optional.
	// callback is only called when the load is 100% complete (that is, you
	// won't be able to implement a progress indicator).
	// body should be specified for POST method.  It can be an object of
	// {name:value,...} where it will be encoded like form variables, or
	// it can be a string, where it will be transmitted bare
		var
			i,
			collected = [],
			xmlhttprequest = window.XMLHttpRequest ?
				new XMLHttpRequest() : new ActiveXObject("Microsoft.XMLHTTP");

		xmlhttprequest.onreadystatechange = function() {
			if (xmlhttprequest.readyState === 4) {

				// implement JSON parsing
				// we've disabled setting responseJSON here since setting a value
				// to it breaks in IE6 - for now user should use neon.jsonDecode()
				// not ideal I know
				/*
					if (!xmlhttprequest.responseJSON) {
						xmlhttprequest.responseJSON =
							neon.jsonDecode(xmlhttprequest.responseText);
					}
				*/

				callback.call(xmlhttprequest);

				// this may be desirable to free memory, not sure if it's a
				// memory leak problem though
				// fixme: this was causing an error in my IE6 tester
				// xmlhttprequest.onreadystatechange = null;
			}
		};
		xmlhttprequest.open(method || "GET", url, true);
		if (body && typeof body !== "string" /*&&
			typeof body.cloneNode != "function" &&
			typeof body.read != "function"*/) {
			for (i in body) {
				if (body.hasOwnProperty(i)) {
					collected.push(encodeURIComponent(i) + "=" +
						encodeURIComponent(body[i]));
				}
			}
			body = collected.join("&");
			contenttype = "application/x-www-form-urlencoded";
		}
		if (contenttype) {
			xmlhttprequest.setRequestHeader("Content-type",
				contenttype);
		}
		xmlhttprequest.send(body);
		// asks for callback so don't chain
	};

	// set up ready listening
	neon.select(document).watch("DOMContentLoaded", processreadyqueue);
	neon.select(window).watch("load", processreadyqueue);
	// IE only hack; testing doscroll method - check IE9 support
	if (/\bMSIE\s/.test(navigator.userAgent) && !window.opera && self === top) {
		checkscroll();
	}

	return neon;
}()); 

neon.$ev = function(a) {
	// internal use only
	// eval is currently needed for decoding JSON.  We separate this into another function
	// scope so it won't execute in the same scope as everything else.  Among other things
	// this allow minification to work properly.
	return eval(a);
};
