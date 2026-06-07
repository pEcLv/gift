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

assertIncludes("const COMET_PARTICLE_COUNT = 4200;", "comet particle budget");
assertIncludes("const COMET_STREAMER_COUNT = 900;", "comet streamer budget");
assertMatches(/function setupComet\(\) \{[\s\S]*scene\.add\(cometGroup\);/, "comet group added to the main scene");
assertMatches(/setupNebula\(\);\s*setupComet\(\);\s*setupCompanionPlanets\(\);/, "comet setup is wired into initialization");
assertMatches(/function updateComet\(time, delta\) \{[\s\S]*cometGroup\.visible = activeStage === "planet";/, "comet visibility follows the planet stage");
assertMatches(/updateComet\(time, delta\);/, "comet update is wired into the animation loop");
assertMatches(/new THREE\.PointsMaterial\(\{[\s\S]*vertexColors: true,[\s\S]*blending: THREE\.AdditiveBlending/, "comet tail keeps colored additive particles");

console.log("Solar system comet integration source checks passed.");
