// merge-json.js
//
// Usage:
// node merge-json.js
//
// Folder structure:
// .
// ├─ output/
// │   ├─ uni1A01_stroke1.json
// │   ├─ uni1A01_stroke2.json
// │   ├─ uni1A01_stroke3.json
// │   └─ ...
//
// Result:
// output/all.json
//
// This script:
// - merges ALL stroke JSON files
// - combines strokes + medians
// - sorts by stroke number
// - outputs ONE character object
//
// Example:
// uni1A01_stroke1.json
// uni1A01_stroke2.json
// uni1A01_stroke3.json
//
// becomes:
//
// {
//   "character": "uni1A01",
//   "width": 1024,
//   "height": 1024,
//   "strokes": [...],
//   "medians": [...]
// }

const fs = require("fs");
const path = require("path");

const INPUT_DIR = "./output";

const files = fs.readdirSync(INPUT_DIR)
  .filter(f =>
    f.toLowerCase().endsWith(".json") &&
    f !== "all.json"
  )
  .sort((a, b) => {

    const aMatch = a.match(/_stroke(\d+)/i);
    const bMatch = b.match(/_stroke(\d+)/i);

    const aNum = aMatch
      ? parseInt(aMatch[1])
      : 0;

    const bNum = bMatch
      ? parseInt(bMatch[1])
      : 0;

    return aNum - bNum;
  });

if (files.length === 0) {
  console.log("No JSON files found.");
  process.exit(1);
}

const merged = {
  character: "",
  width: 1024,
  height: 1024,
  strokes: [],
  medians: []
};

for (const file of files) {

  const fullPath = path.join(INPUT_DIR, file);

  const data = JSON.parse(
    fs.readFileSync(fullPath, "utf8")
  );

  // remove _strokeX suffix
  const baseName = data.character.replace(
    /_stroke\d+$/i,
    ""
  );

  merged.character = baseName;

  merged.width = data.width;
  merged.height = data.height;

  // merge strokes
  if (Array.isArray(data.strokes)) {
    merged.strokes.push(...data.strokes);
  }

  // merge medians
  if (Array.isArray(data.medians)) {
    merged.medians.push(...data.medians);
  }

  console.log(`Merged ${file}`);
}

// save all.json
const outputPath = path.join(
  INPUT_DIR,
  "all.json"
);

fs.writeFileSync(
  outputPath,
  JSON.stringify(merged, null, 2),
  "utf8"
);

console.log(`\nSaved ${outputPath}`);