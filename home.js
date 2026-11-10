// bernardogeadas.com — home page only (v2 redesign).
// 1) Background video in the hero: plays muted, with a pause/play button.
//    Respects prefers-reduced-motion (starts paused, shows the poster).
// 2) Live mini-previews in the tool cards, read from the tools' own snapshots.
// Progressive: with JS off the hero shows the poster and the cards show "—".

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, el = document) => el.querySelector(s);

/* ---- hero video ---------------------------------------------------------- */
function initHeroVideo() {
  const video = $("[data-hero-video]");
  const btn = $("[data-hero-toggle]");
  if (!video || !btn) return;

  const setState = (playing) => {
    btn.setAttribute("aria-pressed", String(!playing));
    btn.textContent = playing ? "❚❚ Pause background" : "▶ Play background";
  };
  const play = () => video.play().then(() => setState(true)).catch(() => setState(false));
  const pause = () => { video.pause(); setState(false); };

  btn.hidden = false;
  btn.addEventListener("click", () => (video.paused ? play() : pause()));

  if (REDUCED) { setState(false); return; }
  // Only play while the hero is on screen (saves CPU/battery further down the page).
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && btn.getAttribute("aria-pressed") === "false") play();
    else if (!e.isIntersecting && !video.paused) video.pause();
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

initHeroVideo();
const s = $('[data-preview="scanner"]'); if (s) previewScanner(s);
const r = $('[data-preview="rwa"]'); if (r) previewRWA(r);
