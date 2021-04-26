import fs from 'fs';
import convert from 'xml-js';
import isRTL from './is-rtl.js';
import { Point, Word, Clause, rightOrLeft } from './draw.js';

const preferEnglish = true;
const textAttr = preferEnglish ? "gloss" : "word";

export default function(filePath) {
	const xml = fs.readFileSync(filePath).toString();
	const input = convert.xml2js(xml);
	const json = convert.xml2json(xml, { compact: false, spaces: 2});
	fs.writeFileSync('diagram.json', json); // write JSON file to disk for ease of debugging

	if (!(input.elements && input.elements[0] && tagNameMatches(input.elements[0], "GrammaticalDiagram"))) throw new Error("Invalid XML file. Must have <GrammaticalDiagram> as top-level tag.");
	const grammaticalDiagramTagObj = input.elements[0];

	const baselines = grammaticalDiagramTagObj.elements.map(baselineTag => { parseTag(baselineTag, null) });
	return baselines;
}

/**
 * Checks whether a tag's name can be found in a list of names
 * @param {object} tag XML tag with a "name" property
 * @param  {...string} names One or more strings to check the name against
 * @returns {boolean}
 */
function tagNameMatches(tag, ...names) {
	return names.some(name => {
		return lowercaseFirstLetter(tag.name) === lowercaseFirstLetter(name);
	});
}
function lowercaseFirstLetter(string) {
	return string[0].toLowerCase() + string.substr(1);
}

function parseTag(tag, parentDiagram) {
	if (tagNameMatches(tag, "BaselineGroup")) {
		return parseBaselineGroup(tag);
	} else if (tagNameMatches(tag, "Baseline")) {
		return parseBaseline(tag, parentDiagram);
	}

	if (tag.attributes) {
		// tag may have text on it
		var text = tag.attributes[textAttr];
		var label = tag.attributes.label || tag.name.toLowerCase();
		var defaultOrigin = new Point(10, 40);
		var diagrammedTag, direction;
		if (tagNameMatches(tag, "Word", "Subject", "Verb")) {
			direction = tag.attributes.direction || rightOrLeft(parentDiagram, "right", "left");
			diagrammedTag = new Word({ origin: defaultOrigin, text, label, direction });
		} else if (tagNameMatches(tag, "Underslant")) {
			direction = tag.attributes.direction || rightOrLeft(parentDiagram, "downRight", "downLeft");
			diagrammedTag = parentDiagram.addUnderslant({ text, label, direction });
		} else if (tagNameMatches(tag, "UnderslantThenStraight")) {
			direction = tag.attributes.direction || rightOrLeft(parentDiagram, "right", "left");
			diagrammedTag = parentDiagram.addUnderslantThenStraight({ origin: defaultOrigin, text, label, direction });
		} else if (tagNameMatches(tag, "Stairstep")) {
			direction = tag.attributes.direction || rightOrLeft(parentDiagram, "right", "left");
			diagrammedTag = parentDiagram.addStairstep({ origin: defaultOrigin, text, label, direction });
		} else throw new Error("Don't recognize tag named " + tag.name + ".");
	} else {
		// tag has no text
		if (tagNameMatches(tag, "Baseline")) {
			diagrammedTag = new Word({
				origin: defaultOrigin,
				text: "",
				label: "",
				direction: preferEnglish ? "right" : "left"
			});
		} else throw new Error("Unrecognized empty tag named " + tag.name);
	}

	// recursively parse tag's children
	tag.elements?.forEach(childTag => { parseTag(childTag, diagrammedTag)});

	return diagrammedTag;
}

function getTagText(tag) {
	if (tag?.attributes && tag.attributes[textAttr]) {
		return tag.attributes[textAttr];
	} else {
		return "";
	}
}

function parseBaselineGroup(baselineGroup) {
	if (baselineGroup.elements.length == 1) {
		return parseBaseline(baselineGroup.elements[0], null);
	}
}
function parseBaseline(baselineTag, parentDiagram) {
	const subjectSlotTag = baselineTag.elements.find(element => element.name === "SubjectSlot");
	const subjectText = getTagText(subjectSlotTag);
	const verbSlotTag = baselineTag.elements.find(element => element.name === "VerbSlot");
	const verbText = getTagText(verbSlotTag);
	const wordTag = baselineTag.elements.find(element => element.name === "Word");
	const wordText = wordTag?.attributes[textAttr] || "";
	const wordLabel = wordTag?.attributes?.label || "";

	var direction = baselineTag.elements?.attributes?.direction;
	if (!direction) direction = (isRTL(subjectText) || isRTL(verbText)) ? "left" : "right";

	let diagram;
	if (subjectSlotTag && verbSlotTag) {
		diagram = new Clause({
			subject: subjectText,
			verb: verbText,
			direction: direction
		});

		subjectSlotTag.elements.forEach(elementTag => { parseTag(elementTag, diagram.subject) });
		verbSlotTag.elements.forEach(elementTag => { parseTag(elementTag, diagram.verb) });
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