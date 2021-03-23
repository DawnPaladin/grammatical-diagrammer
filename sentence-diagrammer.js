const darkMode = true;
const foregroundColor = darkMode ? "white" : "black";
const canvasSize = [500, 300];
const lineStyle = { width: 3, color: foregroundColor };
const textFont = { size: 24, fill: foregroundColor };
const labelFont = { size: 24, fill: "blue" };
const descenderOffset = 45; // distance between descender attachment points

var draw = SVG().addTo('#canvas').size(...canvasSize);

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

class Word {
	/**
	 * @param {object} options
	 * @param {Point} options.origin For LTR words this will be the left edge; for RTL words it will be the right edge.
	 * @param {string} options.text
	 * @param {string} options.label
	 * @param {string} options.direction One of "left", "right", "downLeft", "downRight"
	 * @param {object} [options.parent]
	 */
	constructor(options) {
		this.origin = options.origin;
		this.text = options.text;
		this.label = options.label;
		this.direction = options.direction;
		this.parent = options.parent;

		this.group = draw.group();
		this.attachments = [];
		this.descenders = [];
		this.debug = false;

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
		var attributes = {};
		if (this.direction == "right") {
			attributes = {
				x: 20, y: -38,
				direction: "ltr"
			}
		} else if (this.direction == "left") {
			attributes = {
				x: -20, y: -38,
				direction: "rtl"
			}
		} else throw new Error("Invalid sentence direction " + this.direction); // TODO: Add diagonal word directionalities
		return draw.text(this.text).attr(attributes).font(textFont);
	}
	calcLength() {
		var extraSpaceForDescenders = 0;
		if (this.descenders.length > 1) {
			extraSpaceForDescenders = (this.descenders.length - 1) * 50;
		}
		return this.wordSvg.length() + 40 + extraSpaceForDescenders;
	}
	calcLineEndpoint() {
		var x;
		switch (this.direction) {
			case 'left':
			case 'downLeft':
				x = 0 - this.length;
				break;
			case 'right':
			case 'downRight':
				x = 0 + this.length;
				break;
			default:
				throw new Error("Can't calculate line endpoint - invalid direction");
		}
		var y = 0;
		return new Point(x, y);
	}
	transformGroup() {
		let transformation = { translateX: this.origin.x, translateY: this.origin.y };
		if (this.direction == "downRight") transformation = {...transformation, rotate: 60, origin: "bottom left" };
		if (this.direction == "downLeft" ) transformation = {...transformation, rotate: -60, origin: "top right" };
		this.group.transform(transformation);
	}
	newAttachment() {
		const attachPoint = new Point(20 + this.attachments.length * descenderOffset, 0);
		this.attachments.push(attachPoint);
		return attachPoint;
	}
	/**
	 * @param {object} options 
	 * @param {string} options.text
	 * @param {string} options.label
	 * @param {string} options.direction One of "left", "right", "downLeft", "downRight"
	 * @returns {Word}
	 */
	addSlantedModifier(options) {
		const attachPoint = this.newAttachment();
		const newWord = new Word({
			origin: attachPoint,
			text: options.text,
			label: options.label,
			direction: options.direction
		});
		this.descenders.push(newWord);
		this.render();
		this.parent?.render();
		
		return newWord;
	}
	render() {
		this.group.remove();
		this.group = draw.group();
		this.wordSvg = this.createWordSvg();
		this.line = this.createLine();

		this.group.add(this.line);
		this.group.add(this.wordSvg);

		this.transformGroup();

		this.descenders.forEach(descender => {
			this.group.add(descender.group)
		})

		if (this.debug == true) {
			var originLabel = draw.text('O').move(this.origin.x - 6, this.origin.y - 6).fill('silver')
		}
	}
}

class Sentence {
	/**
	 * @param {object} options 
	 * @param {string} options.subject
	 * @param {string} options.verb
	 * @param {string} options.direction Either "left" or "right", for LTR and RTL sentences respectively.
	 * @param {Point} [options.origin] Baseline of the text. For LTR sentences this will be at the text's left edge; for RTL sentences it will be at the right edge.
	 */
	constructor(options) {
		this.subjectText = options.subject;
		this.verbText = options.verb;
		this.direction = options.direction;
		this.origin = options.origin || new Point(10, 40);
		this.group = draw.group();
		this.sentenceDividerX = 0; // sentence divider distance from left edge
		this.debug = false;

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

		this.subjectVerbDivider = this.drawSubjectVerbDivider();
		this.verb.render();
		this.group.add(this.subject.group);
		this.group.add(this.subjectVerbDivider);
		this.group.add(this.verb.group);

		if (this.debug) {
			var originLabel = draw.text('O').move(this.origin.x - 6, this.origin.y - 6).fill('silver')
		}
	}

	/**
	 * Add two numbers if the sentence is LTR, otherwise subtract them.
	 * @param {number} a
	 * @param {number} b
	 */
	proceedInSentenceDirection(a, b) {
		if (this.direction == "right") {
			return a + b;
		} else if (this.direction == "left") {
			return a - b;
		} else {
			throw new Error("Invalid sentence direction " + this.direction);
		}
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

var rtlSentence = new Sentence({
	subject: "אַ֥שְֽׁרֵי",
	verb: "הָלַךְ֮",
	direction: "left",
	origin: new Point(200, 100)
});
// FIXME
// rtlSentence.subject.addSlantedModifier({
// 	text: "the",
// 	label: "article",
// 	direction: "downRight"
// })

// var test = new Sentence({
// 	subject: "fox",
// 	verb: "jumps",
// 	direction: "right",
// 	origin: new Point(100, 100)
// });
// test.subject.addSlantedModifier({
// 	text: "the",
// 	label: "article",
// 	direction: "downRight"
// });
// test.subject.addSlantedModifier({
// 	text: "quick",
// 	label: "adjective",
// 	direction: "downRight"
// });
// test.subject.addSlantedModifier({
// 	text: "brown",
// 	label: "adjective",
// 	direction: "downRight"
// });

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