import { existsSync, readFileSync } from "node:fs";

const html = readFileSync("index.html", "utf8");
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));
const required = [
  "config.js",
  "multiplayer.js",
  "game.js",
  "manifest.webmanifest",
  "sw.js",
  "file_00000000d45c81f48ba3ab6d5282ec87.png",
  "server/worker.js",
  "server/wrangler.toml"
];

const missing = required.filter(path => !existsSync(path));
if (missing.length) {
  console.error("Missing SAVASH files:", missing.join(", "));
  process.exit(1);
}

for (const script of ["config.js", "multiplayer.js", "game.js"]) {
  if (!html.includes('src="./' + script + '"')) {
    console.error("index.html does not load " + script);
    process.exit(1);
  }
}

if (!packageJson.scripts || !packageJson.scripts.check) {
  console.error("package.json must define the check script.");
  process.exit(1);
}

console.log("SAVASH static assets and runtime script references are present.");
