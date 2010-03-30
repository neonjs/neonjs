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
	var
		doc = document,
		mynull = null,
		undef,
		selectorregex = /(\s*)([>+]?)\s*([#\.\[:]?)(\*|[\w\-]+)(([~|]?=)['"]?([^\]'"]*))?|\s*,/g,
		loadstate = [], // for each file, loadstate 1 = loading, 2 = loaded
		callbacks = [], // for each load callback, [files, callback]
		readyqueue = [], // just callbacks to execute when ready
		ready = 0;

	var checkcascade = function(elements, newelement, cascade) {
	// check if newelement cascades from the list of elements, according
	// to the cascade type.
	// cascade == '&' : match when newelement occurs in elements
	// cascade == '>' : when newelement is direct child of one in elements
	// cascade == '>>': when newelement is descendent of one in elements
		for (var m = 0; m < elements.length; m++) {
			if (
				cascade == ">>" ? (elements[m].compareDocumentPosition ?
					(elements[m].compareDocumentPosition(newelement) & 16) :
					(elements[m].contains(newelement) && elements[m]!==newelement)) :
				cascade == ">" ? newelement.parentNode === elements[m] :
				newelement === elements[m] // cascade == '&'
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

	var checkscroll = function() {
	// hack, intended only for IE, for checking when the DOM content is
	// loaded
		try {
			doc.documentElement.doScroll('left');
			processreadyqueue();
		} catch (e) {
			setTimeout(checkscroll, 7);
		}
	};

	var makeobject = function(prototype, selection) {
	// makes a new object based on the given prototype, and sets the selected
	// contents to those specified in selection.
		var
			Constructor = function() {},
			supplied = selection.cloneNode || selection.alert ? [selection] :
				selection,
			newobject;
		Constructor.prototype = prototype;
		newobject = new Constructor();

		for (var i = 0; i < supplied.length; i++) {
			newobject[i] = supplied[i];
		}
		newobject.length = supplied.length;

		return newobject;
	};

	var makeforeach = function(callback) {
		return function() {
			var
				i, result;
			for (i = 0; i < this.length; i++) {
				result = callback.apply(this[i], arguments);
				if (result !== undef) {
					return result;
				}
			}
			return this;
		};
	};

	var core = {

		build: function(spec) {
		// builds a new node (element or text node) according to the given
		// spec and selects it, but doesn't insert it into the document. this
		// is used internally by SPARK, but may be useful elsewhere. the spec
		// should be an object conforming to:
		// {name: <tag name>, attr: {name:val, ...}, contents: [<spec>, ...]}  
		// where attr and contents are optional.  alternatively, spec can be
		// just a string (which will result in a text node)
			var
				node = makeobject(this, spec.name ? doc.createElement(spec.name) :
					doc.createTextNode(spec)),
				name;
			if (spec.attr) {
				for (name in spec.attr) {
					if (spec.attr[name].charAt) {
						node[0].setAttribute(name, spec.attr[name]);
						if (name.toLowerCase() == "style") {
							node[0].style.cssText = spec.attr[name];
						}
						if (name.toLowerCase() == "class") {
							node[0].className = spec.attr[name];
						}
					}
				}
			}
			if (spec.contents) {
				node.append(spec.contents);
			}
			return node;
		},

		select: function(selector) {
		// css selector engine for SPARK.  returns array of elements according to
		// the given selector string.  as much of CSS 2.1 selector syntax as
		// possible is supported including A > B, A + B, A:first-child
			var
				parts,
				cascade,
				tmp,
				collected = [],
				elements = [];

			// if a node or an array of nodes (or array-like object) is passed
			// then just do this
			if (!selector.charAt) {
				return makeobject(this, selector);
			}

			selector += ","; // makes the loop with the regex easier

			// grab the parts of the selector one by one, and process it as we go.
			// whether there is whitespace before the part is significant
			while	((parts = selectorregex.exec(selector))) {

				if (parts[4]) {
					// we have at least a name; this is part of a selector and not a comma or the end
					var
						//whitespace = parts[1],
						//combine = parts[2],
						type = parts[3],
						name = parts[4],
						attrcompare = parts[6],
						attrvalue = parts[7],
						singleparent = elements.length==1 && (cascade=='>' || cascade=='>>'),
						searchwithin = singleparent ? elements[0] : doc,
						skipcascade = !cascade,
						skipfilter = 0,
						regex,
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
							for (var o = 0; o < elements.length; o++) {
								var 
									element = getelementsibling(elements[o]);
								if (element) {
									newelements.push(element);
								}
							}
							skipcascade = 1;
						}
						else {
							// see if we can narrow down.  in some cases if there's a single
							// parent we can still skip the cascade
							if (type == '#') {
								// get element by ID (quick - there's only one!)
								tmp = doc.getElementById(name);
								newelements = tmp ? [tmp] : [];
								skipfilter = 1;
							}
							else {
								// get element by tag name or get all elements (worst case, when comparing
								// attributes and there's no '&' cascade)
								tmp = searchwithin.getElementsByTagName(type ? "*" : name);
								for (var f = 0; f < tmp.length; f++) {
									newelements.push(tmp[f]);
								}
								skipfilter = !type;
								skipcascade += (singleparent && cascade == '>>');
							}
						}
						// now we do filtering and cascading in one big loop!  stand back!
						for (var n = 0; n < newelements.length; n++) {
							var
								pass = skipfilter ? 1 :
									!type ? (name == "*" || name.toLowerCase() == 
										newelements[n].nodeName.toLowerCase()) :
									type == "." ? regex.test(newelements[n].className) :
									type == '#' ? (newelements[n].id == name) :
									attrcompare ? regex.test(newelements[n].getAttribute(name)) :
									type == '[' ? ((tmp = newelements[n].getAttribute(name)) !==
										mynull && tmp != "") :
									(name.toLowerCase() == "first-child") ? 
										!getelementsibling(newelements[n],1) :
									0;
							if (!pass ||
								(!skipcascade && !checkcascade(elements, newelements[n], cascade))) {
								newelements.splice(n--, 1);
							}
						}
						elements = newelements;
						cascade = '&';
					}
				}
				else {
					// if we have reached either a comma or the end of the selector
					while ((tmp = elements.shift())) {

						if (!checkcascade(collected, tmp, '&')) {
							// if elements[p] DOESN'T exist in collected
							collected.push(tmp);
						}
					}
					cascade = 0;
				}
			}
			return makeobject(this, collected);
		},

		watch: makeforeach(function(eventname, callback) {
		// simple cross-platform event handling. registers the given callback
		// as an even handler for each currently selected element, for the event
		// named by eventname.  eventname should not include the "on" prefix.
		// intended to be cross platform.
		// the callback will be able to access the source element via the "this"
		// variable, and the event object via the first parameter.
		// the event object is largely different across browsers, but at least
		// preventDefault() is simulated on browsers (IE) not supporting it.
			var
				addeventlistener = arguments[3] ? "removeEventListener" :
					"addEventListener",
				attachevent = arguments[3] ? "detachEvent" : "attachEvent",
				mycallback = function() {
					var
						evt = event;
					evt.preventDefault = evt.preventDefault || function() {
						evt.returnValue = !1;
					};
					return callback.call(evt.srcElement, evt);
				};

			callback.SPARK = callback.SPARK || {};
			mycallback = callback.SPARK.iehn || (callback.SPARK.iehn = mycallback);

			if (this[addeventlistener]) {
				// other browsers
				this[addeventlistener](eventname, callback, !1);
			} 
			else {
				this[attachevent]("on"+eventname, mycallback);
			}
		}),

		unwatch: function(eventname, callback) {
		// removes an event handler added with watch(). While SPARK can be mixed
		// with other frameworks and even with native browser calls, you need to
		// always un-register events with the same method as the event was
		// registered with.
			this.watch(eventname, callback, undef, 1);
			// this asks for a callback, but not with the intention of running
			// it.  so do chain this method
			return this;
		},

		ready: function(callback) {
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
		},

		extend: function(name, property) {
		// for extending the default capabilities of SPARK.  the new
		// property will be added to the prototype chain of all SPARK
		// objects. Existing properties will not be replaced.
		// Therefore, you have to be careful not to collide with names of
		// present or future SPARK core properties.
			if (!core[name]) {
				core[name] = property;
			}
			return this;
		},

		load: function(file, callback) {
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
				files = file.charAt ? [file] : file,
				processcallbacks = function() {
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
				},
				registerscript = function(file) {
					loadstate[file] = 1;
					setTimeout(function () {
						// add the script into the head as a new element
						var
							myscript = this.find('head').append({name: 'script'}),
							mycallback = function() {
								var
									readystate = this.readyState;
								// if readystate exists ensure its value is 'loaded' or 'complete'
								if (!readystate || /loade|co/.test(readystate)) {
									loadstate[file] = 2;
									myscript.unwatch('load', mycallback, 1).unwatch('load', mycallback, 1).remove();
									processcallbacks();
								}
							};
						myscript[0].src = file;
						myscript.watch('load', mycallback);
						myscript.watch('readystatechange', mycallback);
					}, 0);
				};

			if (callback) {
				callbacks.push([files,callback]);
			}
			for (var i = 0; i < files.length; i++) {
				if (!loadstate[files[i]]) {
					registerscript(files[i]);
				}
			}
			processcallbacks();
			// load asks for callback so don't chain
		},

		style: makeforeach(function(style, styleval) {
		// gets or sets the style of the selected elements.
		// if styleval is blank and style is a string, gets the current style
		// of the first element having such a style
		// if styleval is specified, sets the current style instead
		// alternatively style can be an object of {style: styleval, ...} in
		// which case it sets multiple styles
			var
				stringfirst = style.charAt;
			if (stringfirst && styleval === undef) {
				return window.getComputedStyle ?
					getComputedStyle(this, mynull)[style] :
					this.currentStyle ? this.currentStyle[style] :
					undef;
			}
			if (stringfirst) {
				style = {};
				style[style] = styleval;
			}
			for (var name in style) {
				if (style[name].charAt && this.style) {
					this.style[name] = style[name];
				}
			}
		}),

		append: makeforeach(function(spec) {
		// inserts a new element or array of elements as defined by spec into
		// the document. for each selected element, the elements/text nodes
		// specified in the spec are created and them inserted within the 
		// element after any other children.
			var
				tmp,
				myspec = spec.name ? [spec] : spec,
				node;
			while ((tmp = myspec.shift())) {
				node = this.build(tmp);
				if (arguments[2] && this.parentNode) {
					this.parentNode.insertBefore(node, this);
				}
				else {
					this.appendChild(node);
				}
			}
		}),

		insert: function(spec) { 
		// inserts new element or elements as defined by spec into
		// the document. elements are inserted before the beginning of each
		// selected element.
		// Avoid attempting this on a node at the top of its tree (ie, the
		// document element).  Current behaviour in this exceptional case is
		// to append the nodes instead, but this may change.
			return this.append(spec, undef, 1);
		},

		remove: makeforeach(function(contentsonly) {
		// remove selected elements from the document.  If contentsonly is
		// given and is true, then it removes only their contents, leaving
		// the empty elements. note that references to the deleted objects
		// may still exist in the SPARK object that's returned (don't count
		// on this behaviour)
			var
				tmp;
			if (!contentsonly && this.parentNode) {
				this.parentNode.removeChild(this);
			}
			else {
				while ((tmp = this.firstChild)) {
					this.removeChild(tmp);
				}
			}
		}),

		each: makeforeach(function(callback) {
		// simply executes the given callback for each currently selected element.
		// the callback's 'this' variable will be the element it applies to
			callback.call(this);
		}),

		gethttp: function(url, callback, options) {
		// places an HTTP request (using XMLHttpRequest) for the given URL.
		// options is optional.  it should be an object with properties
		// like 'method' (get or post), 'body' (body of post request) etc.
		// callback is only called when the load is 100% complete (that is, you
		// won't be able to implement a progress indicator).
			var
				xmlhttprequest,
				myoptions = options || {},
				method = myoptions.method || 'GET',
				body = myoptions.body || mynull;
			try {
				xmlhttprequest = XMLHttpRequest ?
					new XMLHttpRequest() : new ActiveXObject('Microsoft.XMLHTTP');
				if (callback) {
					xmlhttprequest.onreadystatechange = function() {
						if (xmlhttprequest.readyState == 4) {
							callback.call(xmlhttprequest);
						}
					};
				}
				xmlhttprequest.open(method, url, !0);
				xmlhttprequest.send(body);
			} catch (e) {}
			// asks for callback so don't chain
		}
	};

	// set up ready listening
	core.select(doc).watch("DOMContentLoaded", processreadyqueue);
	core.select(window).watch("load", processreadyqueue);
	// IE only hack; testing doscroll method
	if (/\bMSIE\b/.test(navigator.userAgent) && !window.opera && window == top) {
		checkscroll();
	}

	return makeobject(core, []);
}()); 
