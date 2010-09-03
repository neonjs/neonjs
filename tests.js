
if (!document.createDocumentFragment) {
	document.open();
	document.write("<p>Your browser appears to be too old to support SPARK</p>");
}

SPARK.load("SPARK.tester.js", function() {

	SPARK.tester.test("Document ready state", function() {
		var
			called = 0,
			that = this;

		SPARK.ready(function() {
			called++;
			that.assert(called == 1, "Ready called only once");
			setTimeout(function() { that.finish(); }, 80);
		});
		
	});

	SPARK.ready(function() {

		SPARK.tester.test("Selectors", function() {

			this.testdiv.append([
				{div:"",$id:"myid"},
				{div:"",$class:"test2 test2test",$title:"Tom's + [\"cat\"]?"},
				{p:"",$lang:"en-US"}
			]);

			this.assert(SPARK.select('body').length == 1, "Single tag name select");
			this.assert(SPARK.select('html')[0].firstChild.nodeName, "Ensure element is node");
			this.assert(SPARK.select('body html').length == 0, "Negative descendant child match");
			this.assert(SPARK.select('body> #myid').length == 0, "Negative immediate child match");
			this.assert(SPARK.select('body #myid').length == 1, "Test descendant child match");
			this.assert(SPARK.select("#"+this.id+">#myid").length == 1,
				"Test immediate child match");
			this.assert(SPARK.select('head+body').length == 1, "Test next sibling match");
			this.assert(SPARK.select('body+body').length == 0, "Negative next sibling match");
			this.assert(SPARK.select("#"+this.id+' div.test2').length == 1,
				"Test class name match");
			this.assert(SPARK.select("#"+this.id+' div.otherclass').length == 0,
				"Negative class name match");
			this.assert(SPARK.select('div#myid').length == 1, "Tag name and ID match");
			this.assert(SPARK.select('#myid').length == 1, "ID match");
			this.assert(SPARK.select("#"+this.id+' div[title="Tom\'s + [\\"cat\\"]?"]').length == 1, 
				"Complex attribute selector match");
			this.assert(SPARK.select('*').length > 0, "* tagname match");
			this.assert(SPARK.select("#"+this.id+' div[class~=test2]').length == 1, 
				"~= attribute selector match");
			this.assert(SPARK.select("#"+this.id+' div[class=test2]').length == 0, 
				"Negative = attribute selector match");
			this.assert(SPARK.select('html, head, #myid, #asdf').length == 3, 
				"Multiple selectors with commas");
			this.assert(SPARK.select('div#myid *').length == 0, "Negative descendant * match");
			this.assert(SPARK.select('head:first-child').length == 1, ":first-child match count");
			this.assert(SPARK.select('body:first-child').length == 0,
				"Negative :first-child match");
			this.assert(SPARK.select('* html').length == 0, "Document descendant child checking");
			this.assert(SPARK.select(window)[0].alert, "Manual selector: window");
			this.assert(SPARK.select(document)[0].createElement, "Manual selector: document");
			this.assert(SPARK.select("#"+this.id+' p[lang|=en]').length == 1, 
				"|= attribute selector match");
			this.assert(SPARK.select("#"+this.id+' p[lang|=en-US]').length == 1,
				"|= attribute selector match 2");
			this.assert(SPARK.select("#"+this.id+' p[lang|=US]').length == 0,
				"Negative |= attribute selector");
			this.assert(SPARK.select(document.createElement('p')).length == 1,
				"Createelement in select");

			this.finish();
		});

		SPARK.tester.test("Event handling", function() {

			var
				that = this,
				p = this.testdiv.append({p:"Testing user input: "}),
				button = p.append({button:"Please click"}),
				otherclicked = 0,
				wrongclicked = 0,
				mouseup = 1,
				wrongclickfunc = function() { wrongclicked = 1; };

			this.wait(30000);
			button.watch('click', function(evt) {
				that.assert(!!evt, "Event object was passed");
				that.assert(!!evt.currentTarget.nodeName, "event.currentTarget is a node");
				that.assert(!!evt.target.nodeName, "event.target is a node");
				that.assert(evt.pageX > 0, "event.pageX has some positive value");
				that.assert(evt.pageY > 0, "event.pageY has some positive value");
				that.assert(evt.target.nodeName.toLowerCase() == "button", "Button clicked target");
				setTimeout(function() {
					that.assert(otherclicked == 1, "Multiple watchers on event fired");
					that.assert(wrongclicked == 0, "Unwatched successfully");
					that.assert(mouseup == 1, "Mouseup event fired");
					that.finish();
				}, 20);
			});
			button.watch('click', function() { otherclicked = 1; });
			button.watch('click', wrongclickfunc);
			button.unwatch('click', wrongclickfunc);
			button.watch('mouseup', function(evt) {
				mouseup = 1;
				that.assert(evt.which > 0, "event.which has some positive value");
			});

		});

		SPARK.tester.test("Extending SPARK", function() {
			var
				myobj = {name: "thisisatest"},
				myobj2 = {name: "2nd"};
			SPARK.SPARKunittesttry1 = myobj;
			this.assert(SPARK.SPARKunittesttry1 === myobj,
				"Writing to SPARK global");
			this.assert(SPARK.select(document.body).SPARKunittesttry1 === myobj,
				"Derived SPARK objects inherit written property.");
			this.finish();
		});

		SPARK.tester.test("Loading external Javascript", function() {
			var
				that = this;
			this.assert(1, "Must have worked for these tests to function");
			SPARK.load("SPARK.tester.js", function() {
				that.assert(1, "Has worked a second time");
				that.finish();
			});
		});

		/*
		SPARK.tester.test("Getting/setting element properties", function() {
			var
				newdiv = this.testdiv.append({div:"",$id:"SPARKtestertestget"});
			this.assert(newdiv.get("id") == "SPARKtestertestget", "Testing get() on id");
			this.assert(newdiv.get("nodeName").toLowerCase() == "div", "Testing get() on nodeName");
			newdiv.set('SPARKtest', 555);
			this.assert(newdiv.get('SPARKtest') === 555, "Setting and getting custom property");
			this.finish();
		});
		*/

		SPARK.tester.test("Getting/setting style properties", function() {
			var
				newdiv = this.testdiv.append({div:"",$style:"width:66px"});
			this.assert(newdiv.getStyle('width') == "66px", "Read inline style");
			newdiv.style('width', '555px');
			this.assert(newdiv.getStyle('width') == '555px', "Set and read element style");
			this.finish();
		});

		SPARK.tester.test("Building elements", function() {
			var
				elements = SPARK.build({p:"Contents",$title:"Mytitle"}),
				pandtext = SPARK.build([{p:""},"Mycontents"]),
				complex = SPARK.build({p:"",$style:"width:66px",$class:"mysomething"});

			this.assert(elements[0].nodeName.toLowerCase() == "p", "Correct element name created");
			this.assert(elements[0].firstChild.nodeType == 3, "Text node child created");
			this.assert(pandtext[0].nodeName.toLowerCase() == "p", "Accepts array");
			this.assert(pandtext[1].nodeType == 3, "Text node second part of array");
			this.assert(/width:\s*66px/i.test(complex[0].style.cssText), "Building style attribute");
			this.assert(/\bmysomething\b/.test(complex[0].className), "Building class attribute");
			this.finish();
		});

		SPARK.tester.test("Document manipulation", function() {
			var
				testelement = this.testdiv.append({div:{p:""}}),
				appended2 = this.testdiv.append({p:"TestAppend"}),
				inserted = appended2.insert({p:"TestInsert"});

			this.assert(this.testdiv[0].lastChild.firstChild.data ==
				'TestAppend', "Append to an element");
			this.assert(this.testdiv[0].firstChild.nextSibling.firstChild.data ==
				'TestInsert', "Insert an element");

			testelement.empty();
			appended2.remove();

			this.assert(testelement[0].hasChildNodes() == false, "Remove an element's children");
			this.assert(this.testdiv[0].lastChild.firstChild.data == 
				'TestInsert', "Remove an element");
				
			this.finish();
		});

		SPARK.tester.test("JSON decoding", function() {
			var
				obj = SPARK.jsonDecode('{"a":5.3e2,"b":false,"c":null}'),
				obj2 = SPARK.jsonDecode('{"a":"my\\"string\\n","b":[1,2]}'),
				obj3 = SPARK.jsonDecode('{"a":{"a":5}}'),
				obj4 = SPARK.jsonDecode('7');
				invalid = SPARK.jsonDecode('{"a":5+5}'),
				invalid2 = SPARK.jsonDecode('{"a":alert(\'2\')}');


			this.assert(obj.a === 5.3e2, "Read decimal number with exponent");
			this.assert(obj.b === false, "Read boolean value");
			this.assert(obj.c === null, "Read null value");
			this.assert(obj2.a === "my\"string\n", "Read string value");
			this.assert(obj2.b.length == 2 && obj2.b[1] === 2, 
				"Read array value");
			this.assert(obj3.a.a === 5, "Read nested object");
			this.assert(obj4 === 7, "Read primitive value");

			this.assert(invalid === undefined, "Reject invalid expression");
			this.assert(invalid2 === undefined, "Reject invalid function call");

			this.finish();

			/*
			var
				windowjson = SPARK.jsonencode(window),
				arrjson = SPARK.jsonencode([null, undefined, function(){}, 456.67, "Tom's + [\"cat\"]?"]),
				objjson = SPARK.jsonencode({val:function() {}, "val\n": 5 / 0, nested: []}),
				newwindow = SPARK.jsondecode(windowjson),
				newarr = SPARK.jsondecode(arrjson),
				newobj = SPARK.jsondecode(objjson);

			this.assert(windowjson, "JSON encoding window object is OK");
			this.assert(arrjson == "[null,null,null,456.67,\"Tom's + [\\\"cat\\\"]?\"]",
				"Correct encoding of an array");
			this.assert(objjson == "{\"val\\n\":null,\"nested\":[]}",
				"Correct encoding of an object");
			this.assert(newarr.length == 5, "Correct array length reconstructed");
			this.assert(newarr[3] == 456.67, "Correct float reconstructed");
			this.assert(newarr[4] == "Tom's + [\"cat\"]?", "Correct string reconstructed");
			this.assert(newobj["val\n"] === null, "Correct null reconstructed");
			this.assert(newobj.nested.length == 0, "Correct empty array reconstructed");
			this.finish();
			*/
		});

		SPARK.tester.test("AJAX requests", function() {
			var
				that = this,
				finished = false,
				callback = function() {
					if (!finished) {
						that.assert(this.responseText, "Fetch text");
						that.finish();
						finished = true;
					}
				};

			this.wait(10000);

			SPARK.getHttp('http://example.org/', callback);
			SPARK.getHttp('http://localhost/', callback);

		});

	});

});
	
