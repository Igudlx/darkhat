// js/desktop.js
import { showContextMenu } from "./contextMenu.js";
import { openExplorer } from "./apps/explorer.js";
import { setClipboard, getClipboard, clearClipboard } from "./clipboard.js";
import * as FS from "./fileSystem.js";

const CELL_W = 100, CELL_H = 96;

const DEFAULT_APPS = [
  { id: "gamehub", name: "GameHub", icon: "/images/gamehub.png", open: () => window.DarkhatApps.gamehub.open() },
  { id: "ai", name: "AI", icon: "/images/ai.png", open: () => window.DarkhatApps.ai.open() },
  { id: "notes", name: "Notes", icon: "/images/notes.png", open: () => window.DarkhatApps.notes.open() },
  { id: "coder", name: "CodeR", icon: "/images/coder.png", open: () => window.DarkhatApps.coder.open() },
  { id: "extra", name: "Extra", icon: "/images/folder.png", open: () => window.DarkhatApps.extra.open() },
  { id: "system", name: "System", icon: "/images/folder.png", open: () => openExplorer({ appId: "system", title: "System", iconSrc: "/images/folder.png", location: "system", allowCreate: true }) },
  { id: "finished", name: "Finished Projects", icon: "/images/folder.png", open: () => openExplorer({ appId: "finished", title: "Finished Projects", iconSrc: "/images/folder.png", location: "finished", allowCreate: false }) },
];

let layoutCache = {};

function fileIcon(f) {
  if (f.type === "note") return "/images/file-text.png";
  if (f.type === "project-finished") return "/images/file-html.png";
  return "/images/folder.png";
}

function buildIconEl({ name, icon }) {
  const el = document.createElement("div");
  el.className = "desk-icon";
  el.innerHTML = `
    <img class="icon-img" src="${icon}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'icon-fallback',textContent:'?'}))" />
    <div class="icon-label">${name}</div>
  `;
  return el;
}

function placeIcon(el, pos) {
  if (pos) {
    el.style.gridColumnStart = pos.col + 1;
    el.style.gridRowStart = pos.row + 1;
  }
}

function pointToCell(clientX, clientY) {
  const container = document.getElementById("desktop-icons");
  const rect = container.getBoundingClientRect();
  const col = Math.max(0, Math.floor((clientX - rect.left) / CELL_W));
  const row = Math.max(0, Math.floor((clientY - rect.top) / CELL_H));
  return { col, row };
}

function attachDrag(el, id) {
  let dragging = false;
  el.addEventListener("mousedown", (e) => {
    if (e.button !== 0) return;
    dragging = false;
    const startX = e.clientX, startY = e.clientY;
    const container = document.getElementById("desktop-icons");
    const rect = el.getBoundingClientRect();
    const contRect = container.getBoundingClientRect();

    function onMove(ev) {
      if (!dragging && (Math.abs(ev.clientX - startX) > 4 || Math.abs(ev.clientY - startY) > 4)) {
        dragging = true;
        el.style.position = "absolute";
        el.style.left = (rect.left - contRect.left) + "px";
        el.style.top = (rect.top - contRect.top) + "px";
        el.style.zIndex = 10;
      }
      if (dragging) {
        el.style.left = (rect.left - contRect.left + (ev.clientX - startX)) + "px";
        el.style.top = (rect.top - contRect.top + (ev.clientY - startY)) + "px";
      }
    }
    async function onUp(ev) {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      if (dragging) {
        const cell = pointToCell(ev.clientX, ev.clientY);
        el.style.position = "";
        el.style.left = "";
        el.style.top = "";
        el.style.zIndex = "";
        placeIcon(el, cell);
        layoutCache[id] = cell;
        FS.saveDesktopLayout(layoutCache).catch((err) => console.warn("Couldn't save icon position:", err));
      }
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  });
  return () => dragging;
}

function wireIconEvents(el, id, onOpen, opts = {}) {
  const isDraggingRef = attachDrag(el, id);
  el.addEventListener("click", (e) => {
    e.stopPropagation();
    document.querySelectorAll(".desk-icon.selected").forEach((n) => n.classList.remove("selected"));
    el.classList.add("selected");
  });
  el.addEventListener("dblclick", () => { if (!isDraggingRef()) onOpen(); });
  el.addEventListener("contextmenu", (e) => {
    e.preventDefault(); e.stopPropagation();
    const menu = [{ label: "Open", onClick: onOpen }];
    if (opts.deletable) {
      menu.push(
        { label: "Rename", onClick: () => renameFile(opts.fileRef) },
        { label: "Cut", onClick: () => setClipboard([opts.fileRef.id], "cut") },
        { label: "Copy", onClick: () => setClipboard([opts.fileRef.id], "copy") },
        { sep: true },
        { label: "Delete", danger: true, onClick: () => deleteFile(opts.fileRef.id) },
      );
    } else {
      menu.push({ sep: true }, { label: "Can't be deleted", disabled: true });
    }
    showContextMenu(e.clientX, e.clientY, menu);
  });
}

async function renameFile(f) {
  const name = prompt("Rename:", f.name);
  if (!name) return;
  await FS.updateFile(f.id, { name });
  renderDesktop();
}
async function deleteFile(id) {
  if (!confirm("Delete this?")) return;
  await FS.deleteFile(id);
  renderDesktop();
}

function openDesktopFile(f) {
  if (f.type === "note") { window.DarkhatApps.notes.openNote(f.id); return; }
  if (f.type === "project-finished") { window.DarkhatApps.coder.openFinishedProject(f); return; }
  if (f.type === "folder") {
    openExplorer({
      appId: "desktop-folder-" + f.id,
      title: f.name,
      iconSrc: "/images/folder.png",
      location: "desktop",
      allowCreate: true,
      initialParentId: f.id,
      initialBreadcrumb: f.name,
      onChange: renderDesktop,
    });
  }
}

export async function renderDesktop() {
  const container = document.getElementById("desktop-icons");
  container.innerHTML = "";

  // Default app icons always render, even if Firestore can't be reached yet
  // (e.g. security rules not deployed) — the desktop should never be empty.
  let savedLayout = {};
  try {
    const userDoc = await FS.getUserDoc();
    savedLayout = userDoc.desktopLayout || {};
  } catch (err) {
    console.warn("Couldn't load saved desktop layout (check that firestore.rules is deployed):", err);
  }
  layoutCache = savedLayout;

  DEFAULT_APPS.forEach((app) => {
    const el = buildIconEl(app);
    placeIcon(el, layoutCache[app.id]);
    wireIconEvents(el, app.id, app.open, { deletable: false });
    container.appendChild(el);
  });

  let files = [];
  try {
    files = await FS.listFiles("desktop");
  } catch (err) {
    console.warn("Couldn't load desktop files (check that firestore.rules is deployed):", err);
  }
  files.filter((f) => !f.parentId).forEach((f) => {
    const el = buildIconEl({ name: f.name, icon: fileIcon(f) });
    placeIcon(el, layoutCache[f.id]);
    wireIconEvents(el, f.id, () => openDesktopFile(f), { deletable: true, fileRef: f });
    container.appendChild(el);
  });
}

async function createDesktopFolder() {
  const name = prompt("Folder name:", "New Folder");
  if (!name) return;
  await FS.createFile({ type: "folder", name, location: "desktop", parentId: null });
  renderDesktop();
}
async function createDesktopNote() {
  const name = prompt("File name:", "New Note");
  if (!name) return;
  await FS.createFile({ type: "note", name, content: "", location: "desktop", parentId: null });
  renderDesktop();
}
async function pasteToDesktop() {
  const clip = getClipboard();
  if (!clip) return;
  for (const id of clip.ids) {
    const src = await FS.getFile(id);
    if (!src) continue;
    if (clip.mode === "cut") {
      await FS.updateFile(id, { parentId: null, location: "desktop" });
    } else {
      const { id: _drop, createdAt, updatedAt, ...rest } = src;
      await FS.createFile({ ...rest, parentId: null, location: "desktop", name: rest.name + " (copy)" });
    }
  }
  if (clip.mode === "cut") clearClipboard();
  renderDesktop();
}

function desktopContextMenu(x, y) {
  const menu = [
    { label: "New Folder", onClick: createDesktopFolder },
    { label: "New Text File", onClick: createDesktopNote },
  ];
  if (getClipboard()) menu.push({ label: "Paste", onClick: pasteToDesktop });
  menu.push(
    { sep: true },
    { label: "Change Background", onClick: () => window.DarkhatApps.settings.toggle() },
    { label: "Refresh", onClick: renderDesktop },
  );
  showContextMenu(x, y, menu);
}

function updateClock() {
  const el = document.getElementById("clock");
  if (el) el.textContent = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function initDesktop() {
  renderDesktop();

  document.getElementById("desktop-icons").addEventListener("contextmenu", (e) => {
    if (e.target.id !== "desktop-icons") return;
    e.preventDefault();
    desktopContextMenu(e.clientX, e.clientY);
  });
  document.getElementById("desktop-icons").addEventListener("click", (e) => {
    if (e.target.id === "desktop-icons") document.querySelectorAll(".desk-icon.selected").forEach((n) => n.classList.remove("selected"));
  });
  document.getElementById("desktop-icons").addEventListener("dragover", (e) => e.preventDefault());
  document.getElementById("desktop-icons").addEventListener("drop", async (e) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData("text/darkhat-file");
    if (!raw) return;
    const { id } = JSON.parse(raw);
    const cell = pointToCell(e.clientX, e.clientY);
    await FS.updateFile(id, { location: "desktop", parentId: null, x: cell.col, y: cell.row });
    layoutCache[id] = cell;
    await FS.saveDesktopLayout(layoutCache);
    renderDesktop();
  });

  document.getElementById("start-btn").addEventListener("click", (e) => {
    e.stopPropagation();
    window.DarkhatApps.settings.toggle();
  });
  document.addEventListener("click", (e) => {
    const menu = document.getElementById("start-menu");
    if (!menu.classList.contains("hidden") && !menu.contains(e.target) && e.target.id !== "start-btn") {
      window.DarkhatApps.settings.close();
    }
  });

  updateClock();
  setInterval(updateClock, 1000 * 30);
}
