import fs from 'fs';
import convert from 'xml-js';

const xml = fs.readFileSync('./grammatical-diagram.xml').toString();
// console.log(xml);

const input = convert.xml2js(xml);

const clauseObj = input.elements[0].elements[0];
// const json = JSON.stringify(clauseObj);
// console.log(json);

