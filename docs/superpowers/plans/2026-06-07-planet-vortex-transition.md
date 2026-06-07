# Planet Vortex Transition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a medium-strength vortex reconstruction animation when switching planets in the Three.js particle solar system.

**Architecture:** Keep the current single-file Three.js scene and existing particle buffers. Add a small transition controller, color source/destination buffers, and deterministic vortex offsets inside the existing per-frame body/ring movement functions.

**Tech Stack:** Static HTML, JavaScript modules, Three.js 0.160.0, Node.js source-level test scripts.

---

## File Structure

- Modify: `solar_system.html`
  - Add transition constants and controller state near current planet state.
  - Allocate color transition buffers inside `setupPlanetParticles()`.
  - Add transition lifecycle helpers near the planet switching helpers.
  - Hook `switchPlanet()` and `switchStage()` into the transition lifecycle.
  - Update `animate()`, `moveBodyAttribute()`, and `moveRingAttribute()` so transition state affects rendered positions and colors.
- Create: `scripts/test_solar_system_vortex_transition.mjs`
  - Source-level regression checks for transition state, lifecycle hooks, motion math, and immediate-switch behavior.

## Task 1: Add Transition State and Buffer Tests

**Files:**
- Create: `scripts/test_solar_system_vortex_transition.mjs`
- Modify: `solar_system.html`
- Test: `scripts/test_solar_system_vortex_transition.mjs`

- [ ] **Step 1: Write the failing test**

Create `scripts/test_solar_system_vortex_transition.mjs` with:

```js
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node scripts/test_solar_system_vortex_transition.mjs
```

Expected: FAIL with `Missing vortex transition duration`.

- [ ] **Step 3: Add transition constants and state**

In `solar_system.html`, add these constants after `const SHOW_COMPANION_PLANETS = false;`:

```js
const TRANSITION_DURATION = 1.1;
const TRANSITION_VORTEX_TILT = -0.34;
const TRANSITION_RING_TILT = -0.42;
```

Replace the existing particle buffer declaration:

```js
let bodyPositions, bodyTargets, bodyColors, ringPositions, ringTargets, ringColors;
```

with:

```js
let bodyPositions, bodyTargets, bodyColors, bodyColorFrom, bodyColorTo, ringPositions, ringTargets, ringColors, ringColorFrom, ringColorTo;
```

Add this controller after `let targetCoreOpacity = 0.62;`:

```js
const planetTransition = {
    active: false,
    startedAt: 0,
    duration: TRANSITION_DURATION,
    fromKey: "saturn",
    toKey: "saturn",
    progress: 1,
    eased: 1,
    vortexWeight: 0,
    colorMix: 1
};
```

- [ ] **Step 4: Allocate color transition buffers**

Inside `setupPlanetParticles()`, immediately after:

```js
bodyColors = new Float32Array(BODY_COUNT * 3);
```

add:

```js
bodyColorFrom = new Float32Array(BODY_COUNT * 3);
bodyColorTo = new Float32Array(BODY_COUNT * 3);
```

Inside `setupPlanetParticles()`, immediately after:

```js
ringColors = new Float32Array(RING_COUNT * 3);
```

add:

```js
ringColorFrom = new Float32Array(RING_COUNT * 3);
ringColorTo = new Float32Array(RING_COUNT * 3);
```

- [ ] **Step 5: Run the test to verify it passes**

Run:

```bash
node scripts/test_solar_system_vortex_transition.mjs
```

Expected: PASS with `Solar system vortex transition source checks passed.`

- [ ] **Step 6: Commit**

Run:

```bash
git add solar_system.html scripts/test_solar_system_vortex_transition.mjs
git commit -m "Add planet transition state"
```

Expected: commit succeeds with only `solar_system.html` and `scripts/test_solar_system_vortex_transition.mjs` staged.

## Task 2: Add Transition Lifecycle and Color Mixing

**Files:**
- Modify: `scripts/test_solar_system_vortex_transition.mjs`
- Modify: `solar_system.html`
- Test: `scripts/test_solar_system_vortex_transition.mjs`

- [ ] **Step 1: Extend the failing test**

In `scripts/test_solar_system_vortex_transition.mjs`, add these assertions before the final `console.log(...)`:

```js
assertMatches(
  /function beginPlanetTransition\(fromKey, toKey\) \{[\s\S]*planetTransition\.active = fromKey !== toKey;[\s\S]*planetTransition\.startedAt = clock\.getElapsedTime\(\);[\s\S]*bodyColorTo\.set\(bodyColors\);[\s\S]*ringColorTo\.set\(ringColors\);[\s\S]*bodyColors\.set\(bodyColorFrom\);[\s\S]*ringColors\.set\(ringColorFrom\);/,
  "transition begin snapshots target colors and restores visible source colors"
);
assertMatches(
  /function updatePlanetTransition\(time\) \{[\s\S]*planetTransition\.progress = progress;[\s\S]*planetTransition\.eased = THREE\.MathUtils\.smoothstep\(progress, 0, 1\);[\s\S]*planetTransition\.vortexWeight = Math\.sin\(progress \* Math\.PI\);[\s\S]*planetTransition\.colorMix = THREE\.MathUtils\.smoothstep\(progress, 0\.2, 0\.72\);/,
  "transition progress, vortex weight, and color mix"
);
assertMatches(
  /function mixTransitionColors\(\) \{[\s\S]*mixColorBuffer\(bodyColors, bodyColorFrom, bodyColorTo, planetTransition\.colorMix\);[\s\S]*mixColorBuffer\(ringColors, ringColorFrom, ringColorTo, planetTransition\.colorMix\);/,
  "visible color interpolation"
);
assertMatches(
  /function snapPlanetTransition\(\) \{[\s\S]*planetTransition\.active = false;[\s\S]*planetTransition\.progress = 1;[\s\S]*bodyPositions\.set\(bodyTargets\);[\s\S]*ringPositions\.set\(ringTargets\);[\s\S]*bodyColors\.set\(bodyColorTo\);[\s\S]*ringColors\.set\(ringColorTo\);/,
  "transition completion snaps positions and colors"
);
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node scripts/test_solar_system_vortex_transition.mjs
```

Expected: FAIL with `Missing transition begin snapshots target colors and restores visible source colors`.

- [ ] **Step 3: Add lifecycle helpers**

In `solar_system.html`, add these functions after `applyPlanetShellImmediate()` and before `updateReadout(...)`:

```js
function beginPlanetTransition(fromKey, toKey) {
    if (!bodyPoints || !ringPoints || !bodyColorFrom || !bodyColorTo || !ringColorFrom || !ringColorTo) return;

    planetTransition.active = fromKey !== toKey;
    planetTransition.startedAt = clock.getElapsedTime();
    planetTransition.fromKey = fromKey;
    planetTransition.toKey = toKey;
    planetTransition.progress = 0;
    planetTransition.eased = 0;
    planetTransition.vortexWeight = 0;
    planetTransition.colorMix = 0;

    bodyColorTo.set(bodyColors);
    ringColorTo.set(ringColors);
    bodyColors.set(bodyColorFrom);
    ringColors.set(ringColorFrom);

    bodyPoints.geometry.attributes.color.needsUpdate = true;
    ringPoints.geometry.attributes.color.needsUpdate = true;
}

function updatePlanetTransition(time) {
    if (!planetTransition.active) return;

    const progress = THREE.MathUtils.clamp((time - planetTransition.startedAt) / planetTransition.duration, 0, 1);
    planetTransition.progress = progress;
    planetTransition.eased = THREE.MathUtils.smoothstep(progress, 0, 1);
    planetTransition.vortexWeight = Math.sin(progress * Math.PI);
    planetTransition.colorMix = THREE.MathUtils.smoothstep(progress, 0.2, 0.72);

    mixTransitionColors();

    if (progress >= 1) {
        snapPlanetTransition();
    }
}

function mixTransitionColors() {
    if (!bodyColorFrom || !bodyColorTo || !ringColorFrom || !ringColorTo) return;

    mixColorBuffer(bodyColors, bodyColorFrom, bodyColorTo, planetTransition.colorMix);
    mixColorBuffer(ringColors, ringColorFrom, ringColorTo, planetTransition.colorMix);

    bodyPoints.geometry.attributes.color.needsUpdate = true;
    ringPoints.geometry.attributes.color.needsUpdate = true;
}

function mixColorBuffer(visible, from, to, amount) {
    for (let i = 0; i < visible.length; i++) {
        visible[i] = from[i] + (to[i] - from[i]) * amount;
    }
}

function snapPlanetTransition() {
    planetTransition.active = false;
    planetTransition.progress = 1;
    planetTransition.eased = 1;
    planetTransition.vortexWeight = 0;
    planetTransition.colorMix = 1;

    if (!bodyPoints || !ringPoints) return;

    bodyPositions.set(bodyTargets);
    ringPositions.set(ringTargets);
    bodyColors.set(bodyColorTo);
    ringColors.set(ringColorTo);

    bodyPoints.geometry.attributes.position.needsUpdate = true;
    ringPoints.geometry.attributes.position.needsUpdate = true;
    bodyPoints.geometry.attributes.color.needsUpdate = true;
    ringPoints.geometry.attributes.color.needsUpdate = true;
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run:

```bash
node scripts/test_solar_system_vortex_transition.mjs
```

Expected: PASS with `Solar system vortex transition source checks passed.`

- [ ] **Step 5: Commit**

Run:

```bash
git add solar_system.html scripts/test_solar_system_vortex_transition.mjs
git commit -m "Add planet transition lifecycle"
```

Expected: commit succeeds with the lifecycle helpers and test assertions staged.

## Task 3: Hook Planet Switching Into the Transition

**Files:**
- Modify: `scripts/test_solar_system_vortex_transition.mjs`
- Modify: `solar_system.html`
- Test: `scripts/test_solar_system_vortex_transition.mjs`

- [ ] **Step 1: Extend the failing test**

In `scripts/test_solar_system_vortex_transition.mjs`, add these assertions before the final `console.log(...)`:

```js
assertMatches(
  /function switchPlanet\(key, immediate = false\) \{[\s\S]*const previousPlanetKey = activePlanetKey;[\s\S]*const animateTransition = !immediate && bodyPoints && ringPoints && bodyColorFrom && bodyColorTo && ringColorFrom && ringColorTo;[\s\S]*if \(animateTransition\) \{[\s\S]*bodyColorFrom\.set\(bodyColors\);[\s\S]*ringColorFrom\.set\(ringColors\);[\s\S]*beginPlanetTransition\(previousPlanetKey, key\);/,
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node scripts/test_solar_system_vortex_transition.mjs
```

Expected: FAIL with `Missing switchPlanet captures visible colors and starts transition`.

- [ ] **Step 3: Update `switchStage()` immediate behavior**

Inside `switchStage(stage, immediate = false)`, after:

```js
setBodyTargets(planet);
setRingTargets(planet);
updateReadout(planet, activePlanetKey);
```

add:

```js
if (bodyColorTo && ringColorTo) {
    bodyColorTo.set(bodyColors);
    ringColorTo.set(ringColors);
}
```

Inside the existing `if (immediate) { ... }` block in `switchStage(...)`, add this as the first statement:

```js
snapPlanetTransition();
```

- [ ] **Step 4: Replace `switchPlanet()` with transition-aware switching**

Replace the entire `switchPlanet(key, immediate = false)` function with:

```js
function switchPlanet(key, immediate = false) {
    const planet = PLANETS[key];
    if (!planet) return;

    const previousPlanetKey = activePlanetKey;
    const animateTransition = !immediate && bodyPoints && ringPoints && bodyColorFrom && bodyColorTo && ringColorFrom && ringColorTo;
    if (animateTransition) {
        bodyColorFrom.set(bodyColors);
        ringColorFrom.set(ringColors);
    }

    activePlanetKey = key;
    activeStage = "planet";
    updateStageUI();
    targetTilt = planet.tilt;
    targetRingOpacity = planet.ring ? planet.ring.opacity : 0.0;
    document.documentElement.style.setProperty("--active-planet", planet.color);
    document.documentElement.style.setProperty("--active-glow", planet.glow);

    targetAtmosphereScale = planet.radius * planet.displayScale * 1.015;
    targetAtmosphereColor.set(planet.color);

    targetCoreScale = planet.radius * planet.displayScale;
    targetCoreOpacity = coreOpacityFor(planet);
    
    if (bodyMaterial) {
        bodyMaterial.uniforms.uPlanetType.value = TYPE_MAP[planet.type];
        bodyMaterial.uniforms.uSpinSpeed.value = planet.spin;
    }
    if (ringMaterial) {
        ringMaterial.uniforms.uPlanetType.value = TYPE_MAP[planet.type];
        if (planet.ring) {
            ringMaterial.uniforms.uRingSpeed.value = 0.04;
            ringMaterial.uniforms.uInnerRadius.value = planet.ring.inner;
            ringMaterial.uniforms.uOuterRadius.value = planet.ring.outer;
        }
    }

    setBodyTargets(planet);
    setRingTargets(planet);
    updateReadout(planet, key);

    if (animateTransition) {
        beginPlanetTransition(previousPlanetKey, key);
    }

    if (!animateTransition) {
        if (bodyColorTo && ringColorTo) {
            bodyColorTo.set(bodyColors);
            ringColorTo.set(ringColors);
        }
        snapPlanetTransition();
    }

    if (immediate) {
        if (ringMaterial) {
            ringMaterial.uniforms.uOpacity.value = targetRingOpacity;
        }
        displayGroup.rotation.x = manualRotX + targetTilt;
        
        if (atmosphereMesh) {
            atmosphereMesh.scale.setScalar(targetAtmosphereScale);
            atmosphereMaterial.uniforms.uColor.value.copy(targetAtmosphereColor);
        }
        applyPlanetShellImmediate();
    }
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run:

```bash
node scripts/test_solar_system_vortex_transition.mjs
```

Expected: PASS with `Solar system vortex transition source checks passed.`

- [ ] **Step 6: Commit**

Run:

```bash
git add solar_system.html scripts/test_solar_system_vortex_transition.mjs
git commit -m "Start vortex transition on planet switch"
```

Expected: commit succeeds with only planet switching and test changes staged.

## Task 4: Apply Vortex Motion in the Animation Loop

**Files:**
- Modify: `scripts/test_solar_system_vortex_transition.mjs`
- Modify: `solar_system.html`
- Test: `scripts/test_solar_system_vortex_transition.mjs`

- [ ] **Step 1: Extend the failing test**

In `scripts/test_solar_system_vortex_transition.mjs`, add these assertions before the final `console.log(...)`:

```js
assertIncludes("updatePlanetTransition(time);", "transition loop update");
assertMatches(
  /function moveBodyAttribute\(ease\) \{[\s\S]*const transitionActive = planetTransition\.active;[\s\S]*const vortexWeight = planetTransition\.vortexWeight;[\s\S]*const transitionSpin = planetTransition\.eased \* Math\.PI \* 1\.65;[\s\S]*const tiltSin = Math\.sin\(TRANSITION_VORTEX_TILT\);[\s\S]*targetX = THREE\.MathUtils\.lerp\(baseX, flatX, vortexWeight\);/,
  "body vortex target math"
);
assertMatches(
  /function moveRingAttribute\(ease\) \{[\s\S]*const transitionActive = planetTransition\.active;[\s\S]*const vortexWeight = planetTransition\.vortexWeight;[\s\S]*const transitionSpin = planetTransition\.eased \* Math\.PI \* 1\.45;[\s\S]*const tiltSin = Math\.sin\(TRANSITION_RING_TILT\);[\s\S]*targetX = THREE\.MathUtils\.lerp\(baseX, flatX, vortexWeight\);/,
  "ring vortex target math"
);
```

- [ ] **Step 2: Run the test to verify it fails**

Run:

```bash
node scripts/test_solar_system_vortex_transition.mjs
```

Expected: FAIL with `Missing transition loop update`.

- [ ] **Step 3: Update the animation loop**

In `animate()`, immediately after:

```js
const planet = PLANETS[activePlanetKey];
```

add:

```js
updatePlanetTransition(time);
```

- [ ] **Step 4: Replace `moveBodyAttribute()`**

Replace the entire existing `moveBodyAttribute(ease)` function with:

```js
function moveBodyAttribute(ease) {
    const transitionActive = planetTransition.active;
    const vortexWeight = planetTransition.vortexWeight;
    const transitionSpin = planetTransition.eased * Math.PI * 1.65;
    const tiltSin = Math.sin(TRANSITION_VORTEX_TILT);
    const tiltCos = Math.cos(TRANSITION_VORTEX_TILT);

    for (let i = 0; i < BODY_COUNT; i++) {
        const seed = bodySeeds[i];
        const index = i * 3;
        const baseX = bodyTargets[index];
        const baseY = bodyTargets[index + 1];
        const baseZ = bodyTargets[index + 2];
        let targetX = baseX;
        let targetY = baseY;
        let targetZ = baseZ;

        if (transitionActive && vortexWeight > 0.001) {
            const theta = seed.theta + seed.orbit + transitionSpin;
            const baseRadius = Math.sqrt(baseX * baseX + baseY * baseY + baseZ * baseZ);
            const vortexRadius = baseRadius * (1.02 + seed.shell * 0.34) + 1.25 + seed.noise * 1.9;
            const flatX = Math.cos(theta) * vortexRadius;
            const flatZ = Math.sin(theta) * vortexRadius;
            const flatY = baseY * 0.16 + Math.sin(theta * 2.0 + seed.noise * Math.PI * 2) * 0.62;
            const tiltedY = flatY * tiltCos - flatZ * tiltSin;
            const tiltedZ = flatY * tiltSin + flatZ * tiltCos;
            targetX = THREE.MathUtils.lerp(baseX, flatX, vortexWeight);
            targetY = THREE.MathUtils.lerp(baseY, tiltedY, vortexWeight);
            targetZ = THREE.MathUtils.lerp(baseZ, tiltedZ, vortexWeight);
        }

        const spreadX = baseX * (0.5 + seed.shell * 1.35) + Math.cos(seed.orbit) * (1.8 + seed.noise * 3.2);
        const spreadY = baseY * (0.4 + seed.noise * 1.35) + Math.sin(seed.theta * 2.1) * 2.4;
        const spreadZ = baseZ * (0.5 + seed.shell * 1.35) + Math.sin(seed.orbit) * (1.8 + seed.noise * 3.2);
        bodyPositions[index] += (targetX + spreadX * gestureSpread - bodyPositions[index]) * ease;
        bodyPositions[index + 1] += (targetY + spreadY * gestureSpread - bodyPositions[index + 1]) * ease;
        bodyPositions[index + 2] += (targetZ + spreadZ * gestureSpread - bodyPositions[index + 2]) * ease;
    }
}
```

- [ ] **Step 5: Replace `moveRingAttribute()`**

Replace the entire existing `moveRingAttribute(ease)` function with:

```js
function moveRingAttribute(ease) {
    const transitionActive = planetTransition.active;
    const vortexWeight = planetTransition.vortexWeight;
    const transitionSpin = planetTransition.eased * Math.PI * 1.45;
    const tiltSin = Math.sin(TRANSITION_RING_TILT);
    const tiltCos = Math.cos(TRANSITION_RING_TILT);

    for (let i = 0; i < RING_COUNT; i++) {
        const seed = ringSeeds[i];
        const index = i * 3;
        const baseX = ringTargets[index];
        const baseY = ringTargets[index + 1];
        const baseZ = ringTargets[index + 2];
        let targetX = baseX;
        let targetY = baseY;
        let targetZ = baseZ;

        if (transitionActive && vortexWeight > 0.001) {
            const theta = seed.angle + transitionSpin + seed.band * Math.PI * 2;
            const baseRadius = Math.sqrt(baseX * baseX + baseZ * baseZ);
            const vortexRadius = baseRadius * (1.04 + seed.radius * 0.26) + 1.8 + seed.band * 2.8;
            const flatX = Math.cos(theta) * vortexRadius;
            const flatZ = Math.sin(theta) * vortexRadius;
            const flatY = baseY * 0.3 + Math.sin(theta * 1.7 + seed.gap * Math.PI * 2) * 0.54;
            const tiltedY = flatY * tiltCos - flatZ * tiltSin;
            const tiltedZ = flatY * tiltSin + flatZ * tiltCos;
            targetX = THREE.MathUtils.lerp(baseX, flatX, vortexWeight);
            targetY = THREE.MathUtils.lerp(baseY, tiltedY, vortexWeight);
            targetZ = THREE.MathUtils.lerp(baseZ, tiltedZ, vortexWeight);
        }

        const spreadRadius = 2.4 + seed.radius * 8.2;
        const spreadX = Math.cos(seed.angle) * spreadRadius;
        const spreadY = seed.height * (3.8 + seed.radius * 4.5) + Math.sin(seed.angle * 2.4) * 0.9;
        const spreadZ = Math.sin(seed.angle) * spreadRadius;
        ringPositions[index] += (targetX + spreadX * gestureSpread - ringPositions[index]) * ease;
        ringPositions[index + 1] += (targetY + spreadY * gestureSpread - ringPositions[index + 1]) * ease;
        ringPositions[index + 2] += (targetZ + spreadZ * gestureSpread - ringPositions[index + 2]) * ease;
    }
}
```

- [ ] **Step 6: Run the test to verify it passes**

Run:

```bash
node scripts/test_solar_system_vortex_transition.mjs
```

Expected: PASS with `Solar system vortex transition source checks passed.`

- [ ] **Step 7: Commit**

Run:

```bash
git add solar_system.html scripts/test_solar_system_vortex_transition.mjs
git commit -m "Animate planet vortex reconstruction"
```

Expected: commit succeeds with the render-loop transition changes staged.

## Task 5: Verify Existing Regression Tests and Browser Behavior

**Files:**
- Modify: none unless verification reveals a defect in the implementation from Tasks 1-4.
- Test: all existing source-level scripts plus manual browser checks.

- [ ] **Step 1: Run the solar system source tests**

Run:

```bash
node scripts/test_solar_system_stage_switch.mjs
node scripts/test_solar_system_single_planet_focus.mjs
node scripts/test_solar_system_comet.mjs
node scripts/test_solar_system_vortex_transition.mjs
```

Expected output includes:

```text
Solar system planet-only source checks passed.
Solar system single-planet focus source checks passed.
Solar system comet integration source checks passed.
Solar system vortex transition source checks passed.
```

- [ ] **Step 2: Run the index scene test**

Run:

```bash
node scripts/test_index_uses_photo_tree_scene.mjs
```

Expected output includes:

```text
Index photo tree routing source checks passed.
```

- [ ] **Step 3: Run the Christmas gesture test**

Run:

```bash
node scripts/test_christmas_gesture_controls.mjs
```

Expected output includes:

```text
Christmas tree gesture controls source checks passed.
```

- [ ] **Step 4: Start a local static server**

Run:

```bash
python3 -m http.server 8090
```

Expected: server prints a line containing `Serving HTTP on :: port 8090` or `Serving HTTP on 0.0.0.0 port 8090`.

- [ ] **Step 5: Manual browser verification**

Open:

```text
http://127.0.0.1:8090/solar_system.html
```

Verify these exact interactions:

- Saturn initial load appears without a transition from a scattered state.
- Click Earth; particles form a tilted vortex and settle into Earth within about 1.1 seconds.
- Click Mars before Earth finishes; particles redirect from their current visible positions to Mars without waiting for Earth to complete.
- Click Jupiter and then Uranus; ring particles use a wider vortex than body particles, and ring opacity follows the selected planet.
- Drag the planet during a transition; pointer drag still rotates the display group.
- Zoom using the existing camera controls; the vortex remains centered and does not fill the whole mobile viewport width.

- [ ] **Step 6: Stop the local server**

Press `Control-C` in the terminal running:

```bash
python3 -m http.server 8090
```

Expected: the server process exits and the shell prompt returns.

- [ ] **Step 7: Inspect git status**

Run:

```bash
git status --short
```

Expected: implementation files are either clean or show only intended changes in `solar_system.html` and `scripts/test_solar_system_vortex_transition.mjs`. The `.superpowers/` preview cache may remain untracked and must not be staged for the transition implementation commit.

- [ ] **Step 8: Commit final verification adjustments**

If Tasks 1-4 already produced all needed commits and Task 5 changed no files, skip this commit step. If Task 5 required a concrete fix, run:

```bash
git add solar_system.html scripts/test_solar_system_vortex_transition.mjs
git commit -m "Polish planet vortex transition"
```

Expected: commit succeeds only when Task 5 produced a verified implementation fix.
