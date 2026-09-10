// js/windowManager.js
// A small Windows-like window manager: draggable/resizable windows, a
// taskbar with live entries, focus/z-index handling, minimize/maximize/close.

let zTop = 100;
const windows = new Map(); // winId -> { el, appId, minimized, maximized, prevRect, taskbarBtn }
let winSeq = 0;

function layerEl() { return document.getElementById("window-layer"); }
function taskbarItemsEl() { return document.getElementById("taskbar-items"); }

function clampToDesktop(x, y, w, h) {
  const maxX = window.innerWidth - 80;
  const maxY = window.innerHeight - 80;
  return { x: Math.max(0, Math.min(x, maxX)), y: Math.max(0, Math.min(y, maxY)) };
}

function focusWindow(winId) {
  const w = windows.get(winId);
  if (!w) return;
  zTop += 1;
  w.el.style.zIndex = zTop;
  windows.forEach((other, id) => {
    other.el.classList.toggle("focused", id === winId);
    if (other.taskbarBtn) other.taskbarBtn.classList.toggle("active", id === winId && !other.minimized);
  });
}

function makeResizeHandles(win) {
  const dirs = ["n", "s", "e", "w", "ne", "nw", "se", "sw"];
  dirs.forEach((dir) => {
    const h = document.createElement("div");
    h.className = `resize-handle rh-${dir}`;
    h.addEventListener("mousedown", (e) => startResize(e, win, dir));
    win.el.appendChild(h);
  });
}

function startResize(e, win, dir) {
  if (win.maximized) return;
  e.preventDefault();
  e.stopPropagation();
  focusWindow(win.id);
  const startX = e.clientX, startY = e.clientY;
  const rect = win.el.getBoundingClientRect();
  const start = { x: rect.left, y: rect.top, w: rect.width, h: rect.height };

  function onMove(ev) {
    const dx = ev.clientX - startX;
    const dy = ev.clientY - startY;
    let { x, y, w, h } = start;
    if (dir.includes("e")) w = Math.max(320, start.w + dx);
    if (dir.includes("s")) h = Math.max(200, start.h + dy);
    if (dir.includes("w")) { w = Math.max(320, start.w - dx); x = start.x + (start.w - w); }
    if (dir.includes("n")) { h = Math.max(200, start.h - dy); y = start.y + (start.h - h); }
    win.el.style.left = x + "px";
    win.el.style.top = y + "px";
    win.el.style.width = w + "px";
    win.el.style.height = h + "px";
  }
  function onUp() {
    document.removeEventListener("mousemove", onMove);
    document.removeEventListener("mouseup", onUp);
  }
  document.addEventListener("mousemove", onMove);
  document.addEventListener("mouseup", onUp);
}

function makeDraggable(win, handleEl) {
  handleEl.addEventListener("mousedown", (e) => {
    if (e.target.closest(".win-btn")) return;
    if (win.maximized) return;
    focusWindow(win.id);
    const startX = e.clientX, startY = e.clientY;
    const rect = win.el.getBoundingClientRect();
    const start = { x: rect.left, y: rect.top };

    function onMove(ev) {
      const nx = start.x + (ev.clientX - startX);
      const ny = Math.max(0, start.y + (ev.clientY - startY));
      win.el.style.left = nx + "px";
      win.el.style.top = ny + "px";
    }
    function onUp() {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });
}

function toggleMaximize(win) {
  const desktopH = window.innerHeight - 52;
  if (!win.maximized) {
    win.prevRect = {
      left: win.el.style.left, top: win.el.style.top,
      width: win.el.style.width, height: win.el.style.height,
    };
    win.el.style.left = "0px";
    win.el.style.top = "0px";
    win.el.style.width = "100vw";
    win.el.style.height = desktopH + "px";
    win.el.classList.add("maximized");
    win.maximized = true;
  } else {
    Object.assign(win.el.style, win.prevRect);
    win.el.classList.remove("maximized");
    win.maximized = false;
  }
}

function minimizeWindow(win) {
  win.minimized = true;
  win.el.classList.add("hidden");
  if (win.taskbarBtn) win.taskbarBtn.classList.remove("active");
}

function restoreWindow(win) {
  win.minimized = false;
  win.el.classList.remove("hidden");
  focusWindow(win.id);
}

function closeWindow(win) {
  if (win.onClose) { try { win.onClose(); } catch (e) {} }
  win.el.remove();
  if (win.taskbarBtn) win.taskbarBtn.remove();
  windows.delete(win.id);
}

function addTaskbarItem(win) {
  const btn = document.createElement("button");
  btn.className = "task-item";
  btn.innerHTML = `${win.iconSrc ? `<img src="${win.iconSrc}" onerror="this.replaceWith(Object.assign(document.createElement('span'),{textContent:'?',style:'display:inline-flex;width:16px;height:16px;background:#000;border:1px solid #3a3a3a;border-radius:3px;align-items:center;justify-content:center;font-size:10px;color:#767676;'}))" />` : ""}<span>${win.title}</span>`;
  btn.addEventListener("click", () => {
    if (win.minimized) restoreWindow(win);
    else if (win.el.classList.contains("focused")) minimizeWindow(win);
    else focusWindow(win.id);
  });
  taskbarItemsEl().appendChild(btn);
  win.taskbarBtn = btn;
}

/**
 * Opens a new window.
 * @param {Object} opts
 * @param {string} opts.appId - stable app identifier (e.g. "notes")
 * @param {string} opts.title
 * @param {string} [opts.iconSrc]
 * @param {number} [opts.width=680]
 * @param {number} [opts.height=460]
 * @param {HTMLElement} opts.content - element to mount inside the window body
 * @param {Function} [opts.onClose]
 * @param {boolean} [opts.singleton] - if true, focuses the existing window of this appId instead of opening a new one
 */
export function openWindow(opts) {
  if (opts.singleton) {
    const existing = Array.from(windows.values()).find((w) => w.appId === opts.appId);
    if (existing) { restoreWindow(existing); return existing; }
  }

  const id = "win-" + (++winSeq);
  const width = opts.width || 680;
  const height = opts.height || 460;
  const offset = (winSeq % 8) * 24;

  const el = document.createElement("div");
  el.className = "window";
  el.style.left = (90 + offset) + "px";
  el.style.top = (60 + offset) + "px";
  el.style.width = width + "px";
  el.style.height = height + "px";

  el.innerHTML = `
    <div class="win-titlebar">
      ${opts.iconSrc ? `<img class="t-icon" src="${opts.iconSrc}" onerror="this.style.visibility='hidden'" />` : ""}
      <div class="t-title">${opts.title}</div>
      <button class="win-btn min" title="Minimize">&#8211;</button>
      <button class="win-btn max" title="Maximize">&#9633;</button>
      <button class="win-btn close" title="Close">&#10005;</button>
    </div>
    <div class="win-body"></div>
  `;

  layerEl().appendChild(el);
  const body = el.querySelector(".win-body");
  if (opts.content) body.appendChild(opts.content);

  const win = { id, appId: opts.appId, title: opts.title, iconSrc: opts.iconSrc, el, minimized: false, maximized: false, onClose: opts.onClose };
  windows.set(id, win);

  makeDraggable(win, el.querySelector(".win-titlebar"));
  makeResizeHandles(win);
  addTaskbarItem(win);

  el.querySelector(".win-btn.min").addEventListener("click", () => minimizeWindow(win));
  el.querySelector(".win-btn.max").addEventListener("click", () => toggleMaximize(win));
  el.querySelector(".win-btn.close").addEventListener("click", () => closeWindow(win));
  el.addEventListener("mousedown", () => focusWindow(id));

  focusWindow(id);
  return { id, el, body, setTitle: (t) => { win.title = t; el.querySelector(".t-title").textContent = t; if (win.taskbarBtn) win.taskbarBtn.querySelector("span").textContent = t; }, close: () => closeWindow(win) };
}

export function closeAllWindows() {
  Array.from(windows.values()).forEach(closeWindow);
}

window.DarkhatWM = { openWindow, closeAllWindows };
