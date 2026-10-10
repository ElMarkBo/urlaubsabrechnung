// Copies the PWA sources from the repo root into www/ (Capacitor webDir) and
// bundles the Firebase SDK locally so the app starts without network.
// The repo-root sources stay untouched (the PWA keeps loading from the CDN);
// only the copy in www/ gets its CDN URLs rewritten.
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const www = join(here, "..", "www");

rmSync(www, { recursive: true, force: true });
mkdirSync(www, { recursive: true });
for (const entry of ["index.html", "manifest.json", "css", "js", "icons"]) {
  cpSync(join(root, entry), join(www, entry), { recursive: true });
}

const syncPath = join(www, "js", "sync.js");
const syncSrc = readFileSync(syncPath, "utf8");
const match = syncSrc.match(/https:\/\/www\.gstatic\.com\/firebasejs\/([\d.]+)\//);
if (!match) throw new Error("Firebase CDN URL not found in js/sync.js");
const [cdnPrefix, version] = match;

const vendorDir = join(www, "vendor", "firebase");
mkdirSync(vendorDir, { recursive: true });
for (const name of ["firebase-app", "firebase-auth", "firebase-firestore"]) {
  const res = await fetch(`${cdnPrefix}${name}.js`);
  if (!res.ok) throw new Error(`Download failed for ${name}: ${res.status}`);
  const code = (await res.text()).replaceAll(cdnPrefix, "./");
  if (code.includes("gstatic.com/firebasejs")) throw new Error(`${name}: unexpected CDN import left`);
  writeFileSync(join(vendorDir, `${name}.js`), code);
}
writeFileSync(syncPath, syncSrc.replaceAll(cdnPrefix, "../vendor/firebase/"));

console.log(`www/ synced from ${root}, Firebase ${version} bundled locally`);
