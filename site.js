// bernardo geadas — personal site. Zero-build, no dependencies.
// Everything here is progressive: with JS off (or reduced motion) the pages are
// complete and static; this file only adds motion and the live numbers.

const REDUCED = matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, el = document) => el.querySelector(s);
const $$ = (s, el = document) => [...el.querySelectorAll(s)];

const LIVE = {
  scanner: "https://cryptogeadas.github.io/defi-yield-scanner/data/latest.json",
  rwa: "https://cryptogeadas.github.io/tokenized-rwa-tracker/data/latest.json",
};

/* ---- theme --------------------------------------------------------------- */
function initTheme() {
  const btn = $("#theme");
  if (!btn) return;
  btn.addEventListener("click", () => {
    const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch {}
  });
}

/* ---- nav ----------------------------------------------------------------- */
function initNav() {
  const nav = $(".nav");
  if (!nav) return;
  const on = () => nav.classList.toggle("scrolled", scrollY > 24);
  on();
  addEventListener("scroll", on, { passive: true });
}

/* ---- hero name: split into letters that rise in --------------------------- */
function splitName() {
  const h = $(".name");
  if (!h || REDUCED) return;
  h.setAttribute("aria-label", h.textContent.replace(/\s+/g, " ").trim());
  let n = 0;
  $$(".line", h).forEach((line, li) => {
    const text = line.textContent.trim();
    line.textContent = "";
    for (const c of text) {
      const s = document.createElement("span");
      s.className = "ch";
      s.setAttribute("aria-hidden", "true");
      s.textContent = c === " " ? " " : c;
      s.style.animationDelay = `${120 + li * 140 + n++ * 32}ms`;
      line.append(s);
    }
  });
}

/* ---- text decode effect --------------------------------------------------- */
const GLYPHS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/·";
function scramble(el) {
  const final = el.dataset.final ?? (el.dataset.final = el.textContent);
  if (REDUCED) { el.textContent = final; return; }
  const dur = 650, t0 = performance.now();
  const tick = (now) => {
    const p = Math.min(1, (now - t0) / dur);
    let out = "";
    for (let i = 0; i < final.length; i++) {
      const c = final[i];
      out += c === " " || i / final.length < p ? c : GLYPHS[(Math.random() * GLYPHS.length) | 0];
    }
    el.textContent = out;
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ---- count-up ------------------------------------------------------------ */
function countUp(el) {
  const to = parseFloat(el.dataset.count);
  const dec = parseInt(el.dataset.dec || "0", 10);
  const pre = el.dataset.pre || "", suf = el.dataset.suf || "";
  const fmt = (v) => pre + v.toFixed(dec) + suf;
  if (REDUCED) { el.textContent = fmt(to); return; }
  const dur = 1400, t0 = performance.now();
  const tick = (now) => {
    const p = Math.min(1, (now - t0) / dur);
    el.textContent = fmt(to * (1 - Math.pow(1 - p, 4)));
    if (p < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/* ---- reveal on scroll ----------------------------------------------------- */
function initReveal() {
  const targets = $$(".reveal, [data-scramble], [data-count]");
  if (!("IntersectionObserver" in window)) {
    targets.forEach((el) => el.classList.add("in"));
    return;
  }
  $$("[data-count]").forEach((el) => {
    if (!REDUCED) el.textContent = (el.dataset.pre || "") + "0" + (el.dataset.suf || "");
  });
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target;
      el.classList.add("in");
      if (el.hasAttribute("data-scramble")) scramble(el);
      if (el.hasAttribute("data-count")) countUp(el);
      io.unobserve(el);
    }
  }, { rootMargin: "0px 0px -10% 0px", threshold: 0.1 });
  targets.forEach((el) => io.observe(el));
}

/* ---- experience timeline: rail fills as you scroll ------------------------ */
function initTimeline() {
  const tl = $(".timeline");
  if (!tl) return;
  const fill = $(".rail i", tl);
  const roles = $$(".role", tl);
  let queued = false;
  const update = () => {
    queued = false;
    const line = innerHeight * 0.62;
    const r = tl.getBoundingClientRect();
    const p = Math.max(0, Math.min(1, (line - r.top) / r.height));
    fill.style.height = `${p * 100}%`;
    roles.forEach((role) => {
      const node = $(".node", role).getBoundingClientRect();
      role.classList.toggle("lit", node.top < line);
    });
  };
  const q = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  update();
  addEventListener("scroll", q, { passive: true });
  addEventListener("resize", q);
}

/* ---- pointer spotlight on cards ------------------------------------------ */
function initSpotlight() {
  $$(".tcard, .leaf").forEach((el) => {
    el.addEventListener("pointermove", (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - r.left}px`);
      el.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  });
}

/* ---- the field: a perspective lattice that lifts under the pointer -------- */
function initField(canvas) {
  const ctx = canvas.getContext("2d");
  const strength = parseFloat(canvas.dataset.strength || "1");
  let w = 0, h = 0, dpr = 1, cols = 0, rows = 0;
  let colors = {};
  const ptr = { x: -9999, y: -9999, tx: -9999, ty: -9999, real: false, last: -1e9 };
  let running = false, visible = true, raf = 0;

  const readColors = () => {
    const cs = getComputedStyle(document.documentElement);
    const v = (n, fb) => cs.getPropertyValue(n).trim() || fb;
    colors = { dot: v("--muted", "#7C8696"), accent: v("--accent", "#3B82F6"), text: v("--text", "#E4E8EE") };
  };

  const resize = () => {
    const r = canvas.getBoundingClientRect();
    dpr = Math.min(2, devicePixelRatio || 1);
    w = r.width; h = r.height;
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = w < 700 ? 34 : 64;
    rows = w < 700 ? 30 : 42;
    if (!running) draw(0);
  };

  const Z0 = 1.6, Z1 = 11, CAM = 1.15;
  const wave = (x, z, t) =>
    0.2 * Math.sin(x * 0.8 + t * 0.55) * Math.cos(z * 0.6 - t * 0.35) +
    0.09 * Math.sin(z * 1.4 + x * 0.45 + t * 0.8);

  // one frame; t in seconds
  const draw = (t) => {
    ctx.clearRect(0, 0, w, h);
    const fov = h * 0.78, cx = w / 2, hy = h * 0.36;
    const sigma = Math.max(110, w * 0.1), s2 = 2 * sigma * sigma;
    const lit = ptr.real ? colors.accent : colors.text;
    const grid = new Array(rows);

    for (let r = 0; r < rows; r++) {
      const z = Z0 + (Z1 - Z0) * (r / (rows - 1));
      const half = (z * (w / 2)) / fov * 1.15;
      const depthFade = Math.pow(1 - (z - Z0) / (Z1 - Z0), 1.1);
      const row = (grid[r] = new Array(cols));
      for (let c = 0; c < cols; c++) {
        const x = (c / (cols - 1) * 2 - 1) * half;
        const y = wave(x, z, t);
        const px = cx + (x * fov) / z;
        let py = hy + ((CAM - y) * fov) / z;
        const dx = px - ptr.x, dy = py - ptr.y;
        const lift = Math.exp(-(dx * dx + dy * dy) / s2) * strength;
        py -= (lift * 60) / Math.sqrt(z);
        row[c] = { px, py, lift, depthFade, z };
      }
    }

    // wires between lifted neighbours
    ctx.lineWidth = 1;
    ctx.strokeStyle = lit;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const p = grid[r][c];
        if (p.lift < 0.14) continue;
        const nb = [c + 1 < cols && grid[r][c + 1], r + 1 < rows && grid[r + 1][c]];
        for (const q of nb) {
          if (!q || q.lift < 0.14) continue;
          ctx.globalAlpha = Math.min(p.lift, q.lift) * 0.55 * p.depthFade;
          ctx.beginPath(); ctx.moveTo(p.px, p.py); ctx.lineTo(q.px, q.py); ctx.stroke();
        }
      }
    }

    // dots
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const p = grid[r][c];
        if (p.px < -4 || p.px > w + 4 || p.py < -4 || p.py > h + 4) continue;
        const size = Math.max(0.6, 2.4 / Math.sqrt(p.z)) + p.lift * 1.8;
        if (p.lift > 0.1) {
          ctx.fillStyle = lit;
          ctx.globalAlpha = Math.min(1, 0.25 + p.lift) * p.depthFade;
        } else {
          ctx.fillStyle = colors.dot;
          ctx.globalAlpha = 0.55 * p.depthFade;
        }
        ctx.fillRect(p.px - size / 2, p.py - size / 2, size, size);
      }
    }
    ctx.globalAlpha = 1;
  };

  const loop = (now) => {
    const t = now / 1000;
    if (!ptr.real || now - ptr.last > 2500) {
      // idle: a slow wandering "scanner" keeps the field alive on touch / no pointer
      ptr.real = false;
      ptr.tx = w * (0.5 + 0.34 * Math.sin(t * 0.21));
      ptr.ty = h * (0.62 + 0.14 * Math.sin(t * 0.33 + 1));
    }
    if (ptr.x < -1000) { ptr.x = ptr.tx; ptr.y = ptr.ty; }
    ptr.x += (ptr.tx - ptr.x) * 0.09;
    ptr.y += (ptr.ty - ptr.y) * 0.09;
    draw(t);
    raf = requestAnimationFrame(loop);
  };

  const start = () => { if (!running && visible && !document.hidden && !REDUCED) { running = true; raf = requestAnimationFrame(loop); } };
  const stop = () => { running = false; cancelAnimationFrame(raf); };

  addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left, y = e.clientY - r.top;
    if (x < 0 || y < 0 || x > r.width || y > r.height) return;
    ptr.tx = x; ptr.ty = y; ptr.real = true; ptr.last = performance.now();
  }, { passive: true });

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(canvas);
  document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  new MutationObserver(() => { readColors(); if (!running) draw(0); })
    .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  matchMedia("(prefers-color-scheme: dark)").addEventListener?.("change", () => { readColors(); if (!running) draw(0); });
  new ResizeObserver(resize).observe(canvas);

  readColors();
  resize();
  if (REDUCED) { ptr.x = w * 0.62; ptr.y = h * 0.6; draw(0); } else start();
}

/* ---- live numbers from the tools' own published snapshots ---------------- */
const nf = new Intl.NumberFormat("en-US");
function ago(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (!isFinite(s)) return "";
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))}m ago`;
  if (s < 86400 * 2) return `${Math.round(s / 3600)}h ago`;
  return `${Math.round(s / 86400)}d ago`;
}
async function getJSON(url) {
  const ctl = new AbortController();
  const to = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetch(url, { signal: ctl.signal, cache: "no-cache" });
    return r.ok ? await r.json() : null;
  } catch { return null; } finally { clearTimeout(to); }
}
async function initLive() {
  const slots = $$("[data-live]");
  if (!slots.length) return;
  const [scan, rwa] = await Promise.all([getJSON(LIVE.scanner), getJSON(LIVE.rwa)]);
  const text = {
    "scanner-kept": scan?.stats && `<b>${nf.format(scan.stats.kept)}</b> pools pass the filter, from <b>${nf.format(scan.stats.totalPools)}</b> screened`,
    "scanner-age": scan?.generatedAt && `· refreshed ${ago(scan.generatedAt)}`,
    "rwa-count": rwa?.stats && `<b>${rwa.stats.mainStageCount + rwa.stats.secondaryCount}</b> funds classified · <b>${rwa.stats.unclassifiedCount}</b> flagged as unclassified`,
    "rwa-age": rwa?.generatedAt && `· refreshed ${ago(rwa.generatedAt)}`,
    "hero-scanner": scan?.stats && `<b>${nf.format(scan.stats.kept)}</b> stablecoin pools pass the trust filter`,
    "hero-rwa": rwa?.stats && `<b>${rwa.stats.mainStageCount + rwa.stats.secondaryCount}</b> tokenized funds classified`,
  };
  let any = false;
  for (const el of slots) {
    const v = text[el.dataset.live];
    if (v) { el.innerHTML = v; any = true; } else el.remove();
  }
  const strip = $(".live-strip");
  if (strip) any ? strip.classList.add("ready") : strip.remove();
}

/* ---- tools tree: wires drawn from parent to child ------------------------ */
function initTree() {
  const tree = $(".tree");
  if (!tree) return;
  const NS = "http://www.w3.org/2000/svg";
  const svg = document.createElementNS(NS, "svg");
  svg.classList.add("wires");
  svg.setAttribute("aria-hidden", "true");
  tree.prepend(svg);
  let drawn = false;

  const build = (animate) => {
    svg.replaceChildren();
    const T = tree.getBoundingClientRect();
    const stacked = getComputedStyle(tree).gridTemplateColumns.split(" ").length < 2;
    $$("[data-parent]", tree).forEach((child, i) => {
      const parent = tree.querySelector(`[data-node="${child.dataset.parent}"]`);
      if (!parent) return;
      const P = parent.getBoundingClientRect(), C = child.getBoundingClientRect();
      let d;
      if (!stacked) {
        const sx = P.right - T.left, sy = P.top + P.height / 2 - T.top;
        const ex = C.left - T.left, ey = C.top + Math.min(C.height / 2, 34) - T.top;
        const k = (ex - sx) * 0.55;
        d = `M${sx},${sy} C${sx + k},${sy} ${ex - k},${ey} ${ex},${ey}`;
      } else {
        const sx = P.left - T.left + 14, sy = P.bottom - T.top;
        const ex = C.left - T.left, ey = C.top + Math.min(C.height / 2, 30) - T.top;
        d = `M${sx},${sy} L${sx},${ey - 10} Q${sx},${ey} ${sx + 10},${ey} L${ex},${ey}`;
      }
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", d);
      path.classList.add("wire");
      if (child.dataset.hot !== undefined) path.classList.add("hot");
      svg.append(path);
      if (animate && !REDUCED) {
        const len = path.getTotalLength();
        path.style.strokeDasharray = len;
        path.style.strokeDashoffset = len;
        path.style.transition = `stroke-dashoffset 1100ms cubic-bezier(.6,0,.2,1) ${120 + i * 110}ms`;
        requestAnimationFrame(() => requestAnimationFrame(() => (path.style.strokeDashoffset = 0)));
      }
      if (child.dataset.hot !== undefined && !REDUCED) {
        const dot = document.createElementNS(NS, "circle");
        dot.setAttribute("r", "2.5");
        dot.classList.add("packet");
        const m = document.createElementNS(NS, "animateMotion");
        m.setAttribute("dur", `${2.4 + (i % 3) * 0.5}s`);
        m.setAttribute("repeatCount", "indefinite");
        m.setAttribute("begin", `${1.2 + (i % 4) * 0.45}s`);
        m.setAttribute("path", d);
        dot.append(m);
        svg.append(dot);
      }
    });
  };

  new IntersectionObserver(([e], io) => {
    if (e.isIntersecting && !drawn) { drawn = true; build(true); io.disconnect(); }
  }, { threshold: 0.05 }).observe(tree);
  let t;
  new ResizeObserver(() => { if (!drawn) return; clearTimeout(t); t = setTimeout(() => build(false), 80); }).observe(tree);
}

/* ---- boot ---------------------------------------------------------------- */
splitName();
initTheme();
initNav();
initReveal();
initTimeline();
initSpotlight();
initTree();
$$("canvas.field").forEach(initField);
initLive();
const yr = $("#yr"); if (yr) yr.textContent = new Date().getFullYear();
