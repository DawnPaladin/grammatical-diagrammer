const darkMode = false;
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
	}
}

class Word {
	/**
	 * @param {object} options
	 * @param {Point} options.origin
	 * @param {string} options.text
	 * @param {string} options.label
	 * @param {string} options.direction One of "left", "right", "downLeft", "downRight"
	 */
	constructor(options) {
		this.origin = options.origin;
		this.text = options.text;
		this.label = options.label;
		this.direction = options.direction;

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
			this.lineEndpoint.x, this.lineEndpoint.y
		).stroke(lineStyle);
	}
	createWordSvg() {
		return draw.text(this.text).attr({ x: 20, y: -38 }).font(textFont);
	}
	calcLength() {
		var extraSpaceForDescenders = 0;
		if (this.descenders.length > 1) {
			extraSpaceForDescenders = (this.descenders.length - 1) * 40;
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

		// reset attachpoints
		this.attachments = [];
		// add descender groups to parent group
		this.descenders.forEach(descender => {
			const attachPoint = this.newAttachment();
			this.group.add(descender.group)
		})
	}
}

class Sentence {
	/**
	 * @param {object} options 
	 * @param {string} options.subject
	 * @param {string} options.verb
	 * @param {string} options.direction
	 * @param {Point} [options.origin]
	 */
	constructor(options) {
		this.subjectText = options.subject;
		this.verbText = options.verb;
		this.direction = options.direction;
		this.origin = options.origin || new Point(10, 40);

		this.group = draw.group();
		this.subject = new Word({
			origin: this.origin,
			text: this.subjectText,
			label: "subject",
			direction: this.direction
		});
		var subjectVerbDivider = this.drawSubjectVerbDivider();
		this.verb = new Word({
			origin: new Point(this.proceedInSentenceDirection(this.origin.x, this.subject.group.width()), this.origin.y),
			text: this.verbText,
			label: "verb",
			direction: this.direction
		})
		this.group.add(this.subject.group);
		this.group.add(subjectVerbDivider);
		this.group.add(this.verb.group);
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
		let x = this.proceedInSentenceDirection(this.origin.x, this.subject.group.width());
		let startY = this.origin.y - 30;
		let endY = this.origin.y + 20;
		const subjectVerbDivider = draw.line(x, startY, x, endY).stroke(lineStyle);
		return subjectVerbDivider;
	}

}

var test = new Sentence({
	subject: "fox",
	verb: "jumps",
	direction: "right",
});
test.subject.addSlantedModifier({
	text: "the",
	label: "article",
	direction: "downRight"
});
test.subject.addSlantedModifier({
	text: "quick",
	label: "adjective",
	direction: "downRight"
});


var url = "data:image/svg+xml,"+encodeURIComponent(draw.svg());
// @ts-ignore
document.getElementById('download-link').href = url;