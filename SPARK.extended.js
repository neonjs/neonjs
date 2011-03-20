/*

The SPARK Javascript Library: extended

Part of the SPARK Javascript Library
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

See http://SPARKlib.com for documentation and examples of use.

*/

/*jslint browser:true,evil:true,newcap:true,undef:true */
/*global SPARK:true,attachEvent,window,self,top,opera,ActiveXObject */

/**
@preserve The SPARK Javascript Library
Copyright (c) Thomas Rutter 2011
http://SPARKlib.com
*/

SPARK.getText = function() {
// fetches and returns the text content of the selected nodes.
// to set the text content of a node, you should just use
// .append("text") - preceded by .empty() if replacing existing
// contents
	return !this.length ? undefined :
		this[0].textContent || this[0].innerText;
};

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

SPARK.flyout = function(direction) {
// turns the selected element(s) into fly-out menus.
// direction specifies first which side of the offsetparent the flyout
// should appear on out of 'l', 'r', 't', 'b', then optionally another
// letter specifying the alignment, eg if the first is bottom, whether
// to fly towards the right from the left ('r') or vice versa.  default
// is 'br'.
// make sure that the element you want to fly out FROM is the offsetparent,
// that is, give it position 'relative' (or anything other than static)

// closeevent specifies the event that closes the flyout if received outside
// of both it and its offsetparent - recommended
// is 'mousedown' for normal menus or 'mousein' for a hover-only (no click
// required) menu.

	var
		i,
		flyout, host,
		rect, size,
		addrect, dim,
		horiz = /^[lr]/.test(direction),
		clientwidth = window.innerWidth || document.documentElement.clientWidth,
		clientheight = window.innerHeight || document.documentElement.clientHeight;

	for (i = this.length; i--;) {
		flyout = this.select(this[i]).style('position', 'absolute').style('zIndex', 1e3);
		host = this.select(flyout[0].offsetParent);

		// getBoundingClientRect not supported by some browsers
		// like firefox 2 and earlier.  Supported in IE5.x+ though
		// flyout should have an offsetparent, but it may not
		rect = host[0] && host[0].getBoundingClientRect && host[0].getBoundingClientRect();
		size = flyout[0].getBoundingClientRect && flyout[0].getBoundingClientRect();

		addrect = horiz ? 0 : rect.right - rect.left;
		dim = size.right - size.left || 1e3;
		flyout.style(rect.left+addrect < dim ? 'left' :
			clientwidth+addrect-rect.right < dim ? 'right' :
			/l/.test(direction) ? 'right' : 'left',
			horiz ? '100%' : '0');

		addrect = !horiz ? 0 : rect.bottom - rect.top;
		dim = size.bottom - size.top || 1e3;
		flyout.style(rect.top+addrect < dim ? 'top' :
			clientheight+addrect-rect.bottom < dim ? 'bottom' :
			/t/.test(direction) ? 'bottom' : 'top',
			!horiz ? '100%' : '0');
	}

	return this;
};

