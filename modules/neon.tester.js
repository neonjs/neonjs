/*

The Neon Javascript Library: tester 
A unit testing library for Neon

Part of the Neon Javascript Library
Copyright (c) 2012, Thomas Rutter
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
	curly:true,eqeqeq:true,forin:true,immed:true,latedef:true,newcap:true,noarg:true,undef:true,trailing:true */
/*global neon */

/**
@preserve The Neon Javascript Library: tester
Copyright (c) Thomas Rutter 2012
http://neonjs.com
http://neonjs.com/license
*/

neon.tester = (function() {
	var
		testtbody,
		gid = 0;

	var setuptable = function() {
		return (testtbody = neon.select('body').append({table:""}).append({tbody:""}));
	};

	var tester = function(testname, testfunction) {
	// registers a test case.  the testfunction may call this.assert one or
	// more times
		var
			mytesttbody = testtbody || setuptable(),
			testrow = mytesttbody.append({tr:""}),
			resultcell = testrow.append({td:"TESTING ..."}).
				style('background', 'gray').
				style('color', 'white').
				style('padding', '5px'),
			messagecell = testrow.append({td:{div:testname}}).
				style('padding', '2px'),
			failures = 0,
			assertions = 0,
			testobj = {};

		var mytimeout = function() {
			if (testobj.testdiv) {
				testobj.testdiv.remove();
			}
			if (!failures) {
				resultcell.empty().style('background', 'brown').append("TIMEOUT");
			}
		};

		testobj.assert = function(assertval, shortdesc) {
		// test cases should call this.assert() as many times as they have something
		// to test
			if (!assertval) {
				resultcell.empty().style('background', 'brown').append("FAILURE");
				messagecell = messagecell.
					append({div:"Assertion failed: "+shortdesc});
				failures++;
			}
			assertions++;
		};

		testobj.finish = function() {
		// test cases must call this.finish() when they have finished, or their status
		// will show 'incomplete'.  Cleanup is done then.  This allows test functions
		// which return immediately but do their tests at a later time to function.
			if (testobj.testdiv) {
				testobj.testdiv.remove();
			}
			if (!failures) {
				resultcell.empty().style('background', 'green').append("SUCCESS");
			}
			clearTimeout(testobj.timeout);
		};

		testobj.id = "neon-tester-" + (++gid);

		testobj.testdiv = neon.select('body>:first-child').insert({div:"",$id:testobj.id});

		testobj.timeout = setTimeout(mytimeout, 2490);

		testobj.wait = function(timelimit) {
		// buy a bit more time, and indicate that the test is waiting on user
		// input
			clearTimeout(testobj.timeout);
			testobj.timeout = setTimeout(mytimeout, timelimit);
			if (!failures) {
				resultcell.empty().append("WAITING ...");
			}
		};
		
		// asynchronous
		setTimeout(function() {
			testfunction.call(testobj);
		}, 0);
	};

	return tester;

}());
