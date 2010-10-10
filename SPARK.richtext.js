
// SPARK richtext - rich text editing control for Javascript
// Part of the SPARK Javascript library
// Copyright (c) 2010 Thomas Rutter

// A simple, reliable, easy (for users) rich text control is needed.
// Who needs a toolbar with 63 buttons when just writing some text

/*jslint browser: true, evil: true, newcap: true, immed: true */
/*global SPARK:true */

/**
@preserve SPARK js lib (c) Thomas Rutter SPARKlib.com
*/

SPARK.richText = SPARK.richText || function(opts) {

	var setupeditor = function(that) {
		var
			i,
			el,
			container,
			editor,
			toolbar,
			savebar,
			source,
			canedit = document.body.contentEditable == undefined;

		/*
		var totext = function(html) {


			var 
				matches,
				output = '',
				lastpos = 0,
				mybreak = 0,
				regex = /\s*+<\/?+(\w++)[^>"]*(?:"[^"]*"[^>"]*+)*+>\s*|\x20\s+|\t\s*|\n\s*|\r\s*|<!(?:--[\S\s]*?--|[^-][^>]*)>\s*+/;
			while (matches = regex.exec(html)) {
				output .= html.substr(lastpos, regex.lastIndex - lastpos);
				if (regex.lastIndex > lastpos) {
					mybreak = 0;
				}
				if ($matches[1] == '') {
					mybreak = Math.max(mybreak, 1);
				}
				else {
					if (/^(p|ul|ol|li|blockquote|h[1-6])$/i.test(matches[1])) {
						mybreak = Math.max(mybreak, 3);
					}
					else {
						if (matches[1] == 'br' || matches[1] == 'tr') {
							mybreak = Math.max(mybreak, 2);
						}
						else {
							mybreak = Math.max(mybreak, 1);
						}
					}
				}
				lastpos = regex.lastIndex;
			}



			return html;
		};
		*/

		for (var i = that.length; i--; ) {
			el = SPARK.select(that[i]);

			// set up editor
			container = el.insert({div:''});
			editor = container.insert(canedit ? {div:''} : {textarea:''}).
				setAttribute('contenteditable', 'true').
				addClass('SPARK-richtext-editor').
				style('border', '1px inset #aaa').
				style('padding', '1px').
				style('maxHeight', '26em').
				style('overflow', 'auto');
			if (!canedit) {
				editor.style('width', '98%').
					style('background', 'transparent').
					style('minHeight', '14em').
					style('color', 'inherit');
			}
			toolbar = editor.insert({div:''}).
				addClass('SPARK-richtext-toolbar');

			// transfer to new editor and remove old
			if (el[0].tagName.toLowerCase() == 'textarea') {
				source = el[0].value;
				editor.
					style('minWidth', el.getStyle('width')).
					style('minHeight', el.getStyle('height'));
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
				totext(source);
		}
	}
	
	setupeditor(this);

};
