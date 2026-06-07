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

function assertNotIncludes(needle, label) {
  if (html.includes(needle)) {
    throw new Error(`Unexpected ${label}: ${needle}`);
  }
}

function assertMatches(pattern, label) {
  if (!pattern.test(html)) {
    throw new Error(`Missing ${label}: ${pattern}`);
  }
}

assertNotIncludes('data-stage="tree">圣诞树</button>', "legacy tree stage tab");
assertIncludes('const defaultStage = "planet";', "planet-only default stage");
assertIncludes('if (stage !== "planet") return;', "stage guard blocks legacy tree mode");

assertMatches(
  /stageTitle\.textContent = "粒子太阳系";/,
  "solar system title stays planet-only"
);

assertMatches(
  /stageEyebrow\.textContent = "Particle Solar System";/,
  "solar system eyebrow stays planet-only"
);

console.log("Solar system planet-only source checks passed.");
