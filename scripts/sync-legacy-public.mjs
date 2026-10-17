import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicDir = path.join(root, "public");
const manifestPath = path.join(root, "scripts", "legacy-public-manifest.json");
const pageManifestPath = path.join(root, "src", "fullsite", "pageManifest.ts");

if (publicDir !== path.join(root, "public") || publicDir === root || !existsSync(path.join(root, "package.json"))) {
  throw new Error("Refusing to sync legacy files outside the project public directory.");
}

const staticAssetExtensions = new Set([
  ".avif", ".css", ".gif", ".ico", ".jpeg", ".jpg", ".js", ".otf",
  ".png", ".svg", ".ttf", ".txt", ".webp", ".woff", ".woff2",
]);

function isAllowedLegacyFile(file) {
  const normalized = file.replaceAll("\\", "/");
  if (normalized === "index.html") return false;

  if (!normalized.includes("/")) {
    return /\.(?:html|css|js)$/i.test(normalized);
  }

  if (!normalized.startsWith("assets/")) return false;
  if (normalized.toLowerCase().endsWith(".png") && normalized !== "assets/hero.png") return false;
  return staticAssetExtensions.has(path.posix.extname(normalized).toLowerCase());
}

function listTrackedLegacyFiles() {
  const tracked = execFileSync("git", ["ls-files", "-z"], {
    cwd: root,
    encoding: "utf8",
  }).split("\0").filter(Boolean);

  return [...new Set(tracked.filter(isAllowedLegacyFile))].sort((a, b) => a.localeCompare(b));
}

if (process.argv.includes("--update-manifest")) {
  const files = listTrackedLegacyFiles();
  writeFileSync(manifestPath, `${JSON.stringify({ version: 1, files }, null, 2)}\n`, "utf8");
  console.log(`Updated the committed legacy public manifest with ${files.length} tracked files.`);
  process.exit(0);
}

if (!existsSync(manifestPath)) {
  throw new Error("The committed legacy public manifest is missing. Run npm run sync:legacy -- --update-manifest in a Git checkout.");
}

const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
if (manifest?.version !== 1 || !Array.isArray(manifest.files)) {
  throw new Error("The legacy public manifest has an unsupported format.");
}

const pageManifestSource = readFileSync(pageManifestPath, "utf8");
const routeMatches = [...pageManifestSource.matchAll(/route:\s*['"]\/([^'"]+\.html)['"]/g)];
const migratedHtmlRoutes = new Set(routeMatches.map((match) => match[1].toLowerCase()));
const legacyRootHtmlFiles = manifest.files.filter((file) =>
  typeof file === "string" && !file.includes("/") && file.toLowerCase().endsWith(".html") && file.toLowerCase() !== "index.html",
).map((file) => file.toLowerCase());
if (migratedHtmlRoutes.size === 0 || legacyRootHtmlFiles.length === 0) {
  throw new Error("The migrated HTML route set or legacy root HTML manifest is empty; refusing to copy potentially conflicting pages.");
}
if (!migratedHtmlRoutes.has("checkout.html")) {
  throw new Error("The checkout redirect is missing from the migrated route set; refusing to copy legacy HTML.");
}
const uncoveredHtml = legacyRootHtmlFiles.filter((file) => !migratedHtmlRoutes.has(file));
if (uncoveredHtml.length > 0) {
  throw new Error(`Root HTML files are not covered by the App Router manifest: ${uncoveredHtml.join(", ")}. Update src/fullsite/pageManifest.ts before syncing public assets.`);
}
function isMigratedHtml(file) {
  return migratedHtmlRoutes.has(path.posix.basename(file.replaceAll("\\", "/")).toLowerCase());
}

const filesToCopy = manifest.files.filter((file) => !isMigratedHtml(file));
if (!filesToCopy.every((file) => typeof file === "string" && isAllowedLegacyFile(file))) {
  throw new Error("The legacy public manifest includes a path outside the approved static file list.");
}
if (new Set(filesToCopy).size !== filesToCopy.length) {
  throw new Error("The legacy public manifest contains duplicate paths.");
}

const rootRealPath = realpathSync(root);
const resolvedFiles = filesToCopy.map((file) => {
  const source = path.resolve(root, ...file.split(/[\\/]/));
  const relative = path.relative(rootRealPath, source);
  if (!relative || relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Refusing a legacy manifest path outside the project: ${file}`);
  }
  if (!existsSync(source) || !lstatSync(source).isFile()) {
    throw new Error(`Legacy static file is missing or is not a regular file: ${file}`);
  }
  const realSource = realpathSync(source);
  const realRelative = path.relative(rootRealPath, realSource);
  if (realRelative.startsWith("..") || path.isAbsolute(realRelative)) {
    throw new Error(`Refusing a legacy manifest symlink outside the project: ${file}`);
  }
  return { file, source, realSource };
});

if (existsSync(publicDir)) {
  if (lstatSync(publicDir).isSymbolicLink()) {
    throw new Error("Refusing to replace a symlink at the generated public directory.");
  }
  rmSync(publicDir, { recursive: true, force: true });
}
mkdirSync(publicDir, { recursive: true });

for (const { file, realSource } of resolvedFiles) {
  const destination = path.join(publicDir, ...file.split(/[\\/]/));
  mkdirSync(path.dirname(destination), { recursive: true });
  copyFileSync(realSource, destination);
}

console.log(`Synced ${filesToCopy.length} approved legacy files into public/.`);
