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
			i,
			direction = opts && opts.direction,
			hover = opts && opts.hover,
			horiz = /^[lr]/.test(direction),
			contents = (opts && opts.contents) || [],
			hosts = elements.insert({span:""})
				.addClass("SPARK-widget-flyout-host"),
			flyouts = hosts.append({div:""}).addClass("SPARK-widget-flyout")
				.addClass("SPARK-widget-flyout-hidden");
			obj = {};
		
		var onfocusin = function(evt) {
			var
				hostpos, flyoutpos,
				windowpos = SPARK.select(window).getPosition(),
				addrect, dim,
				host = SPARK.select(evt.currentTarget),
				flyout = SPARK.select(evt.currentTarget.firstChild.nextSibling)
					.removeClass("SPARK-widget-flyout-hidden")
					.style('right', 'auto')
					.style('bottom', 'auto');

			hostpos = host.getPosition();
			flyoutpos = flyout.style('left', horiz ? '100%' : '0')
				.style('top', horiz ? '0' : '100%')
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

			if (opts && opts.onfocus) {
				opts.onfocus.call(this, evt);
			}
		};

		var onfocusout = function(evt) {
			SPARK.select(evt.currentTarget.firstChild.nextSibling)
				.addClass("SPARK-widget-flyout-hidden");
			if (opts && opts.onblur) {
				opts.onblur.call(this, evt);
			}
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
			hosts.unwatch(hover ? "mouseenter" : "focusin", onfocusin)
				.unwatch(hover ? "mouseleave" : "focusout", onfocusout)
				.unwatch("keydown", onkeydown);
			for (i = hosts.length; i--;) {
				SPARK.select(hosts[i]).insert(hosts[i].firstChild).remove();
			}
			obj = null;
		};

		// returns the flyout(s) itself (a div containing your contents)
		// in a fresh SPARK object
		obj.getFlyout = function() {
			return SPARK.select(flyouts);
		};

		flyouts.append(contents);

		for (i = elements.length; i--;) {
			SPARK.select(elements[i].previousSibling.firstChild)
				.insert(elements[i]);
		}

		// add events
		hosts.setAttribute("tabindex", "-1")
			.watch(hover ? "mouseenter" : "focusin", onfocusin);
		hosts.watch(hover ? "mouseleave" : "focusout", onfocusout);
		hosts.watch("keydown", onkeydown);

		return obj;
	};

	SPARK.styleRule('.SPARK-widget-flyout',
		'position:absolute;z-index:999;border:1px solid ButtonShadow;padding:1px;background:#fff;min-width:14px')
		.styleRule('.SPARK-widget-flyout-hidden',
			'display:none')
		// some ugly-ish hacks for ie6/ie7:
		.styleRule('.SPARK-widget-flyout-host',
			'position:relative;display:inline-block;outline:none;z-index:998;background-image:url(x)');
	
	widgets.flyoutMenu = function(el, opts) {
		var
			i,
			obj = widgets.flyout(el, opts),
			flyouts = obj.getFlyout()
				.addClass('SPARK-widget-flyoutMenu');

		return obj;
	};

	SPARK.styleRule('.SPARK-widget-flyoutMenu',
		'background:Menu;color:MenuText;min-width:10em;max-height:400px;overflow:auto')
		.styleRule('.SPARK-widget-flyoutMenu a',
			'display:block;text-decoration:none;color:inherit;padding:2px 4px')
		.styleRule('.SPARK-widget-flyoutMenu a:hover',
			'background:Highlight;color:HighlightText')
		.styleRule('.SPARK-widget-flyoutMenu ul, .SPARK-widget-flyoutMenu ol, .SPARK-widget-flyoutMenu li',
			'list-style:none;padding:none;margin:none');

	widgets.richtext = function(el, opts) {
		var
			container = el.insert({div:''}).addClass('SPARK-widget-richtext-container'),
			editor = container.append(canedit ? {div:''} : {textarea:''})
				.addClass('SPARK-widget-richtext-editor'),
			toolbar = editor.insert({div:''}).addClass('SPARK-widget-richtext-toolbar'),
			source,
			iconsize = (opts && opts.iconsize) || 14,
			updators = [],
			teardowns = [];

		/*******************************************
		 * HELPER FUNCTIONS FOR THE EDITOR CONTROL *
		 *******************************************/

		var updatecontrols = function(toolbar) {
			setTimeout(function() {
				var
					i;
				for (i = updators.length;i--;) {
					updators[i]();
				}
			}, 0);
		};

		var addbutton = function(command, num, title) {
			var
				button = toolbar.append({button:'',$title:title})
					.addClass('SPARK-widget-richtext-toolbar-selectable'),
				state;

			var clickhandler = function() {
				document.execCommand('useCSS', 0, 1);
				document.execCommand(command, 0, null);
				updatecontrols(toolbar);
			};
			
			button.append({span:""})
				.addClass('SPARK-widget-richtext-toolbar-icon')
				.style('width', iconsize+"px")
				.style('height', iconsize+"px")
				.style('background', 
						'url(images/SPARK-widget-richtext.png) -1px -'+((iconsize+2)*num+1)+'px');

			button.watch('click', clickhandler);
			teardowns.push(function() {
				button.unwatch('click', clickhandler);
			});
			updators.push(function() {
				var
					value;
				try {
					value = document.queryCommandState(command);
					if (value !== state) {
						if (value) {
							button.addClass('SPARK-widget-richtext-active');
						}
						else {
							button.removeClass('SPARK-widget-richtext-active');
						}
						state = value;
					}
				}
				catch (e) {
					button.removeClass('SPARK-widget-richtext-active');
				}
			});
		};

		var addseparator = function() {
			toolbar.append({span:''})
				.addClass('SPARK-widget-richtext-toolbar-separator');
		};

		var stylechooseroption = function(label, container) {
			var
				option = SPARK.build({div:""}),
				link,
				spec = {};

			spec[container] = '';
			link = option.append(spec).append({a:label,$href:'#'});

			link.watch('click', function() {
				document.execCommand('formatblock', false, '<h1>');
			});

			return option;
		};

		var addstylechooser = function() {
			var
				chooser = toolbar.append({span:'',$title:'Paragraph style'})
					.addClass('SPARK-widget-richtext-toolbar-dropper'),
				text = chooser.append({button:'Paragraph style'})
					.addClass('SPARK-widget-richtext-toolbar-label'),
				currentformat,
				dropdown = chooser.append({div:""})
					.style('display', 'none')
					.addClass('SPARK-widget-richtext-toolbar-dropdown');

			
			chooser.append({span:""}) // drop arrow icon
				.addClass('SPARK-widget-richtext-toolbar-icon')
				.style('width', iconsize+"px")
				.style('height', iconsize+"px")
				.style('background',
					'url(images/SPARK-widget-richtext.png) -1px -'+((iconsize+2)*9+1)+'px');

			dropdown.append(stylechooseroption('Normal text', 'p'));
			dropdown.append(stylechooseroption('Page heading', 'h1'));
			dropdown.append(stylechooseroption('Section heading', 'h2'));
			dropdown.append(stylechooseroption('Section subheading', 'h3'));
			dropdown.append(stylechooseroption('Formatted code', 'pre'));
			widgets.flyoutMenu(chooser, {contents:[{a:"Link 1",$href:"#"},{a:"Link 2",$href:"#"}]});

			teardowns.push(function() {
				dropdown.remove();
			});

			updators.push(function () {
				var
					value, part;
				try {
					value = document.queryCommandValue('formatblock');
					if (value !== currentformat) {
						part = /^(?:h|Heading )(\d)$/.exec(value);
						text.empty().append(
							part ? 'Heading '+part[1] :
							value === 'pre' || value === 'Formatted' ? 'Formatted code' :
							'Normal text'
						);
						currentformat = value;
					}
				}
				catch (e) {}
			});
		};

		var populatetoolbar = function() {

			if (!canedit) {
				toolbar.append({div:"HTML tags allowed"})
					.addClass('SPARK-widget-richtext-toolbar-altnotice');
				return;
			}

			if (!opts || opts.stylechooser === undefined || opts.stylechooser) {
				addstylechooser();
				addseparator();
			}
			addbutton('bold', 0, 'Bold');
			addbutton('italic', 1, 'Italic');
			if (!opts || opts.listbuttons === undefined || opts.listbuttons) {
				addseparator();
				addbutton('insertunorderedlist', 2, 'Insert bulleted list');
				addbutton('insertorderedlist', 3, 'Insert numbered list');
			}
			if (!opts || opts.indentbuttons === undefined || opts.indentbuttons) {
				addseparator();
				addbutton('outdent', 4, 'Decrease indent');
				addbutton('indent', 5, 'Increase indent');
			}
		};

		if (canedit) {
			editor.setAttribute('contenteditable', 'true');
			editor.watch('keypress', updatecontrols);
			editor.watch('mousedown', updatecontrols);
			editor.watch('click', updatecontrols);
		}

		// transfer to new editor and remove old
		if (el[0].tagName.toLowerCase() === 'textarea') {
			source = el[0].value;
			editor.style('minHeight', el.getStyle('height'));
			el.insert({
				input:'',
				$type:'hidden',
				$name:el[0].name,
				$value:el[0].value
				});
			el.remove();
		}
		else {
			source = el[0].innerHTML;
			el.style('display', 'none');
		}

		editor[0][canedit ? 'innerHTML' : 'value'] =
			htmlconvert(source, !canedit, 0);

		populatetoolbar();
		updatecontrols();
	};

	/************************
	 *        STYLES        *
	 ************************/

	// flyout
	

	// richtext

	SPARK.styleRule('.SPARK-widget-richtext-container',
		'border:1px solid ButtonShadow;width:auto;padding:1px;background:#fff;color:#000')
		.styleRule('.SPARK-widget-richtext-toolbar',
			'font:12px sans-serif;margin:0 0 1px 0;background:#f9f6f3')
		// button text needs to be re-set in FF (at least)
		.styleRule('.SPARK-widget-richtext-toolbar-selectable',
			'border:none;padding:0;background:transparent;font:inherit;overflow:visible')
		.styleRule('.SPARK-widget-richtext-toolbar-selectable:hover',
			'background:#edd')
		.styleRule('.SPARK-widget-richtext-toolbar-selectable .SPARK-widget-richtext-active',
			'background:#e8d8d8')
		.styleRule('.SPARK-widget-richtext-toolbar-separator',
			'display:inline-block;width:5px')
		.styleRule('.SPARK-widget-richtext-editor',
			'max-height:27em')
	// outline:0 prevents dotted line in firefox
	// position:relative is in case people paste in absolute positioned elements
		.styleRule('div.SPARK-widget-richtext-editor',
			'cursor:text;padding:1px 0 1px 2px;outline:0;position:relative;min-height:6em;overflow:auto')
	// min-height needed as textareas don't auto-expand
		.styleRule('textarea.SPARK-widget-richtext-editor',
			'width:100%;border:0;padding:0;margin:0;background:#fff;color:#000;font:inherit;min-height:14em')
		.styleRule('.SPARK-widget-richtext-toolbar-altnotice',
			'padding:5px;text-align:right')
		.styleRule('.SPARK-widget-richtext-toolbar-icon',
			'display:inline-block;vertical-align:middle;margin:4px 3px 5px')
		.styleRule('.SPARK-widget-richtext-toolbar-label',
			'vertical-align:middle;margin: 4px 3px')
		.styleRule('.SPARK-widget-richtext-toolbar-dropper',
			'display:inline-block;position:relative')
		.styleRule('.SPARK-widget-richtext-toolbar-dropdown',
			'overflow:hidden;background:#fff;border:1px solid ButtonShadow');

	return function(func, opts) {
		if (widgets.hasOwnProperty(func)) {
			return widgets[func](this, opts);
		}
	};

}());
