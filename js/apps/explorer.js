// js/apps/explorer.js
// A reusable folder/grid file-explorer, used for the "System" and "Finished Projects"
// desktop folders. Supports (for System only) creating subfolders/text files, and
// rename/delete/cut/copy/paste — the familiar right-click flow.

import { openWindow } from "../windowManager.js";
import { showContextMenu } from "../contextMenu.js";
import * as FS from "../fileSystem.js";

let clipboard = null; // { ids: [...], mode: "cut"|"copy" }

function iconFor(item) {
  if (item.type === "folder") return "/images/folder.png";
  if (item.type === "note") return "/images/file-text.png";
  if (item.type === "project-finished") return "/images/file-html.png";
  return null;
}

export function openExplorer({ appId, title, iconSrc, location, allowCreate }) {
  const root = document.createElement("div");
  root.style.height = "100%";
  root.style.display = "flex";
  root.style.flexDirection = "column";

  const toolbar = document.createElement("div");
  toolbar.className = "app-toolbar";
  const crumb = document.createElement("div");
  crumb.style.cssText = "font-size:12px;color:var(--gray-400);font-weight:700;flex:1;";
  toolbar.appendChild(crumb);
  root.appendChild(toolbar);

  const grid = document.createElement("div");
  grid.className = "file-grid";
  root.appendChild(grid);

  let parentId = null;
  const stack = []; // breadcrumb of {id, name}

  async function render() {
    crumb.textContent = title + (stack.length ? " / " + stack.map((s) => s.name).join(" / ") : "");
    grid.innerHTML = "";
    const items = await FS.listFiles(location);
    const visible = items.filter((it) => (it.parentId || null) === parentId);

    if (!visible.length) {
      const empty = document.createElement("div");
      empty.className = "empty-state";
      empty.style.gridColumn = "1/-1";
      empty.textContent = allowCreate ? "Nothing here yet. Right-click to create something." : "Nothing here yet.";
      grid.appendChild(empty);
    }

    visible.forEach((item) => {
      const el = document.createElement("div");
      el.className = "file-item";
      el.draggable = true;
      const icon = iconFor(item);
      el.innerHTML = `
        ${icon ? `<img class="icon-img" src="${icon}" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'icon-fallback',textContent:'?'}))" />`
                : `<div class="icon-fallback">?</div>`}
        <div class="name">${item.name}</div>`;

      el.addEventListener("dblclick", () => openItem(item));
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        grid.querySelectorAll(".file-item.selected").forEach((n) => n.classList.remove("selected"));
        el.classList.add("selected");
      });
      el.addEventListener("dragstart", (ev) => {
        ev.dataTransfer.setData("text/darkhat-file", JSON.stringify({ id: item.id, location }));
      });
      el.addEventListener("contextmenu", (e) => {
        e.preventDefault(); e.stopPropagation();
        showContextMenu(e.clientX, e.clientY, itemMenu(item));
      });
      grid.appendChild(el);
    });
  }

  function itemMenu(item) {
    const menu = [
      { label: "Open", onClick: () => openItem(item) },
    ];
    if (allowCreate) {
      menu.push(
        { label: "Rename", onClick: () => renameItem(item) },
        { label: "Cut", onClick: () => { clipboard = { ids: [item.id], mode: "cut" }; } },
        { label: "Copy", onClick: () => { clipboard = { ids: [item.id], mode: "copy" }; } },
        { sep: true },
        { label: "Delete", danger: true, onClick: () => deleteItem(item) },
      );
    }
    return menu;
  }

  function backgroundMenu() {
    const menu = [];
    if (allowCreate) {
      menu.push(
        { label: "New Folder", onClick: createFolder },
        { label: "New Text File", onClick: createNote },
      );
      if (clipboard) menu.push({ label: "Paste", onClick: pasteClipboard });
      menu.push({ sep: true });
    }
    menu.push({ label: "Refresh", onClick: render });
    return menu;
  }

  async function openItem(item) {
    if (item.type === "folder") {
      stack.push({ id: item.id, name: item.name });
      parentId = item.id;
      render();
      return;
    }
    if (item.type === "note" && window.DarkhatApps?.notes) {
      window.DarkhatApps.notes.openNote(item.id);
      return;
    }
    if (item.type === "project-finished" && window.DarkhatApps?.coder) {
      window.DarkhatApps.coder.openFinishedProject(item);
      return;
    }
  }

  async function createFolder() {
    const name = prompt("Folder name:", "New Folder");
    if (!name) return;
    await FS.createFile({ type: "folder", name, location, parentId });
    render();
  }
  async function createNote() {
    const name = prompt("File name:", "New Note");
    if (!name) return;
    await FS.createFile({ type: "note", name, content: "", location, parentId });
    render();
  }
  async function renameItem(item) {
    const name = prompt("Rename:", item.name);
    if (!name) return;
    await FS.updateFile(item.id, { name });
    render();
  }
  async function deleteItem(item) {
    if (!confirm(`Delete "${item.name}"?`)) return;
    await FS.deleteFile(item.id);
    render();
  }
  async function pasteClipboard() {
    if (!clipboard) return;
    for (const id of clipboard.ids) {
      const src = await FS.getFile(id);
      if (!src) continue;
      if (clipboard.mode === "cut") {
        await FS.updateFile(id, { parentId });
      } else {
        const { id: _drop, createdAt, updatedAt, ...rest } = src;
        await FS.createFile({ ...rest, parentId, name: rest.name + " (copy)" });
      }
    }
    if (clipboard.mode === "cut") clipboard = null;
    render();
  }

  grid.addEventListener("contextmenu", (e) => {
    if (e.target !== grid) return;
    e.preventDefault();
    showContextMenu(e.clientX, e.clientY, backgroundMenu());
  });
  grid.addEventListener("click", () => {
    grid.querySelectorAll(".file-item.selected").forEach((n) => n.classList.remove("selected"));
  });

  render();

  return openWindow({ appId, title, iconSrc, width: 620, height: 440, content: root });
}
