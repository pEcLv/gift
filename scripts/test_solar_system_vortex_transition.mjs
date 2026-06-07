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

assertIncludes("const TRANSITION_DURATION = 1.1;", "vortex transition duration");
assertIncludes("const TRANSITION_VORTEX_TILT = -0.34;", "body vortex tilt");
assertIncludes("const TRANSITION_RING_TILT = -0.42;", "ring vortex tilt");
assertIncludes(
  "let bodyPositions, bodyTargets, bodyColors, bodyColorFrom, bodyColorTo, ringPositions, ringTargets, ringColors, ringColorFrom, ringColorTo;",
  "color transition buffer declarations"
);
assertMatches(
  /const planetTransition = \{\s*active: false,\s*startedAt: 0,\s*duration: TRANSITION_DURATION,\s*fromKey: "saturn",\s*toKey: "saturn",\s*progress: 1,\s*eased: 1,\s*vortexWeight: 0,\s*colorMix: 1\s*\};/,
  "planet transition controller"
);
assertIncludes("bodyColorFrom = new Float32Array(BODY_COUNT * 3);", "body source color buffer allocation");
assertIncludes("bodyColorTo = new Float32Array(BODY_COUNT * 3);", "body target color buffer allocation");
assertIncludes("ringColorFrom = new Float32Array(RING_COUNT * 3);", "ring source color buffer allocation");
assertIncludes("ringColorTo = new Float32Array(RING_COUNT * 3);", "ring target color buffer allocation");

console.log("Solar system vortex transition source checks passed.");
