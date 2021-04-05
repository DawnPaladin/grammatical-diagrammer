import fs from 'fs';
import convert from 'xml-js';
import isRTL from './is-rtl.js';
import { Word, Clause, rightOrLeft } from './draw.js';

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

function parseTag(tag, parent) {
	var direction = tag.attributes.direction || rightOrLeft(parent, () => "downRight", () => "downLeft");
	return parent.addSlantedModifier({
		text: tag.attributes.word,
		label: tag.attributes.label || tag.name,
		direction
	})
}