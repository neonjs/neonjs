/*

The Neon Javascript Library: json 
A JSON encoder for Neon

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

/*jslint browser:true,evil:true,newcap:true,undef:true */
/*global neon:true */

/**
@preserve The Neon Javascript Library: json
Copyright (c) Thomas Rutter 2011
http://neonjs.com
http://neonjs.com/license
*/

// It's unfortunate that JSON encoding and decoding is so hard
// to do in Javascript - until browsers start supporting it
// natively.

neon.jsonEncode = function(obj) {
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
				}
				catch (err1) {}
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
