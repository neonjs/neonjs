// SPARK core - your basic javascript framework with CSS selectors
// and event handling, and a way of loading in modules
// Part of the SPARK Javascript library
// Copyright (c) 2010 Thomas Rutter

/*jslint browser: true, newcap: true, immed: true */
/*global SPARK:true,attachEvent,window,opera,ActiveXObject */

/**
@preserve SPARK lib (c) Thomas Rutter SPARKlib.com
*/

SPARK = (function() {

	// ##################################################################
	// PRIVATE VARIABLES
	
	var
		undef,
		selectorregex = /(\s*)([>+]?)\s*([#\.\[:]?)(\*|[\w\-]+)(([~|]?=)['"]?([^\]'"]*))?|\s*,/g,
		loadstate = [], // for each file, loadstate 1 = loading, 2 = loaded
		callbacks = [], // for each load callback, [files, callback]
		readyqueue = [], // just callbacks to execute when ready
		ready = 0,
		gid = 0,
		core = {};

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

	var processcallbacks = function() {
		// go over the list of registered callbacks and check which ones are ready
		for (var i = 0; i < callbacks.length; i++) {
			for (var j = 0, satisfied = 1; satisfied &&
				j < callbacks[i][0].length; j++) {
				satisfied = loadstate[callbacks[i][0][j]] == 2;
			}
			if (satisfied) {
				callbacks[i][1]();
				callbacks.splice(i--, 1); // decrease i after shortening current array
			}
		}
	};

	var registerscript = function(file) {
		loadstate[file] = 1;
		setTimeout(function() {
			// add the script into the head as a new element
			var
				myscript = this.find('head').append({name: 'script'}).set("src", file),
				mycallback = function() {
					// if readystate exists ensure its value is 'loaded' or 'complete'
					if (!this.readyState || /oade|co/.test(this.readyState)) {
						loadstate[file] = 2;
						myscript.unwatch('load', mycallback).unwatch('load', mycallback).remove();
						processcallbacks();
					}
				};
			myscript.watch('load', mycallback);
			myscript.watch('readystatechange', mycallback);
		}, 0);
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
			callback.call(this[i]);
		}
	};

	core.select = function(selector) {
	// css selector engine for SPARK.  returns array of elements according to
	// the given selector string.  as much of CSS 2.1 selector syntax as
	// possible is supported including A > B, A + B, A:first-child
		var
			i,
			parts,
			cascade,
			tmp,
			Constructor = function() {},
			newelement,
			elements = [];

		// construct new spark object
		Constructor.prototype = this;
		newelement = new Constructor();
		newelement.length = 0;

		if (selector.charAt) {
			// if the selector is a string, then treat it as a CSS style selector

			selector += ","; // makes the loop with the regex easier

			// grab the parts of the selector one by one, and process it as we go.
			// whether there is whitespace before the part is significant
			while	((parts = selectorregex.exec(selector))) {

				if (parts[4]) {
					// we have at least a name; this is part of a selector and not a comma or the end
					var
						// set these parts for readability, mostly
						//whitespace = parts[1],
						//combine = parts[2],
						type = parts[3],
						name = parts[4],
						attrcompare = parts[6],
						attrvalue = parts[7],
						singleparent = elements.length==1 && (cascade=='>' || cascade=='>>'),
						searchwithin = singleparent ? elements[0] : document,
						skipcascade = !cascade,
						skipfilter = 0,
						regex,
						pass,
						newelements = [];

					// the cascade is the way in which the new set of elements must relate
					// to the previous set
					cascade = parts[2] || (parts[1] && cascade ? ">>" : cascade);

					// if we have no starting elements and this isn't the first run,
					// then don't bother
					if (elements.length || skipcascade) {

						// always treat .myclass the same as [class~=myclass] 
						if (type == '.') {
							attrvalue = name;
							attrcompare = '~=';
						}

						// get ready to filter
						if (attrcompare) {
							regex = new RegExp(
								attrcompare == '|=' ? ("^"+attrvalue+"(-|$)") :
								attrcompare == '~=' ? ("(\\s|^)"+attrvalue+"(\\s|$)") 
								: ("^"+attrvalue+"$"));
						}

						// see if we can skip the cascade, narrow down only
						if (cascade == '&') {
							newelements = elements.slice(0);
							skipcascade = 1;
						}
						else if (cascade == '+') {
							for (i = 0; i < elements.length; i++) {
								tmp = getelementsibling(elements[i]);
								if (tmp) {
									newelements.push(tmp);
								}
							}
							skipcascade = 1;
						}
						else {
							// see if we can narrow down.  in some cases if there's a single
							// parent we can still skip the cascade
							if (type == '#') {
								// get element by ID (quick - there's only one!)
								tmp = document.getElementById(name);
								newelements = tmp ? [tmp] : [];
								skipfilter = 1;
							}
							else {
								// get element by tag name or get all elements (worst case, when comparing
								// attributes and there's no '&' cascade)
								tmp = searchwithin.getElementsByTagName(type ? "*" : name);
								for (i = 0; i < tmp.length; i++) {
									newelements.push(tmp[i]);
								}
								skipfilter = !type;
								skipcascade += (singleparent && cascade == '>>');
							}
						}
						// now we do filtering and cascading in one big loop!  stand back!
						for (i = 0; i < newelements.length; i++) {
							pass = skipfilter ? 1 :
								!type ? (name == "*" || name.toLowerCase() == 
									newelements[i].nodeName.toLowerCase()) :
								type == "." ? regex.test(newelements[i].className) :
								type == '#' ? (newelements[i].id == name) :
								attrcompare ? regex.test(newelements[i].getAttribute(name)) :
								type == '[' ? ((tmp = newelements[i].getAttribute(name)) !==
									null && tmp != "") :
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
			elements = selector.cloneNode || selector.alert ? [selector] :
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
					var
						evt = event;
					evt.preventDefault = function() {
						evt.returnValue = !1;
					};
					evt.stopPropagation = function() {
						evt.cancelBubble = !0;
					};
					evt.target = evt.srcElement;
					return callback.call(myelement, evt);
				};

			myelement.SPARK = myelement.SPARK || {};
			myelement.SPARK["e"+callback.SPARKi] = 
				myelement.SPARK["e"+callback.SPARKi] || mycallback;

			if (myelement.addEventListener) {
				// other browsers
				myelement.addEventListener(eventname, callback, !1);
			} 
			else {
				myelement.attachEvent("on"+eventname, myelement.SPARK["e"+callback.SPARKi]);
			}
		});
	};

	core.unwatch = function(eventname, callback) {
	// removes an event handler added with watch(). While SPARK can be mixed
	// with other frameworks and even with native browser calls, you need to
	// always un-register each event handler with the same framework/method
	// as the event was registered with.
		this.each(function() {
			var
				myelement = this;
			if (myelement.addEventListener) {
				// other browsers
				myelement.removeEventListener(eventname, callback, !1);
			} 
			else {
				if (callback.SPARKi && myelement.SPARK &&
					myelement.SPARK["e"+callback.SPARKi]) {
					myelement.detachEvent("on"+eventname, myelement.SPARK["e"+callback.SPARKi]);
					delete myelement.SPARK["e"+callback.SPARKi];
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
	// for extending the default capabilities of SPARK. you can trash
	// the spark object by doing this, so make sure not to collide with
	// names of SPARK core properties
		core[name] = property;
		return this;
	};

	core.load = function(file, callback) {
	// for dynamically loading other javascript files.  files may be a single
	// URL or an array of URLs.  callback is optional, and if supplied the given
	// callback will be called once the given file is loaded.
	// files should be loaded asynchronously, and there is no guarantee about the
	// order in which they're executed, except that the callback will only be
	// called when all specified files are loaded.
	// It's safe to call this many times with the same file, and it won't be
	// loaded again, as long as the filename string is completely the same (not
	// just resolving to the same URL).
		var
			i,
			files = file.charAt ? [file] : file;

		for (i = 0; i < files.length; i++) {
			if (!loadstate[files[i]]) {
				registerscript(files[i]);
			}
		}
		if (callback) {
			callbacks.push([files,callback]);
		}
		processcallbacks();
		// load asks for callback so don't chain
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

	core.gettext = function() {
	// fetches and returns the text content of the selected nodes.
	// to set the text content of a node, you should just use
	// append("text") - preceded by empty() if necessary
		return !this.length ? undef :
			this[0].textContent ? this[0].textContent :
			this[0].innerText;
	};

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
		return newspark.append(spec.contents || []);
	};

	core.append = function(spec) {
	// inserts a new element or array of elements as defined by spec into
	// the document. for each selected element, the elements/text nodes
	// specified in the spec are created and then inserted within the 
	// element after any other children.
		var
			elements = [];
		this.each(function() {
			var 
				tmp,
				myspec = spec.name ? [spec] : spec,
				node;
			while ((tmp = myspec.shift())) {
				node = this.build(tmp);
				elements.push(node);
				this.appendChild(node);
			}
		});
		return this.select(elements);
	};

	core.insert = function(spec) {
	// inserts a new element or array of elements as defined by spec into
	// the document. for each selected element, the elements/text nodes
	// specified in the spec are created and then inserted before the
	// current element
		var
			elements = [];
		this.each(function() {
			var 
				tmp,
				myspec = spec.name ? [spec] : spec,
				node;
			while ((tmp = myspec.shift()) && this.parentNode) {
				node = this.build(tmp);
				elements.push(node);
				this.parentNode.insertBefore(node, this);
			}
		});
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
		try {
			var
				xmlhttprequest = XMLHttpRequest ?
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
		} catch (e) {}
		// asks for callback so don't chain
	};

	// set up ready listening
	core.select(document).watch("DOMContentLoaded", processreadyqueue);
	core.select(window).watch("load", processreadyqueue);
	// IE only hack; testing doscroll method
	if (/\bMSIE\b/.test(navigator.userAgent) && !window.opera && window == top) {
		checkscroll();
	}

	return core.select([]);
}()); 
