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
assertMatches(
  /function beginPlanetTransition\(fromKey, toKey\) \{[\s\S]*planetTransition\.active = fromKey !== toKey;[\s\S]*planetTransition\.startedAt = clock\.getElapsedTime\(\);[\s\S]*bodyColorTo\.set\(bodyColors\);[\s\S]*ringColorTo\.set\(ringColors\);[\s\S]*bodyColors\.set\(bodyColorFrom\);[\s\S]*ringColors\.set\(ringColorFrom\);/,
  "transition begin snapshots target colors and restores visible source colors"
);
assertMatches(
  /function updatePlanetTransition\(time\) \{[\s\S]*planetTransition\.progress = progress;[\s\S]*planetTransition\.eased = THREE\.MathUtils\.smoothstep\(progress, 0, 1\);[\s\S]*planetTransition\.vortexWeight = Math\.sin\(progress \* Math\.PI\);[\s\S]*planetTransition\.colorMix = THREE\.MathUtils\.smoothstep\(progress, 0\.2, 0\.72\);/,
  "transition progress, vortex weight, and color mix"
);
assertMatches(
  /function animate\(\) \{[\s\S]*const time = clock\.getElapsedTime\(\);[\s\S]*const planet = PLANETS\[activePlanetKey\];\s*updatePlanetTransition\(time\);/,
  "transition loop update"
);
assertMatches(
  /function mixTransitionColors\(\) \{[\s\S]*mixColorBuffer\(bodyColors, bodyColorFrom, bodyColorTo, planetTransition\.colorMix\);[\s\S]*mixColorBuffer\(ringColors, ringColorFrom, ringColorTo, planetTransition\.colorMix\);/,
  "visible color interpolation"
);
assertMatches(
  /function snapPlanetTransition\(\) \{[\s\S]*planetTransition\.active = false;[\s\S]*planetTransition\.progress = 1;[\s\S]*bodyPositions\.set\(bodyTargets\);[\s\S]*ringPositions\.set\(ringTargets\);[\s\S]*bodyColors\.set\(bodyColorTo\);[\s\S]*ringColors\.set\(ringColorTo\);[\s\S]*bodyColorFrom\.set\(bodyColors\);[\s\S]*ringColorFrom\.set\(ringColors\);/,
  "transition completion snaps positions and colors"
);
assertMatches(
  /function switchPlanet\(key, immediate = false\) \{[\s\S]*const previousPlanetKey = activePlanetKey;[\s\S]*if \(!immediate && previousPlanetKey === key\) return;[\s\S]*const animateTransition = !immediate && bodyPoints && ringPoints && bodyColorFrom && bodyColorTo && ringColorFrom && ringColorTo;[\s\S]*if \(animateTransition\) \{[\s\S]*bodyColorFrom\.set\(bodyColors\);[\s\S]*ringColorFrom\.set\(ringColors\);[\s\S]*beginPlanetTransition\(previousPlanetKey, key\);/,
  "switchPlanet captures visible colors and starts transition"
);
assertMatches(
  /if \(!animateTransition\) \{[\s\S]*if \(bodyColorTo && ringColorTo\) \{[\s\S]*bodyColorTo\.set\(bodyColors\);[\s\S]*ringColorTo\.set\(ringColors\);[\s\S]*snapPlanetTransition\(\);[\s\S]*\}/,
  "non-animated switch snaps transition state"
);
assertMatches(
  /function switchStage\(stage, immediate = false\) \{[\s\S]*bodyColorTo\.set\(bodyColors\);[\s\S]*ringColorTo\.set\(ringColors\);[\s\S]*if \(immediate\) \{[\s\S]*snapPlanetTransition\(\);/,
  "immediate stage setup cancels transition"
);
assertMatches(
  /function moveBodyAttribute\(ease\) \{[\s\S]*const transitionActive = planetTransition\.active;[\s\S]*const vortexWeight = planetTransition\.vortexWeight;[\s\S]*const transitionSpin = planetTransition\.eased \* Math\.PI \* 1\.65;[\s\S]*const tiltSin = Math\.sin\(TRANSITION_VORTEX_TILT\);[\s\S]*targetX = THREE\.MathUtils\.lerp\(baseX, flatX, vortexWeight\);/,
  "body vortex target math"
);
assertMatches(
  /function moveRingAttribute\(ease\) \{[\s\S]*const transitionActive = planetTransition\.active;[\s\S]*const vortexWeight = planetTransition\.vortexWeight;[\s\S]*const transitionSpin = planetTransition\.eased \* Math\.PI \* 1\.45;[\s\S]*const tiltSin = Math\.sin\(TRANSITION_RING_TILT\);[\s\S]*targetX = THREE\.MathUtils\.lerp\(baseX, flatX, vortexWeight\);/,
  "ring vortex target math"
);

console.log("Solar system vortex transition source checks passed.");
