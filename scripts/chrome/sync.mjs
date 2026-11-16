// Writes the shared header and footer into every page of the site.
//   node scripts/chrome/sync.mjs           rewrite the pages
//   node scripts/chrome/sync.mjs --check   exit 1 if a page differs (nothing is written)
import { readFile, writeFile, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";
import { applyChrome } from "./chrome.mjs";

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, "..", "..");
const SKIP = new Set(["node_modules", "scripts", "assets", ".git"]);

export async function sitePages(dir = ROOT) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (e.isDirectory()) { if (!SKIP.has(e.name)) out.push(...(await sitePages(join(dir, e.name)))); }
    else if (e.name.endsWith(".html")) out.push(join(dir, e.name));
  }
  return out.sort();
}
export const loadChrome = async () => ({ header: await readFile(join(HERE, "header.html"), "utf8"), footer: await readFile(join(HERE, "footer.html"), "utf8") });

// → the pages that differ from the shared header and footer (rewritten unless check)
export async function syncChrome({ check = false } = {}) {
  const chrome = await loadChrome(), changed = [];
  for (const file of await sitePages()) {
    const html = await readFile(file, "utf8"), next = applyChrome(html, chrome);
    if (next === html) continue;
    changed.push(relative(ROOT, file).replaceAll("\\", "/"));
    if (!check) await writeFile(file, next);
  }
  return changed;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const check = process.argv.includes("--check");
  const changed = await syncChrome({ check });
  console.log(changed.length ? `${check ? "differ" : "rewritten"}: ${changed.join(", ")}` : "every page has the shared header and footer");
  if (check && changed.length) process.exit(1);
}
