// Variant "tour": the three live tools, one action each (site-backlog #9).
// Run from this folder:  npm i && npx playwright install chromium && node record.mjs && bash build.sh tour scanner rwa fundamentals

import { record, glide, scroll, wait } from "./lib.mjs";

// 1. Yield Scanner: filter to lending, then open a vault row.
await record("scanner", "/defi-yield-scanner/", async (page) => {
  const lend = page.locator("button[data-v=lend]");
  await glide(page, lend, 35); await wait(200); await lend.click(); await wait(700);
  const row = page.locator(".row[data-id]").nth(1);
  await glide(page, row, 30); await wait(200); await row.click(); await wait(400);
  await scroll(page, 240, 1100);
  await wait(900);
}, { setup: (page) => page.evaluate(() => scrollTo(0, 530)) });

// 2. RWA tracker: the Yield vs Trust chart, then a fund's classification.
await record("rwa", "/tokenized-rwa-tracker/", async (page) => {
  await scroll(page, 380, 1300);
  await wait(900);
  const fund = page.locator("button[aria-controls=detail-blackrock-buidl]");
  await fund.evaluate((e) => e.scrollIntoView({ block: "center", behavior: "smooth" }));
  await wait(800);
  await glide(page, fund, 25); await wait(200); await fund.click(); await wait(400);
  await scroll(page, 200, 900);
  await wait(900);
}, { setup: (page) => page.evaluate(() => scrollTo(0, 220)) });

// 3. Crypto Fundamentals: open a token, then hover a rating to show its rule.
await record("fundamentals", "/crypto-fundamentals/", async (page) => {
  const chip = page.locator("button[data-id=aave]");
  await glide(page, chip, 30); await wait(200); await chip.click();
  await page.locator(".fact").first().waitFor();
  await wait(700);
  await scroll(page, 1060, 1500);
  await wait(900); // let smooth scrolling settle before measuring the target
  await glide(page, page.locator(".fact.t-g1").first(), 30); await wait(1700);
});
