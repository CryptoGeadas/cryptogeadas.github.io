// The shared header and footer: defined once, the same in every page, with the page's own
// section and data line kept. Run: node --test scripts/chrome/
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { applyChrome, headerFor, pageParts } from "./chrome.mjs";
import { syncChrome, sitePages, loadChrome } from "./sync.mjs";

const chrome = { header: `<header class="site-header">\n  <nav><a href="/tools/">Tools</a><a href="/#about">About</a></nav>\n</header>\n`,
  footer: `<footer class="site-footer">\n  <span class="data-line"><!-- data-line --></span>\n  <span class="credit">c</span>\n</footer>\n` };
const page = (body, line, header = "<p>old</p>") => `<html>\n${body}\n  <header class="site-header">${header}</header>\n\n  <main></main>\n  <footer class="site-footer">\n  <span class="data-line">${line}</span>\n  <span class="credit">old</span>\n</footer>\n</html>\n`;

test("every page of the site has the shared header and footer", async () => {
  assert.ok((await sitePages()).length >= 4);
  assert.deepEqual(await syncChrome({ check: true }), [], "run: node scripts/chrome/sync.mjs");
});

test("the header and footer are written into the page as plain HTML, with nothing left of the old ones", () => {
  const out = applyChrome(page("<body>", "Source: X"), chrome);
  assert.ok(out.includes(`<a href="/tools/">Tools</a>`));
  assert.ok(!out.includes("<p>old</p>") && !out.includes(">old<"));
  assert.ok(out.includes("<main></main>"), "the page's own content is untouched");
  assert.equal(applyChrome(out, chrome), out, "a second sync changes nothing");
});

test("a page's own data line is kept, whatever it holds", () => {
  const line = `<span class="dot" data-tool-dot>●</span> <span data-tool-dataline>Source: DefiLlama · $1 & more</span>`;
  const out = applyChrome(page("<body>", line), chrome);
  assert.ok(out.includes(`<span class="data-line">${line}</span>`));
  assert.equal(pageParts(out).dataLine, line);
});

test("the current section is marked one way, for sight and for screen readers", () => {
  const out = applyChrome(page(`<body data-nav="/tools/">`, "x"), chrome);
  assert.ok(out.includes(`<a href="/tools/" aria-current="page">Tools</a>`));
  assert.ok(!out.includes("is-active"));
  assert.ok(!applyChrome(page("<body>", "x"), chrome).includes("aria-current"), "the home page marks none");
  assert.throws(() => headerFor(chrome.header, "/nope/"), /matches no link in the site nav/);
});

test("a page keeps its own line endings", () => {
  const crlf = page("<body>", "x").replaceAll("\n", "\r\n");
  const out = applyChrome(crlf, chrome);
  assert.ok(!/[^\r]\n/.test(out), "no bare line feed in a CRLF page");
  assert.ok(!applyChrome(page("<body>", "x"), chrome).includes("\r"));
});

test("a page without a header, a footer or a data line is refused, not half written", () => {
  assert.throws(() => applyChrome("<html><body></body></html>", chrome), /no site header or footer/);
  assert.throws(() => applyChrome(page("<body>", "x").replace('class="data-line"', 'class="other"'), chrome), /no data line/);
  assert.throws(() => applyChrome(page("<body>", "x"), { ...chrome, footer: "<footer class=\"site-footer\"></footer>" }), /lost its data-line marker/);
});

test("the real header and footer: one nav, one footer nav, and the marker for the page's data line", async () => {
  const { header, footer } = await loadChrome();
  assert.equal(header.match(/<nav class="site-nav"/g).length, 1);
  assert.ok(header.includes(`<a href="/tools/">Tools</a>`));
  assert.ok(!header.includes("aria-current") && !header.includes("is-active"), "the source marks no section");
  assert.equal(footer.match(/<!-- data-line -->/g).length, 1);
  for (const file of await sitePages()) assert.ok((await readFile(file, "utf8")).includes(`<nav class="site-nav"`), file);
});
