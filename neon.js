/*

The Neon Javascript Library: core
All of Neon's core functionality in a small package

Part of the Neon Javascript Library
Copyright (c) 2015, Thomas Rutter
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

/*jshint strict:false,smarttabs:true,browser:true,
	bitwise:false,
	curly:true,eqeqeq:true,forin:true,immed:true,latedef:true,newcap:true,noarg:true,undef:true,trailing:true */
/*global neon:true,window */

/**
@preserve The Neon Javascript Library
Copyright (c) Thomas Rutter 2015
http://neonjs.com
http://neonjs.com/license
*/

// overwrites any existing neon object
neon = (function() {

	// ##################################################################
	// PRIVATE VARIABLES
	
	var
		neon = {},
		loadscripts = {}, // for each file, script element while loading, true when finished
		eventstore = {}, // remembering event handlers
		readyqueue = [], // just callbacks to execute when ready
		ready = 0, // 0 = not ready, 1 = ready
		stylerule,
		gid = 0;

	// ##################################################################
	// PUBLIC METHODS
	// call these methods using neon.methodname() eg neon.watch()
	
	neon.select = function(selector) {
	// main way of selecting elements in neon.  accepts a CSS selector
	// string, or a node or array of nodes.  also accepts the window object
	// returns a neon object with the given elements selected.
		var
			i,
			// handle the case where no selector is given, or a node, window,
			// or array of nodes
			elements = typeof selector === "string" ?
				document.querySelectorAll(selector) :
				!selector ? [] :
				selector.addEventListener ? [selector] : selector,
			newelement,
			/** @constructor */
			Constructor = function() {};

		Constructor.prototype = this;
		newelement = new Constructor();

		for (i = newelement.length; --i >= elements.length;) {
			delete newelement[i];
		}
		for (newelement.length = i = elements.length; i--;) {
			newelement[i] = elements[i];
		}
		return newelement;
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
			found,
			mylist = this.select(what);

		// the try/catch was protection against "what" sometimes being
		// a xul element or from some other context where walking up the tree
		// would raise exceptions
		for (j = mylist.length; j--;) {
			try {
				for (found = 0, i = this.length; !found && i--;) {
					// not supported in FF < 9.0!
					found = this[i].contains(mylist[j]) && this[i] !== mylist[j];
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
			// focusin and focusout emulation required for Firefox
			captureevent =
				eventname === 'focusin' ? 'focus' :
				eventname === 'focusout' ? 'blur' :
				null,
			mycallback;

		callback.$neoni = callback.$neoni || ++gid;

		for (i = this.length; i--;) {

			mycallback = callback;

			this[i].addEventListener(captureevent || eventname, mycallback, !!captureevent);

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
			// focusin and focusout emulation required for Firefox
			captureevent =
				eventname === 'focusin' ? 'focus' :
				eventname === 'focusout' ? 'blur' :
				null;

		for (i = this.length; i--;) {

			if (this[i].$neoni && callback.$neoni &&
				eventstore[this[i].$neoni+eventname+callback.$neoni]) {

				this[i].removeEventListener(captureevent || eventname,
					eventstore[this[i].$neoni+eventname+callback.$neoni],
					!!captureevent);

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
			// store a count of how many files this callback
			// is still "waiting on"
			myurls = typeof urls === "string" ? [urls] : urls,
			loadcounter = myurls.length,
			that = this,
			registerscript = function(url) {
				var
					existing = loadscripts[url],
					script = existing || that.select('head').append({script:""});

				script.watch("load", function() {
						loadscripts[url] = true;
						if (callback && !(--loadcounter)) {
							// this callback is no longer waiting on any files, so call it
							callback();
						}
					});
				if (!existing) { 
					loadscripts[url] = script.setAttribute('src', /^[^\/?#]+:|^\//.test(url) ? url : that.loaddir+url);
				}
			};

		for (i = myurls.length; i--;) {
			if (loadscripts[myurls[i]] !== true) {
				registerscript(myurls[i]);
			}
			else {
				loadcounter--;
			}
		}
		if (callback && !loadcounter) {
			callback();
		}
	};

	neon.getStyle = function(style) {
	// fetches and returns the "computed"/"current" style value for
	// the given style, for the first selected element.
	// Note that this value may be returned in a range of different
	// notations, in particular in IE where it's as it was set eg.
	// "yellow" vs "rgb(255, 255, 0)" vs "#ffff00".  at this stage
	// neon doesn't normalise them
		return !this.length ? undefined :
			getComputedStyle(this[0], null)[style === 'float' ? 'cssFloat' :
			style.replace(/-(.)/g, function(_a,b) {
				return b.toUpperCase();
			})];

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
					right: innerWidth,
					bottom: innerHeight
				} :
				this[0].getBoundingClientRect(),
			relpos;

		if (pos && rel.length && rel[0] !== window) {

			relpos = rel[0] === document.documentElement ? {left:0,top:0,right:0,bottom:0} :
				rel.getPosition(document.documentElement);

			// some browsers (tested in FF3.5/linux) cannot write to pos.left etc
			// so we clone them

			// no longer compatible with various "quirks" modes.
			// (neon now requires a browser in standards mode)
			pos = {
				left: pos.left + pageXOffset - relpos.left,
				top: pos.top + pageYOffset - relpos.top,
				right: pos.right + pageXOffset - relpos.right,
				bottom: pos.bottom + pageYOffset - relpos.bottom
				};
		}

		return pos;
	};

	// neon.removeAttribute is now just an alias of setAttribute, because
	// setAttribute without a second arg removes the attribute anyway
	neon.setAttribute = 
		neon.removeAttribute = function(attr, value) {
	// shortcut, for setting attribute on all selected elements
	// note that in this function, setting the value to "" (empty
	// string) removes that attribute.  handy for boolean attributes
	// like 'selected'
		var
			i = this.length;
		for (;i--;) {
			if (value) {
				this[i].setAttribute(attr, value);
			}
			else {
				this[i].removeAttribute(attr);
			}
		}
		return this;
	};

	neon.removeClass = function(myclass) {
	// removes the given class from all selected nodes.
	// it's assumed that classes are always separated by spaces
		var i = this.length;
		for (; i--;) {
			this[i].className =
				(" "+this[i].className+" ").replace(/\s+/g, " ")
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
				(" "+this[i].className+" ").replace(/\s+/g, " ")
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
	
		if (!stylerule) {
			stylerule = this.select('head').append({style:''});
		}
		stylerule.append(selector+"{"+rules+"}");

		return this;
	};

	neon.style = function(style, value, _lastval, _d, _e, _func) {
	// sets an inline style to the given value on all selected nodes.
	// DEPRECATED: all arguments after "value" are deprecated
		var
			i = this.length,
			myval = _lastval === undefined ? value : _lastval,
			mystyle = style === 'float' ? 'cssFloat' :
				style.replace(/-(.)/g, function(_x,y) { return y.toUpperCase(); });

		while (i--) {
			this[i].style[mystyle] = myval;
		}

		if (_func) {
			_func.call(this);
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
		if (spec.addEventListener) { // is a node
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
		for (tmp = 0, len = attributes.length; tmp < len;) {
			element.setAttribute(attributes[tmp][0], attributes[tmp++][1]);
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
			// we rely on this.build returning children of a DocumentFragment
			element = elements.length && (
				elements.length > 1 ? elements[0].parentNode :
				elements[0]),
			instance,
			group,
			collected = [];
		
		if (element) {
			for (i = this.length; i--;) {
				if (this[i].appendChild) {
					instance = i ? element.cloneNode(true) : element;
					group = elements.length > 1 ? instance.childNodes : [instance];
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
			element = elements.length && (
				elements.length > 1 ? elements[0].parentNode :
				elements[0]),
			instance,
			group,
			collected = [];
		
		if (element) {
			for (i = this.length; i--;) {
				if (this[i].parentNode) {
					instance = i ? element.cloneNode(true) : element;
					group = elements.length > 1 ? instance.childNodes : [instance];
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
			while ((tmp = this[i].lastChild)) {
				this[i].removeChild(tmp);
			}
		}
		return this;
	};

	neon.jsonDecode = JSON.parse; // DEPRECATED
	// unserialises the JSON string into the equivalent value.
	// This function is no longer useful since browsers now support JSON.parse()
	// It's included only for backward compatibility.

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
			xhr = new XMLHttpRequest();

		if (callback) {
			this.select(xhr).watch('load', callback);
		}
				
		xhr.open(method || "GET", url, true);
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
			xhr.setRequestHeader("Content-type",
				contenttype);
		}
		xhr.send(body);
		// asks for callback so don't chain
	};

	// set up ready listening
	neon.select(document).watch("DOMContentLoaded", function() {
		// runs every callback in the ready queue
		// and sets ready to 1
			ready = 1;
			while (readyqueue[0]) {
				readyqueue.shift()();
			}
		});

	return neon;
}());
