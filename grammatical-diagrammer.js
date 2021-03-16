const darkMode = true;
const canvasSize = [500, 300];
const lineStyle = { width: 3, color: darkMode ? "white" : "black" };
const textFont = { size: 24, fill: darkMode ? "black" : "white"};
const labelFont = { size: 24, fill: "blue" };
const descenderOffset = 24; // distance between descender attachment points

var draw = SVG().addTo('#canvas').size(...canvasSize);

if (darkMode) {
	// draw.rect(...canvasSize).attr({ fill: "black" });
}

/**
 * 
 * @param {Object} options
 * @param {Point} options.origin
 * @param {string} options.text
 * @param {string} options.label
 * @param {string} options.direction One of "left", "right", "downLeft", "downRight"
 * @returns {Word}
 */
class Word {
	constructor(options) {
		this.origin = options.origin;
		this.text = options.text;
		this.label = options.label;
		this.direction = options.direction;

		this.group = draw.group();
		this.wordSvg = this.createWordSvg();
		this.length = this.calcLength();
		this.lineEndpoint = this.calcLineEndpoint();
		this.line = this.createLine();
		this.attachments = [];

		this.group.add(this.line);
		this.group.add(this.wordSvg);

		this.transformGroup();
	}
	createLine() {
		return draw.line(
			0, 0,
			this.lineEndpoint.x, this.lineEndpoint.y
		).stroke(lineStyle);
	}
	createWordSvg() {
		return draw.text(this.text).attr({ x: 20, y: -38 }).font(textFont);
	}
	calcLength() {
		return this.wordSvg.length() + 40;
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
	 * 
	 * @param {Object} options 
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
		this.group.add(newWord.group);
		return newWord;
	}
}
/**
 * 
 * @param {number} x
 * @param {number} y
 * @returns {Point}
 */
class Point {
	constructor(x, y) {
		this.x = x;
		this.y = y;
	}
}

var fox = new Word({
	origin: new Point(100, 130),
	text: "fox",
	label: "subject",
	direction: "right"
});
var jumps = new Word({
	origin: new Point(150, 130),
	text: "jumps",
	label: "verb",
	direction: "right"
});
fox.addSlantedModifier({
	text: "quick",
	label: "article",
	direction: "downRight"
});

function clauseLines() {
	var horizLine = draw.line(0, 100, 500, 100).stroke(lineStyle);
	var vertLine = draw.line(250, 0, 250, 150).stroke(lineStyle);
}
// clauseLines();

// var fox = draw.text("fox").move(125, 70).font(textFont);
// var jumps = draw.text("jumps").move(250+125, 70).font(textFont);

// var nounLabel = draw.text("(noun)").move(150, 70).font(labelFont).addClass('label');
// var verbLabel = draw.text("(verb)").move(410, 70).font(labelFont).addClass('label');

function addDescendingModifier(xYcoords, wordStr, labelStr) {
	const [xStart, yStart] = xYcoords;
	const lineLength = 200;
	var line = draw.line(xStart, yStart, xStart+lineLength, yStart).stroke(lineStyle);
	var word = draw.text(wordStr).move(xStart+50, yStart-30).font(textFont);
	var labelOffset = wordStr.length * 8 + 50;
	var label = draw.text("("+labelStr+")").move(xStart+labelOffset, yStart-30).font(labelFont).addClass('label');
	var group = draw.group();
	group.add(word).add(label).add(line);
	group.transform({ rotate: 63, origin: "bottom left", translateX: 40 })
}
// addDescendingModifier([10, 100], "the", "article");
// addDescendingModifier([60, 100], "quick", "adjective");
// addDescendingModifier([110, 100], "brown", "adjective");

var url = "data:image/svg+xml,"+encodeURIComponent(draw.svg());
// @ts-ignore
document.getElementById('download-link').href = url;