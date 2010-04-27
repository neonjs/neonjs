
// SPARK json - json encoding for Javascript
// and event handling, and a way of loading in modules
// Part of the SPARK Javascript library
// Copyright (c) 2010 Thomas Rutter

// It's unfortunate that JSON encoding and decoding is so hard
// to do in Javascript - until browsers start supporting it
// natively.

/*jslint browser: true, evil: true, newcap: true, immed: true */
/*global SPARK:true */

/**
@preserve SPARK js lib (c) Thomas Rutter SPARKlib.com
*/

SPARK.jsonEncode = SPARK.jsonEncode || function(obj) {
// serialises the value obj into a JSON string.
// this JSON encoder guards against infinite recursion, as well as
// write-only properties (properties which throw an error when you
// attempt to read them) so it should be safe to use it when you object
// contains native objects, circular references etc.
	var
		i, current, len,
		exclude = arguments[1] || [],
		meta = {'\n': '\\n', '\r': '\\r', '"' : '\\"', '\\': '\\\\'},
		escapechars = /[\\\"\x00-\x1f\u007f-\uffff]/g,
		undef,
		collected = [];

	if (typeof obj == 'object' && obj !== null) {

		// prevent endless recursion; check if processing same object inside itself
		for (i = exclude.length; i--;) {
			if (obj === exclude[i]) {
				return undef;
			}
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
