var draw = SVG().addTo('#canvas').size(500,500);
// var rect = draw.rect(100,100).attr({ fill: '#f06' });

function basicSentence() {

}

const lineStyle = { width: 3, color: "black" };
const textFont = { size: 24, anchor: "middle" };
const labelFont = { size: 24, fill: "blue" };

var horizLine = draw.line(0, 100, 500, 100).stroke(lineStyle);
var vertLine = draw.line(250, 0, 250, 150).stroke(lineStyle);
var fox = draw.text("fox").move(125, 70).font(textFont);
var jumps = draw.text("jumps").move(250+125, 70).font(textFont);

var nounLabel = draw.text("(noun)").move(150, 70).font(labelFont).addClass('label');
var verbLabel = draw.text("(verb)").move(410, 70).font(labelFont).addClass('label');