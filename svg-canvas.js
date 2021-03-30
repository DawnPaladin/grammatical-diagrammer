const canvasSize = [500, 500];

import { createSVGWindow } from 'svgdom';
const window = createSVGWindow();
const document = window.document;
import { SVG, registerWindow } from '@svgdotjs/svg.js';
registerWindow(window, document);
const draw = SVG(document.documentElement).size(...canvasSize);

export default draw;