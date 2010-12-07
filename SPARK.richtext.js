
// SPARK richtext - rich text editing control for Javascript
// Part of the SPARK Javascript library
// Copyright (c) 2010 Thomas Rutter

// A simple, reliable, easy (for users) rich text control is needed.
// Who needs a toolbar with 63 buttons when just writing some text

/*jslint browser:true */
/*global SPARK:true */

/**
@preserve SPARK js lib (c) Thomas Rutter SPARKlib.com
*/

SPARK.richText = function(opts) {

	var
		i,
		iconsize = opts && opts.iconsize || 14,
		canedit = document.body.contentEditable !== undefined;

	/*
		block level: h[1-6]|ul|ol|dl|menu|dir|pre|hr|blockquote|address|center|
			p|div|isindex|fieldset|table
		optional end tag: p
		no end tag (autoclose): hr isindex
		contains paragraphs: blockquote|address|center|div|fieldset
	*/

	var htmlconvert = function(input, strippara, wstopara) {
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

		while ((matches = parsereg.exec(input))) {

			lastdelta = delta;
			last = tagname;
			lastclose = closetag;
			delta = closetag = 0;
			tagname = 0;
			topstack = stack[stack.length-1];
			popen = pinitially =
				lastdelta ? 0 :
				last != 'p' ? popen :
				lastclose ? 0 : 1;
			if (matches[4]) {
				tagname = matches[4].toLowerCase();
				closetag = matches[3];
				if (blockreg.test(tagname)) {
					if (!closetag) {
						if (tagname != 'hr' && tagname != 'isindex') {
							delta = 1;
							stack.push(tagname);
						}
					}
					else if (tagname == topstack) {
						delta = -1;
						stack.pop();
					}
				}
			}
			text = matches[1];
			tagcode = matches[2];

			if (topstack != 'pre') {
				// process paragraphs
				if (!topstack || topstack == 'blockquote' || topstack == 'center' || popen) {
					// add missing <p> at start
					if (!popen && (/\S/.test(text) ||
						(tagname && !delta && tagname != '!' && tagname != 'p'))) {
						popen = 1;
						text = '<p>' + text.replace(/^\s*/, '');
					}
					if (popen) {
						// add missing </p> at end
						if (delta ||
							(!closetag && tagname == 'p') ||
							!tagname ||
							(wstopara && /\n\r?\n\s*$/.test(text))
							) {
							popen = 0;
							text = text.replace(/\s*$/, '') + '</p>';
						}
						// add paragraph breaks within based on whitespace
						if (wstopara) {
							if (last == 'br') {
								text = text.replace(/^\s+/, '');
							}
							text = text.replace(/\s*\n\r?\n\s*(?=\S)/g, '</p><p>')
								.replace(/\s*\n\s*/g, '<br>');
						}
					}
				}
				// remove leading spaces
				if (lastdelta || !last || !pinitially || 
					last == 'p' || last == 'br' || blockseparator.test(last)) {
					text = text.replace(/^\s+/, '');
				}
				// remove trailing spaces
				if (delta || !tagname || !popen ||
					tagname == 'p' || tagname == 'br' || blockseparator.test(tagname)) {
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
					delta == 1 || (!popen && tagname == '!') || 
					(!closetag && (tagname == 'p' || blockseparator.test(tagname))) || 
					(closetag && (tagname == 'table' || tagname == 'ul'))
					) {
					text += "\n";
				}
				// add newline at start (after last tag)
				if (
					lastdelta == -1 || (!pinitially && last == '!') ||
					(lastclose && last == 'p') ||
					last == 'br') {
					text = "\n" + text;
				}
			}

			// process the actual tag
			if (strippara &&
				(tagname == 'p' || (tagname == 'br' && (!topstack ||
					topstack == 'blockquote' || topstack == 'center'))) &&
				!/\S/.test(matches[5])) {
				tagcode = '';
			}

			output += text + tagcode;
		}
		// close last p tag
		if (popen && !strippara && !delta && (tagname != 'p' || !closetag)) {
			 output += '</p>';
		}

		return output.replace(/^\s+|\s+$/g, '');
	};


	var setupeditor = function(el) {
		var
			container = el.insert({div:''}).addClass('SPARK-richtext-container'),
			editor = container.append(canedit ? {div:''} : {textarea:''})
				.addClass('SPARK-richtext-editor'),
			toolbar = editor.insert({div:''}).addClass('SPARK-richtext-toolbar'),
			source,
			updators = [],
			teardowns = [];

		/*******************************************
		 * HELPER FUNCTIONS FOR THE EDITOR CONTROL *
		 *******************************************/

		var updatecontrols = function(toolbar) {
			setTimeout(function() {
				for (var i = updators.length;i--;) {
					updators[i]();
				}
			}, 0);
		};

		var addbutton = function(command, num, title) {
			var
				button = toolbar.append({button:'',$title:title}),
				state;

			var clickhandler = function() {
				document.execCommand('useCSS', 0, 1);
				document.execCommand(command, 0, null);
				updatecontrols(toolbar);
			};
			
			button.append({span:""})
				.addClass('SPARK-richtext-toolbar-icon')
				.style('width', iconsize+"px")
				.style('height', iconsize+"px")
				.style('background', 
						'url(images/SPARK-richtext-toolbar.png) -1px -'+((iconsize+2)*num+1)+'px');

			button.watch('click', clickhandler);
			teardowns.push(function() {
				button.unwatch('click', clickhandler);
			});
			updators.push(function() {
				var
					value;
				try {
					value = document.queryCommandState(command);
					if (value != state) {
						if (value) {
							button.addClass('SPARK-richtext-active');
						}
						else {
							button.removeClass('SPARK-richtext-active');
						}
						state = value;
					}
				}
				catch (e) {}
			});
		};

		var addseparator = function() {
			toolbar.append({span:''})
				.addClass('SPARK-richtext-toolbar-separator');
		};

		var addstylechooser = function() {
			var
				chooser = toolbar.append({span:''})
					.addClass('SPARK-richtext-toolbar-dropper'),
				button = chooser.append({button:'',$title:'Paragraph style'}),
				text = button.append({span:'Paragraph style'})
					.addClass('SPARK-richtext-toolbar-label'),
				currentformat,
				dropdown;

			var onfocus = function() {
				dropdown = chooser.append({div:"Test"})
					.addClass('SPARK-richtext-toolbar-dropdown')
					.flyout('br');
			};
			
			var onblur = function() {
				if (dropdown) {
					dropdown.remove();
					dropdown = null;
				}
			};

			button.append({span:""}) // drop arrow icon
				.addClass('SPARK-richtext-toolbar-icon')
				.style('width', iconsize+"px")
				.style('height', iconsize+"px")
				.style('background',
					'url(images/SPARK-richtext-toolbar.png) -1px -'+((iconsize+2)*9+1)+'px');

			button.watch('focus', onfocus);
			button.watch('blur', onblur);
			teardowns.push(function() {
				button.unwatch('focus', onfocus)
					.unwatch('blur', onblur);
			});


			updators.push(function () {
				var
					value, part;
				try {
					value = document.queryCommandValue('formatblock');
					if (value != currentformat) {
						text.empty().append(
							(part = /^(?:h|Heading )(\d)$/.exec(value)) ? 'Heading '+part[1] :
							value == 'pre' || value == 'Formatted' ? 'Formatted code' :
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
					.addClass('SPARK-richtext-toolbar-altnotice');
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
		if (el[0].tagName.toLowerCase() == 'textarea') {
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

	
	for (i = this.length; i--;) {
		setupeditor(SPARK.select(this[i]));
	}

	return this;
};

/************************
 *        STYLES        *
 ************************/

SPARK.styleRule('.SPARK-richtext-container', 'border:1px solid ButtonShadow;width:auto;padding:1px;background:#fff;color:#000')
	.styleRule('.SPARK-richtext-toolbar', 'font:12px sans-serif;margin:0 0 1px 0;background:#f9f6f3')
	// button text needs to be re-set in FF (at least)
	.styleRule('.SPARK-richtext-toolbar button', 'border:none;padding:0;background:transparent;font:inherit;overflow:visible')
	.styleRule('.SPARK-richtext-toolbar button:hover', 'background:#edd')
	.styleRule('.SPARK-richtext-toolbar button.SPARK-richtext-active', 'background:#e8d8d8')
	.styleRule('.SPARK-richtext-toolbar-separator', 'display:inline-block;width:5px')
	.styleRule('.SPARK-richtext-editor', 'max-height:27em')
// outline:0 prevents dotted line in firefox
// position:relative is in case people paste in absolute positioned elements
	.styleRule('div.SPARK-richtext-editor', 'cursor:text;padding:1px 0 1px 2px;outline:0;position:relative;min-height:6em;overflow:auto')
// min-height needed as textareas don't auto-expand
	.styleRule('textarea.SPARK-richtext-editor', 'width:100%;border:0;padding:0;margin:0;background:#fff;color:#000;font:inherit;min-height:14em')
	.styleRule('.SPARK-richtext-toolbar-altnotice', 'padding:5px;text-align:right')
	.styleRule('.SPARK-richtext-toolbar-icon', 'display:inline-block;vertical-align:middle;margin:4px 3px 5px')
	.styleRule('.SPARK-richtext-toolbar-label', 'vertical-align:middle;margin: 4px 3px')
	.styleRule('.SPARK-richtext-toolbar-dropper', 'display:inline-block;position:relative');
