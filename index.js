
import { Point, Sentence, saveAs } from './draw.js';
import fs from 'fs';

const xml = fs.readFileSync('./grammatical-diagram.xml').toString();

console.log(xml);

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
});
var prepPhrase = preposition.addPhrase({
	text: "dog",
	label: "noun",
	direction: "right",
});
prepPhrase.addSlantedModifier({
	text: "the",
	label: "article",
	direction: "downRight"
});
prepPhrase.addSlantedModifier({
	text: "lazy",
	label: "adjective",
	direction: "downRight"
});

// var rtlSentence = new Sentence({
// 	subject: "fox",
// 	verb: "jumps",
// 	direction: "left",
// 	origin: new Point(500, 250)
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
// 	text: "fox",
// 	label: "noun",
// 	direction: "right"
// })
// subject.addSlantedModifier({
// 	text: "lazy",
// 	label: "adjective",
// 	direction: "downRight"
// })

const svgString = saveAs.svg();
fs.writeFileSync('diagram.svg', svgString);