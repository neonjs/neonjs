
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
		loadstate = {}, // for each file, loadstate 1 = loading, 2 = loaded
		animations = [], // information about properties currently animating
		readyqueue = [], // just callbacks to execute when ready
		animationschedule, // next scheduled tick or 0/undefined if stopped
		undef, // shortcut for undefined
		ready = 0,
		gid = 0;

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
			collected = [],
			cascade,
			singleparent,
			searchwithin,
			pass,
			regex = /(([>+]?)\s*)([#.\[:]?)([*\w\-]+)(([|~]?=)("|'|)((\\.|[^\\])*?)\7\])?|,/g;

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
					attrcompare = parts[6],
					attrvalue = (""+parts[8]).replace(/\\(.)/g, "$1"), // strip slashes
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
							if (type == "." && searchwithin.getElementsByClassName) {
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
							!type ? name == "*" || newelements[i].nodeName.toLowerCase() ==
								name.toLowerCase() :
							type == "#" ? newelements[i].id == name :
							type == "." ?
								(" "+newelements[i].className+" ").replace(/\s/g, " ").
								indexOf(" "+name+" ") >= 0 :
							type == "[" ? (
								!attrcompare || !attrvalue ? newelements[i].hasAttribute(name) :
								(tmp = name == "class" ? newelements[i].className :
								 	newelements[i].getAttribute(name)) &&
								attrcompare == "=" ? tmp == attrvalue :
								attrcompare == "~=" ? (" "+tmp+" ").
									indexOf(" "+attrvalue+" ") >= 0 :
								(tmp+"-").indexOf(attrvalue) === 0) :
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
			x = (time - anim[4]) / (anim[7]||400);
			if (x > 1) {
				animations.splice(i, x = 1);
			}

			anim[0][anim[1]] = (
				anim[6] == "lin"   ? x :
				anim[6] == "in"    ? x*x :
				anim[6] == "inout" ? (1-Math.cos(Math.PI*x)) / 2 :
				anim[6] == "el"    ? ((2-x)*x-1) *
					Math.cos(Math.PI*x*2*(anim[7]||400)/(anim[8]||300)) + 1 :
				anim[6] == "fn"    ? anim[8](x) :
				(2-x)*x // 'out' (default)
				) * anim[3] + anim[2] + anim[5];

		}
	};

	// ##################################################################
	// PUBLIC METHODS
	// call these methods using SPARK.methodname() eg SPARK.watch()

	SPARK.select = function(selector) {
	// main way of selecting elements in SPARK.  accepts a CSS selector
	// string, or a node or array of nodes.  also accepts the window object
	// returns a SPARK object with the given elements selected.
		var
			i,
			elements,
			newelement,
			Constructor = function() {};
		
		Constructor.prototype = this;
		newelement = new Constructor();

		if (selector !== ""+selector) {
		// handle the case where no selector is given, or a node, window,
		// or array of nodes
			elements = !selector ? [] :
				selector.nodeType || selector.setTimeout ? [selector] :
				selector;

			for (newelement.length = i = elements.length; i--;) {
				newelement[i] = elements[i];
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
			myfiles = files===""+files ? [files] : files,
			mycallback = callback || function() {},
			that = this,
			loadid = ++gid,
			registerscript = function(file) {
				var
					myscript = that.build({script:"",$src:file}),
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

	SPARK.getStyle = function(style) {
	// fetches and returns the "computed"/"current" style value for
	// the given style, for the first selected element.
	// Note that this value may be returned in a range of different
	// notations, in particular in IE where it's as it was set eg.
	// "yellow" vs "rgb(255, 255, 0)" vs "#ffff00".  at this stage
	// spark doesn't normalise them
		return !this[0] ? undef :
			document.defaultView && document.defaultView.getComputedStyle ?
				document.defaultView.getComputedStyle(this[0], null)[style] :
			this[0].currentStyle[style];
	};

	/*
	SPARK.getText = function() {
	// fetches and returns the text content of the selected nodes.
	// to set the text content of a node, you should just use
	// .append("text") - preceded by .empty() if replacing existing
	// contents
		return !this.length ? undef :
			this[0].textContent || this[0].innerText;
	};
	*/

	/*
	SPARK.get = function(prop) {
	// fetches and returns the value of the given property, for the
	// first selected element.
		return this[0][prop];
	};

	SPARK.set = function(prop, value) {
	// really simple method, just sets one or more properties on each
	// selected node.  prop can be an object of {property: value, ...}
	// or you can set a single property with prop and value.
		var
			i = this.length;

		while (i--) {
			this[i][prop] = value;
		}

		return this;
	};
	*/

	SPARK.setAttribute = function(attr, value) {
	// shortcut, for setting attribute on all selected elements
	// note that in this function, setting the value to "" (empty
	// string) removes that attribute.  handy for boolean attributes
	// like 'selected'
		for (var i = this.length, lower = attr.toLowerCase(); i--;) {

			if (lower == "style") {
				this[i].style.cssText = value;
			}
			else if (lower == "for") {
				this[i].htmlFor = value;
			}
			else if (lower == "class") {
				this[i].className = value;
			}
			// i'm not sure if the following is necessary (src):
			/*
			else if (lower == "src") {
				this[i].src = value;
			}
			*/
			else if (!value) {
				this[i].removeAttribute(attr);
			}
			else {
				this[i].setAttribute(attr, value);
			}
		}
		return this;
	};

	SPARK.removeAttribute = function(attr) {
		return this.setAttribute(attr, "");
	};

	SPARK.removeClass = function(myclass) {
	// removes the given class from all selected nodes.
	// it's assumed that classes are always separated by spaces
		for (var i = this.length; i--;) {
			this[i].className =
				(" "+this[i].className+" ").replace(/\s/g, " ").
				replace(" "+myclass+" ", " ").slice(1,-1);
		}
		return this;
	};

	SPARK.addClass = function(myclass) {
	// adds the given class to all selected nodes.
	// removes the class first if it's already there, to prevent
	// duplication
		for (var i = this.length; i--;) {
			this[i].className =
				(" "+this[i].className+" ").replace(/\s/g, " ").
				replace(" "+myclass+" ", " ").slice(1) + myclass;
		}
		return this;
	};

	SPARK.style = function(style, value, lastval, easing, msec, parm) {
	// sets an inline style to the given value on all selected nodes.
	// if lastval is given, then after the style is initially set to
	// the first value, it is animated towards the last value.  easing,
	// msec and parm are all optional and specify parameters for the
	// animation; if they are not given, a fairly basic and short
	// animation is used by default.
		var
			i = this.length, j,
			time = +new Date(),
			mylastval,
			myval,
			animated = 
				lastval !== undef &&
				(mylastval = parseFloat(lastval)) == mylastval &&
				(myval = parseFloat(value)) == myval,
			suffix = animated && /\D*$/.exec(lastval)[0];

		while (i--) {
			this[i].style[style] = value;

			for (j = animations.length; j--;) {
				if (animations[j][0] === this[i].style &&
					animations[j][1] == style) {
					animations.splice(j, 1);
					j = 0;
				}
			}

			if (animated) {
				animations.push([
					this[i].style, style, myval, mylastval - myval,
					time, suffix, easing, msec, parm
					]);
			}
		}

		if (animated && !animationschedule) {
			animationtick();
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
		if (spec === "" || spec === null || spec.length === 0) {
			return this.select([]);
		}
		if (spec.cloneNode && spec.nodeType) { // is a node
			return this.select(spec);
		}
		if (spec.length && spec[0] && spec !== ""+spec) { //arraylike
			element = document.createDocumentFragment();
			for (tmp = 0, len = spec.length; tmp < len;) {
				element.appendChild(this.build(spec[tmp++])[0]);
			}
			return this.select(element.childNodes);
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
			element.setAttribute(attributes[tmp][0], attributes[tmp][1]);
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
		for (var i = this.length, tmp; i--;) {
			while ((tmp = this[i].lastChild)) {
				this[i].removeChild(tmp);
			}
		}
		return this;
	};

	SPARK.jsonDecode = function(json) {
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

	SPARK.getHttp = function(url, callback, method, body) {
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
					this.jsonDecode(xmlhttprequest.responseText);
				}

				callback.call(xmlhttprequest);
			}
		};
		xmlhttprequest.open(method || "GET", url, !0);
		if (body && ""+body!==body &&
			typeof body.cloneNode != "function" &&
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
	// SPARK.framing before loading SPARK
	// I consider this temporary until stable Firefox implements
	// X-FRAME-OPTIONS which is a better clickjacking fix
	if (self !== top && !SPARK.framing) {
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
