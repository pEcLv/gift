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
assertMatches(apiSource, /async function handleDeletePhotos/, "photo batch delete handler");
assertMatches(apiSource, /prefix:\s*PHOTO_PREFIX/, "Blob list prefix");
assertMatches(apiSource, /const \{ del \} = await getBlobClient\(\);/, "Vercel Blob delete client");
assertMatches(apiSource, /await del\(pathnames\)/, "batch Blob deletion");
assertMatches(apiSource, /res\.setHeader\("Allow", "GET, POST, DELETE"\)/, "DELETE method allow header");

assertMatches(treeHtml, /const PHOTO_API_URL = "\/api\/photos";/, "photo API URL constant");
assertMatches(treeHtml, /<button class="delete-button" type="button" id="delete-photos">删除照片<\/button>/, "photo delete button");
assertMatches(treeHtml, /async function loadPhotosFromRemote\(\)/, "remote photo loader");
assertMatches(treeHtml, /async function savePhotoToRemote\(dataURL, file\)/, "remote photo saver");
assertMatches(treeHtml, /async function deletePhotosFromRemote\(\)/, "remote photo batch deleter");
assertMatches(treeHtml, /async function clearPhotosFromDB\(\)/, "IndexedDB photo clearer");
assertMatches(treeHtml, /const existingPhotos = await loadPhotosFromDB\(\);[\s\S]*if \(existingPhotos\.includes\(dataURL\)\) return;/, "IndexedDB duplicate save guard");
assertMatches(treeHtml, /Array\.from\(new Set\(request\.result \|\| \[\]\)\)/, "IndexedDB load deduplication");
assertMatches(treeHtml, /function clearUploadedPhotoCards\(\)/, "scene photo card clearer");
assertMatches(treeHtml, /async function handleDeletePhotos\(\)/, "delete button handler");
assertMatches(treeHtml, /const DEFAULT_PHOTO_DELETED_KEY = "christmas-tree-default-photo-deleted";/, "default photo deleted flag");
assertMatches(treeHtml, /function shouldShowDefaultPhoto\(\)/, "default photo visibility check");
assertMatches(treeHtml, /function markDefaultPhotoDeleted\(\)/, "default photo deletion marker");
assertMatches(treeHtml, /if \(!loadedPhotoCount && shouldShowDefaultPhoto\(\)\)/, "default photo appears only when allowed and no uploads exist");
assertMatches(treeHtml, /async function resizePhotoForUpload\(file\)/, "client photo resize before upload");
assertMatches(treeHtml, /const remotePhotos = await loadPhotosFromRemote\(\);/, "startup remote photo load");
assertMatches(treeHtml, /let remoteLoadedCount = 0;/, "remote photo loaded counter");
assertMatches(treeHtml, /if \(await addPhotoFromSource\(photo\.url\)\) \{[\s\S]*remoteLoadedCount\+\+;/, "remote photo counter increments");
assertMatches(treeHtml, /if \(remoteLoadedCount > 0\) \{[\s\S]*await clearPhotosFromDB\(\);[\s\S]*\} else \{[\s\S]*const storedPhotos = await loadPhotosFromDB\(\);/, "local fallback is skipped when remote photos exist");
assertMatches(treeHtml, /await savePhotoToRemote\(dataURL, file\);/, "upload persists to remote API");
assertMatches(treeHtml, /await savePhotoToDB\(dataURL\);/, "IndexedDB fallback when remote upload fails");
assertMatches(treeHtml, /await deletePhotosFromRemote\(\);/, "delete handler calls remote API");
assertMatches(treeHtml, /await clearPhotosFromDB\(\);/, "delete handler clears local fallback");
assertMatches(treeHtml, /markDefaultPhotoDeleted\(\);/, "delete handler hides default photo after refresh");

assert(
  !/photos\.length <= 1/.test(treeHtml),
  "Delete handler must not treat the default photo as undeletable"
);

console.log("Christmas photo persistence source checks passed.");
