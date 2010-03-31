// SPARK core - your basic javascript framework with CSS selectors
// and event handling, and a way of loading in modules
// Part of the SPARK Javascript library
// Copyright (c) 2010 Thomas Rutter

/*jslint browser: true, newcap: true, immed: true */
/*global SPARK:true,attachEvent,window,opera,ActiveXObject */

/**
@preserve SPARK js lib (c) Thomas Rutter SPARKlib.com
*/

SPARK = (function() {

	// ##################################################################
	// PRIVATE VARIABLES
	
	var
		undef,
		core = {},
		loadstate = {}, // for each file, loadstate 1 = loading, 2 = loaded
		readyqueue = [], // just callbacks to execute when ready
		ready = 0,
		gid = 0;

	var checkcascade = function(elements, newelement, cascade) {
	// check if newelement cascades from the list of elements, according
	// to the cascade type.
	// cascade == '&' : match when newelement occurs in elements
	// cascade == '>' : when newelement is direct child of one in elements
	// cascade == '>>': when newelement is descendent of one in elements
		for (var i = 0; i < elements.length; i++) {
			if (
				cascade == ">>" ? (elements[i].compareDocumentPosition ?
					(elements[i].compareDocumentPosition(newelement) & 16) :
					(elements[i].contains(newelement) && elements[i]!==newelement)) :
				cascade == ">" ? newelement.parentNode === elements[i] :
				newelement === elements[i] // cascade == '&'; default
				) {
				return !0; //true
			}
		}
	};

	var checkattr = function(attr, attrcompare, attrvalue) {
	// check if attribute attr matches the attribute comparison specified
		return !attrcompare ? attr !== null && attr !== "" :
			attrcompare == "=" ? attrvalue == attr :
			attrcompare == "~=" ? (" "+attr+" ").indexOf(" "+attrvalue+" ") >= 0 :
			(attrvalue == attr || attr.indexOf(attrvalue+"-") === 0); // |=
	};

	var getelementsibling = function(element, doprevious) {
	// find the next sibling of this element which is an element node
	// or if doprevious is set, the previous one!
		while ((element =
			element[doprevious ? "previousSibling" : "nextSibling"])) {
			if (element.nodeType == 1) {
				return element;
			}
		}
	};

	var processreadyqueue = function() {
	// fairly straightforward.  runs every callback in the ready queue
	// and sets ready to 1
		var
			callback;
		while ((callback = readyqueue.shift())) {
			callback();
		}
		ready = 1;
	};

	var checkscroll = function() {
	// hack, intended only for IE, for checking when the DOM content is
	// loaded
		try {
			document.documentElement.doScroll("left");
			processreadyqueue();
		} catch (e) {
			setTimeout(checkscroll, 7);
		}
	};

	// ##################################################################
	// PUBLIC METHODS
	// call these methods using SPARK.methodname() eg SPARK.each()

	core.each = function(callback) {
	// simply executes the given callback for each currently selected element.
	// the callback's 'this' variable will be the element it applies to
		for (var i = 0; i < this.length; i++) {
			callback.call(this[i], this);
		}
	};

	core.select = function(selector) {
	// css selector engine for SPARK.  returns array of elements according to
	// the given selector string.  as much of CSS 2.1 selector syntax as
	// possible is supported including A > B, A + B, A:first-child
		var
			i,
			parts,
			tmp,
			elements = [],
			cascade,
			singleparent,
			searchwithin,
			Constructor = function() {},
			pass,
			regex = /(([>+]?)\s*)([#.\[:]?)([*\w\-]+)(([|~]?=)("|'|)((\\.|[^\\])*?)\7\])?|,/g,
			newelement;

		// construct new spark object
		Constructor.prototype = this;
		newelement = new Constructor();
		newelement.length = 0;

		if (selector.charAt) {
			// if the selector is a string, then treat it as a CSS style selector

			selector += ","; // makes the loop with the regex easier

			// grab the parts of the selector one by one, and process it as we go.
			// whether there is whitespace before the part is significant
			while	((parts = regex.exec(selector))) {

				if (parts[4]) {
					// we have at least a name; this is part of a selector and not a comma or the end
					var
						// set these parts for readability, mostly
						//whitespace = parts[1],
						//combine = parts[2],
						type = parts[3],
						name = parts[4],
						//attrcompare = parts[6],
						attrvalue = (parts[8]+"").replace("\\",""),
						skipcascade = !cascade,
						skipfilter = 0,
						newelements = [];

					// the cascade is the way in which the new set of elements must relate
					// to the previous set
					cascade = parts[2] || (parts[1] && cascade ? ">>" : cascade);

					singleparent = elements.length==1 && cascade.charAt(0) == '>';
					searchwithin = singleparent ? elements[0] : document;

					// if we have no starting elements and this isn't the first run,
					// then don't bother
					if (elements.length || skipcascade) {

						// see if we can skip the cascade, narrow down only
						if (cascade == '&') {
							skipcascade = 1;
							newelements = elements.slice(0);
						}
						else if (cascade == '+') {
							skipcascade = 1;
							for (i = 0, skipcascade = 1; i < elements.length; i++) {
								if ((tmp = getelementsibling(elements[i]))) {
									newelements.push(tmp);
								}
							}
						}
						else {
							// see if we can narrow down.  in some cases if there's a single
							// parent we can still skip the cascade
							if (type == '#') {
								skipfilter = 1;
								// get element by ID (quick - there's only one!)
								tmp = document.getElementById(name);
								newelements = tmp ? [tmp] : [];
							}
							else {
								// get element by tag name or get all elements (worst case, when comparing
								// attributes and there's no '&' cascade)
								skipfilter = !type;
								tmp = searchwithin.getElementsByTagName(type ? "*" : name);
								for (i = 0; i < tmp.length; i++) {
									newelements.push(tmp[i]);
								}
								skipcascade += (singleparent && cascade == '>>');
							}
						}
						// now we do filtering and cascading in one big loop!  stand back!
						for (i = 0; i < newelements.length; i++) {
							pass = skipfilter ? 1 :
								!type ? (name == "*" || name.toUpperCase() ==
									newelements[i].nodeName) :
								type == '#' ? (newelements[i].id == name) :
								type == "." ? checkattr(newelements[i].className,
									"~=", name) :
								type == "[" ? checkattr(newelements[i].getAttribute(name),
									parts[6], attrvalue) :
								(name.toLowerCase() == "first-child") ? 
									!getelementsibling(newelements[i],1) :
								// if we're supporting first-child, supporting last-child is
								// trivial.  however we may as well limit ourselves to CSS2.1
								// as this library is supposed to be low fat
								//(name.toLowerCase() == "last-child") ? 
								//	!getelementsibling(newelements[n]) :
								0;
							if (!pass ||
								(!skipcascade && !checkcascade(elements, newelements[i], cascade))) {
								newelements.splice(i--, 1);
							}
						}
						elements = newelements;
						cascade = '&';
					}
				}
				else {
					// if we have reached either a comma or the end of the selector
					while ((tmp = elements.shift())) {

						if (!checkcascade(newelement, tmp)) {
							// if elements[p] DOESN'T exist in newelement
							newelement[newelement.length++] = tmp;
						}
					}
					cascade = 0;
				}
			}
		}
		else {
			// handle the case where the argument was a node or array of nodes rather than
			// a CSS selector
			elements = selector.cloneNode || selector.setTimeout ? [selector] :
				selector;
			for (i = 0; i < elements.length; i++) {
				newelement[newelement.length++] = elements[i];
			}
		}
		return newelement;
	};

	core.watch = function(eventname, callback) {
	// simple cross-platform event handling. registers the given callback
	// as an even handler for each currently selected element, for the event
	// named by eventname.  eventname should not include the "on" prefix.
	// intended to be cross platform.
	// The callback will be able to access the event object via the first
	// parameter, which will contain event.target, event.preventDefault()
	// and event.stopPropagation() across browsers.
	// Other things, such as the this keyword cannot be relied upon to
	// work cross-browser
		callback.SPARKi = callback.SPARKi || ++gid;

		this.each(function() {
			var
				myelement = this,
				mycallback = function() {
					// this should only be called by browsers who use attachevent
					// and not addeventlistener, so we can assume a global event
					// object
					var
						evt = event;
					evt.preventDefault = function() {
						evt.returnValue = !1;
					};
					evt.stopPropagation = function() {
						evt.cancelBubble = !0;
					};
					evt.currentTarget = myelement;
					evt.target = evt.srcElement;
					return callback.call(myelement, evt);
				};

			// all this so we can provide 'this' and 'currentTarget' in IE.
			// So we maintain a separate handler with its in-closure reference
			// to 'myelement' for each element we apply to
			this.SPARKe = this.SPARKe || {};
			this.SPARKe[callback.SPARKi] = 
				this.SPARKe[callback.SPARKi] || mycallback;

			if (this.addEventListener) {
				// other browsers
				this.addEventListener(eventname, callback, !1);
			} 
			else {
				this.attachEvent("on"+eventname, this.SPARKe[callback.SPARKi]);
			}
		});
	};

	core.unwatch = function(eventname, callback) {
	// removes an event handler added with watch(). While SPARK can be mixed
	// with other frameworks and even with native browser calls, you need to
	// always un-register each event handler with the same framework/method
	// as the event was registered with.
		this.each(function() {
			if (this.addEventListener) {
				// other browsers
				this.removeEventListener(eventname, callback, !1);
			} 
			else {
				if (this.SPARKe && this.SPARKe[callback.SPARKi]) {
					this.detachEvent("on"+eventname, this.SPARKe[callback.SPARKi]);
					delete this.SPARKe[callback.SPARKi];
				}
			}
		});
		return this;
	};

	core.ready = function(callback) {
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

	core.extend = function(name, property) {
	// for extending prototype for all SPARK objects. if the SPARK prototype
	// already has a property with this name, then it will NOT be replaced.
	// therefore you must take steps not to choose names that collide with
	// current or future SPARK properties.
	//todo a standard for this should be created.  don't use this yet
		if (core[name] === undef) {
			core[name] = property;
		}
		return this;
	};

	core.load = function(files, callback) {
	// dynamically load and execute other javascript files asynchronously,
	// allowing the rest of the page to continue loading and the user to
	// interact with it while loading.  files may be a single URL or an
	// array of URLs.  callback is optional, and if supplied the given
	// callback will be called once the given file is loaded.
	// There is no guarantee about the order in which different callbacks
	// are executed, except that a callback will only be called when all
	// specified files are loaded.
	// It's safe to call this many times with the same file, and it won't be
	// loaded again, as long as the filename string is completely the same (not
	// just resolving to the same URL).
		var
			myfiles = files.charAt ? [files] : files,
			mycallback = callback || function() {},
			that = this,
			loadid = ++gid,
			registerscript = function(file) {
				var
					myscript = that.build({name: 'script'}).set('src', file),
					gencallback = function() {
						if (loadstate[file] < 2 &&
							(!this.readyState || /loade|co/.test(this.readyState))) {
							loadstate[file] = 2;
							myscript.unwatch('load', gencallback).unwatch('readystatechange',
								gencallback).remove();
							if (!(--mycallback.SPARKl[loadid])) {
								// this callback is no longer waiting on any files, so call it
								mycallback();
								delete mycallback.SPARKl[loadid];
							}
						}
					};
				myscript.watch('load', gencallback);
				myscript.watch('readystatechange', gencallback);
				that.find('head').append(myscript);
				loadstate[file] = 1;
			};

		mycallback.SPARKl = mycallback.SPARKl || {};
		// store a count of how many files this callback (for this loadid)
		// is still "waiting on"
		mycallback.SPARKl[loadid] = 0;

		this.ready(function() {
			for (var i = 0; i < myfiles.length; i++) {
				if (!loadstate[myfiles[i]]) {
					mycallback.SPARKl[loadid]++;
					registerscript(myfiles[i]);
				}
			}
			if (!mycallback.SPARKl[loadid]) {
				mycallback();
			}
		});
	};

	core.get = function(prop) {
	// fetches and returns the value of the given property, for the
	// first selected element.
		return this.length && this[0][prop];
	};

	core.getstyle = function(style) {
	// fetches and returns the "computed"/"current" style value for
	// the given style, for the first selected element.  Note that
	// this is a value computed by the browser and they may each
	// return the same value in quite different notations, eg
	// "yellow" vs "rgb(255, 255, 0)" vs "#ffff00".  at this stage
	// spark doesn't normalise them
		return !this.length ? undef :
			window.getComputedStyle ?
				getComputedStyle(this[0], null)[style] :
			this[0].currentStyle ? this[0].currentStyle[style] :
			undef;
	};

	/*
	// this is kind of the odd one out in my SPARK library as it
	// doesn't seem like an everyday essential task.  leaving it
	// out to save space. 
	core.gettext = function() {
	// fetches and returns the text content of the selected nodes.
	// to set the text content of a node, you should just use
	// append("text") - preceded by empty() if necessary
		return !this.length ? undef :
			this[0].textContent !== undef ? this[0].textContent :
			this[0].innerText;
	};
	*/

	core.set = function(prop, value) {
	// really simple method, just sets one or more properties on each
	// selected node.  prop can be an object of {property: value, ...}
	// or you can set a single property with prop and value.
		this.each(function() {
			this[prop] = value;
		});
		return this;
	};

	core.setstyle = function(style, value) {
	// sets one or more styles on each selected node.  style can be
	// an object of {style: styleval, ...} or you can set a single
	// style with style and value.
		this.each(function() {
			if (this.style) {
				this.style[style] = value;
			}
		});
		return this;
	};

	core.build = function(spec) {
	// builds a new node (element or text node) according to the given
	// spec and selects it, but doesn't insert it into the document. this
	// is used internally by SPARK, but may be useful elsewhere. the spec
	// should be an object conforming to:
	// {name: <tag name>, attr: {name:val, ...}, contents: [<spec>, ...]}  
	// where attr and contents are optional.  alternatively, spec can be
	// just a string (which will result in a text node)
		var
			newspark = this.select(spec.name ? document.createElement(spec.name) :
				document.createTextNode(spec)),
			name;
		if (spec.attr) {
			for (name in spec.attr) {
				if (spec.attr[name].charAt) {
					newspark[0].setAttribute(name, spec.attr[name]);
					if (name.toLowerCase() == "style") {
						newspark[0].style.cssText = spec.attr[name];
					}
					if (name.toLowerCase() == "class") {
						newspark[0].className = spec.attr[name];
					}
				}
			}
		}
		if (spec.contents) {
			newspark.append(spec.contents);
		}
		return newspark;
	};

	core.append = function(spec) {
	// inserts a new element or array of elements into the document.
	// the parameter may be either a node, a spec as defined in build(),
	// or an array containing a mixture of such.
	// the new elements are appended to the child nodes of each currently
	// selected node.
	// todo see if modifying this to use this.each() compresses a bit better
		var
			i, j,
			myspec = spec.name || spec.clonenode || spec.charat ? [spec] : spec,
			node,
			elements = [];
		for (i = 0; i < this.length; i++) {
			for (j = 0; j < myspec.length; j++) {
				node = myspec[j].parentnode ? myspec[j].clonenode(!0) :
					myspec[j].clonenode ? myspec[j] : this.build(myspec[j])[0];
				elements.push(node);
				this[i].appendchild(node);
			}
		}
		return this.select(elements);
	};

	core.insert = function(spec) {
	// inserts a new element or array of elements into the document.
	// the parameter may be either a node, a spec as defined in build(),
	// or an array containing a mixture of such.
	// the new elements are inserted before each currently
	// selected node.
		var
			i, j,
			myspec = spec.name || spec.clonenode || spec.charat ? [spec] : spec,
			node,
			elements = [];
		for (i = 0; i < this.length; i++) {
			for (j = 0; j < myspec.length && this[i].parentNode; j++) {
				node = myspec[j].parentnode ? myspec[j].clonenode(!0) :
					myspec[j].clonenode ? myspec[j] : this.build(myspec[j])[0];
				elements.push(node);
				this[i].parentNode.insertBefore(node);
			}
		}
		return this.select(elements);
	};

	core.remove = function() {
	// removes the selected nodes from the document and all their contents.
		this.each(function() {
			if (this.parentNode) {
				this.parentNode.removeChild(this);
			}
		});
		return this;
	};

	core.empty = function() {
	// deletes the contents of the selected nodes, but not the nodes
	// themselves
		this.each(function() {
			var tmp;
			while ((tmp = this.firstChild)) {
				this.removeChild(tmp);
			}
		});
		return this;
	};

	core.gethttp = function(url, callback, method, body) {
	// places an HTTP request (using XMLHttpRequest) for the given URL.
	// options is optional.  it should be an object with properties
	// like 'method' (get or post), 'body' (body of post request) etc.
	// callback is only called when the load is 100% complete (that is, you
	// won't be able to implement a progress indicator).
		var
			xmlhttprequest = window.XMLHttpRequest ?
				new XMLHttpRequest() : new ActiveXObject('Microsoft.XMLHTTP');
		if (callback) {
			xmlhttprequest.onreadystatechange = function() {
				if (xmlhttprequest.readyState == 4) {
					callback.call(xmlhttprequest);
				}
			};
		}
		xmlhttprequest.open(method || "GET", url, !0);
		xmlhttprequest.send(body);
		// asks for callback so don't chain
	};

	// set up ready listening
	core.select(document).watch("DOMContentLoaded", processreadyqueue);
	core.select(window).watch("load", processreadyqueue);
	// IE only hack; testing doscroll method
	if (/\bMSIE/.test(navigator.userAgent) && !window.opera && window == top) {
		checkscroll();
	}

	return core.select([]);
}()); 
