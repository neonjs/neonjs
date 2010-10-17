
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

SPARK.richText = SPARK.richText || function(opts) {

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
			blockreg = /^(?:h[1-6]|ul|ol|dl|menu|dir|pre|hr|blockquote|address|center|div|isindex|fieldset|table)$/;
				// 1: text; 2: tag; 3: slash; 4: tagname; 5: tagcontents; 6: endtext;

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
					last == 'p' || last == 'br' || last == 'li' || last == 'tr') {
					text = text.replace(/^\s+/, '');
				}
				// remove trailing spaces
				if (delta || !tagname || !popen ||
					tagname == 'p' || tagname == 'br' || tagname == 'li' || last == 'tr') {
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
					(!closetag && (tagname == 'tr' || tagname == 'li' || tagname == 'p')) || 
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

	var setupeditor = function(that) {
		var
			i,
			el,
			container,
			editor,
			toolbar,
			//savebar,
			source,
			canedit = 0 && document.body.contentEditable !== undefined;

		for (i = that.length; i--; ) {
			el = SPARK.select(that[i]);

			// set up editor
			container = el.insert({div:''});
			editor = container.insert(canedit ? {div:''} : {textarea:''})
				.addClass('SPARK-richtext-editor')
				.style('border', '1px inset #888')
				.style('padding', '1px')
				.style('maxHeight', '25em');
			if (canedit) {
				editor.setAttribute('contenteditable', 'true')
					.style('overflow', 'auto');
			}
			else {
				editor.style('width', '97.5%')
					.style('background', 'transparent')
					.style('minHeight', '14em')
					.style('color', 'inherit');
			}
			toolbar = editor.insert({div:''})
				.addClass('SPARK-richtext-toolbar');
				/*
			savebar = container.append({div:'CLICK'})
				.watch('click', function() {
					editor[0].value = htmlconvert(editor[0].value, 0, 1);
				});
				*/

			// transfer to new editor and remove old
			if (el[0].tagName.toLowerCase() == 'textarea') {
				source = el[0].value;
				//editor.style('minWidth', el.getStyle('width'))
			//		.style('minHeight', el.getStyle('height'));
				el.insert({
					input:'',
					$type:'hidden',
					$name:el[0].name,
					$value:''
					});
			}
			else {
				source = el[0].innerHTML;
			}
			el.style('display', 'none');

			editor[0][canedit ? 'innerHTML' : 'value'] =
				htmlconvert(source, !canedit, 0);
		}
	};
	
	setupeditor(this);

};
