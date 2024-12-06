/*

The Neon Javascript Library: animate
Legacy animation features of Neon

Part of the Neon Javascript Library
Copyright (c) 2013, Thomas Rutter
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

*/

/*jshint strict:false,smarttabs:true,browser:true,
	bitwise:false,
	curly:true,eqeqeq:true,forin:true,immed:true,latedef:true,newcap:true,noarg:true,undef:true,trailing:true */
/*global neon:true */

/**
@preserve The Neon Javascript Library: animate
Copyright (c) Thomas Rutter 2013
*/

neon.style = (function() {

	// ##################################################################
	// PRIVATE VARIABLES
	
	var
		animations = [], // information about properties currently animating
		animationschedule, // next scheduled tick or 0/undefined if stopped
		animgid = 0;

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

	var style = function(style, value, lastval, duration, easing, endfunc) {
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
			endfuncid = endfunc && ++animgid;

		var myendfunc = endfunc && function() {
			endfunc.call(that);
		};

		style = style === 'float' ? 'cssFloat' :
			style.replace(/-(.)/g, function(a,b) { return b.toUpperCase(); });

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
			// still required for IE8
			this.style('filter', 'alpha(opacity='+(100*myval)+')',
				animated && 100*mylastval, duration, easing, endfunc);
		}

		if (animated && !animationschedule) {
			animationtick();
		}

		return this;
	};

	return style;
}());
