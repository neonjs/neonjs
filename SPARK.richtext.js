
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

SPARK.richText = SPARK.richText || (function() {

	return function(opts) {
		var
			i,
			area,
			el,
			textareas = [];
		
		for (i = this.length; i--;) {
			if (this[i].tagName.toLowerCase() == 'textarea') {
				textareas.push((el = SPARK.select(this[i])));
				area = el.insert({div:""}).
					style('minWidth', el.getStyle('width')).
					style('minHeight', el.getStyle('height'));
				area[0].innerHTML = el[0].value;
				el.insert({
					input:'',
					$type:'hidden',
					$name:el[0].name,
					$value:''
					});
				el.remove();
			}
			else {
				area = SPARK.select(this[i]);
			}
			area.setAttribute('contenteditable', 'true').
				style('border', '1px inset #aaa').
				style('padding', '1px').
				style('maxHeight', '26em').
				style('overflow', 'auto').
				addClass('SPARK-richtext-area');
		}
		
	};
	
}());
