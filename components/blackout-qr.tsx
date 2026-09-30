"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import jsQR from "jsqr";
import QRCore, { type Level, type Mode, type OptimizeOptions, type Phase, type Snapshot } from "@/lib/qr-core";
import type { WorkerRequest, WorkerResponse } from "@/lib/qr.worker";

type FillMode = Exclude<Mode, "standard">;
type Goal = "dark" | "light";

interface Settings {
  goal: Goal;
  text: string;
  v: number;
  lvl: Level;
  budget: number;
  mode: FillMode;
  ink: string;
  border: number;
}

interface Chip {
  kind: string;
  text: string;
}

const DEFAULTS: Settings = {
  goal: "dark",
  text: "https://example.com/menu",
  v: 10,
  lvl: "L",
  budget: 0.5,
  mode: "hidden",
  ink: "#000000",
  border: 4,
};
const STORE_KEY = "blackout-qr-settings";

const GOALS: [Goal, string, string][] = [
  ["dark", "Dark", "most ink"],
  ["light", "Light", "least ink"],
];
const LEVELS: [Level, string][] = [["L", "7%"], ["M", "15%"], ["Q", "25%"], ["H", "30%"]];
const FILL_MODES: [FillMode, string, string][] = [
  ["hidden", "Hidden", "darkest"],
  ["fragment", "Link fragment", "strict standard"],
];
const INKS: [string, string][] = [
  ["Black", "#000000"],
  ["Midnight", "#0b1f3a"],
  ["Forest", "#0f3b2a"],
  ["Oxblood", "#4a0e14"],
];
const BORDERS: [number, string][] = [[4, "standard"], [8, "modules"], [16, "modules"]];

const PHASES: Record<Phase, [string, number, number]> = {
  start: ["Placing your text", 0, 0.05],
  tune: ["Tuning parity bits", 0.05, 0.35],
  pairs: ["Searching bit pairs", 0.35, 0.75],
  triples: ["Searching bit triples", 0.75, 1],
  done: ["Search finished", 1, 1],
};

const VERIFIED: Chip = { kind: "good", text: "Verified · reads back as your text" };
const SEARCHING: Chip = { kind: "busy", text: "Searching" };

// ---------- helpers ----------
function loadSettings(): Settings | null {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY) || "null");
    if (!saved || typeof saved.text !== "string") return null;
    const s = { ...DEFAULTS, text: saved.text.slice(0, 3000) };
    if (saved.v >= 1 && saved.v <= 40) s.v = saved.v | 0;
    if (/^[LMQH]$/.test(saved.lvl)) s.lvl = saved.lvl;
    if (saved.budget >= 0 && saved.budget <= 1) s.budget = saved.budget;
    if (saved.mode === "hidden" || saved.mode === "fragment") s.mode = saved.mode;
    if (saved.goal === "dark" || saved.goal === "light") s.goal = saved.goal;
    if ([4, 8, 16].includes(saved.border)) s.border = saved.border;
    if (/^#[0-9a-f]{6}$/i.test(saved.ink)) s.ink = saved.ink;
    return s;
  } catch {
    return null;
  }
}

function minVersionFor(text: string, lvl: Level, mode: FillMode) {
  return text ? QRCore.minVersion(text, lvl, mode) : 1;
}

// Link fragment can't be used when the text already has a #, and the size can't drop below what the text needs.
function normalize(s: Settings): Settings {
  const mode = s.mode === "fragment" && s.text.includes("#") ? "hidden" : s.mode;
  const minV = minVersionFor(s.text, s.lvl, mode);
  const v = minV && s.v < minV ? minV : s.v;
  return mode === s.mode && v === s.v ? s : { ...s, mode, v };
}

function byteLen(s: string) {
  return new TextEncoder().encode(s).length;
}

function hexRGB(hex: string) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(hex: string) {
  const c = hexRGB(hex).map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}

function paint(canvas: HTMLCanvasElement, snap: Snapshot, scale: number, border: number, ink: string) {
  const n = snap.n, W = (n + 2 * border) * scale;
  canvas.width = W;
  canvas.height = W;
  const ctx = canvas.getContext("2d")!, img = ctx.createImageData(W, W), px = img.data, rgb = hexRGB(ink);
  px.fill(255);
  const M = snap.matrix;
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (!M[r * n + c]) continue;
    for (let y = 0; y < scale; y++) {
      const row = ((r + border) * scale + y) * W;
      for (let x = 0; x < scale; x++) {
        const i = (row + (c + border) * scale + x) * 4;
        px[i] = rgb[0]; px[i + 1] = rgb[1]; px[i + 2] = rgb[2];
      }
    }
  }
  ctx.putImageData(img, 0, 0);
  return ctx;
}

// Render off-screen at the current ink and border and read it back with jsQR.
function verify(snap: Snapshot, ink: string, border: number) {
  const c = document.createElement("canvas"), scale = snap.n > 100 ? 4 : 6;
  const ctx = paint(c, snap, scale, Math.max(4, border), ink);
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const res = jsQR(img.data, c.width, c.height, { inversionAttempts: "dontInvert" });
  return !!res && res.data === snap.decoded;
}

function svgFor(snap: Snapshot, border: number, ink: string) {
  const n = snap.n, b = border, W = n + 2 * b;
  let d = "";
  for (let r = 0; r < n; r++) {
    let c = 0;
    while (c < n) {
      if (!snap.matrix[r * n + c]) { c++; continue; }
      const s = c;
      while (c < n && snap.matrix[r * n + c]) c++;
      d += "M" + (s + b) + " " + (r + b) + "h" + (c - s) + "v1h-" + (c - s) + "z";
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${W}" width="${W * 10}" height="${W * 10}" shape-rendering="crispEdges"><rect width="${W}" height="${W}" fill="#ffffff"/><path fill="${ink}" d="${d}"/></svg>`;
}

function baseName(text: string, v: number, light: boolean) {
  const m = /^[a-z]+:\/\/([^\/?#]+)/i.exec(text.trim());
  const host = m ? m[1].replace(/[^a-z0-9.-]/gi, "") : "";
  return "blackout-qr" + (light ? "-light" : "") + (host ? "-" + host : "") + "-v" + v;
}

function downloadBlob(filename: string, blob: Blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ---------- component ----------
export default function BlackoutQR() {
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);
  const [customInk, setCustomInk] = useState("#2b2350");
  const [snap, setSnap] = useState<Snapshot | null>(null);
  const [empty, setEmpty] = useState(false);
  const [chip, setChip] = useState<Chip>({ kind: "busy", text: "Starting" });
  const [buttonsOn, setButtonsOn] = useState(false);
  const [toastMsg, setToastMsg] = useState("");

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const settingsRef = useRef(settings); // updated synchronously so async search callbacks see the latest ink and border
  const currentRef = useRef<Snapshot | null>(null); // latest snapshot
  const verifiedRef = useRef<Snapshot | null>(null); // latest snapshot that decoded correctly
  const jobRef = useRef(0);
  const workerRef = useRef<Worker | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const delayRef = useRef(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { goal, text, v, lvl, budget, mode, ink, border } = settings;
  const minV = useMemo(() => minVersionFor(text, lvl, mode), [text, lvl, mode]);

  const update = (patch: Partial<Settings>, delay?: number) => {
    if (delay != null) delayRef.current = delay;
    const next = normalize({ ...settingsRef.current, ...patch });
    settingsRef.current = next;
    setSettings(next);
  };

  // restore saved settings after hydration
  useEffect(() => {
    const saved = loadSettings();
    if (saved) {
      const next = normalize(saved);
      settingsRef.current = next;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- localStorage is only readable after hydration
      setSettings(next);
      if (!INKS.some(([, hex]) => hex === saved.ink)) setCustomInk(saved.ink);
    }
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(settings)); } catch {}
  }, [settings, loaded]);

  // ---------- running the search ----------
  const showSnap = useCallback((s: Snapshot | null) => {
    currentRef.current = s;
    setSnap(s);
  }, []);

  const stop = useCallback(() => {
    if (workerRef.current) { workerRef.current.terminate(); workerRef.current = null; }
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  const onSnapshot = useCallback((id: number, s: Snapshot, done: boolean) => {
    if (id !== jobRef.current) return;
    showSnap(s);
    const tuneDone = s.phase === "tune" && s.progress === 1;
    if (tuneDone || done) {
      const { ink, border } = settingsRef.current;
      if (verify(s, ink, border)) {
        verifiedRef.current = s;
        setChip(done ? VERIFIED : { kind: "good busy", text: "Verified · still improving" });
        setButtonsOn(true);
      } else if (done && verifiedRef.current) {
        showSnap(verifiedRef.current);
        setChip(VERIFIED);
      } else {
        setChip({ kind: "bad", text: "Didn't read back · lower the repair budget or use darker ink" });
        if (done) setButtonsOn(false);
      }
    } else if (!verifiedRef.current) setChip(SEARCHING);
  }, [showSnap]);

  const runMain = useCallback((id: number, opts: OptimizeOptions) => {
    const g = QRCore.optimize(opts);
    const step = () => {
      if (id !== jobRef.current) return;
      const r = g.next();
      onSnapshot(id, r.value, !!r.done);
      if (!r.done) timerRef.current = setTimeout(step, 0);
    };
    step();
  }, [onSnapshot]);

  useEffect(() => {
    if (!loaded) return;
    const debounce = setTimeout(() => {
      stop();
      const id = ++jobRef.current;
      verifiedRef.current = null;
      setButtonsOn(false);
      if (!text) { setEmpty(true); setChip({ kind: "", text: "Waiting for text" }); showSnap(null); return; }
      setEmpty(false);
      if (!minV) { setChip({ kind: "bad", text: "Text too long" }); showSnap(null); return; }
      setChip(SEARCHING);
      const opts: OptimizeOptions = {
        text, v, lvl, mode, budget, light: goal === "light", seed: 1 + (id * 7919) % 100000, tripleMs: 400,
      };
      try {
        const worker = new Worker(new URL("../lib/qr.worker.ts", import.meta.url));
        workerRef.current = worker;
        let got = false;
        worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
          got = true;
          if (e.data.id === id) onSnapshot(id, e.data.snap, e.data.done);
        };
        worker.onerror = (ev) => {
          if (id !== jobRef.current) return;
          if (!got) { ev.preventDefault(); stop(); runMain(id, opts); }
          else setChip({ kind: "bad", text: "The search stopped unexpectedly. Change a setting to retry." });
        };
        worker.postMessage({ id, opts } satisfies WorkerRequest);
      } catch {
        workerRef.current = null;
        runMain(id, opts);
      }
    }, delayRef.current);
    return () => clearTimeout(debounce);
  }, [loaded, goal, text, v, lvl, mode, budget, minV, stop, showSnap, onSnapshot, runMain]);

  useEffect(() => stop, [stop]);

  // ---------- rendering ----------
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    if (!snap) { c.width = 10; c.height = 10; return; }
    const total = snap.n + 2 * border;
    paint(c, snap, Math.max(2, Math.floor(720 / total)), border, ink);
  }, [snap, ink, border]);

  const dark = useMemo(() => (snap ? snap.matrix.reduce((s, m) => s + m, 0) : 0), [snap]);

  // ink or border changed without a new search: re-check the latest result
  const recolor = (nextInk: string, nextBorder: number) => {
    const s = currentRef.current;
    if (!s) return;
    if (verify(s, nextInk, nextBorder)) { verifiedRef.current = s; setChip(VERIFIED); setButtonsOn(true); }
    else { verifiedRef.current = null; setChip({ kind: "bad", text: "Didn't read back with this ink. Try a darker color." }); setButtonsOn(false); }
  };
  const setInk = (hex: string) => { update({ ink: hex }); recolor(hex, border); };
  const setBorder = (b: number) => { update({ border: b }); if (verifiedRef.current) recolor(ink, b); };

  // ---------- exports ----------
  const toast = (msg: string) => {
    setToastMsg(msg);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToastMsg(""), 4000);
  };
  const downloadPng = () => {
    const ver = verifiedRef.current;
    if (!ver) return;
    const total = ver.n + 2 * border, scale = Math.max(8, Math.ceil(1600 / total)), c = document.createElement("canvas");
    paint(c, ver, scale, border, ink);
    const name = baseName(text, ver.v, ver.light) + ".png";
    c.toBlob((blob) => { if (blob) { downloadBlob(name, blob); toast("Saved " + name); } }, "image/png");
  };
  const downloadSvg = () => {
    const ver = verifiedRef.current;
    if (!ver) return;
    const name = baseName(text, ver.v, ver.light) + ".svg";
    downloadBlob(name, new Blob([svgFor(ver, border, ink)], { type: "image/svg+xml" }));
    toast("Saved " + name);
  };
  const copySvg = () => {
    const ver = verifiedRef.current;
    if (!ver) return;
    try {
      navigator.clipboard.writeText(svgFor(ver, border, ink)).then(() => toast("SVG copied"), () => toast("Copying isn't allowed in this view."));
    } catch {
      toast("Copying isn't allowed in this view.");
    }
  };

  // ---------- derived UI ----------
  const light = goal === "light";
  const hasHash = text.includes("#");
  const n = 4 * v + 17;
  const per = QRCore.correctable(v, lvl, QRCore.blocksOf(v, lvl)[0].e);
  const painted = Math.round(budget * per);
  const paints = light ? "Blanks" : "Paints";
  let budgetHint: [string, string];
  if (painted === 0) budgetHint = ["hint", `No codewords ${light ? "blanked" : "painted"}. The full repair capacity (${per} per block) stays free for real damage.`];
  else if (painted === per) budgetHint = ["hint bad", `${paints} all ${per} repairable codewords in each block. No margin left: a smudge, crease or glare spot can stop it scanning.`];
  else budgetHint = [painted / per > 0.6 ? "hint warn" : "hint", `${paints} ${painted} of ${per} repairable codewords in each block. ${per - painted} stay free for real damage.`];
  let modeHint = mode === "hidden"
    ? "Filler goes after the end-of-message marker, where QR readers stop reading. It scans as exactly your text."
    : "Filler becomes digits after a # at the end of your link. Fully standard, and browsers don't send the # part to the website.";
  if (hasHash) modeHint += " Link fragment is off because your text already contains #.";

  const phase = snap ? PHASES[snap.phase] || PHASES.start : null;
  const barWidth = snap && phase ? (100 * (phase[1] + (phase[2] - phase[1]) * snap.progress)).toFixed(1) + "%" : "0";

  return (
    <main className="grid">
      <section className="controls" aria-label="Settings">
        <div className="field">
          <span className="label" id="goalLabel">Aim for</span>
          <div className="seg" role="radiogroup" aria-labelledby="goalLabel">
            {GOALS.map(([value, label, sub]) => (
              <label key={value}>
                <input type="radio" name="goal" value={value} checked={goal === value}
                  onChange={() => update({ goal: value }, 0)} />
                <span>{label}<small>{sub}</small></span>
              </label>
            ))}
          </div>
          <p className="hint">
            {light
              ? "Every bit the search can choose is aimed at blank paper. Finder and timing patterns always stay."
              : "Every bit the search can choose is aimed at solid ink."}
          </p>
        </div>

        <div className="field">
          <div className="field-head">
            <label className="label" htmlFor="txt">Link or text</label>
            <span className="value">{byteLen(text).toLocaleString()} bytes</span>
          </div>
          <textarea id="txt" spellCheck={false} autoComplete="off" value={text}
            onChange={(e) => update({ text: e.target.value }, 450)} />
          <p className="hint bad" hidden={!!minV}>
            Too long for error-correction level {lvl}. Shorten the text or pick a lower level.
          </p>
        </div>

        <div className="field">
          <div className="field-head">
            <label className="label" htmlFor="size">Size</label>
            <span className="value">{n} × {n} · v{v}</span>
          </div>
          <input type="range" id="size" min={minV || 1} max={40} step={1} value={v}
            onChange={(e) => update({ v: +e.target.value }, 250)} />
          <p className="hint">
            Bigger codes can {light ? "go lighter" : "carry more ink"}, but need a bigger print or a closer phone.
          </p>
        </div>

        <div className="field">
          <span className="label" id="ecLabel">Error correction</span>
          <div className="seg" role="radiogroup" aria-labelledby="ecLabel">
            {LEVELS.map(([value, pct]) => (
              <label key={value}>
                <input type="radio" name="ec" value={value} checked={lvl === value}
                  onChange={() => update({ lvl: value }, 0)} />
                <span>{value}<small>{pct}</small></span>
              </label>
            ))}
          </div>
          <p className="hint">L leaves the most room for ink. Higher levels can repair more damage.</p>
        </div>

        <div className="field">
          <div className="field-head">
            <label className="label" htmlFor="budget">Repair budget spent on {light ? "blanking" : "ink"}</label>
            <span className="value">{Math.round(budget * 100)}%</span>
          </div>
          <input type="range" id="budget" min={0} max={100} step={5} value={Math.round(budget * 100)}
            onChange={(e) => update({ budget: +e.target.value / 100 }, 250)} />
          <p className={budgetHint[0]}>{budgetHint[1]}</p>
        </div>

        <div className="divider" aria-hidden="true"></div>

        <div className="field">
          <span className="label" id="fillLabel">Filler bits</span>
          <div className="seg" role="radiogroup" aria-labelledby="fillLabel">
            {FILL_MODES.map(([value, label, sub]) => (
              <label key={value}>
                <input type="radio" name="mode" value={value} checked={mode === value}
                  disabled={value === "fragment" && hasHash} onChange={() => update({ mode: value }, 0)} />
                <span>{label}<small>{sub}</small></span>
              </label>
            ))}
          </div>
          <p className="hint">{modeHint}</p>
        </div>

        <div className="field">
          <span className="label" id="inkLabel">Ink</span>
          <div className="swatches" role="radiogroup" aria-labelledby="inkLabel">
            {INKS.map(([name, hex]) => (
              <label className="swatch" title={name} key={hex}>
                <input type="radio" name="ink" value={hex} checked={ink === hex} onChange={() => setInk(hex)} />
                <span style={{ "--c": hex } as CSSProperties}></span>
              </label>
            ))}
            <label className="custom-color">
              Custom{" "}
              <input type="color" value={customInk} aria-label="Custom ink color"
                onChange={(e) => { setCustomInk(e.target.value); setInk(e.target.value); }} />
            </label>
          </div>
          <p className="hint warn" hidden={luminance(ink) < 0.12}>
            This ink is light. Scanners need strong contrast, so test before printing.
          </p>
        </div>

        <div className="field">
          <span className="label" id="borderLabel">White border</span>
          <div className="seg" role="radiogroup" aria-labelledby="borderLabel">
            {BORDERS.map(([value, sub]) => (
              <label key={value}>
                <input type="radio" name="border" value={value} checked={border === value}
                  onChange={() => setBorder(value)} />
                <span>{value}<small>{sub}</small></span>
              </label>
            ))}
          </div>
          <p className="hint">Some scanners read very dark codes more reliably with a wider border.</p>
        </div>
      </section>

      <section className="stage" aria-label="Preview">
        <div className="readout">
          <div className="big">
            <span className="label">Ink coverage</span>
            <div className="pct-line">
              <span className="pct">{snap ? ((100 * dark) / (snap.n * snap.n)).toFixed(1) : "00.0"}</span>
              <span className="pct-sign">%</span>
            </div>
          </div>
          <span className={"chip " + chip.kind} role="status">{chip.text}</span>
        </div>
        <div className="proof">
          <div className="crop"></div>
          <div className="sheet">
            <canvas ref={canvasRef} width={10} height={10} aria-label="QR code preview"></canvas>
            <div className="empty" hidden={!empty}>Type a link or message to make a code.</div>
          </div>
        </div>
        <div className="progress">
          <div className="bar"><i style={{ width: barWidth }}></i></div>
          <div className="phase">
            <span>{phase ? phase[0] : "Waiting"}</span>
            <span>{snap ? (snap.light ? dark : snap.n * snap.n - dark).toLocaleString() + (snap.light ? " dark" : " light") + " modules left" : ""}</span>
          </div>
        </div>
        <div className="actions">
          <button type="button" disabled={!buttonsOn} onClick={downloadPng}>Download PNG</button>
          <button type="button" className="ghost" disabled={!buttonsOn} onClick={downloadSvg}>Download SVG</button>
          <button type="button" className="ghost" disabled={!buttonsOn} onClick={copySvg}>Copy SVG</button>
          <span className="toast" role="status">{toastMsg}</span>
        </div>
        <dl className="specs">
          <div><dt>Modules</dt><dd>{snap ? `${snap.n} × ${snap.n}` : "–"}</dd></div>
          <div><dt>Version</dt><dd>{snap ? `${snap.v}-${snap.lvl}` : "–"}</dd></div>
          <div><dt>Mask</dt><dd>{snap ? snap.mask : "–"}</dd></div>
          <div><dt>Painted codewords</dt><dd>{snap ? snap.painted.toLocaleString() : "–"}</dd></div>
          <div><dt>Repair margin</dt><dd>{snap ? `${snap.margin} / block` : "–"}</dd></div>
          <div><dt>Free filler</dt><dd>{snap ? `${snap.freeBits.toLocaleString()} bits` : "–"}</dd></div>
          <div className="wide"><dt>Scans as</dt><dd title={snap?.decoded}>{snap ? snap.decoded : "–"}</dd></div>
        </dl>
      </section>
    </main>
  );
}
