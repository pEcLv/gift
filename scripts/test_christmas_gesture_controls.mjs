import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const html = readFileSync(resolve(__dirname, "../christmas_tree_scene.html"), "utf8");
const indexHtml = readFileSync(resolve(__dirname, "../index.html"), "utf8");

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

assertIncludes("@mediapipe/hands/hands.js", "MediaPipe Hands script");
assertIncludes('id="start-gesture"', "gesture start button");
assertIncludes('id="camera-preview"', "camera preview video");
assertIncludes('id="hand-overlay"', "hand overlay canvas");
assertIncludes("张掌：待命", "open palm idle label");
assertIncludes("握拳：旋转", "fist rotation label");
assertIncludes("左右停：切换", "open-palm edge hold label");
assertIncludes("V手势：照片", "victory photo mode label");
assertIncludes("双手：缩放", "two-hand zoom label");
assertIncludes("双拳：复位", "two-fist reset label");
assertMatches(/function handleDualHandGesture\(analyses, now\)/, "dual-hand gesture handler");
assertMatches(/function handleTwoFistReset\(now\)/, "two-fist reset handler");
assertMatches(/function holdVictoryGesture\(now\)/, "victory hold-to-toggle handler");
assertMatches(/function triggerDirectionalSwitch\(direction, now\)/, "directional switch trigger handler");
assertMatches(/function resetSceneView\(\)/, "reset gesture handler");
assertMatches(/if \(analysis\.isFist\)[\s\S]*rotationAnchor/, "fist locks rotation before moving the tree");
assertMatches(/if \(analysis\.isVictory\)[\s\S]*holdVictoryGesture\(now\)/, "victory gesture requires a hold");
assertMatches(/if \(activeMode === "focus"\)[\s\S]*switchRelativePhoto\(direction\)/, "edge hold switches photos while in focus mode");
assertMatches(/targetCameraDistance = clampCameraDistance\(targetCameraDistance - spanDelta \* 6\.8\)/, "two-hand span controls camera distance");
assertMatches(/Math\.abs\(spanDelta\) > 0\.055/, "two-hand zoom ignores normal tracking jitter");
assertMatches(/const resetHands = analyses\.filter\(\(analysis\) => analysis\.isFist\)/, "reset uses two fists instead of open palms");
assertMatches(/resetHands\.length >= 2[\s\S]*handleTwoFistReset\(now\)/, "two fists trigger reset hold");
assertIncludes("双拳稳定：复位", "two-fist reset progress message");
if (html.includes("双掌稳定：复位")) {
  throw new Error("Two open palms should not be used as the reset hold gesture.");
}
assertMatches(/minDetectionConfidence: 0\.58/, "camera hand detection uses tolerant detection confidence");
assertMatches(/minTrackingConfidence: 0\.58/, "camera hand tracking uses tolerant tracking confidence");
assertMatches(/isOpen: openFingerCount >= 3 && thumbReach > 0\.58 && !fist/, "open palm accepts three extended fingers");
assertMatches(/const EDGE_HOLD_MS = 900/, "open-palm edge hold has a deliberate delay");
assertMatches(/analysis\.palmCenter\.x < 0\.38 \? -1 : analysis\.palmCenter\.x > 0\.62 \? 1 : 0/, "open-palm edge zones drive direction");
assertMatches(/gestureControl\.edgeHoldDirection !== direction/, "edge hold resets when side changes");
if (/gestureControl\.mode === "open"[\s\S]*targetCameraDistance/.test(html)) {
  throw new Error("Open palm should be an idle state, not a continuous zoom control.");
}
assertMatches(/navigator\.mediaDevices\?\.getUserMedia/, "camera permission flow");
assertMatches(/new window\.Hands/, "MediaPipe Hands setup");

if (!/<iframe[^>]+data-scene="tree"[^>]+allow="camera; fullscreen"/.test(indexHtml)) {
  throw new Error("Missing camera permission on the Christmas tree iframe.");
}

console.log("Christmas tree gesture controls source checks passed.");
