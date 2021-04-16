import fs from 'fs';
import convert from 'xml-js';
import isRTL from './is-rtl.js';
import { Word, Clause, rightOrLeft } from './draw.js';

const preferEnglish = true;
const textAttr = preferEnglish ? "englishText" : "hebrewText";

export default function(filePath) {
	const xml = fs.readFileSync(filePath).toString();
	const input = convert.xml2js(xml);
	const json = convert.xml2json(xml, { compact: false, spaces: 2});
	fs.writeFileSync('diagram.json', json); // write JSON file to disk for ease of debugging

	if (!(input.elements && input.elements[0] && input.elements[0].name === "GrammaticalDiagram")) throw new Error("Invalid XML file. Must have <GrammaticalDiagram> as top-level tag.");
	const grammaticalDiagramTagObj = input.elements[0];

	const baselines = grammaticalDiagramTagObj.elements.map(baselineTag => { parseBaseline(baselineTag, null) });
	return baselines;
}

function parseTag(tag, parentDiagram) {
	if (tag.name == "BaselineGroup") {
		return parseBaselineGroup(tag);
	} else if (tag.name == "Baseline") {
		return parseBaseline(tag, parentDiagram);
	}
	if (!tag || !tag.attributes || !tag.attributes[textAttr]) debugger;
	var text = tag.attributes[textAttr];
	if (!text) throw new Error(`Text not found for tag ${tag.name}`)
	var label = tag.attributes.label || tag.name.toLowerCase();

	if (tag.name == "Underslant") {
		var direction = tag.attributes.direction || rightOrLeft(parentDiagram, () => "downRight", () => "downLeft");
		var diagrammedTag = parentDiagram.addUnderslant({ text, label, direction });
	} else throw new Error("Don't recognize tag named" + tag.name + ".");

	// recursively parse tag's children
	tag.elements?.forEach(childTag => { parseTag(childTag, diagrammedTag)});

	return diagrammedTag;
}

function parseBaselineGroup(baselineGroup) {
	if (baselineGroup.elements.length == 1) {
		parseBaseline(baselineGroup.elements[0], null);
	}
}
function parseBaseline(baselineTag, parentDiagram) {
	const subjectTag = baselineTag.elements.find(element => element.name === "Subject");
	const subjectText = subjectTag?.attributes[textAttr] || "";
	const verbTag = baselineTag.elements.find(element => element.name === "Verb");
	const verbText = verbTag?.attributes[textAttr] || "";
	const wordTag = baselineTag.elements.find(element => element.name === "Word");
	const wordText = wordTag?.attributes[textAttr] || "";
	const wordLabel = wordTag?.attributes?.label || "";

	var direction = baselineTag.elements?.attributes?.direction;
	if (!direction) direction = (isRTL(subjectText) || isRTL(verbText)) ? "left" : "right";

	let diagram;
	if (subjectTag && verbTag) {
		diagram = new Clause({
			subject: subjectText,
			verb: verbText,
			direction: direction
		});

		subjectTag.elements.forEach(elementTag => { parseTag(elementTag, diagram.subject) });
		verbTag.elements.forEach(elementTag => { parseTag(elementTag, diagram.verb) });
	} else if (wordTag) {
		diagram = parentDiagram.addPhrase({
			origin: parentDiagram.origin,
			text: wordText,
			label: wordLabel,
			direction,
			parent: parentDiagram
		});

		wordTag.elements.forEach(elementTag => { parseTag(elementTag, diagram)});
	}
	return diagram;
}