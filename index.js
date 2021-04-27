
import { Point, Clause, saveAs } from './draw.js';
import parseXML from './parse-xml.js';
import fs from 'fs';

var renderToDisk = function() {
	const svgString = saveAs.svg();
	fs.writeFileSync('diagram.svg', svgString);
}

const clauseDiagrams = parseXML('./grammatical-diagram.xml');

renderToDisk();