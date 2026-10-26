import { CHARSET, encodeName, seedFromBytes, generateStars, PRESETS } from "./sky.js";
import { drawSky, hex } from "./render.js";
import { LookAround } from "./look.js";

const nameInput = document.getElementById("name");
const help = document.getElementById("name-help");
const bytesEl = document.getElementById("bytes");
const presetsEl = document.getElementById("presets");
const canvas = document.getElementById("sky");
const sizeSelect = document.getElementById("size");
const captionBox = document.getElementById("caption");
const downloadBtn = document.getElementById("download");
const shareBtn = document.getElementById("share");
const statusEl = document.getElementById("status");
const mapView = document.getElementById("map-view");
const gameView = document.getElementById("game-view");
const exportEl = document.getElementById("export");
const gameCanvas = document.getElementById("game");
const driftBox = document.getElementById("drift");
const look = new LookAround(gameCanvas);

const HELP_TEXT = help.innerHTML;

const state = { name: "Link", count: 300, view: "map" };

// ---- URL state: ?name=Airimder&stars=1500 ----
{
  const q = new URLSearchParams(location.search);
  if (q.has("name") && encodeName(q.get("name"))) state.name = q.get("name");
  const c = Number(q.get("stars"));
  if (PRESETS.some((p) => p.count === c)) state.count = c;
  if (q.get("view") === "game") state.view = "game";
  nameInput.value = state.name;
}

function shareUrl() {
  const u = new URL(location.href);
  const params = { name: state.name, stars: state.count };
  if (state.view === "game") params.view = "game";
  u.search = new URLSearchParams(params).toString();
  return u.toString();
}

// ---- Rendering ----

function currentSky() {
  const bytes = encodeName(state.name);
  const preset = PRESETS.find((p) => p.count === state.count);
  return {
    bytes,
    seed: seedFromBytes(bytes),
    stars: generateStars(bytes, state.count),
    label: `${state.count} stars · ${preset.places}`,
  };
}

let frame = 0;
function render() {
  cancelAnimationFrame(frame);
  frame = requestAnimationFrame(() => {
    const sky = currentSky();
    if (state.view === "game") {
      look.setStars(sky.stars);
    } else {
      drawSky(canvas.getContext("2d"), canvas.width, sky.stars, null);
      canvas.setAttribute("aria-label", `Night sky for the name ${state.name}, ${state.count} stars`);
    }
  });
}

// ---- Name input ----

function showBytes(bytes) {
  const chars = [...state.name.padEnd(8, " ")];
  bytesEl.innerHTML = "";
  bytes.forEach((b, i) => {
    const cell = document.createElement("div");
    cell.className = "byte" + (i >= state.name.length ? " pad" : "");
    const ch = document.createElement("b");
    ch.textContent = chars[i] === " " ? "␣" : chars[i];
    const code = document.createElement("span");
    code.textContent = hex(b);
    cell.append(ch, code);
    bytesEl.append(cell);
  });
  const seed = document.createElement("div");
  seed.className = "seed";
  seed.innerHTML = `seed <strong>0x${hex(seedFromBytes(bytes), 8)}</strong>`;
  bytesEl.append(seed);
}

function onName() {
  const value = nameInput.value;
  const bytes = encodeName(value);
  if (!bytes) {
    const bad = [...value].find((ch) => !CHARSET.has(ch));
    nameInput.setAttribute("aria-invalid", "true");
    help.classList.add("error");
    help.textContent = bad ? `“${bad}” can't be typed on the file select screen.` : "Names are at most 8 characters.";
    return;
  }
  nameInput.removeAttribute("aria-invalid");
  help.classList.remove("error");
  help.innerHTML = HELP_TEXT;
  state.name = value;
  showBytes(bytes);
  history.replaceState(null, "", shareUrl());
  render();
}

nameInput.addEventListener("input", onName);

// ---- Star count presets ----

for (const p of PRESETS) {
  const chip = document.createElement("button");
  chip.type = "button";
  chip.className = "chip";
  chip.dataset.count = p.count;
  chip.innerHTML = `<strong>${p.count.toLocaleString("en-US")}</strong><span>${p.places}</span>`;
  chip.addEventListener("click", () => {
    state.count = p.count;
    syncChips();
    history.replaceState(null, "", shareUrl());
    render();
  });
  presetsEl.append(chip);
}

function syncChips() {
  for (const chip of presetsEl.children) {
    chip.setAttribute("aria-pressed", String(Number(chip.dataset.count) === state.count));
  }
}

// ---- Export ----

downloadBtn.addEventListener("click", () => {
  const size = Number(sizeSelect.value);
  downloadBtn.disabled = true;
  statusEl.textContent = `Drawing ${size} × ${size}…`;
  setTimeout(() => {
    const sky = currentSky();
    const off = document.createElement("canvas");
    off.width = off.height = size;
    const ctx = off.getContext("2d");
    if (!ctx) {
      fail(size);
      return;
    }
    drawSky(ctx, size, sky.stars, captionBox.checked ? { name: state.name, ...sky } : null);
    off.toBlob((blob) => {
      downloadBtn.disabled = false;
      if (!blob) {
        fail(size);
        return;
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${(state.name.trim() || "blank").replace(/[ .]+/g, "_")}_${state.count}_stars_${size}px.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 10000);
      statusEl.textContent = "";
    }, "image/png");
  }, 30);
});

function fail(size) {
  downloadBtn.disabled = false;
  statusEl.textContent = `This browser couldn't make a ${size} × ${size} image. Try a smaller size.`;
}

shareBtn.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(shareUrl());
    statusEl.textContent = "Link copied.";
  } catch {
    statusEl.textContent = shareUrl();
  }
});

// ---- View switch and in-game camera ----

const tabs = document.querySelectorAll(".view-tab");

function setView(view) {
  state.view = view;
  for (const t of tabs) t.setAttribute("aria-pressed", String(t.dataset.view === view));
  mapView.hidden = view !== "map";
  exportEl.hidden = view !== "map";
  gameView.hidden = view !== "game";
  if (view !== "game") driftBox.checked = false;
  history.replaceState(null, "", shareUrl());
  render();
}

for (const t of tabs) t.addEventListener("click", () => setView(t.dataset.view));

// Drag to look: moving the pointer across the frame turns the camera by the frame's field of view
let drag = null;
gameCanvas.addEventListener("pointerdown", (e) => {
  drag = { x: e.clientX, y: e.clientY };
  try {
    gameCanvas.setPointerCapture(e.pointerId);
  } catch {
    // not a capturable pointer; dragging still works while over the canvas
  }
});
gameCanvas.addEventListener("pointermove", (e) => {
  if (!drag) return;
  const radPerPx = (Math.PI / 3) / gameCanvas.clientHeight; // 60 degree vertical field of view
  look.look((e.clientX - drag.x) * radPerPx, (e.clientY - drag.y) * radPerPx);
  drag = { x: e.clientX, y: e.clientY };
});
const endDrag = () => { drag = null; };
gameCanvas.addEventListener("pointerup", endDrag);
gameCanvas.addEventListener("pointercancel", endDrag);

const KEY_STEP = Math.PI / 180;
const keysDown = new Set();
gameCanvas.addEventListener("keydown", (e) => {
  if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
  e.preventDefault();
  keysDown.add(e.key);
  startLoop();
});
gameCanvas.addEventListener("keyup", (e) => keysDown.delete(e.key));
gameCanvas.addEventListener("blur", () => keysDown.clear());
driftBox.addEventListener("change", startLoop);

let looping = false;
function startLoop() {
  if (looping) return;
  looping = true;
  let last = performance.now();
  const step = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    let yaw = 0, pitch = 0;
    if (keysDown.has("ArrowLeft")) yaw += 60 * KEY_STEP * dt;
    if (keysDown.has("ArrowRight")) yaw -= 60 * KEY_STEP * dt;
    if (keysDown.has("ArrowUp")) pitch += 45 * KEY_STEP * dt;
    if (keysDown.has("ArrowDown")) pitch -= 45 * KEY_STEP * dt;
    if (driftBox.checked) yaw += 2 * KEY_STEP * dt;
    if (yaw || pitch) look.look(yaw, pitch);
    if (keysDown.size || driftBox.checked) {
      requestAnimationFrame(step);
    } else {
      looping = false;
    }
  };
  requestAnimationFrame(step);
}

syncChips();
setView(state.view);
onName();
