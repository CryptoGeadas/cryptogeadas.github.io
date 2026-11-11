// Calmer hero variants, for comparison with the "tour" in record.mjs.
//   close-ups : the same three tools, zoomed in on one element each
//   chart     : the RWA Yield vs Trust chart only, cursor drifting across funds
//   table     : the Yield Scanner table only, slow scroll, no cursor
// Run: node variants.mjs, then build.sh per variant (see README lines at the end of this file).

import { record, glide, scroll, wait } from "./lib.mjs";

const center = (loc) => loc.evaluate((e) => e.scrollIntoView({ block: "center" }));

// --- close-ups -------------------------------------------------------------
await record("cu-scanner", "/defi-yield-scanner/", async (page) => {
  const row = page.locator(".row[data-id]").nth(1);
  await glide(page, row, 40); await wait(300); await row.click(); await wait(600);
  await scroll(page, 160, 1400);
  await wait(1200);
}, { zoom: 1.7, setup: (page) => center(page.locator(".row[data-id]").nth(1)) });

await record("cu-rwa", "/tokenized-rwa-tracker/", async (page) => {
  const dots = page.locator("g.dot");
  for (const i of [3, 7, 12]) { await glide(page, dots.nth(i), 45); await wait(1100); }
}, { zoom: 1.6, setup: (page) => center(page.locator("g.dot").first()) });

await record("cu-fundamentals", "/crypto-fundamentals/?t=aave", async (page) => {
  await glide(page, page.locator(".fact.t-g1").first(), 40); await wait(1800);
  await glide(page, page.locator(".fact.t-n").nth(1), 35); await wait(1500);
}, { zoom: 1.6, setup: async (page) => { await page.locator(".fact").first().waitFor(); await center(page.locator(".fact.t-g1").first()); await wait(400); } });

// --- chart only --------------------------------------------------------------
await record("chart", "/tokenized-rwa-tracker/", async (page) => {
  const dots = page.locator("g.dot");
  for (const i of [0, 4, 9, 14, 17]) { await glide(page, dots.nth(i), 60); await wait(1300); }
}, { zoom: 1.25, setup: (page) => center(page.locator("g.dot").first()) });

// --- table only ----------------------------------------------------------------
await record("table", "/defi-yield-scanner/", async (page) => {
  await scroll(page, 900, 12000);
}, { cursor: false, zoom: 1.2, setup: (page) => center(page.locator(".row[data-id]").nth(2)) });

// Encode:
//   bash build.sh closeups cu-scanner cu-rwa cu-fundamentals
//   bash build.sh chart chart
//   bash build.sh table table
