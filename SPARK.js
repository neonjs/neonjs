
// SPARK core - your basic javascript framework with CSS selectors
// and event handling, and a way of loading in modules
// Part of the SPARK Javascript library
// Copyright (c) 2010 Thomas Rutter

/*jslint browser: true, evil: true, newcap: true, immed: true */
/*global SPARK:true,attachEvent,window,self,opera,ActiveXObject */

/**
@preserve SPARK js lib (c) Thomas Rutter SPARKlib.com
*/

SPARK = (function() {

	// ##################################################################
	// PRIVATE VARIABLES
	
	var
		SPARK = window.SPARK || {},
		undef,
		loadstate = {}, // for each file, loadstate 1 = loading, 2 = loaded
		animations = [], 
		readyqueue = [], // just callbacks to execute when ready
		animationschedule = 0, // next scheduled tick or 0 if stopped
		ready = 0,
		gid = 0;

	var makeobject = function(base) {
		var
			Constructor = function() {};
		Constructor.prototype = base;
		return new Constructor();
	};

	var getprevioussibling = function(element) {
	// find the previous sibling of this element which is an element node
		while ((element = element.previousSibling)) {
			if (element.nodeType == 1) {
				return element;
			}
		}
	};

	var checkinarray = {
		" " : function(elements, newelement) {
			for (var i = elements.length;i--;) {
				if (elements[i].compareDocumentPosition ?
						elements[i].compareDocumentPosition(newelement) & 16 :
					elements[i].contains ?
						(elements[i].contains(newelement) && elements[i] !== newelement) :
					0) {
					return 1;
				}

			}
		},
		">" : function(elements, newelement) {
			for (var i = elements.length;i--;) {
				if (elements[i] === newelement.parentNode) {
					return 1;
				}
			}
		},
		"+" : function(elements, newelement) {
			for (var i = elements.length;i--;) {
				if (elements[i] === getprevioussibling(newelement)) {
					return 1;
				}
			}
		},
		"&" : function(elements, newelement) {
			for (var i = elements.length;i--;) {
				if (elements[i] === newelement) {
					return 1;
				}
			}
		}
	};

	var checkattr = function(attr, attrcompare, attrvalue) {
	// check if attribute attr matches the attribute comparison specified
		return !attrcompare ? attr !== null && attr != "" :
			attrcompare == "=" ? attrvalue == attr :
			attrcompare == "~=" ? (" "+attr+" ").indexOf(" "+attrvalue+" ") >= 0 :
			(attr+"-").indexOf(attrvalue) === 0;
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
			if (!ready) {
				setTimeout(checkscroll, 16);
			}
		}
	};

	var jsondecode = function(json) {
	// unserialises the JSON string into the equivalent value.  Does a check
	// on the string that is only thorough enough to prevent arbitrary code
	// execution.
	
		/*
		var cx = /[\x00\u007f-\uffff]/g;
		json = json.replace(cx, function(ch) {
			return '\\u' + ('000' + ch.charCodeAt(0).toString(16)).slice(-4);
		});
		*/
		if (/^[\],:{}\s]*$/.test(
			json.replace(/\\["\\\/bfnrt]|\\u[0-9a-fA-F]{4}/g, "$").
			replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, "]").
			replace(/(?:^|:|,)(?:\s*\[)+/g, ""))) {
			return eval("("+json+")");
		}
	};

	var myqueryselector = function(selector) {
	// css selector engine for SPARK.  returns array of elements according to
	// the given selector string.  as much of CSS 2.1 selector syntax as
	// possible is supported including A > B, A + B, A:first-child
	// processes the selector string as a CSS style selector and returns
	// just an array of elements matching.  for internal use - call
	// SPARK.select() in your own code.
		var
			i, len,
			parts,
			tmp,
			elements = [],
			cascade,
			singleparent,
			searchwithin,
			pass,
			regex = /(([>+]?)\s*)([#.\[:]?)([*\w\-]+)(([|~]?=)("|'|)((\\.|[^\\])*?)\7\])?|,/g,
			collected = [];

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
					attrvalue = (parts[8]+"").replace(/\\(.)/g, "$1"), // strip slashes
					skipcascade = !cascade,
					skipfilter = 0,
					newelements = [];

				// the cascade is the way in which the new set of elements must relate
				// to the previous set.  >> is just a ancestor-descendent relationship
				// like a space in a CSS selector

				cascade = parts[2] ? parts[2] :
					parts[1] && cascade ? " " :
					cascade;

				singleparent = elements.length==1 && (cascade === ">" || cascade === " ");
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
						if (type == "#") {
							skipfilter = 1;
							// get element by ID (quick - there's only one!)
							if ((tmp = document.getElementById(name))) {
								newelements.push(tmp);
							}
						}
						else {
							// get element by tag name or get all elements (worst case, when comparing
							// attributes and there's no '&' cascade)
							skipfilter = !type;
							tmp = searchwithin.getElementsByTagName(type ? "*" : name);
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
							!type ? name == "*" || newelements[i].nodeName.toLowerCase() ==
								name.toLowerCase() :
							type == "#" ? newelements[i].id == name :
							type == "." ? checkattr(newelements[i].className,
								"~=", name) :
							type == "[" ? checkattr(newelements[i].getAttribute(name),
								parts[6], attrvalue) :
							name.toLowerCase() == "first-child" ? 
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
				while ((tmp = elements.shift())) {

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

	var animationtick = function() {
	// process a single frame for all registered animations.  Any
	// animation callback that returns false is deregistered, and when
	// there are no registered animations left this function stops
	// calling itself.
		var
			i = animations.length,
			time = +new Date(),
			anim,
			x;

		animationschedule = !i ? 0 :
			time < animationschedule + 10 ? animationschedule + (50/3) :
			time + 4;

		if (animationschedule) {
			setTimeout(animationtick, animationschedule - time);
		}

		while (i--) {
			anim = animations[i];
			if ((x = (time - anim[4]) / anim[5]) > 1) {
				x = 1;
				animations.splice(i, 1);
			}

			anim[0][anim[1]] = anim[2] + anim[3] * (
				anim[7] == 'lin'   ? x :
				anim[7] == 'in'    ? x * x :
				anim[7] == 'inout' ? (1 - Math.cos(Math.PI * x)) / 2 :
				anim[7] == 'el'    ? ((2-x) * x - 1) * Math.cos(Math.PI * 2/anim[6] * x) + 1 :
				(2-x) * x // 'out' (default)
				) + anim[8];

		}
	};

	// ##################################################################
	// PUBLIC METHODS
	// call these methods using SPARK.methodname() eg SPARK.watch()

	SPARK._animate = function(obj, prop, firstval, lastval, ease, msec, period) {
	// The frequency of frames will aim for the smoothest animation.  It
	// won't ever significantly exceed 60 fps, but may be less frequent.
		var
			i = animations.length,
			time = +new Date();
	
		// if this property is already animating, stop it. todo optimise 
		while (i--) {
			if (animations[i][0] === obj && animations[i][1] === prop) {
				animations.splice(i, 1);
			}
		}

		firstval = parseFloat(firstval);
		animations.push([
			obj, prop,
			firstval, parseFloat(lastval) - firstval,
			time, msec || 444, (period || 333) / (msec || 444), ease,
			lastval.replace(/[\d.]+/, "")
			]);

		if (!animationschedule) {
			animationtick();
		}
	};

	SPARK.select = function(selector) {
	// main way of selecting elements in SPARK.  accepts a CSS selector
	// string, or a node or array of nodes.  also accepts the window object
	// returns a SPARK object with the given elements selected.
		var
			elements,
			len,
			newelement = makeobject(this);

		if (typeof selector != "string") {
		// handle the case where no selector is given, or a node, window,
		// or array of nodes
			elements = !selector ? [] :
				selector.nodeType == 11 ? selector.childNodes :
				selector.nodeType || selector.setTimeout ? [selector] :
				selector;

			for (newelement.length = 0, len = elements.length;
				newelement.length < len;) {
				newelement[newelement.length] = elements[newelement.length++];
			}
			return newelement;
		}

		return this.select(document.querySelectorAll ?
			document.querySelectorAll(selector) :
			myqueryselector(selector));
	};

	SPARK.watch = function(eventname, callback) {
	// simple cross-platform event handling. registers the given callback
	// as an even handler for each currently selected element, for the event
	// named by eventname.  eventname should not include the "on" prefix.
	// intended to be cross platform.
	// The callback will be able to access the event object via the first
	// parameter, which will contain event.target, event.preventDefault()
	// and event.stopPropagation() across browsers.
		var
			i,
			myelement,
			makecallback = function(myelement) {
				return function() {
					var
						evt = event;
					evt.preventDefault = function() {
						evt.returnValue = !1;
					};
					evt.stopPropagation = function() {
						evt.cancelBubble = !0;
					};
					if (!evt.which) {
						evt.which = 
							evt.button & 1 ? 1 :
							evt.button & 2 ? 3 :
							evt.button & 4 ? 2 : evt.which;
					}
					evt.pageX = evt.clientX + 
						(document.documentElement.scrollLeft || document.body.scrollLeft);
					evt.pageY = evt.clientY + 
						(document.documentElement.scrollTop || document.body.scrollTop);
					evt.currentTarget = myelement;
					evt.target = evt.srcElement;
					return callback.call(myelement, evt);
				};
			};

		callback.SPARK = callback.SPARK || {};
		callback.SPARK.$i = callback.SPARK.$i || ++gid;

		for (i = this.length; i--;) {
			myelement = this[i];

			if (myelement.addEventListener) {
				// other browsers
				myelement.addEventListener(eventname, callback, !1);
			} 
			else {
				// all this so we can provide 'this' and 'currentTarget' in IE.
				// So we maintain a separate handler with its in-closure reference
				// to 'myelement' for each element we apply to
				myelement.SPARK = myelement.SPARK || {};
				myelement.SPARK["$e"+callback.SPARK.$i] = 
					myelement.SPARK["$e"+callback.SPARK.$i] || makecallback(myelement);
				myelement.attachEvent("on"+eventname, myelement.SPARK["$e"+callback.SPARK.$i]);
			}
		}
	};

	SPARK.unwatch = function(eventname, callback) {
	// removes an event handler added with watch(). While SPARK can be mixed
	// with other frameworks and even with native browser calls, you need to
	// always un-register each event handler with the same framework/method
	// as the event was registered with.
		var
			i,
			myelement;

		for (i = this.length; i--;) {
			myelement = this[i];

			if (myelement.addEventListener) {
				// other browsers
				myelement.removeEventListener(eventname, callback, !1);
			} 
			else {
				if (myelement.SPARK && callback.SPARK && 
					myelement.SPARK["$e"+callback.SPARK.$i]) {
					// special IE handling
					myelement.detachEvent("on"+eventname,
						myelement.SPARK["$e"+callback.SPARK.$i]);
					delete myelement.SPARK["$e"+callback.SPARK.$i];
				}
			}
		}
		return this;
	};

	SPARK.ready = function(callback) {
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

	SPARK.load = function(files, callback) {
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
			i,
			myfiles = typeof files == "string" ? [files] : files,
			mycallback = callback || function() {},
			that = this,
			loadid = ++gid,
			registerscript = function(file) {
				var
					myscript = that.build({script:""}).set("src", file),
					gencallback = function() {
						if (loadstate[file] != 2 &&
							(!this.readyState || /loade|co/.test(this.readyState))) {
							loadstate[file] = 2;
							myscript.unwatch("load", gencallback).unwatch("readystatechange",
								gencallback).remove();
							if (!(--mycallback.SPARK["$l"+loadid])) {
								// this callback is no longer waiting on any files, so call it
								mycallback();
								delete mycallback.SPARK["$l"+loadid];
							}
						}
					};
				loadstate[file] = 1;
				myscript.watch("load", gencallback);
				myscript.watch("readystatechange", gencallback);
				that.select(document.documentElement.childNodes[0]).append(myscript);
			};

		mycallback.SPARK = mycallback.SPARK || {};
		// store a count of how many files this callback (for this loadid)
		// is still "waiting on"
		mycallback.SPARK["$l"+loadid] = 0;

		this.ready(function() {
			for (i = myfiles.length; i--;) {
				if (!loadstate[myfiles[i]]) {
					mycallback.SPARK["$l"+loadid]++;
					registerscript(myfiles[i]);
				}
			}
			if (!mycallback.SPARK["$l"+loadid]) {
				mycallback();
			}
		});
	};

	SPARK.get = function(prop) {
	// fetches and returns the value of the given property, for the
	// first selected element.
		return this.length && this[0][prop];
	};

	SPARK.getstyle = function(style) {
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
	SPARK.gettext = function() {
	// fetches and returns the text content of the selected nodes.
	// to set the text content of a node, you should just use
	// .append("text") - preceded by .empty() if replacing existing
	// contents
		return !this.length ? undef :
			this[0].textContent || this[0].innerText;
	};
	*/

	SPARK.set = function(prop, value) {
	// really simple method, just sets one or more properties on each
	// selected node.  prop can be an object of {property: value, ...}
	// or you can set a single property with prop and value.
		for (var i = this.length; i--;) {
			this[i][prop] = value;
		}
		return this;
	};

	SPARK.setstyle = function(style, value) {
	// sets one or more styles on each selected node.  style can be
	// an object of {style: styleval, ...} or you can set a single
	// style with style and value.
		for (var i = this.length; i--;) {
			if (this[i].style) {
				this[i].style[style] = value;
			}
		}
		return this;
	};

	SPARK.build = function(spec) {
	// builds one or more new nodes (elements/text nodes) according to
	// the given spec and returns a spark object with the new nodes
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
		if (!spec || spec.length === 0) {
			return this.select([]);
		}
		if (spec.cloneNode && spec.nodeType) { // is a node
			return this.select(spec);
		}
		if (spec.length && spec[0] && typeof spec != "string") { //arraylike
			element = document.createDocumentFragment();
			for (tmp = 0, len = spec.length; tmp < len;) {
				element.appendChild(this.build(spec[tmp++])[0]);
			}
			return this.select(element);
		}
		if (typeof spec != "object") {
			return this.select(document.createTextNode(spec));
		}
		for (tmp in spec) {
			if (Object.hasOwnProperty.call(spec, tmp)) {
				if (tmp.slice(0,1) == "$") {
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
			element[0].setAttribute(attributes[tmp][0], attributes[tmp][1]);
			if (attributes[tmp][0].toLowerCase() == "style" && element[0].style) {
				element[0].style.cssText = attributes[tmp][1];
			}
			if (attributes[tmp][0].toLowerCase() == "class") {
				element[0].className = attributes[tmp][1];
			}
		}
		return element;
	};
	
	SPARK.append = function(spec) {
	// inserts a new element or array of elements into the document.
	// the parameter may be either a node, a spec as defined in build(),
	// or an array containing a mixture of such.
	// the new elements are appended to the child nodes of each currently
	// selected node.
		var
			i, j, len,
			element = this.build(spec)[0],
			instance,
			group,
			collected = [];
		
		if (element) {
			if (element.parentNode && element.parentNode.nodeType == 11) {
				element = element.parentNode;
			}
			for (i = this.length; i--;) {
				if (this[i].appendChild) {
					instance = i ? element.cloneNode(!0) : element;
					group = instance.nodeType == 11 ? instance.childNodes : [instance];
					for (j = 0, len = group.length; j < len;) {
						collected.push(group[j++]);
					}
					this[i].appendChild(instance);
				}
			}
		}
		return this.select(collected);
	};

	SPARK.insert = function(spec) {
	// inserts a new element or array of elements into the document.
	// the parameter may be either a node, a spec as defined in build(),
	// or an array containing a mixture of such.
	// the new elements are inserted before each currently
	// selected node.
		var
			i, j, len,
			element = this.build(spec)[0],
			instance,
			group,
			collected = [];
		
		if (element) {
			if (element.parentNode && element.parentNode.nodeType == 11) {
				element = element.parentNode;
			}
			for (i = this.length; i--;) {
				if (this[i].parentNode) {
					instance = i ? element.cloneNode(!0) : element;
					group = instance.nodeType == 11 ? instance.childNodes : [instance];
					for (j = 0, len = group.length; j < len;) {
						collected.push(group[j++]);
					}
					this[i].parentNode.insertBefore(instance, this[i]);
				}
			}
		}
		return this.select(collected);
	};

	SPARK.remove = function() {
	// removes the selected nodes from the document and all their contents.
		for (var i = this.length; i--;) {
			if (this[i].parentNode) {
				this[i].parentNode.removeChild(this[i]);
			}
		}
		return this;
	};

	SPARK.empty = function() {
	// deletes the contents of the selected nodes, but not the nodes
	// themselves
		var
			i, tmp;
		for (i = this.length; i--;) {
			while ((tmp = this[i].lastChild)) {
				this[i].removeChild(tmp);
			}
		}
		return this;
	};

	/*
	SPARK.jsonencode = function(obj, _exclude) {
	// serialises the value obj into a JSON string.  the second parameter is
	// intended for internal use only and must not be relied upon in case
	// of future changes
		var
			i, current, len,
			exclude = _exclude || [],
			meta = {'\n': '\\n', '\r': '\\r', '"' : '\\"', '\\': '\\\\'},
			escapechars = /[\\\"\x00-\x1f\u007f-\uffff]/g,
			collected = [];

		if (typeof obj == 'object' && obj !== null) {

			// prevent endless recursion; check if processing same object inside itself
			if (checkinarray["&"](exclude, obj)) {
				return undef;
			}
			exclude.push(obj);

			if (Object.prototype.toString.call(obj) == '[object Array]') {
				for (i = 0, len = obj.length; i < len; i++) {
					try {
						collected.push(this.jsonencode(obj[i], exclude) || 'null');
					} catch (err1) {}
				}
				return '[' + collected.join() + ']';
			}

			// not array so treat it as pairs of name:value
			for (i in obj) {
				if (Object.hasOwnProperty.call(obj, i)) {
					try {
						if ((current = this.jsonencode(obj[i], exclude))) {
							collected.push(this.jsonencode(i) + ':' + current);
						}
					} catch (err2) {}
				}
			}
			return '{' + collected.join() + '}';
		}

		return typeof obj == 'string' ? '"' + obj.replace(escapechars, function(ch) {
				return meta[ch] || '\\u' + ('000' + ch.charCodeAt(0).toString(16)).slice(-4);
				}) + '"' :
			typeof obj == 'number' ? (isFinite(obj) ? String(obj) : 'null') :
			typeof obj == 'boolean' ? String(obj) :
			obj === null ? "null" :
			undef;
	};
	*/

	SPARK.gethttp = function(url, callback, method, body) {
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
			if (xmlhttprequest.readyState == 4) {

				// implement JSON parsing
				if (!xmlhttprequest.responseJSON) {
					xmlhttprequest.responseJSON =
					jsondecode(xmlhttprequest.responseText);
				}

				callback.call(xmlhttprequest);
			}
		};
		xmlhttprequest.open(method || "GET", url, !0);
		if (body && typeof body.cloneNode != "function" &&
			typeof body.read != "function") {
			for (i in body) {
				if (Object.hasOwnProperty.call(body, i)) {
					collected.push(encodeURIComponent(i) + "=" +
						encodeURIComponent(body[i]));
				}
			}
			body = collected.join("&");
			xmlhttprequest.setRequestHeader("Content-type",
				"application/x-www-form-urlencoded");
		}
		xmlhttprequest.send(body);
		// asks for callback so don't chain
	};

	// frame busting.  this is built in for security
	// but you can prevent it by setting a global 
	// SPARK.inframe before loading SPARK
	// I consider this temporary until stable Firefox implements
	// X-FRAME-OPTIONS which is a better clickjacking fix
	if (self !== top && !SPARK.allowframing) {
		top.location.replace(location.href);
		location.replace(null);
	}

	// set up ready listening
	SPARK.select(document).watch("DOMContentLoaded", processreadyqueue);
	SPARK.select(window).watch("load", processreadyqueue);
	// IE only hack; testing doscroll method - check IE9 support
	if (/\bMSIE\s/.test(navigator.userAgent) && !window.opera && self === top) {
		checkscroll();
	}

	return SPARK;
}()); 

