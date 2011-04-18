/*

The SPARK Javascript Library: widget 
A widget library for SPARK

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

/*jslint browser:true,newcap:true,undef:true */
/*global SPARK:true */

/**
@preserve The SPARK Javascript Library: widget
Copyright (c) Thomas Rutter 2011
http://SPARKlib.com
http://SPARKlib.com/license
*/

SPARK.widget = (function() {
	
	var
		canedit = document.body.contentEditable !== undefined,
		widgets = {};
	
	var htmlconvert = function(input, strippara, wstopara) {
	// helper function for normalising HTML
	// can strip paragraph tags or generate paragraph tags
	// from whitespace
		var
			matches,
			tagname, last,
			delta = 0, lastdelta, // delta is +1 for moving into a block, -1 for leaving, 
				// 0 for non-block
			closetag = 0, lastclose, // whether there is/was a slash to indicate close tag
			text,	tagcode,
			popen = 0, pinitially, // whether a <p> is open
			output = '',
			stack = [],
			topstack,
			parsereg = /([\s\S]*?(?=<[\/\w!])|[\s\S]+)((?:<(\/?)([\w!]+)((?:[^>"\-]+|"[\s\S]*?"|--[\s\S]*?--)*)>?)?)/g,
				// 1: text; 2: tag; 3: slash; 4: tagname; 5: tagcontents; 6: endtext;
			blockreg = /^(?:h[1-6]|ul|ol|dl|menu|dir|pre|hr|blockquote|address|center|div|isindex|fieldset|table)$/,
			blockseparator = /^(?:li|tr|div|dd|dt|the|tbo|tfo)/;

		for (matches = parsereg.exec(input); matches; matches = parsereg.exec(input)) {

			lastdelta = delta;
			last = tagname;
			lastclose = closetag;
			delta = closetag = 0;
			tagname = 0;
			topstack = stack[stack.length-1];
			popen = pinitially =
				lastdelta ? 0 :
				last !== 'p' ? popen :
				lastclose ? 0 : 1;
			if (matches[4]) {
				tagname = matches[4].toLowerCase();
				closetag = matches[3];
				if (blockreg.test(tagname)) {
					if (!closetag) {
						if (tagname !== 'hr' && tagname !== 'isindex') {
							delta = 1;
							stack.push(tagname);
						}
					}
					else if (tagname === topstack) {
						delta = -1;
						stack.pop();
					}
				}
			}
			text = matches[1];
			tagcode = matches[2];

			if (topstack !== 'pre') {
				// process paragraphs
				if (!topstack || topstack === 'blockquote' || topstack === 'center' || popen) {
					// add missing <p> at start
					if (!popen && (/\S/.test(text) ||
						(tagname && !delta && tagname !== '!' && tagname !== 'p'))) {
						popen = 1;
						text = '<p>' + text.replace(/^\s*/, '');
					}
					if (popen) {
						// add missing </p> at end
						if (delta ||
							(!closetag && tagname === 'p') ||
							!tagname ||
							(wstopara && /\n\r?\n\s*$/.test(text))
							) {
							popen = 0;
							text = text.replace(/\s*$/, '') + '</p>';
						}
						// add paragraph breaks within based on whitespace
						if (wstopara) {
							if (last === 'br') {
								text = text.replace(/^\s+/, '');
							}
							text = text.replace(/\s*\n\r?\n\s*(?=\S)/g, '</p><p>')
								.replace(/\s*\n\s*/g, '<br>');
						}
					}
				}
				// remove leading spaces
				if (lastdelta || !last || !pinitially || 
					last === 'p' || last === 'br' || blockseparator.test(last)) {
					text = text.replace(/^\s+/, '');
				}
				// remove trailing spaces
				if (delta || !tagname || !popen ||
					tagname === 'p' || tagname === 'br' || blockseparator.test(tagname)) {
					text = text.replace(/\s+$/, '');
				}
				// normalise remaining whitespace
				text = text.replace(/\s+/g, ' ');
				// convert < and & where it is not part of tag or entity
				text = strippara ? 
					text.replace(/&lt;(?![\/\w!])/g, '<').replace(/&amp;(?![\w#])/g, '&') :
					text.replace(/<(?![\/\w!])/g, '&lt;').replace(/&(?![\w#])/g, '&amp;');

				// account for added para tags
				text = strippara ? text.replace(/<\/?\w+>/g, "\n") :
					text.replace(/<p>/g, "\n<p>").replace(/<\/p>/g, "</p>\n")
					.replace(/<br>/g, "<br>\n");
				// add newline at end (before tag)
				if (
					delta === 1 || (!popen && tagname === '!') || 
					(!closetag && (tagname === 'p' || blockseparator.test(tagname))) || 
					(closetag && (tagname === 'table' || tagname === 'ul'))
					) {
					text += "\n";
				}
				// add newline at start (after last tag)
				if (
					lastdelta === -1 || (!pinitially && last === '!') ||
					(lastclose && last === 'p') ||
					last === 'br') {
					text = "\n" + text;
				}
			}

			// process the actual tag
			if (strippara &&
				(tagname === 'p' || (tagname === 'br' && (!topstack ||
					topstack === 'blockquote' || topstack === 'center'))) &&
				!/\S/.test(matches[5])) {
				tagcode = '';
			}

			output += text + tagcode;
		}
		// close last p tag
		if (popen && !strippara && !delta && (tagname !== 'p' || !closetag)) {
			 output += '</p>';
		}

		return output.replace(/^\s+|\s+$/g, '');
	};

	var cloneobject = function(obj) {
		var
			Constructor = function() {};
		Constructor.prototype = obj;
		return new Constructor();
	};

	/*******************************************
	 *      FLYOUT - A POP-UP BOX/FLYOUT       *
	 *******************************************/

	widgets.flyout = function(elements, opts) {
	// flyout widget
	// turns the selected element into a hot zone which when clicked
	// or hovered will cause a fly-out (such as a fly-out menu) to appear
	// opts.direction specifies first which side of the hot zone the flyout
	// should appear on out of 'l', 'r', 't', 'b', then optionally another
	// letter specifying the alignment, eg if the first is bottom, whether
	// to fly towards the right from the left ('r') or vice versa.  default
	// is 'br'.
		var
			i, el,
			myopts = opts || {},
			direction = myopts.direction,
			horiz = /^[lr]/.test(direction),
			fuzz = null,
			wasfocused,
			hosts = elements.insert({span:""})
				.setAttribute('tabindex', '-1')
				.addClass("SPARK-widget-flyout-host"),
			flyouts = hosts.append({div:""}).addClass("SPARK-widget-flyout")
				.addClass("SPARK-widget-flyout-hidden"),
			obj = {};

		var show = function(host) {
			var
				hostpos, flyoutpos,
				windowpos,
				addrect, dim,
				flyout = SPARK.select(host[0].firstChild.nextSibling);

			windowpos = SPARK.select(window).getPosition();
			hostpos = host.getPosition();
			flyoutpos = flyout.style('left', horiz ? '100%' : '0')
				.style('top', horiz ? '0' : '100%')
				.style('right', 'auto', 'bottom', 'auto')
				.removeClass("SPARK-widget-flyout-hidden")
				.style('opacity', '1')
				.getPosition();
			flyout.style('top', 'auto').style('left', 'auto');

			addrect = horiz ? 0 : hostpos.right - hostpos.left;
			dim = flyoutpos.right - flyoutpos.left || 1e4;
			flyout.style(hostpos.left+addrect < dim ? 'left' :
				windowpos.right+addrect-hostpos.right < dim ? 'right' :
				/l/.test(direction) ? 'right' : 'left',
				horiz ? '100%' : '0');

			addrect = !horiz ? 0 : hostpos.bottom - hostpos.top;
			dim = flyoutpos.bottom - flyoutpos.top || 1e3;
			flyout.style(hostpos.top+addrect < dim ? 'top' :
				windowpos.bottom+addrect-hostpos.bottom < dim ? 'bottom' :
				/t/.test(direction) ? 'bottom' : 'top',
				!horiz ? '100%' : '0');

			if (myopts.onfocus) {
				myopts.onfocus.call(host[0]);
			}
		};

		var onfocusin = function(evt) {
			if (fuzz !== evt.currentTarget) {
				return show(SPARK.select(evt.currentTarget));
			}
			fuzz = null;
		};

		var onfocusout = function(evt) {
			var
				element = this;
			fuzz = element;
			setTimeout(function() {
				var
					flyout;
				if (fuzz === element) {
					flyout = SPARK.select(element.firstChild.nextSibling);
					if (myopts.fade) {
						flyout.style('opacity', '1', '0',
							myopts.fade > 1 ? myopts.fade : null, null, function() {
							flyout.addClass("SPARK-widget-flyout-hidden");
						});
					}
					else {
						flyout.addClass("SPARK-widget-flyout-hidden");
					}
					if (myopts.onblur) {
						myopts.onblur.call(element);
					}
					fuzz = null;
				}
			}, 0);
		};

		var onkeydown = function(evt) {
			if (evt.which === 27) {
				obj.blur();
				evt.stopPropagation();
			}
		};

		// closes the flyout (unless it's in hover mode)
		// this works by removing focus from the flyout and its contents
		obj.blur = function() {
			var i, j, tmp;
			for (i = hosts.length; i--;) {
				hosts[i].blur();
				tmp = hosts[i].getElementsByTagName("*");
				for (j = tmp.length; j--;) {
					if (tmp[j].blur) {
						tmp[j].blur();
					}
				}
			}
		};

		// dismantles the flyout, restoring the elements to
		// how they were before the flyout was added
		obj.teardown = function() {
			var i;
			hosts.unwatch(myopts.hover ? "mouseenter" : "focusin", onfocusin)
				.unwatch(myopts.hover ? "mouseleave" : "focusout", onfocusout)
				.unwatch("keydown", onkeydown)
				.unwatch("keypress", onkeydown);
			for (i = hosts.length; i--;) {
				SPARK.select(hosts[i]).insert(hosts[i].firstChild).remove();
			}
			obj = null;
		};

		// returns the flyout(s) itself (a div containing your contents)
		// in a fresh SPARK object
		obj.flyout = SPARK.select(flyouts);

		flyouts.append(myopts.contents || []);

		// add events
	
		hosts.watch(myopts.hover ? "mouseenter" : "focusin", onfocusin);
		hosts.watch(myopts.hover ? "mouseleave" : "focusout", onfocusout);
		hosts.watch("keydown", onkeydown);
		// ie in ietester does not fire keydown events??
		hosts.watch("keypress", onkeydown);

		for (i = elements.length; i--;) {
			wasfocused = document.activeElement;
			SPARK.select(elements[i].previousSibling.firstChild)
				.insert(elements[i]);
			if (wasfocused === elements[i] ||
				SPARK.select(elements[i]).contains(wasfocused)) {
				// at least in FF3.5, the previous movement using insert()
				// seems to mess up keyboard focus - we focus() again to workaround
				wasfocused.focus();
				// show because it is already focused
				show(SPARK.select(elements[i].parentNode));
			}
		}

		return obj;
	};

	SPARK.styleRule('.SPARK-widget-flyout',
		'position:absolute;z-index:999;border:1px solid ButtonShadow;padding:1px;background:#fff;min-width:14px;box-shadow:0 4px 10px rgba(0,0,0,0.16)')
		.styleRule('.SPARK-widget-flyout-hidden',
			'display:none')
		// some ugly-ish hacks for ie6/ie7.  the broken background-image makes transparent areas part of the focus:
		.styleRule('.SPARK-widget-flyout-host',
			'position:relative;display:inline-block;outline:none;z-index:998;background-image:url(x)');
	
	/*******************************************
	 *       FLYOUTMENU - DROP-DOWN MENU       *
	 *******************************************/

	widgets.flyoutMenu = function(el, opts) {
	// creates a fly-out window with a selectable menu in it.
	// It takes the same options as flyout() with some extras.
	// opt.contents is the contents, and any "a" element in
	// that will turn into a menu option.
	// You can change that with myopts.optiontag (default "a").
		var
			i,
			myopts = opts || {},
			objects = [],
			flyouts = [],
			obj = {},
			teardowns = [];

		var setupmenu = function(el) {
			var
				i,
				opts,
				obj,
				flyout, host, options,
				currentsel = null;

			var updateselection = function(newval) {
				if (currentsel !== null) {
					SPARK.select(options[currentsel])
						.removeClass('SPARK-widget-flyoutMenu-selected');
				}
				currentsel = newval;
				if (currentsel !== null) {
					SPARK.select(options[currentsel])
						.addClass('SPARK-widget-flyoutMenu-selected');
				}
			};

			var select = function(evt) {
				if (opts.onselect) {
					opts.onselect.call(this, evt);
				}
				if (!opts.remainafterselect) {
					obj.blur();
				}
			}

			var onmouseenter = function(evt) {
				for (i = options.length; i--;) {
					if (options[i] === evt.currentTarget) {
						updateselection(i);
					}
				}
			};

			var onclick = function(evt) {
				onmouseenter.call(this, evt);
				select.call(this, evt);
			};

			var onblur = function() {
				updateselection(null);
			};

			var onkeydown = function(evt) {
				var sel;
				// arrow keys
				if (evt.which >= 37 && evt.which <= 40) {
					updateselection(
						evt.which >= 39 ?
							(currentsel === null || currentsel === options.length - 1 ? 0 :
								currentsel + 1) :
							(currentsel ? currentsel - 1 : options.length - 1)
						);
				}
				if (evt.which === 32 || evt.which === 13) {
					select.call(evt);
					evt.preventDefault();
				}
			};

			opts = cloneobject(myopts);
			opts.onblur = onblur;
			obj = widgets.flyout(el, opts);
			objects.push(obj);
			flyout = obj.flyout
				.addClass('SPARK-widget-flyoutMenu');
			flyouts.push(flyout[0]);
			host = SPARK.select(flyout[0].parentNode);
			options = SPARK.select(flyout[0].getElementsByTagName(myopts.optiontag || "a"))
				//.setAttribute('tabindex', '-1')
				.addClass('SPARK-widget-flyoutMenu-item');

			host.watch('keydown', onkeydown);
			options.watch('mouseenter', onmouseenter);
			options.watch('click', onclick);
			teardowns.push(function() {
				host.unwatch('keydown', onkeydown)
					.unwatch('mouseenter', onmouseenter)
					.unwatch('click', onclick);
			});
			
		};
			
		for (i = el.length; i--;) {
			setupmenu(SPARK.select(el[i]));
		}

		obj.blur = function() {
			for (i = objects.length; i--;) {
				objects[i].blur();
			}
		}

		obj.teardown = function() {
			for (i = teardowns.length; i--;) {
				teardowns[i]();
			}
			for (i = objects.length; i--;) {
				object[i].teardown();
			}
			objects = [];
		};

		obj.flyout = SPARK.select(flyouts);

			
/*
		for (i = flyouts.length; i--;) {
			tmp = flyouts[i].getElementsByTagName(myopts.optiontag || "a");
			for (j = 0, len = tmp.length; j < len; j++) {
				collect.push(tmp[j]);
			}
			setupchooser(SPARK.select(flyouts[i]), SPARK.select(tmp));
		}

		links = SPARK.select(collect)
			.setAttribute('tabindex', '-1');

		links.watch('click', function(evt) {
			if (myopts.onmenuselect) {
				myopts.onmenuselect.call(this, evt);
				evt.preventDefault();
			}
			if (!myopts.remainafterselect) {
				obj.blur();
			}
		});

		*/

		return obj;
	};

	SPARK.styleRule('.SPARK-widget-flyoutMenu',
		'background:#fff;color:#000;min-width:8em;max-height:400px;overflow:auto')
		.styleRule('.SPARK-widget-flyoutMenu-item',
			'display:block;text-decoration:none;color:MenuText;padding:2px 4px;cursor:default')
		.styleRule('.SPARK-widget-flyoutMenu-selected',
			'background:Highlight;color:HighlightText')
		.styleRule('.SPARK-widget-flyoutMenu ul, .SPARK-widget-flyoutMenu ol, .SPARK-widget-flyoutMenu li',
			'list-style:none;padding:none;margin:none');

	/*******************************************
	 *       RICHTEXT - RICH TEXT EDITOR       *
	 *******************************************/

	widgets.richtext = function(el, opts) {
		var
			i,
			myopts = opts || {},
			container = el.insert({div:''})
				.addClass('SPARK-widget-richtext'),
			iconsize = myopts.iconsize || 14,
			teardowns = [];

		var setupeditor = function(container) {
			var
				original = SPARK.select(container[0].nextSibling),
				editor = container.append(canedit ? {div:''} : {textarea:''})
					.addClass('SPARK-widget-richtext-editor'),
				toolbar = editor.insert({div:''})
					.addClass('SPARK-widget-richtext-toolbar'),
				source,
				savedselection = null,
				updators = [];

			var getrange = function() {
				var
					sel, rng, par;
				if (window.getSelection) {
					sel = window.getSelection();
					if (sel.rangeCount) {
						rng = sel.getRangeAt(0);
						if (rng.commonAncestorContainer === editor[0] ||
							editor.contains(rng.commonAncestorContainer)) {
							return rng;
						}
					}
				}
				else {
					rng = document.selection.createRange();
					par = rng.parentElement();
					if (par === editor[0] ||
						editor.contains(par)) {
						return rng;
					}
				}
			};

			var saveselection = function() {
				savedselection = getrange() || savedselection;
			};

			var restoreselection = function() {
				var
					sel;
				if (savedselection && !getrange()) {
					if (window.getSelection) {
						sel = window.getSelection();
						sel.removeAllRanges();
						sel.addRange(savedselection);
					}
					else {
						savedselection.select();
					}
				}
			};

			var docommand = function(command, param) {
				restoreselection();
				try {
					document.execCommand('useCSS', false, true);
				} catch (e) {}
				document.execCommand(command, false, param);
			};

			var updatecontrols = function() {
				setTimeout(function() {
					var i;
					for (i = updators.length; i--;) {
						updators[i]();
					}
				}, 0);
			};

			var addbutton = function(command, iconnum, title) {
				var
					button = toolbar.append({span:'',$title:title})
						.setAttribute('tabindex', '0')
						.addClass('SPARK-widget-richtext-toolbar-selectable');

				var onclick = function(evt) {
					if (evt.which !== 2 && evt.which !== 3) {
						docommand(command, null);
						updatecontrols();
					}
				};

				var onkeypress = function(evt) {
					if (evt.which === 13 || evt.which === 32) {
						docommand(command, null);
						updatecontrols();
						evt.preventDefault();
					}
				};

				button.append({span:""})
					.addClass('SPARK-widget-richtext-toolbar-icon')
					.style('width', iconsize+"px")
					.style('height', iconsize+"px")
					.style('background', 
						'url(images/SPARK-widget-richtext.png) -1px -'+((iconsize+2)*iconnum+1)+'px');
				button.watch('click', onclick);
				button.watch('keypress', onkeypress);
				teardowns.push(function() {
					button.unwatch('click', onclick)
						.unwatch('keypress', onkeypress);
				});

				updators.push(function() {
					try {
						if (document.queryCommandState(command)) {
							button.addClass('SPARK-widget-richtext-active');
						}
						else {
							button.removeClass('SPARK-widget-richtext-active');
						}
					} catch(e) {}
				});
			};

			var addseparator = function() {
				toolbar.append({span:''})
					.addClass('SPARK-widget-richtext-toolbar-separator');
			};

			var addstylechooser = function() {
				var
					chooser = toolbar.append({span:'',$title:'Paragraph style'})
						.setAttribute('tabindex', '0')
						.addClass('SPARK-widget-richtext-toolbar-selectable'),
					text = chooser.append({span:"Paragraph style"})
						.addClass('SPARK-widget-richtext-toolbar-label'),
					menu;

				chooser.append({span:""}) // drop arrow icon
					.addClass('SPARK-widget-richtext-toolbar-icon')
					.addClass('SPARK-widget-richtext-toolbar-sideicon')
					.style('width', iconsize+"px")
					.style('height', iconsize+"px")
					.style('background',
						'url(images/SPARK-widget-richtext.png) -1px -'+((iconsize+2)*9+1)+'px');
				
				menu = widgets.flyoutMenu(chooser, {contents:[{a:"Link 1"},{a:"Link 2"}]});

				teardowns.push(function() {
					menu.teardown();
				});

				updators.push(function() {
					var
						value, part;
					try {
						value = document.queryCommandValue('formatblock');
						part = /^(?:h|Heading )(\d)$/.exec(value);
						text.empty().append(
							part ? 'Heading '+part[1] :
							value === 'pre' || value === 'Formatted' ? 'Formatted code' :
							'Normal text'
						);
					} catch(e) {}
				});


				// TODO add updator here 
				
			};

			// now populate the toolbar
			
			if (!canedit) {
				toolbar.append({div:"HTML tags allowed"})
					.addClass('SPARK-widget-richtext-toolbar-altnotice');
			}
			else {
				if (myopts.stylechooser || myopts.stylechooser === undefined) {
					addstylechooser();
					addseparator();
				}
				addbutton('bold', 0, 'Bold');
				addbutton('italic', 1, 'Italic');
				if (myopts.listbuttons || myopts.listbuttons === undefined) {
					addseparator();
					addbutton('insertunorderedlist', 2, 'Insert bulleted list');
					addbutton('insertorderedlist', 3, 'Insert numbered list');
				}
				if (myopts.indentbuttons || myopts.indentbuttons === undefined) {
					addseparator();
					addbutton('outdent', 4, 'Decrease indent');
					addbutton('indent', 5, 'Increase indent');
				}

				editor.setAttribute('contenteditable', 'true');
				editor.watch('keypress', updatecontrols);
				editor.watch('mousedown', updatecontrols);

				toolbar.watch('mousedown', saveselection);

				teardowns.push(function() {
					editor.unwatch('keypress', updatecontrols)
						.unwatch('mousedown', updatecontrols);
					toolbar.unwatch('mousedown', saveselection);
				});
			}

			if (original[0].tagName.toLowerCase() === 'textarea') {
				source = original[0].value;
				container.append({
					input:'',
					$type:'hidden',
					$name:original[0].name,
					$value:el[0].value
					});
			}
			else {
				source = original[0].innerHTML;
			}
			original.remove();
			editor[0][canedit ? 'innerHTML' : 'value'] =
				htmlconvert(source, !canedit, 0);

			updatecontrols();

		};
		
		for (i = container.length; i--;) {
			setupeditor(SPARK.select(container[i]));
		}

	};

	/************************
	 *        STYLES        *
	 ************************/


	// richtext

	SPARK.styleRule('.SPARK-widget-richtext',
		'border:1px solid ButtonShadow;width:auto;padding:1px;background:#fff;color:#000')
		.styleRule('.SPARK-widget-richtext-toolbar',
			'font:12px sans-serif;margin:0 0 1px 0;background:#f9f6f3')
		// button text needs to be re-set in FF (at least)
		.styleRule('.SPARK-widget-richtext-toolbar-selectable',
			'display:inline-block;padding:5px;cursor:default')
		.styleRule('.SPARK-widget-richtext-toolbar-selectable:hover',
			'padding:4px;border:1px solid #ddbfbf')
		.styleRule('.SPARK-widget-richtext-active',
			'background:#edd')
		.styleRule('.SPARK-widget-richtext-toolbar-separator',
			'display:inline-block;width:5px')
		.styleRule('.SPARK-widget-richtext-editor',
			'max-height:27em')
	// outline:0 prevents dotted line in firefox
	// position:relative is in case people paste in absolute positioned elements
		.styleRule('div.SPARK-widget-richtext-editor',
			'cursor:text;padding:1px 0 1px 2px;outline:0;position:relative;min-height:5em;overflow:auto')
	// min-height needed as textareas don't auto-expand
		.styleRule('textarea.SPARK-widget-richtext-editor',
			'width:100%;border:0;padding:0;margin:0;background:#fff;color:#000;font:inherit;min-height:14em')
		.styleRule('.SPARK-widget-richtext-toolbar-altnotice',
			'padding:5px;text-align:right')
		.styleRule('.SPARK-widget-richtext-toolbar-icon',
			'display:inline-block;vertical-align:middle')
		.styleRule('.SPARK-widget-richtext-toolbar-sideicon',
			'margin-left:4px')
		.styleRule('.SPARK-widget-richtext-toolbar-label',
			'vertical-align:middle');

	return function(func, opts) {
		if (widgets.hasOwnProperty(func)) {
			return widgets[func](this, opts);
		}
	};

}());
