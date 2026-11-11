// Records the home-page hero loop from the live tools (site-backlog #9).
// Run from this folder:  npm i && npx playwright install chromium && node record.mjs
// Output: raw/<clip>.webm + raw/<clip>.json (start/end marks in ms), then build.sh encodes the loop.

import { chromium } from "playwright";
import { mkdirSync, writeFileSync, renameSync } from "node:fs";

const BASE = process.env.BASE || "https://bernardogeadas.com";
const W = 1280, H = 720;
mkdirSync("raw", { recursive: true });

// A small visible cursor, since headless recordings show none.
const CURSOR = () => {
  addEventListener("DOMContentLoaded", () => {
    const c = document.createElement("div");
    c.style.cssText = "position:fixed;left:0;top:0;width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,.85);box-shadow:0 0 0 3px rgba(0,0,0,.35);z-index:2147483647;pointer-events:none;transform:translate(-50%,-50%);transition:transform .08s";
    document.body.appendChild(c);
    // Hide the site header: the hero already has one, and a second would look like a ghost menu.
    const s = document.createElement("style");
    s.textContent = ".site-header{display:none!important}";
    document.head.appendChild(s);
    addEventListener("mousemove", (e) => { c.style.left = e.clientX + "px"; c.style.top = e.clientY + "px"; }, true);
    addEventListener("mousedown", () => (c.style.transform = "translate(-50%,-50%) scale(.7)"), true);
    addEventListener("mouseup", () => (c.style.transform = "translate(-50%,-50%)"), true);
  });
};

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Moves the mouse to the centre of an element in small steps, so the motion looks human.
async function glide(page, locator, steps = 30) {
  const b = await locator.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps });
}
// Smooth scroll by dy pixels over ms.
async function scroll(page, dy, ms = 1200) {
  const n = Math.round(ms / 16);
  for (let i = 0; i < n; i++) { await page.mouse.wheel(0, dy / n); await wait(16); }
}

async function record(name, url, act, setup) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, colorScheme: "dark", recordVideo: { dir: "raw", size: { width: W, height: H } } });
  await ctx.addInitScript(CURSOR);
  const t0 = Date.now();
  const page = await ctx.newPage();
  await page.goto(BASE + url, { waitUntil: "networkidle" });
  if (setup) await setup(page);
  await page.mouse.move(W * 0.7, H * 0.5);
  await wait(800);
  const start = Date.now() - t0;
  await act(page);
  const end = Date.now() - t0;
  const video = page.video();
  await ctx.close();
  await browser.close();
  renameSync(await video.path(), `raw/${name}.webm`);
  writeFileSync(`raw/${name}.json`, JSON.stringify({ start, end }));
  console.log(name, { start, end, secs: (end - start) / 1000 });
}

// 1. Yield Scanner: filter to lending, then open a vault row.
await record("scanner", "/defi-yield-scanner/", async (page) => {
  const lend = page.locator("button[data-v=lend]");
  await glide(page, lend, 35); await wait(200); await lend.click(); await wait(700);
  const row = page.locator(".row[data-id]").nth(1);
  await glide(page, row, 30); await wait(200); await row.click(); await wait(400);
  await scroll(page, 240, 1100);
  await wait(900);
}, (page) => page.evaluate(() => scrollTo(0, 530)));

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
}, (page) => page.evaluate(() => scrollTo(0, 220)));

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
