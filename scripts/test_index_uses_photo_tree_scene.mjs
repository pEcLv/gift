import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const indexHtml = readFileSync(resolve(__dirname, "../index.html"), "utf8");
const treeHtml = readFileSync(resolve(__dirname, "../christmas_tree_scene.html"), "utf8");

function assertMatches(source, pattern, label) {
  if (!pattern.test(source)) {
    throw new Error(`Missing ${label}: ${pattern}`);
  }
}

assertMatches(
  indexHtml,
  /<iframe[^>]+data-scene="tree"[^>]+data-src="christmas_tree_scene\.html"/,
  "outer Christmas scene uses the photo-capable tree scene"
);

assertMatches(
  indexHtml,
  /<iframe[^>]+data-scene="planet"[^>]+data-src="solar_system\.html\?embed=1&amp;stage=planet"/,
  "outer planet scene uses the solar-system planet stage"
);

assertMatches(
  treeHtml,
  /<button class="mode-button" type="button" data-mode="focus">照片<\/button>/,
  "photo focus mode button"
);

assertMatches(
  treeHtml,
  /<button class="upload-button" type="button" id="upload-trigger">添加照片<\/button>/,
  "photo upload button"
);

console.log("Index photo tree routing source checks passed.");
