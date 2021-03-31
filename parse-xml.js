import fs from 'fs';
import convert from 'xml-js';
import isRTL from './is-rtl.js';

export default function(filePath) {
	const xml = fs.readFileSync(filePath).toString();
	const input = convert.xml2js(xml);

	if (!(input.elements && input.elements[0] && input.elements[0].name === "GrammaticalDiagram")) throw new Error("Invalid XML file. Must have <GrammaticalDiagram> as top-level tag.");
	const grammaticalDiagramTagObj = input.elements[0];

	const clauses = grammaticalDiagramTagObj.elements.map(clauseTagObj => {
		const subjectObj = clauseTagObj.elements.find(element => element.name === "Subject");
		const subjectText = subjectObj?.attributes?.word || "";
		const verbObj = clauseTagObj.elements.find(element => element.name === "Verb");
		const verbText = verbObj?.attributes?.word || "";

		var clauseDirection = clauseTagObj.elements?.attributes?.direction;
		if (!clauseDirection) clauseDirection = (isRTL(subjectText) || isRTL(verbText)) ? "left" : "right";

		return {
			subject: subjectText,
			verb: verbText,
			direction: clauseDirection
		}
	});
	return clauses;
}
