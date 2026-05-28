// convert-to-hanzi.js
//
// Usage:
// node convert-to-hanzi.js
//
// Install:
// npm install svg-path-properties
//
// Folder structure:
// .
// ├─ medians/
// │   ├─ uni1A01_stroke1.svg
// │   ├─ uni1A01_stroke2.svg
// │   └─ ...
// ├─ strokes/
// │   ├─ uni1A01_stroke1.svg
// │   ├─ uni1A01_stroke2.svg
// │   └─ ...
// └─ output/
//
// Output:
// - Individual JSON per stroke file
// - ALL merged characters into:
//   output/all.json

const fs = require("fs");
const path = require("path");
const { svgPathProperties } = require("svg-path-properties");

const STROKE_DIR = "./strokes";
const MEDIAN_DIR = "./medians";
const OUTPUT_DIR = "./output";

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR);
}

/**
 * Extract all path d="" from SVG
 */
function extractPaths(svgText) {

  const items = [];

  // PATHS
  const pathRegex =
    /<path[^>]*?\sd=['"]([^'"]+)['"][^>]*>/gi;

  let match;

  while ((match = pathRegex.exec(svgText)) !== null) {
    items.push({
      type: "path",
      d: match[1]
    });
  }

  // LINES
  const lineRegex =
    /<line[^>]*x1=['"]([^'"]+)['"][^>]*y1=['"]([^'"]+)['"][^>]*x2=['"]([^'"]+)['"][^>]*y2=['"]([^'"]+)['"][^>]*>/gi;

  while ((match = lineRegex.exec(svgText)) !== null) {

    items.push({
      type: "line",
      x1: parseFloat(match[1]),
      y1: parseFloat(match[2]),
      x2: parseFloat(match[3]),
      y2: parseFloat(match[4])
    });
  }

  return items;
}

/**
 * Extract SVG width & height
 */
function extractSVGSize(svgText) {

  // try viewBox first
  const viewBoxMatch = svgText.match(
    /viewBox=["']([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)["']/i
  );

  if (viewBoxMatch) {
    return {
      width: Math.round(parseFloat(viewBoxMatch[3])),
      height: Math.round(parseFloat(viewBoxMatch[4]))
    };
  }

  // fallback to width / height attributes
  const widthMatch = svgText.match(/width=["']([\d.]+)["']/i);
  const heightMatch = svgText.match(/height=["']([\d.]+)["']/i);

  return {
    width: widthMatch
      ? Math.round(parseFloat(widthMatch[1]))
      : 1024,

    height: heightMatch
      ? Math.round(parseFloat(heightMatch[1]))
      : 1024
  };
}

/**
 * Sample median points
 */
function sampleMedian(pathD, step = 8) {

  try {

    const props = new svgPathProperties(pathD);

    const length = props.getTotalLength();

    const points = [];

    for (let i = 0; i <= length; i += step) {

      const pt = props.getPointAtLength(i);

      points.push([
        Math.round(pt.x * 100) / 100,
        Math.round(pt.y * 100) / 100
      ]);
    }

    // include final point
    const end = props.getPointAtLength(length);

    points.push([
      Math.round(end.x * 100) / 100,
      Math.round(end.y * 100) / 100
    ]);

    return points;

  } catch (err) {

    console.log("Invalid median path");

    return [];
  }
}

/**
 * Convert one stroke SVG
 */
function convertCharacter(filename) {

  const strokePath = path.join(STROKE_DIR, filename);

  const medianPath = path.join(MEDIAN_DIR, filename);

  if (!fs.existsSync(medianPath)) {

    console.log(`Missing median for ${filename}`);

    return null;
  }

  const strokeSVG = fs.readFileSync(
    strokePath,
    "utf8"
  );

  const medianSVG = fs.readFileSync(
    medianPath,
    "utf8"
  );

  const size = extractSVGSize(strokeSVG);

  const strokePaths = extractPaths(strokeSVG)
    .filter(x => x.type === "path")
    .map(x => x.d);

  const medianPaths = extractPaths(medianSVG);

  console.log(`\n=== ${filename} ===`);

  console.log("Stroke paths:", strokePaths.length);

  console.log("Median paths:", medianPaths.length);

  const medians = medianPaths.map(item => {

    // SVG path
    if (item.type === "path") {
      return sampleMedian(item.d);
    }

    // SVG line
    if (item.type === "line") {
      return [
        [item.x1, item.y1],
        [item.x2, item.y2]
      ];
    }

    return [];
  });

  const charName = path.parse(filename).name;

  const hanziData = {
    character: charName,
    width: size.width,
    height: size.height,
    strokes: strokePaths,
    medians
  };

  // save individual file
  const outputPath = path.join(
    OUTPUT_DIR,
    `${charName}.json`
  );

  fs.writeFileSync(
    outputPath,
    JSON.stringify(hanziData, null, 2),
    "utf8"
  );

  console.log(`Saved ${outputPath}`);

  return [charName, hanziData];
}

/**
 * Main
 */
function main() {

  const files = fs.readdirSync(STROKE_DIR)
    .filter(f => f.toLowerCase().endsWith(".svg"));

  // final merged output
  const merged = [];

  // temp character storage
  const characters = {};

  for (const file of files) {

    try {

      const result = convertCharacter(file);

      if (!result) continue;

      const [charName, data] = result;

      /**
       * Convert:
       * uni1A01_stroke1
       * uni1A01_stroke2
       * uni1A01_stroke3
       *
       * into:
       * uni1A01
       */
      const baseName = charName.replace(
        /_stroke\d+$/i,
        ""
      );

      // create merged character
      if (!characters[baseName]) {

        characters[baseName] = {
          character: baseName,
          width: data.width,
          height: data.height,
          strokes: [],
          medians: []
        };
      }

      // merge strokes
      characters[baseName].strokes.push(
        ...data.strokes
      );

      // merge medians
      characters[baseName].medians.push(
        ...data.medians
      );

    } catch (err) {

      console.error(`Failed ${file}`);

      console.error(err);
    }
  }

  // save all merged characters WITHOUT outer []
  const mergedPath = path.join(
    OUTPUT_DIR,
    "all.json"
  );

  // if only 1 character exists,
  // save directly as object instead of array
  const firstCharacter =
    Object.values(characters)[0];

  fs.writeFileSync(
    mergedPath,
    JSON.stringify(firstCharacter, null, 2),
    "utf8"
  );

  console.log(`\nSaved merged JSON: ${mergedPath}`);

  console.log("\nDone");
}

main();