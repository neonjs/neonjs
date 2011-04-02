
// SPARK tester - a basic javascript testing framework
// Part of the SPARK Javascript library
// Copyright (c) 2010 Thomas Rutter

/*jslint browser: true, newcap: true, immed: true */
/*global SPARK:true,attachEvent,window,opera,ActiveXObject */

/**
@preserve SPARK js lib (c) Thomas Rutter SPARKlib.com
*/

(function() {
	var
		SPARK = window.SPARK,
		testtbody,
		gid = 0;

	var setuptable = function() {
		return SPARK.select('body').append({table:""}).append({tbody:""});
	};

	SPARK.tester = function(testname, testfunction) {
	// registers a test case.  the testfunction may call this.assert one or
	// more times
		var
			mytesttbody = testtbody || (testtbody = setuptable()),
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

		testobj.id = "SPARK-tester-" + (++gid);

		testobj.testdiv = SPARK.select('body>:first-child').insert({div:"",$id:testobj.id});

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

}());
