var draw = SVG().addTo('#canvas').size(500,300);

const lineStyle = { width: 3, color: "black" };
const textFont = { size: 24, anchor: "middle" };
const labelFont = { size: 24, fill: "blue" };

function clauseLines() {
	var horizLine = draw.line(0, 100, 500, 100).stroke(lineStyle);
	var vertLine = draw.line(250, 0, 250, 150).stroke(lineStyle);
}
clauseLines();

var fox = draw.text("fox").move(125, 70).font(textFont);
var jumps = draw.text("jumps").move(250+125, 70).font(textFont);

var nounLabel = draw.text("(noun)").move(150, 70).font(labelFont).addClass('label');
var verbLabel = draw.text("(verb)").move(410, 70).font(labelFont).addClass('label');

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
addDescendingModifier([10, 100], "the", "article");
addDescendingModifier([60, 100], "quick", "adjective");
addDescendingModifier([110, 100], "brown", "adjective");

var url = "data:image/svg+xml,"+encodeURIComponent(draw.svg());
document.getElementById('download-link').href = url;