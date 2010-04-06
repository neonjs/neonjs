
// SPARK tester - a basic javascript testing framework
// Part of the SPARK Javascript library
// Copyright (c) 2010 Thomas Rutter

/*jslint browser: true, newcap: true, immed: true */
/*global SPARK:true,attachEvent,window,opera,ActiveXObject */

/**
@preserve SPARK js lib (c) Thomas Rutter SPARKlib.com
*/

SPARK.extend('tester', (function() {
	var
		SPARK = window.SPARK,
		testtbody,
		gid = 0,
		tester = {};

	var setuptable = function() {
		return SPARK.select('body').append({table:""}).append({tbody:""});
	};

	tester.test = function(testname, testfunction) {
	// registers a test case.  the testfunction may call this.assert one or
	// more times
		var
			mytesttbody = testtbody || (testtbody = setuptable()),
			testrow = mytesttbody.append({tr:""}),
			resultcell = testrow.append({td:"TESTING ..."}).
				setstyle('background', 'gray').
				setstyle('color', 'white').
				setstyle('padding', '5px'),
			messagecell = testrow.append({td:{div:testname}}).
				setstyle('padding', '2px'),
			failures = 0,
			assertions = 0,
			testobj = {};
			
		var mytimeout = function() {
			if (testobj.testdiv) {
				testobj.testdiv.remove();
			}
			if (!failures) {
				resultcell.empty().setstyle('background', 'brown').append("TIMEOUT");
			}
		}; 

		testobj.assert = function(assertval, shortdesc) {
		// test cases should call this.assert() as many times as they have something
		// to test
			if (!assertval) {
				resultcell.empty().setstyle('background', 'brown').append("FAILURE");
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
				resultcell.empty().setstyle('background', 'green').append("SUCCESS");
			}
			clearTimeout(testobj.timeout);
		};

		testobj.id = "SPARK-tester-" + (++gid);

		testobj.testdiv = SPARK.select('body>:first-child').insert({div:"",$id:testobj.id});

		testobj.timeout = setTimeout(mytimeout, 9900);

		testobj.waitforinput = function() {
		// buy a bit more time, and indicate that the test is waiting on user
		// input
			clearTimeout(testobj.timeout);
			testobj.timeout = setTimeout(mytimeout, 29900);
			if (!failures) {
				resultcell.empty().append("WAITING ...");
			}
		};
		
		testfunction.call(testobj);
	};

	return tester;
}()));
