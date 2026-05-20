// build.js — zero-dependency build. Copies the manifest and src/ files into
// dist/, which is what you load as an unpacked extension. No bundler needed:
// the extension is plain ES5-compatible JS and static HTML/CSS.
"use strict";

const fs = require("fs");
const path = require("path");

const root = __dirname;
const dist = path.join(root, "dist");
const src = path.join(root, "src");

function rimraf(target) {
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
  }
}

function copyDirFlat(fromDir, toDir) {
  const entries = fs.readdirSync(fromDir, { withFileTypes: true });
  for (const entry of entries) {
    const from = path.join(fromDir, entry.name);
    if (entry.isDirectory()) {
      // Preserve nested dirs (e.g. icons/) rather than flattening them.
      const nested = path.join(toDir, entry.name);
      fs.mkdirSync(nested, { recursive: true });
      copyDirFlat(from, nested);
    } else {
      fs.copyFileSync(from, path.join(toDir, entry.name));
    }
  }
}

rimraf(dist);
fs.mkdirSync(dist, { recursive: true });

// Copy all source files (scripts, html, css, icons) to dist root.
copyDirFlat(src, dist);

// Copy the manifest.
fs.copyFileSync(path.join(root, "manifest.json"), path.join(dist, "manifest.json"));

// Report.
const files = fs.readdirSync(dist).sort();
console.log("Built extension into dist/:");
for (const f of files) console.log("  - " + f);
console.log("\nLoad dist/ as an unpacked extension in chrome://extensions or edge://extensions.");
