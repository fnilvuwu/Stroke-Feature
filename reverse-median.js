// reverse-median.js
//
// Usage:
// node reverse-median.js input.json
//
// Example:
// node reverse-median.js output/all.json
//
// Result:
// Creates:
// output/all.reversed.json
//
// Reverses ALL median directions
// without changing strokes.

const fs = require("fs");
const path = require("path");

const inputFile = process.argv[2];

if (!inputFile) {
  console.log("Usage:");
  console.log("node reverse-median.js input.json");
  process.exit(1);
}

if (!fs.existsSync(inputFile)) {
  console.log("File not found:", inputFile);
  process.exit(1);
}

// load json
const data = JSON.parse(
  fs.readFileSync(inputFile, "utf8")
);

// reverse all medians
if (Array.isArray(data.medians)) {

  data.medians = data.medians.map(median => {

    if (!Array.isArray(median)) {
      return median;
    }

    return [...median].reverse();
  });
}

// output path
const parsed = path.parse(inputFile);

const outputFile = path.join(
  parsed.dir,
  parsed.name + ".reversed.json"
);

// save
fs.writeFileSync(
  outputFile,
  JSON.stringify(data, null, 2),
  "utf8"
);

console.log("Saved:", outputFile);