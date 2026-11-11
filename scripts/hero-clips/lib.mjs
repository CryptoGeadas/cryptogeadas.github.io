// Shared helpers for recording hero clips from the live tools.
import { chromium } from "playwright";
import { mkdirSync, writeFileSync, renameSync } from "node:fs";

export const BASE = process.env.BASE || "https://bernardogeadas.com";
export const W = 1280, H = 720;
mkdirSync("raw", { recursive: true });

// Runs in the page: hides the site header (the hero already has one) and, unless turned off,
// draws a small visible cursor, since headless recordings show none. Optional CSS zoom for close-ups.
const PREP = ({ cursor, zoom }) => {
  addEventListener("DOMContentLoaded", () => {
    const s = document.createElement("style");
    s.textContent = ".site-header{display:none!important}" + (zoom ? `html{zoom:${zoom}}` : "");
    document.head.appendChild(s);
    if (!cursor) return;
    const c = document.createElement("div");
    c.style.cssText = "position:fixed;left:0;top:0;width:18px;height:18px;border-radius:50%;background:rgba(255,255,255,.85);box-shadow:0 0 0 3px rgba(0,0,0,.35);z-index:2147483647;pointer-events:none;transform:translate(-50%,-50%);transition:transform .08s";
    document.body.appendChild(c);
    // With CSS zoom on <html>, fixed-position offsets are in zoomed units, so divide back.
    const z = zoom || 1;
    addEventListener("mousemove", (e) => { c.style.left = e.clientX / z + "px"; c.style.top = e.clientY / z + "px"; }, true);
    addEventListener("mousedown", () => (c.style.transform = "translate(-50%,-50%) scale(.7)"), true);
    addEventListener("mouseup", () => (c.style.transform = "translate(-50%,-50%)"), true);
  });
};

export const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Moves the mouse to the centre of an element in small steps, so the motion looks human.
export async function glide(page, locator, steps = 30) {
  const b = await locator.boundingBox();
  await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps });
}
// Smooth scroll by dy pixels over ms.
export async function scroll(page, dy, ms = 1200) {
  const n = Math.round(ms / 16);
  for (let i = 0; i < n; i++) { await page.mouse.wheel(0, dy / n); await wait(16); }
}

// Records one clip to raw/<name>.webm, with raw/<name>.json holding the start and end marks (ms).
export async function record(name, url, act, { setup, cursor = true, zoom = 0 } = {}) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, colorScheme: "dark", recordVideo: { dir: "raw", size: { width: W, height: H } } });
  await ctx.addInitScript(PREP, { cursor, zoom });
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
