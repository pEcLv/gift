import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(__dirname, "..");
const treeHtml = readFileSync(resolve(rootDir, "christmas_tree_scene.html"), "utf8");
const apiPath = resolve(rootDir, "api/photos.js");
const packagePath = resolve(rootDir, "package.json");

function assert(condition, label) {
  if (!condition) {
    throw new Error(label);
  }
}

function assertMatches(source, pattern, label) {
  assert(pattern.test(source), `Missing ${label}: ${pattern}`);
}

assert(existsSync(apiPath), "Missing Vercel photo API function at api/photos.js");
assert(existsSync(packagePath), "Missing package.json for Vercel function dependencies");

const apiSource = readFileSync(apiPath, "utf8");
const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));

assert(
  packageJson.dependencies && packageJson.dependencies["@vercel/blob"],
  "package.json must declare @vercel/blob"
);
assertMatches(apiSource, /["']@vercel\/blob["']/, "Vercel Blob SDK reference");
assertMatches(apiSource, /async function handlePostPhoto/, "photo upload POST handler");
assertMatches(apiSource, /async function handleGetPhotos/, "photo list GET handler");
assertMatches(apiSource, /prefix:\s*PHOTO_PREFIX/, "Blob list prefix");

assertMatches(treeHtml, /const PHOTO_API_URL = "\/api\/photos";/, "photo API URL constant");
assertMatches(treeHtml, /async function loadPhotosFromRemote\(\)/, "remote photo loader");
assertMatches(treeHtml, /async function savePhotoToRemote\(dataURL, file\)/, "remote photo saver");
assertMatches(treeHtml, /async function resizePhotoForUpload\(file\)/, "client photo resize before upload");
assertMatches(treeHtml, /const remotePhotos = await loadPhotosFromRemote\(\);/, "startup remote photo load");
assertMatches(treeHtml, /await savePhotoToRemote\(dataURL, file\);/, "upload persists to remote API");
assertMatches(treeHtml, /await savePhotoToDB\(dataURL\);/, "IndexedDB fallback when remote upload fails");

console.log("Christmas photo persistence source checks passed.");
