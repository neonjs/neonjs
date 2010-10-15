
// SPARK richtext - rich text editing control for Javascript
// Part of the SPARK Javascript library
// Copyright (c) 2010 Thomas Rutter

// A simple, reliable, easy (for users) rich text control is needed.
// Who needs a toolbar with 63 buttons when just writing some text

/*jslint  */
/*global SPARK:true */

/**
@preserve SPARK js lib (c) Thomas Rutter SPARKlib.com
*/

SPARK.richText = SPARK.richText || function(opts) {

	var 
		// 1: text; 2: tag; 3: slash; 4: tagname; 5: tagcontents; 6: endtext;
		parsereg = /([\s\S]*?(?=<[\/\w!])|[\s\S]+)((?:<(\/?)([\w!]+)((?:[^>"\-]+|"[\s\S]*?"|--[\s\S]*?--)*)>?)?)/g,
		blockreg = /^(?:h[1-6]|ul|ol|dl|menu|dir|pre|hr|blockquote|address|center|div|isindex|fieldset|table)$/;

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
			closetag = 0, lastclose, // whether there is/was a slash to indicate close tag
			text,
			tag,
			topstack,
			popen = 0, // whether a <p> is open
			output = '',
			delta = 0, lastdelta, // delta is +1 for moving into a block, -1 for leaving, 
				// 0 for non-block
			stack = [];

		while ((matches = parsereg.exec(input))) {

			lastdelta = delta;
			last = tagname;
			lastclose = closetag;
			delta = closetag = 0;
			tagname = 0;
			topstack = stack[stack.length-1];
			popen = 
				lastdelta ? 0 :
				last != 'p' ? popen :
				lastclose ? 0 : 1;
			if (matches[4]) {
				tagname = matches[4].toLowerCase();
				closetag = matches[3];
				if (blockreg.test(tagname)) {
					if (!closetag) {
						delta = 1;
						stack.push(tagname);
					}
					else if (tagname == topstack) {
						delta = -1;
						stack.pop();
					}
				}
			}
			text = matches[1];
			tag = matches[2];

			if (topstack != 'pre') {
				if (wstopara && !strippara &&
					(!topstack || topstack == 'blockquote' || topstack == 'center')) {
					if (delta || tagname == 'p' || !tagname) {
						text = text.replace(/\s+$/, '');
					}
					if (!popen) {
						text = text.replace(/^\s+/, '');
					}
					text = text.replace("\n\n", '</p><p>')
						.replace("\n", "<br>\n")
						.replace('</p><p>', "</p>\n\n<p>");
				}
				else {
					// normalise whitespace
					text = text.replace(/\s+/g, ' ');
				}
				// remove leading spaces
				if (lastdelta || (!topstack && last != '!') || 
					last == 'p' || last == 'br' || last == 'li' || last == 'tr') {
					text = text.replace(/^\s+/, '');
				}
				// remove trailing spaces
				if (delta || (!topstack && tagname != '!') ||
					tagname == 'p' || tagname == 'br' || tagname == 'li' || last == 'tr') {
					text = text.replace(/\s+$/, '');
				}
				// add missing <p>
				if (!popen && 
					(!topstack || topstack == 'blockquote' || topstack == 'center') &&
					((!closetag && !delta && tagname && tagname != 'p' && tagname != '!') ||
						/[^\s]/.test(text))) {
					if (!strippara) {
						text = "<p>" + text;
					}
					if (last) {
						text = "\n" + text;
					}
					popen = 1;
				}
				// add missing </p>
				if (popen && (
					(!closetag && tagname == 'p') ||
					delta ||
					!tagname)) {
					if (!strippara) {
						text += "</p>";
					}
					if ((!closetag && tagname == 'p') || delta == 1 || !tagname) {
						text += "\n";
					}
				}
				// add newline at end (before tag)
				if ((
						delta == 1 ||
						(!closetag && (tagname == 'tr' || tagname == 'li' || tagname == 'p')) || 
						(popen && delta) ||
						(closetag && (tagname == 'table' || tagname == 'ul'))) &&
					last) {
					text += "\n";
				}
				// add newline at start (after last tag)
				if ((
					lastdelta == -1 || 
					(lastclose && last == 'p') ||
					last == 'br')) {
					text = "\n" + text;
				}
			}

			if (strippara &&
				(tagname == 'p' || (tagname == 'br' && (!topstack ||
					topstack == 'blockquote' || topstack == 'center'))) &&
				!/[^\s]/.test(matches[5])) {
				tag = '';
			}

			output += text + tag;
		}

		return output;
	};

	var setupeditor = function(that) {
		var
			i,
			el,
			container,
			editor,
			toolbar,
			savebar,
			source,
			//canedit = document.body.contentEditable !== undefined;
			canedit = 0;


		for (i = that.length; i--; ) {
			el = SPARK.select(that[i]);

			// set up editor
			container = el.insert({div:''});
			editor = container.insert(canedit ? {div:''} : {textarea:''})
				.setAttribute('contenteditable', 'true')
				.addClass('SPARK-richtext-editor')
				.style('border', '1px inset #aaa')
				.style('padding', '1px')
				.style('maxHeight', '26em')
				.style('overflow', 'auto');
			if (!canedit) {
				editor.style('width', '98%')
					.style('background', 'transparent')
					.style('minHeight', '14em')
					.style('color', 'inherit');
			}
			toolbar = editor.insert({div:''})
				.addClass('SPARK-richtext-toolbar');
			savebar = container.append({a:'CLICK'}).
				watch('click', function() {
					editor[0].value = htmlconvert(editor[0].value, 0, 1);
				});

			// transfer to new editor and remove old
			if (el[0].tagName.toLowerCase() == 'textarea') {
				source = el[0].value;
				editor.style('minWidth', el.getStyle('width'))
					.style('minHeight', el.getStyle('height'));
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
			el.remove();

			editor[0][canedit ? 'innerHTML' : 'value'] = canedit ? source :
				htmlconvert(source, 1, 1);
		}
	};
	
	setupeditor(this);

};
