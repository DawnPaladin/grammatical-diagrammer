import fs from 'fs';
import convert from 'xml-js';
import isRTL from './is-rtl.js';
import { Word, Clause, rightOrLeft } from './draw.js';

const slantedModifiers = ["article", "adjective", "adverb", "preposition"];
const horizontals = ["phrase"];

export default function(filePath) {
	const xml = fs.readFileSync(filePath).toString();
	const input = convert.xml2js(xml);

	if (!(input.elements && input.elements[0] && input.elements[0].name === "GrammaticalDiagram")) throw new Error("Invalid XML file. Must have <GrammaticalDiagram> as top-level tag.");
	const grammaticalDiagramTagObj = input.elements[0];

	const clauseDiagrams = grammaticalDiagramTagObj.elements.map(clauseTagObj => {
		const subjectObj = clauseTagObj.elements.find(element => element.name === "Subject");
		const subjectText = subjectObj?.attributes?.word || "";
		const verbObj = clauseTagObj.elements.find(element => element.name === "Verb");
		const verbText = verbObj?.attributes?.word || "";

		var clauseDirection = clauseTagObj.elements?.attributes?.direction;
		if (!clauseDirection) clauseDirection = (isRTL(subjectText) || isRTL(verbText)) ? "left" : "right";

		const diagram = new Clause({
			subject: subjectText,
			verb: verbText,
			direction: clauseDirection
		});

		subjectObj.elements.forEach(elementObj => { parseTag(elementObj, diagram.subject)});
		verbObj.elements.forEach(elementObj => { parseTag(elementObj, diagram.verb)});
		return diagram;
	});
	return clauseDiagrams;
}

function parseTag(tag, parentDiagram) {
	var text = tag.attributes.word;
	var label = tag.attributes.label || tag.name.toLowerCase();

	if (slantedModifiers.includes(tag.name.toLowerCase())) {
		var direction = tag.attributes.direction || rightOrLeft(parentDiagram, () => "downRight", () => "downLeft");
		var diagrammedTag = parentDiagram.addSlantedModifier({ text, label, direction });
	} else if (horizontals.includes(tag.name.toLowerCase())) {
		var direction = tag.attributes.direction || rightOrLeft(parentDiagram, () => "right", () => "left");
		var diagrammedTag = parentDiagram.addPhrase({ text, label, direction });
	} else throw new Error("Don't know what direction to draw tag named" + tag.name + ". Add it to slantedModifiers or horizontals at the top of parse-xml.js.");

	// recursively parse tag's children
	tag.elements?.forEach(childTag => { parseTag(childTag, diagrammedTag)});

	return diagrammedTag;
}