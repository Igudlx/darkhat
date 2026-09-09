// js/desktop.js
import { showContextMenu } from "./contextMenu.js";
import { openExplorer } from "./apps/explorer.js";
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
        await FS.saveDesktopLayout(layoutCache);
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
  if (f.type === "note") window.DarkhatApps.notes.openNote(f.id);
  else if (f.type === "project-finished") window.DarkhatApps.coder.openFinishedProject(f);
}

export async function renderDesktop() {
  const container = document.getElementById("desktop-icons");
  container.innerHTML = "";
  const userDoc = await FS.getUserDoc();
  layoutCache = userDoc.desktopLayout || {};

  DEFAULT_APPS.forEach((app) => {
    const el = buildIconEl(app);
    placeIcon(el, layoutCache[app.id]);
    wireIconEvents(el, app.id, app.open, { deletable: false });
    container.appendChild(el);
  });

  const files = await FS.listFiles("desktop");
  files.forEach((f) => {
    const el = buildIconEl({ name: f.name, icon: fileIcon(f) });
    placeIcon(el, layoutCache[f.id]);
    wireIconEvents(el, f.id, () => openDesktopFile(f), { deletable: true, fileRef: f });
    container.appendChild(el);
  });
}

function desktopContextMenu(x, y) {
  showContextMenu(x, y, [
    { label: "New Text Note", onClick: async () => { await FS.createFile({ type: "note", name: "New Note", content: "", location: "desktop" }); renderDesktop(); } },
    { sep: true },
    { label: "Change Background", onClick: () => window.DarkhatApps.settings.toggle() },
    { label: "Refresh", onClick: renderDesktop },
  ]);
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
    await FS.moveFileToLocation(id, "desktop", cell.col, cell.row);
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
