import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(resolve(__dirname, "../solar_system.html"), "utf8");

function assertIncludes(needle, label) {
  if (!html.includes(needle)) {
    throw new Error(`Missing ${label}: ${needle}`);
  }
}

function assertMatches(pattern, label) {
  if (!pattern.test(html)) {
    throw new Error(`Missing ${label}: ${pattern}`);
  }
}

assertIncludes("const SHOW_COMPANION_PLANETS = false;", "single-planet focus toggle");
assertIncludes(
  'companionGroup.visible = activeStage === "planet" && SHOW_COMPANION_PLANETS;',
  "companion group hidden while single-planet focus is enabled"
);
assertIncludes(
  'orbitLinesGroup.visible = activeStage === "planet" && SHOW_COMPANION_PLANETS;',
  "orrery sun and orbit guides hidden while single-planet focus is enabled"
);
assertMatches(
  /const hidden = activeStage !== "planet" \|\| !SHOW_COMPANION_PLANETS;/,
  "companion pivots stay hidden when companion planets are disabled"
);
assertMatches(
  /function pickCompanion\(event\) \{\s*if \(activeStage !== "planet" \|\| !SHOW_COMPANION_PLANETS\) return null;/,
  "hidden companion planets are not clickable"
);

console.log("Solar system single-planet focus source checks passed.");
