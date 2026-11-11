// bernardogeadas.com — home page only (v2 redesign).
// 1) Background video in the hero: plays muted while on screen.
//    Respects prefers-reduced-motion (starts paused, shows the poster).
// 2) Live mini-previews in the tool cards, read from the tools' own snapshots.
// 3) Text fades in and rises on scroll; proof numbers count up. Off for reduced motion.
// Progressive: with JS off the hero shows the poster and the cards show "—".

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, el = document) => el.querySelector(s);

/* ---- hero video ---------------------------------------------------------- */
function initHeroVideo() {
  const video = $("[data-hero-video]");
  if (!video || REDUCED) return; // reduced motion: the poster stays, nothing plays
  // Only play while the hero is on screen (saves CPU/battery further down the page).
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting) video.play().catch(() => {}); // autoplay blocked: the poster stays
    else if (!video.paused) video.pause();
  }, { threshold: 0.2 }).observe(video);
}

/* ---- tool card previews --------------------------------------------------- */
async function getJSON(url) {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(url, { signal: ctl.signal, cache: "no-cache" });
    return r.ok ? await r.json() : null;
  } catch { return null; } finally { clearTimeout(to); }
}
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

async function previewScanner(el) {
  const scan = await getJSON("/defi-yield-scanner/data/latest.json");
  const rows = (scan?.windows?.["1"] || [])
    .filter((r) => r.access !== "permissioned" && isFinite(r.base))
    .sort((a, b) => b.base - a.base)
    .slice(0, 3);
  if (!rows.length) return;
  const flag = (f) => (f === "▲" ? "dot-live warn" : f === "▼" ? "dot-live" : "dot-live");
  const head = el.querySelector(".pv-h").outerHTML;
  el.innerHTML = head + rows.map((r) =>
    `<div class="pv-r"><span class="nm">${esc(r.name)} · ${esc(r.symbol)}</span><span class="v">${r.base.toFixed(2)}%</span><span class="${flag(r.divFlag)}"${r.divFlag === "▼" ? ' style="background:var(--faint);box-shadow:none"' : ""}></span></div>`
  ).join("");
}

async function previewRWA(el) {
  const rwa = await getJSON("/tokenized-rwa-tracker/data/latest.json");
  const funds = rwa?.mainStage || [];
  if (!funds.length) return;
  const count = { 1: 0, 2: 0, 3: 0, 4: 0 };
  funds.forEach((f) => { if (count[f.trust_tier] !== undefined) count[f.trust_tier]++; });
  const total = funds.length;
  const color = { 1: "var(--accent)", 2: "color-mix(in srgb, var(--accent) 50%, var(--border-strong))", 3: "var(--muted)", 4: "var(--warn)" };
  const bar = [1, 2, 3, 4].filter((t) => count[t]).map((t) =>
    `<i style="width:${(count[t] / total * 100).toFixed(1)}%;background:${color[t]}"></i>`).join("");
  const legend = [1, 2, 3, 4].map((t) =>
    `<span><i style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${color[t]}"></i>Tier ${t} · ${count[t]}</span>`).join("");
  el.querySelector("[data-pv-total]").textContent = `${total} funds`;
  el.querySelector(".pv-bar").innerHTML = bar;
  el.querySelector(".pv-lg").innerHTML = legend;
}

/* ---- text reveal on scroll --------------------------------------------------
   Each block fades in and moves up a little as it comes on screen; items in one group
   arrive one after another. Only JS adds the .reveal class, so with JS off or reduced
   motion every block simply shows. */
const REVEAL = [
  ".home-section .label", ".home-section h2", ".home-section .body-text", ".section-head p",
  ".chips .chip", ".facts-panel .fact", ".jobs > li", ".partner-grid li",
  ".card-grid .card", ".contact-list a", ".stat-cell",
].join(", ");

function initReveal() {
  if (REDUCED || !("IntersectionObserver" in window)) return;
  const hero = [...document.querySelectorAll(".intro-copy > *, .hero-side > *")];
  const rest = [...document.querySelectorAll(REVEAL)];
  // Delay by position among matched siblings, capped so long lists don't drag.
  const stagger = (els, step, max = 560) => {
    const n = new Map();
    els.forEach((el) => {
      const i = n.get(el.parentElement) || 0;
      n.set(el.parentElement, i + 1);
      el.style.setProperty("--reveal-delay", Math.min(i * step, max) + "ms");
    });
  };
  [...hero, ...rest].forEach((el) => el.classList.add("reveal"));
  stagger(hero, 110); stagger(rest, 70);
  // Two frames so the hidden state paints before the hero reveals.
  requestAnimationFrame(() => requestAnimationFrame(() => hero.forEach((el) => el.classList.add("in"))));
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); }
  }), { threshold: 0.15, rootMargin: "0px 0px -8% 0px" });
  rest.forEach((el) => io.observe(el));
}

/* ---- proof numbers count up from zero when first on screen -------------------- */
function initCountUp() {
  if (REDUCED || !("IntersectionObserver" in window)) return;
  const run = (el) => {
    const t = [...el.childNodes].find((n) => n.nodeType === 3);
    const m = t && t.textContent.match(/^(\d+)(.*)$/);
    if (!m) return;
    const end = +m[1], tail = m[2], t0 = performance.now(), dur = 1300;
    const tick = (now) => {
      const p = Math.min((now - t0) / dur, 1);
      t.textContent = Math.round(end * (1 - Math.pow(1 - p, 3))) + tail;
      if (p < 1) requestAnimationFrame(tick);
    };
    t.textContent = "0" + tail;
    requestAnimationFrame(tick);
  };
  const io = new IntersectionObserver((entries) => entries.forEach((e) => {
    if (e.isIntersecting) { run(e.target); io.unobserve(e.target); }
  }), { threshold: 0.6 });
  document.querySelectorAll(".stat-num").forEach((el) => io.observe(el));
}

initHeroVideo();
initReveal();
initCountUp();
const s =$('[data-preview="scanner"]'); if (s) previewScanner(s);
const r = $('[data-preview="rwa"]'); if (r) previewRWA(r);
