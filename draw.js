const darkMode = false;
const foregroundColor = darkMode ? "white" : "black";
const lineStyle = { width: 3, color: foregroundColor, linecap: 'round' };
const textFont = { size: 24, fill: foregroundColor };
const descenderOffset = 45; // distance between descender attachment points

import draw from './svg-canvas.js';

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
	if (!object || !object.direction) return false;
	if (object.direction == "right" || object.direction == "downRight")
		return typeof ifRight === "function" ? ifRight() : ifRight;
	else if (object.direction == "left" || object.direction == "downLeft") 
		return typeof ifLeft === "function" ? ifLeft() : ifLeft;
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
	return rightOrLeft(object, true, false);
}
/**
 * Opposite of isRightPointing.
 * @param {object} object 
 * @returns {boolean}
 */
function isLeftPointing(object) {
	return !isRightPointing(object);
}

function heightOfRotatedRectangle(rectWidth, rectHeight, degreesRotation) {
	const radiansRotation = degreesToRadians(degreesRotation);
	return Math.abs(rectWidth * Math.sin(radiansRotation)) + Math.abs(rectHeight * Math.cos(radiansRotation));
}
function widthOfRotatedRectangle(rectWidth, rectHeight, degreesRotation) {
	const radiansRotation = degreesToRadians(degreesRotation);
	return Math.abs(rectWidth * Math.cos(radiansRotation)) + Math.abs(rectHeight * Math.sin(radiansRotation));
}
function degreesToRadians(degrees) {
	return degrees * Math.PI / 180;
}

class Word {
	/**
	 * @param {object} options
	 * @param {string} [options.type] 'underslant', 'understraight', etc.
	 * @param {Point} options.origin For LTR words this will be the left edge; for RTL words it will be the right edge.
	 * @param {string} options.text
	 * @param {string} options.label
	 * @param {string} options.direction One of "left", "right", "downLeft", "downRight"
	 * @param {object} [options.parent]
	 * @param {object} [options.descendingLine]
	 * @param {boolean} [options.debug] Highlight origin
	 */
	constructor(options) {
		this.type = options.type;
		this.origin = options.origin;
		this.text = options.text;
		this.label = options.label;
		this.direction = options.direction;
		this.parent = options.parent;
		this.descendingLine = options.descendingLine;
		this.debug = options.debug;
		this.depth = 0;

		this.group = draw.group();
		this.descenders = []; // underslants descending from this baseline
		this.children = []; // all baselines that depend on this Word for their position, including descenders and stairsteps

		this.render();
	}
	createBaseline() {
		this.baselineEndpoint = this.calcBaselineEndpoint();

		return draw.line(
			0, 0,
			...this.baselineEndpoint.xy,
		).stroke(lineStyle);
	}
	createDescendingLine() {
		const origin = this.origin;
		const depth = this.depth;
		const angle = 17 / 30;
		const endpoint = new Point(
			rightOrLeft(this, origin.x + depth * angle, origin.x - depth * angle),
			origin.y + depth
		);
		const descendingLine = draw.line(...this.origin.xy, ...endpoint.xy).stroke(lineStyle);
		descendingLine.type = 'descendingLine';
		descendingLine.endpoint = endpoint;
		descendingLine.group = draw.group();
		descendingLine.group.addClass('descending-line');
		descendingLine.group.add(descendingLine);
		return descendingLine;
	}
	createWordSvg() {
		var attributes = isRightPointing(this) ? {
			x: 20, y: -38,
			direction: "ltr"
		} : {
			x: -20, y: -38,
			direction: "rtl"
		};
		if (!this.text) this.text = " ";
		var text = draw.text(this.text).attr(attributes).font(textFont);
		// FIXME
		this.baselineLength = this.calcBaselineLength(text); // Calculating the length of <text> with a <title> child crashes under svgdom, so we calculate it now and cache it
		var label = draw.element('title').words(this.label);
		return text.add(label);
	}
	calcBaselineLength(wordSvg) {
		var wordWidth = wordSvg.length() + 40;
		var descendersWidth = 0;
		// add space for each descender
		this.descenders.forEach(descender => {
			if (['underslant', 'underslantThenStraight'].includes(descender.type)) {
				descendersWidth += 40;
			}
		})
		// the last descender especially extends the width of its parent
		if (this.descenders.length > 1) {
			var lastDescender = this.descenders[this.descenders.length - 1];
			if (lastDescender.direction == "downLeft" || lastDescender.direction == "downRight") {
				descendersWidth += lastDescender.length * .7;
			} else if (lastDescender.direction == "right" || lastDescender.direction == "left") {
				// handle understraights and underslantThenStraights
				descendersWidth += 40;
			}
		}
		// if this is a diagonal line with a horizontal phrase attached to it, it will need more space
		if (this.hasAttachedPhrase == true) {
			descendersWidth += 20;
			wordWidth += 20;
		}
		return Math.max(wordWidth, descendersWidth);
	}
	calcBaselineEndpoint() {
		var x = isRightPointing(this) ? 0 + this.baselineLength : 0 - this.baselineLength;
		var y = 0;
		return new Point(x, y);
	}
	transformGroup(origin = this.origin) {
		let transformation = { translateX: origin.x, translateY: origin.y };

		// if the line should be diagonal, rotate it downward
		if (this.direction == "downRight") {
			transformation = {...transformation, rotate: 60, origin: "bottom left" };
		}
		if (this.direction == "downLeft" ) {
			transformation = {
				translateX: origin.x + widthOfRotatedRectangle(this.baselineLength, 0, -60),
				translateY: origin.y + heightOfRotatedRectangle(this.baselineLength, 0, -60),
				rotate: -60, 
				origin: "bottom left", // origin "bottom right" is positioned much too far to the right
			};
		}
		// if the line's parent is diagonal but it should be horizontal, rotate it back
		if (this.direction == "right" && this.parent && this.parent.direction == "downRight") {
			transformation = {...transformation, rotate: -60, origin: "bottom left" };
		}
		if (this.direction == "left" && this.parent && this.parent.direction == "downLeft") {
			transformation = {translateX: -origin.x, translateY: -origin.y, rotate: 60, origin: "bottom right" };
		}
		this.group.transform(transformation);
	}
	getAttachPoint() {
		// don't conditionalize this - the downRight/downLeft conditional expects it
		var attachPointX = 20 + this.descenders.length * descenderOffset;

		if (this.direction == "left") {
			attachPointX = -20 - this.descenders.length * descenderOffset;
		}
		if (this.direction == "downRight" || this.direction == "downLeft") {
			attachPointX = this.baselineLength - attachPointX; // attach to the right end instead of the left
		}

		var attachPoint = new Point(attachPointX, 0);
		return attachPoint;
	}
	getFamilyDepth() {
		const childrenDepths = this.children.map(child => {
			if (typeof child.getFamilyDepth == 'function') {
				return child.getFamilyDepth();
			} else {
				return 0;
			}
		})
		var deepestChildDepth = childrenDepths.length > 0 ? Math.max(...childrenDepths) : 0;
		return this.depth + deepestChildDepth;
	}
	prevDescender() {
		const siblings = this.parent.descenders;
		const myIndex = siblings.indexOf(this);
		if (myIndex == -1) return false;
		return siblings[myIndex - 1];
	}
	nextDescender() {
		const siblings = this.parent.descenders;
		const myIndex = siblings.indexOf(this);
		if (myIndex == -1) return false;
		return siblings[myIndex + 1];
	}
	render() {
		if (this.descendingLine) this.descendingLine.remove();
		this.group.remove();
		this.group = draw.group();
		this.group.addClass('word');

		if (this.type == "stairstep") {
			this.depth = 30;
		}
		if (this.type == "underslant") {
			if (this.baselineLength) this.depth = heightOfRotatedRectangle(this.baselineLength, 0, -60);
		}
		if (this.type == "underslantThenStraight") {
			if (this.nextDescender() && this.nextDescender().type == "underslantThenStraight") {
				this.depth = this.nextDescender().getFamilyDepth() + 45;
			} else {
				this.depth = 30;
			}
			this.descendingLine = this.createDescendingLine();
			if (this.prevDescender() && this.prevDescender().type == "underslantThenStraight") {
				this.prevDescender().render();
			}
		}

		this.wordSvg = this.createWordSvg();
		this.baseline = this.createBaseline();

		this.group.add(this.baseline);
		this.group.add(this.wordSvg);
		if (this.descendingLine)  {
			this.descendingLine.group.add(this.group);

			this.transformGroup(this.descendingLine.endpoint);
		} else {
			this.transformGroup();
		}

		this.children.forEach(child => {
			if (child.type == "underslantThenStraight") {
				this.group.add(child.descendingLine.group);
			} else {
				child.group ? this.group.add(child.group) : this.group.add(child);
			}
		});

		if (this.debug == true) {
			var originLabel = draw.text('O').cx(0).cy(-11).fill('silver').addClass(`word-${this.text}-origin`)
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
	addUnderslant(options) {
		const attachPoint = this.getAttachPoint();
		const newWord = new Word({
			type: 'underslant',
			origin: attachPoint,
			text: options.text,
			label: options.label,
			direction: options.direction,
			debug: options.debug,
			parent: this,
		});
		this.children.push(newWord);
		this.descenders.push(newWord);
		this.recursiveRender(newWord);
		return newWord;
	}

	addUnderstraight(options) {
		const attachPoint = this.getAttachPoint();
		const downLineEndpoint = new Point(attachPoint.x, attachPoint.y + 30)
		const downLine = draw.line(...attachPoint.xy, ...downLineEndpoint.xy).stroke(lineStyle);
		const newWord = new Word({
			origin: downLineEndpoint,
			text: options.text,
			label: options.label,
			direction: options.direction,
			debug: options.debug,
			parent: this,
		});
		this.children.push(downLine);
		this.children.push(newWord);
		this.descenders.push(newWord);
		this.recursiveRender(newWord);
		return newWord;
	}

	addUnderslantThenStraight(options) {
		const newWord = new Word({
			type: 'underslantThenStraight',
			origin: this.getAttachPoint(),
			text: options.text,
			label: options.label,
			direction: options.direction,
			debug: options.debug,
			parent: this,
		});
		this.children.push(newWord);
		this.descenders.push(newWord);
		this.recursiveRender(newWord);
		return newWord;
	}

	addStairstep(options) {
		const downLineEndpoint = new Point(this.baselineEndpoint.x, this.baselineEndpoint.y + 30)
		const downLine = draw.line(...this.baselineEndpoint.xy, ...downLineEndpoint.xy).stroke(lineStyle);
		const newWord = new Word({
			type: 'stairstep',
			origin: downLineEndpoint,
			text: options.text,
			label: options.label,
			direction: options.direction,
			debug: options.debug,
			parent: this,
		});
		this.children.push(newWord);
		this.children.push(downLine);
		this.recursiveRender(newWord);
		return newWord;
	}

	// For objects of prepositions
	addPhrase(options) {
		this.hasAttachedPhrase = true;
		return this.addUnderslant(options);
	}
}

class Clause {
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
		this.sentenceDividerX = this.proceedInSentenceDirection(this.origin.x, this.subject.baselineLength);
		let startY = this.origin.y - 30;
		let endY = this.origin.y + 20;
		const subjectVerbDivider = draw.line(
			this.sentenceDividerX, startY, 
			this.sentenceDividerX, endY
		).stroke(lineStyle);
		return subjectVerbDivider;
	}

}

const saveAs = draw; // so we can do saveAs.svg()

export { Point, Word, Clause, saveAs, rightOrLeft };
