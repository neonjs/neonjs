
if (!document.createDocumentFragment || !document.querySelectorAll) {
	document.open();
	document.write("<p>Your browser appears to be too old to support neon</p>");
}

neon.load("neon.tester.js", function() {

	neon.ready(function() {

		neon.tester("Document ready state", function() {
			var
				called = 0,
				that = this;

			this.assert(1, "Document was ready before testing began");
			neon.ready(function() {
				called++;
				that.assert(called == 1, "Ready called only once");
				setTimeout(function() { that.finish(); }, 80);
			});
			
		});

		neon.tester("Selectors", function() {

			this.testdiv.append([
				{div:"",$id:"myid"},
				{div:"",$class:"test2 test2test",$title:"Tom's + [\"cat\"]?"},
				{p:"",$lang:"en-US"}
			]);

			this.assert(neon.select('body').length == 1, "Single tag name select");
			this.assert(neon.select('html')[0].firstChild.nodeName, "Ensure element is node");
			this.assert(neon.select('body html').length == 0, "Negative descendant child match");
			this.assert(neon.select('body> #myid').length == 0, "Negative immediate child match");
			this.assert(neon.select('body #myid').length == 1, "Test descendant child match");
			this.assert(neon.select("#"+this.id+">#myid").length == 1,
				"Test immediate child match");
			this.assert(neon.select('head+body').length == 1, "Test next sibling match");
			this.assert(neon.select('body+body').length == 0, "Negative next sibling match");
			this.assert(neon.select("#"+this.id+' div.test2').length == 1,
				"Test class name match");
			this.assert(neon.select("#"+this.id+' div.otherclass').length == 0,
				"Negative class name match");
			this.assert(neon.select('div#myid').length == 1, "Tag name and ID match");
			this.assert(neon.select('#myid').length == 1, "ID match");
			this.assert(neon.select("#"+this.id+' div[title="Tom\'s + [\\"cat\\"]?"]').length == 1, 
				"Complex attribute selector match");
			this.assert(neon.select('*').length > 0, "* tagname match");
			this.assert(neon.select("#"+this.id+' div[class~=test2]').length == 1, 
				"~= attribute selector match");
			this.assert(neon.select("#"+this.id+' div[class=test2]').length == 0, 
				"Negative = attribute selector match");
			this.assert(neon.select('html, head, #myid, #asdf').length == 3, 
				"Multiple selectors with commas");
			this.assert(neon.select('div#myid *').length == 0, "Negative descendant * match");
			this.assert(neon.select('head:first-child').length == 1, ":first-child match count");
			this.assert(neon.select('body:first-child').length == 0,
				"Negative :first-child match");
			this.assert(neon.select('* html').length == 0, "Document descendant child checking");
			this.assert(neon.select(window)[0].alert, "Manual selector: window");
			this.assert(neon.select(document)[0].createElement, "Manual selector: document");
			this.assert(neon.select("#"+this.id+' p[lang|=en]').length == 1, 
				"|= attribute selector match");
			this.assert(neon.select("#"+this.id+' p[lang|=en-US]').length == 1,
				"|= attribute selector match 2");
			this.assert(neon.select("#"+this.id+' p[lang|=US]').length == 0,
				"Negative |= attribute selector");
			this.assert(neon.select(document.createElement('p')).length == 1,
				"Createelement in select");

			this.finish();
		});

		neon.tester("Event handling", function() {

			var
				that = this,
				p = this.testdiv.append({p:"Testing user input: "})
					.setAttribute('tabindex', '-1'),
				button = p.append({button:"Please click"}),
				otherclicked = 0,
				wrongclicked = 0,
				mouseentered = 0,
				focused = 0,
				mouseup = 0,
				wrongclickfunc = function() { wrongclicked = 1; };

			this.wait(30000);
			button.watch('mouseenter', function(evt) {
				mouseentered = 1;
			});
			p.watch('focusin', function(evt) {
				focused = 1;
			});
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
					that.assert(mouseentered == 1, "Mouseenter event fired");
					that.assert(focused, "Focusin event fired on container");
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

		neon.tester("Extending neon", function() {
			var
				myobj = {name: "thisisatest"},
				myobj2 = {name: "2nd"};
			neon.neonunittesttry1 = myobj;
			this.assert(neon.neonunittesttry1 === myobj,
				"Writing to neon global");
			this.assert(neon.select(document.body).neonunittesttry1 === myobj,
				"Derived neon objects inherit written property.");
			this.finish();
		});

		neon.tester("Loading external Javascript", function() {
			var
				that = this,
				callback1 = 0,
				callback2 = 0,
				callback2code = function() { 
					callback2++; 
					that.assert(typeof neon.jsonEncode !== 'undefined', 
						"Callback waits until JS loaded");
					if (callback2 == 3) {
						setTimeout(function() {
							that.assert(callback1 == 1, "Callback fires when JS already loaded");
							that.assert(callback2 == 3, "Callback fires 3 times when called 3 times");
							that.assert(neon.jsonEncode, "Included code has executed");
							that.finish();
						}, 80);
					}
				};

			this.assert(1, "Must have worked for these tests to function");

			neon.load("neon.tester.js", function() { callback1++; });
			neon.load("neon.json.js", callback2code);
			neon.load("neon.json.js", callback2code);
			neon.load("neon.json.js", callback2code);

			this.wait(30000);
		});

		/*
		neon.tester("Getting/setting element properties", function() {
			var
				newdiv = this.testdiv.append({div:"",$id:"neontestertestget"});
			this.assert(newdiv.get("id") == "neontestertestget", "Testing get() on id");
			this.assert(newdiv.get("nodeName").toLowerCase() == "div", "Testing get() on nodeName");
			newdiv.set('neontest', 555);
			this.assert(newdiv.get('neontest') === 555, "Setting and getting custom property");
			this.finish();
		});
		*/

		neon.tester("Getting/setting style properties", function() {
			var
				newdiv = this.testdiv.append({div:"",$style:"width:66px"});
			this.assert(newdiv.getStyle('width') === "66px", "Read inline style");
			newdiv.style('width', '555px')
				.style('opacity', '0.75')
				.style('font-size', '16px')
				.style('float', 'right');
			this.assert(newdiv.getStyle('width') === '555px', "Set and read element style");
			this.assert(newdiv.getStyle('opacity') === '0.75', "Set and read element opacity");
			this.assert(newdiv.getStyle('font-size') === '16px', "Set and read element white-space");
			this.assert(newdiv.getStyle('float') === 'right', "Set and read element float style");
			this.finish();
		});

		neon.tester("Getting element position", function() {
			var
				newdiv = this.testdiv.append({div:""})
					.style('width', '50px').style('height', '55px'),
				divpos = newdiv.getPosition(),
				windowpos = neon.select(window).getPosition(),
				divtodoc = newdiv.getPosition(document.documentElement);

			this.assert(divpos, "Get a position object");
			this.assert(divpos.left && divpos.top, "Get top left of element");
			this.assert(divpos.bottom - divpos.top === 55, "Measure height correctly");
			this.assert(divpos.right - divpos.left === 50, "Measure width correctly");
			this.assert(windowpos.bottom && windowpos.right, "Get dimensions of viewport");
			this.assert(divtodoc.left && divtodoc.top && divtodoc.right && divtodoc.bottom,
				"Get position relative to document");

			this.finish();
		});

		neon.tester("Checking element relationship", function() {
			var
				newdiv = this.testdiv.append({div:""}),
				span = this.testdiv.append({span:""});

			this.assert(this.testdiv.contains(newdiv), "Parent contains child");
			this.assert(this.testdiv.contains(span), "Parent contains inline child");
			this.assert(!newdiv.contains(span), "Element does not contain sibling");

			this.finish();
		});

		neon.tester("Setting/clearing attributes", function() {
			var
				newdiv = this.testdiv.append({div:"",$id:"neontestertestget"}),
				newsomething = this.testdiv.append({div:"",$id:"neontestertestsomething"}),
				newlabel = this.testdiv.append({label:"Label",$for:"neontestertestsomething"}),
				label2 = this.testdiv.append({label:"Label2"}),
				img = this.testdiv.append({img:null}),
				radio = this.testdiv.append({input:null,$type:"radio",$value:""});

			var hasattribute = function(element, attribute) {
				// cross-browser hasAttribute() - this is hacky
				if (!element.hasAttribute) {
					if (element.getAttribute(attribute) === null) {
						return false;
					}
					return element.outerHTML.indexOf(attribute) >= 0;
				}
				return element.hasAttribute(attribute);
			};

			newdiv.setAttribute("title", "title1")
				.setAttribute("class", "myclass")
				.setAttribute("style", "color:blue")
				.setAttribute("tabindex", "-1");

			newlabel.setAttribute("for", "neontestertestget");
			label2.setAttribute("for", "neontestertestget");
			img.setAttribute("src", "something");
			radio.setAttribute("value", "neonsomething");

			this.assert(newdiv[0].title === "title1", "Set title attribute");
			this.assert(newdiv[0].style.cssText.indexOf('blue') >= 0, "Set style attribute");
			this.assert(newdiv[0].className === "myclass", "Set class attribute");
			this.assert(newdiv[0].tabIndex === -1, "Set tabindex attribute");
			this.assert(/something$/.test(img[0].src), "Set src attribute");
			this.assert(radio[0].value === "neonsomething", "Set value attribute");
			this.assert(newlabel[0].htmlFor === "neontestertestget",
				"Modify for attribute on label");
			this.assert(label2[0].htmlFor === "neontestertestget",
				"Set for attribute on label");

			newdiv.removeAttribute("title");
			newdiv.removeAttribute("class");
			newdiv.removeAttribute("style");
			newdiv.removeAttribute("tabindex");
			newlabel.removeAttribute("for");
			newdiv.removeAttribute("for");
			img.removeAttribute("src");
			radio.setAttribute("value", "neonsomethingelse"); // value is required attribute

			this.assert(!hasattribute(newdiv[0], "title"), "Remove title attribute");
			this.assert(!hasattribute(newdiv[0], "class"), "Remove class attribute");
			this.assert(!hasattribute(newdiv[0], "style"), "Remove style attribute");
			this.assert(!hasattribute(newdiv[0], "tabindex"), "Remove tabindex attribute");
			this.assert(!hasattribute(newlabel[0], "for"), "Remove for attribute");
			this.assert(!hasattribute(img[0], "src"), "Remove src attribute");
			this.assert(radio[0].value === "neonsomethingelse", "Modify value attribute");
			this.assert(!hasattribute(newdiv[0], "htmlFor"),
					"Don't wrongly leave htmlFor attribute");
			this.assert(!hasattribute(newdiv[0], "className"),
					"Don't wrongly leave className attribute");
			this.assert(!hasattribute(newdiv[0], "tabIndex"),
					"Don't wrongly leave tabIndex attribute");

			this.finish();
		});

		neon.tester("Adding and removing classes", function() {
			var
				newdiv = this.testdiv.append({div:"",$id:"neontestertestget"});

			newdiv.addClass("class1").addClass("class2").addClass("class3")
				.removeClass("class1");

			this.assert(!/\bclass1\b/.test(newdiv[0].className), "Added and removed a class");
			this.assert(/\bclass2\b/.test(newdiv[0].className), "Added a second class");
			this.assert(/\bclass3\b/.test(newdiv[0].className), "Added another class");

			this.finish();
		});

		neon.tester("Building elements", function() {
			var
				elements = neon.build({p:"Contents",$title:"Mytitle"}),
				pandtext = neon.build([{p:""},"Mycontents"]),
				complex = neon.build({p:"",$style:"width:66px",$class:"mysomething"}),
				radio = neon.build({input:null,$type:"radio",$value:"myvalue"});

			this.assert(elements[0].nodeName.toLowerCase() == "p", "Correct element name created");
			this.assert(elements[0].firstChild.nodeType == 3, "Text node child created");
			this.assert(pandtext[0].nodeName.toLowerCase() == "p", "Accepts array");
			this.assert(pandtext[1].nodeType == 3, "Text node second part of array");
			this.assert(/width:\s*66px/i.test(complex[0].style.cssText), "Building style attribute");
			this.assert(/\bmysomething\b/.test(complex[0].className), "Building class attribute");
			this.assert(radio[0].value === "myvalue", "Building value attribute");
			this.finish();
		});

		neon.tester("Document manipulation", function() {
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

		neon.tester("JSON decoding", function() {
			var
				obj = neon.jsonDecode('{"a":5.3e2,"b":false,"c":null}'),
				obj2 = neon.jsonDecode('{"a":"my\\"string\\n","b":[1,2]}'),
				obj3 = neon.jsonDecode('{"a":{"a":5}}'),
				obj4 = neon.jsonDecode('7');
				invalid = neon.jsonDecode('{"a":5+5}'),
				invalid2 = neon.jsonDecode('{"a":alert(\'2\')}');


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
		});

		neon.tester("JSON encoding", function() {
			var
				that = this;

			neon.load("neon.json.js", function() {
				var
					windowjson,
					arrjson,
					objjson,
					newwindow,
					newarr,
					newobj;

				that.assert(neon.jsonEncode, "JSON encoding loaded before called");

				windowjson = neon.jsonEncode(window);
				arrjson = neon.jsonEncode([null, undefined, function(){}, 456.67, "Tom's + [\"cat\"]?"]);
				objjson = neon.jsonEncode({val:function() {}, "val\n": 5 / 0, nested: []});
				newwindow = neon.jsonDecode(windowjson);
				newarr = neon.jsonDecode(arrjson);
				newobj = neon.jsonDecode(objjson);

				that.assert(windowjson, "JSON encoding window object is OK");
				that.assert(arrjson == "[null,null,null,456.67,\"Tom's + [\\\"cat\\\"]?\"]",
					"Correct encoding of an array");
				that.assert(objjson == "{\"val\\n\":null,\"nested\":[]}",
					"Correct encoding of an object");
				that.assert(newarr.length == 5, "Correct array length reconstructed");
				that.assert(newarr[3] == 456.67, "Correct float reconstructed");
				that.assert(newarr[4] == "Tom's + [\"cat\"]?", "Correct string reconstructed");
				that.assert(newobj["val\n"] === null, "Correct null reconstructed");
				that.assert(newobj.nested.length == 0, "Correct empty array reconstructed");
				that.finish();
			});
		});

		neon.tester("AJAX requests", function() {
			var
				that = this,
				finished = false,
				callback = function() {
					if (!finished) {
						that.assert(this.responseText && this.responseText.length > 100,
							"Fetched text via AJAX");
						that.finish();
						finished = true;
					}
				};

			this.wait(10000);

			neon.getHttp('./tests.html', callback);
			//neon.getHttp('http://example.org/', callback);
			//neon.getHttp('http://localhost/', callback);

		});

	});

});
	
