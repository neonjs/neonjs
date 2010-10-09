
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
			toolbar,
			savebar,
			div,
			source,
			canedit;

		for (var i = that.length; i--; ) {
			el = SPARK.select(that[i]);
			container = el.insert({div:''});
			canedit = container.contenteditable !== null;





			if (el[0].tagName.toLowerCase() == 'textarea') {
				div = container.append({div:''}).
					style('minWidth', el.getStyle('width')).
					style('minHeight', el.getStyle('height'));
				div[0].innerHTML = el[0].value;
				el.insert({
					input:'',
					$type:'hidden',
					$name:el[0].name,
					$value:''
					});
			}
			else {
				div = container.append(el);
			}
			el.remove();
			div.setAttribute('contenteditable', 'true').
				style('border', '1px inset #aaa').
				style('padding', '1px').
				style('maxHeight', '26em').
				style('overflow', 'auto').
				addClass('SPARK-richtext-area');
			toolbar = div.insert({div:''}).
				addClass('SPARK-richtext-toolbar');
		}
	}
	
	setupeditor(this);

};
