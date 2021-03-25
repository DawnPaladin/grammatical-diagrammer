const darkMode = false;
const foregroundColor = darkMode ? "white" : "black";
const canvasSize = [500, 500];
const lineStyle = { width: 3, color: foregroundColor };
const textFont = { size: 24, fill: foregroundColor };
const labelFont = { size: 24, fill: "blue" };
const descenderOffset = 45; // distance between descender attachment points

const draw = SVG().addTo('#canvas').size(...canvasSize);

class Point {
	/**
	 * @param {number} x
	 * @param {number} y
	 */
	constructor(x, y) {
		this.x = x;
		this.y = y;
		this.xy = [x, y];
	}
}

/**
 * If object.direction is "right" or "downRight", runs the first function; if it's "left" or "downLeft", runs the second function; otherwise throws error.
 * @param {object} object 
 * @param {*} ifRight 
 * @param {*} ifLeft 
 * @returns {any}
 */
function rightOrLeft(object, ifRight, ifLeft) {
	if (object.direction == "right" || object.direction == "downRight") return ifRight();
	else if (object.direction == "left" || object.direction == "downLeft") return ifLeft();
	else throw new Error("Invalid direction");
}

/**
 * If word/sentence is LTR, returns true; if RTL, returns false; otherwise throws error. Useful for assigning things using the ternary operator, like so:
 * var x = isRightPointing(word) ? 1 : -1;
 * Thus, if word is LTR, x = 1; if it's RTL, x = -1.
 * @param {object} object 
 * @returns {boolean}
 */
function isRightPointing(object) {
	return rightOrLeft(object, () => true, () => false);
}
/**
 * Opposite of isRightPointing.
 * @param {object} object 
 * @returns {boolean}
 */
 function isLeftPointing(object) {
	return !isRightPointing(object);
}

class Word {
	/**
	 * @param {object} options
	 * @param {Point} options.origin For LTR words this will be the left edge; for RTL words it will be the right edge.
	 * @param {string} options.text
	 * @param {string} options.label
	 * @param {string} options.direction One of "left", "right", "downLeft", "downRight"
	 * @param {object} [options.parent]
	 * @param {boolean} [options.debug] Highlight origin
	 */
	constructor(options) {
		this.origin = options.origin;
		this.text = options.text;
		this.label = options.label;
		this.direction = options.direction;
		this.parent = options.parent;
		this.debug = options.debug;

		this.group = draw.group();
		this.attachments = [];
		this.descenders = [];

		this.render();
	}
	createLine() {
		this.length = this.calcLength();
		this.lineEndpoint = this.calcLineEndpoint();

		return draw.line(
			0, 0,
			...this.lineEndpoint.xy,
		).stroke(lineStyle);
	}
	createWordSvg() {
		var attributes = isRightPointing(this) ? {
			x: 20, y: -38,
			direction: "ltr"
		} : {
			x: -20, y: -38,
			direction: "rtl"
		};
		var label = draw.element('title').words(this.label);
		return draw.text(this.text).attr(attributes).font(textFont).add(label);
	}
	calcLength() {
		var extraSpaceForDescenders = 0;
		if (this.descenders.length > 1) {
			extraSpaceForDescenders = (this.descenders.length - 1) * 50;
		}
		if (this.hasAttachedPhrase == true) { // If this is a diagonal line with a horizontal phrase attached to it, it will need more space.
			extraSpaceForDescenders += 20;
		}
		return this.wordSvg.length() + 40 + extraSpaceForDescenders;
	}
	calcLineEndpoint() {
		var x = isRightPointing(this) ? 0 + this.length : 0 - this.length;
		var y = 0;
		return new Point(x, y);
	}
	transformGroup() {
		let transformation = { translateX: this.origin.x, translateY: this.origin.y };

		// if the line should be diagonal, rotate it downward
		if (this.direction == "downRight") {
			transformation = {...transformation, rotate: 60, origin: "bottom left" };
		}
		if (this.direction == "downLeft" ) {
			transformation = {...transformation, rotate: -60, origin: "bottom right" };
		}
		// if the line's parent is diagonal but it should be horizontal, rotate it back
		if (this.direction == "right" && this.parent && this.parent.direction == "downRight") {
			transformation = {...transformation, rotate: -60, origin: "bottom left" };
		}
		if (this.direction == "left" && this.parent && this.parent.direction == "downLeft") {
			transformation = {translateX: -this.origin.x, translateY: -this.origin.y, rotate: 60, origin: "bottom right" };
		}
		this.group.transform(transformation);
	}
	newAttachment() {
		// don't conditionalize this - the downRight/downLeft conditional expects it
		var attachPointX = 20 + this.attachments.length * descenderOffset;

		if (this.direction == "left") {
			attachPointX = -20 - this.attachments.length * descenderOffset;
		}
		if (this.direction == "downRight" || this.direction == "downLeft") {
			attachPointX = this.calcLength() - attachPointX; // attach to the right end instead of the left
		}

		var attachPoint = new Point(attachPointX, 0);
		this.attachments.push(attachPoint);
		return attachPoint;
	}
	render() {
		this.group.remove();
		this.group = draw.group();
		this.group.addClass('word')
		this.wordSvg = this.createWordSvg();
		this.line = this.createLine();

		this.group.add(this.line);
		this.group.add(this.wordSvg);

		this.transformGroup();

		this.descenders.forEach(descender => {
			this.group.add(descender.group)
		})

		if (this.debug == true) {
			var originLabel = draw.text('O').cx(0).cy(0).fill('silver').addClass(`word-${this.text}-origin`);
			this.group.add(originLabel)
		}
	}
	recursiveRender(object) {
		object.render();
		if (object.parent) {
			object.recursiveRender(object.parent)
		}
	}

	// Public API

	/**
	 * For adjectives, adverbs, prepositions
	 * @param {object} options 
	 * @param {string} options.text
	 * @param {string} options.label
	 * @param {string} options.direction One of "left", "right", "downLeft", "downRight"
	 * @param {boolean} [options.debug]
	 * @returns {Word}
	 */
	 addSlantedModifier(options) {
		const attachPoint = this.newAttachment();
		const newWord = new Word({
			origin: attachPoint,
			text: options.text,
			label: options.label,
			direction: options.direction,
			debug: options.debug,
			parent: this,
		});
		this.descenders.push(newWord);
		this.recursiveRender(this);
		
		return newWord;
	}

	// For objects of prepositions
	addPhrase(options) {
		this.hasAttachedPhrase = true;
		return this.addSlantedModifier(options);
	}
}

class Sentence {
	/**
	 * @param {object} options 
	 * @param {string} options.subject
	 * @param {string} options.verb
	 * @param {string} options.direction Either "left" or "right", for LTR and RTL sentences respectively.
	 * @param {Point} [options.origin] Baseline of the text. For LTR sentences this will be at the text's left edge; for RTL sentences it will be at the right edge.
	 * @param {boolean} [options.debug] Highlight origin
	 */
	constructor(options) {
		this.subjectText = options.subject;
		this.verbText = options.verb;
		this.direction = options.direction;
		this.origin = options.origin || new Point(10, 40);
		this.debug = options.debug;
		this.group = draw.group();
		this.sentenceDividerX = 0; // sentence divider distance from left edge

		this.subject = new Word({
			origin: this.origin,
			text: this.subjectText,
			label: "subject",
			direction: this.direction,
			parent: this,
		});
		this.verb = new Word({
			origin: new Point(this.proceedInSentenceDirection(this.origin.x, this.subject.group.width()), this.origin.y),
			text: this.verbText,
			label: "verb",
			direction: this.direction,
			parent: this,
		});

		this.render();
	}

	render() {
		this.group.remove();
		this.group = draw.group();
		this.group.addClass('sentence')

		this.subjectVerbDivider = this.drawSubjectVerbDivider();
		this.verb.origin = new Point(this.sentenceDividerX, this.origin.y); // position the verb on the other side of the sentence divider
		this.verb.render();
		this.group.add(this.subject.group);
		this.group.add(this.subjectVerbDivider);
		this.group.add(this.verb.group);

		if (this.debug) {
			var originLabel = draw.text('O').move(this.origin.x - 6, this.origin.y - 6).fill('silver').addClass(`sentence-origin`);
			this.group.add(originLabel);
		}
	}

	/**
	 * Add two numbers if the sentence is LTR, otherwise subtract them.
	 * @param {number} a
	 * @param {number} b
	 */
	proceedInSentenceDirection(a, b) {
		return rightOrLeft(this, function() {
			return a + b;
		}, function() {
			return a - b;
		})
	}

	drawSubjectVerbDivider() {
		this.sentenceDividerX = this.proceedInSentenceDirection(this.origin.x, this.subject.group.width());
		let startY = this.origin.y - 30;
		let endY = this.origin.y + 20;
		const subjectVerbDivider = draw.line(
			this.sentenceDividerX, startY, 
			this.sentenceDividerX, endY
		).stroke(lineStyle);
		return subjectVerbDivider;
	}

}

var ltrSentence = new Sentence({
	subject: "fox",
	verb: "jumps",
	direction: "right",
	origin: new Point(10, 50)
});
ltrSentence.subject.addSlantedModifier({
	text: "the",
	label: "article",
	direction: "downRight"
});
ltrSentence.subject.addSlantedModifier({
	text: "quick",
	label: "adjective",
	direction: "downRight"
});
ltrSentence.subject.addSlantedModifier({
	text: "brown",
	label: "adjective",
	direction: "downRight"
});
var preposition = ltrSentence.verb.addSlantedModifier({
	text: "over",
	label: "preposition",
	direction: "downRight",
	// debug: true
});
var prepPhrase = preposition.addPhrase({
	text: "dog",
	label: "noun",
	direction: "right",
	// debug: true
})
prepPhrase.addSlantedModifier({
	text: "the",
	label: "article",
	direction: "downRight"
})
prepPhrase.addSlantedModifier({
	text: "lazy",
	label: "adjective",
	direction: "downRight"
})

// var rtlSentence = new Sentence({
// 	subject: "fox",
// 	verb: "jumps",
// 	direction: "left",
// 	origin: new Point(500, 50)
// });
// rtlSentence.subject.addSlantedModifier({
// 	text: "the",
// 	label: "article",
// 	direction: "downLeft"
// });
// rtlSentence.subject.addSlantedModifier({
// 	text: "quick",
// 	label: "adjective",
// 	direction: "downLeft"
// });
// rtlSentence.subject.addSlantedModifier({
// 	text: "brown",
// 	label: "adjective",
// 	direction: "downLeft"
// });
// var preposition = rtlSentence.verb.addSlantedModifier({
// 	text: "over",
// 	label: "preposition",
// 	direction: "downLeft",
// 	// debug: true
// });
// var prepPhrase = preposition.addPhrase({
// 	text: "dog",
// 	label: "noun",
// 	direction: "left",
// 	// debug: true
// })
// prepPhrase.addSlantedModifier({
// 	text: "the",
// 	label: "article",
// 	direction: "downLeft"
// })
// prepPhrase.addSlantedModifier({
// 	text: "lazy",
// 	label: "adjective",
// 	direction: "downLeft"
// })

// var subject = new Word({
// 	origin: new Point(100, 100),
// 	text: "subject",
// 	label: "",
// 	direction: "right"
// })
// subject.addSlantedModifier({
// 	text: "one",
// 	label: "",
// 	direction: "downRight"
// })

var url = "data:image/svg+xml,"+encodeURIComponent(draw.svg());
// @ts-ignore
document.getElementById('download-link').href = url;