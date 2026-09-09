// js/apps/notes.js
import { openWindow } from "../windowManager.js";
import { showContextMenu } from "../contextMenu.js";
import * as FS from "../fileSystem.js";

let winHandle = null;
let sidebarEl, titleInput, bodyInput, deleteBtn;
let activeId = null;
let saveTimer = null;

async function allNotes() {
  const [sys, desk] = await Promise.all([FS.listFiles("system"), FS.listFiles("desktop")]);
  return [...sys, ...desk].filter((f) => f.type === "note");
}

async function renderSidebar() {
  const notes = await allNotes();
  sidebarEl.innerHTML = "";
  notes.forEach((n) => {
    const row = document.createElement("div");
    row.className = "sidebar-item" + (n.id === activeId ? " active" : "");
    row.innerHTML = `<span>${n.name}</span><span class="del" title="Delete">&#10005;</span>`;
    row.addEventListener("click", () => selectNote(n.id));
    row.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, [
        { label: "Rename", onClick: () => renameNote(n) },
        { sep: true },
        { label: "Delete", danger: true, onClick: () => removeNote(n.id) },
      ]);
    });
    row.querySelector(".del").addEventListener("click", (e) => { e.stopPropagation(); removeNote(n.id); });
    sidebarEl.appendChild(row);
  });
  if (!notes.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No notes yet.";
    sidebarEl.appendChild(empty);
  }
}

async function selectNote(id) {
  activeId = id;
  const note = await FS.getFile(id);
  titleInput.value = note ? note.name : "";
  bodyInput.value = note ? (note.content || "") : "";
  bodyInput.disabled = titleInput.disabled = !note;
  deleteBtn.disabled = !note;
  renderSidebar();
}

function queueSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    if (!activeId) return;
    await FS.updateFile(activeId, { name: titleInput.value || "Untitled", content: bodyInput.value });
    renderSidebar();
  }, 500);
}

async function renameNote(n) {
  const name = prompt("Rename note:", n.name);
  if (!name) return;
  await FS.updateFile(n.id, { name });
  if (activeId === n.id) titleInput.value = name;
  renderSidebar();
}

async function removeNote(id) {
  if (!confirm("Delete this note?")) return;
  await FS.deleteFile(id);
  if (activeId === id) { activeId = null; titleInput.value = ""; bodyInput.value = ""; bodyInput.disabled = titleInput.disabled = true; deleteBtn.disabled = true; }
  renderSidebar();
}

async function newNote() {
  const id = await FS.createFile({ type: "note", name: "Untitled", content: "", location: "system", parentId: null });
  await selectNote(id);
}

function buildUI() {
  const root = document.createElement("div");
  root.className = "split";
  root.style.height = "100%";

  const sidebarWrap = document.createElement("div");
  sidebarWrap.className = "sidebar";
  sidebarWrap.style.display = "flex";
  sidebarWrap.style.flexDirection = "column";
  const newBtn = document.createElement("button");
  newBtn.className = "app-btn primary";
  newBtn.style.margin = "10px";
  newBtn.textContent = "+ New Note";
  newBtn.addEventListener("click", newNote);
  sidebarEl = document.createElement("div");
  sidebarEl.style.flex = "1";
  sidebarEl.style.overflowY = "auto";
  sidebarWrap.appendChild(newBtn);
  sidebarWrap.appendChild(sidebarEl);

  const editor = document.createElement("div");
  editor.className = "note-editor";
  editor.style.flex = "1";
  titleInput = document.createElement("input");
  titleInput.className = "title";
  titleInput.placeholder = "Title";
  titleInput.disabled = true;
  bodyInput = document.createElement("textarea");
  bodyInput.placeholder = "Start typing...";
  bodyInput.disabled = true;
  titleInput.addEventListener("input", queueSave);
  bodyInput.addEventListener("input", queueSave);

  const bar = document.createElement("div");
  bar.className = "app-toolbar";
  deleteBtn = document.createElement("button");
  deleteBtn.className = "app-btn danger";
  deleteBtn.textContent = "Delete";
  deleteBtn.disabled = true;
  deleteBtn.addEventListener("click", () => activeId && removeNote(activeId));
  bar.appendChild(deleteBtn);

  editor.appendChild(titleInput);
  editor.appendChild(bar);
  editor.appendChild(bodyInput);

  root.appendChild(sidebarWrap);
  root.appendChild(editor);
  return root;
}

function open() {
  if (winHandle) { openWindow({ appId: "notes", singleton: true }); return; }
  const content = buildUI();
  winHandle = openWindow({ appId: "notes", title: "Notes", iconSrc: "/images/notes.png", width: 640, height: 440, content, onClose: () => { winHandle = null; } });
  renderSidebar();
}

function openNote(id) {
  open();
  selectNote(id);
}

window.DarkhatApps = window.DarkhatApps || {};
window.DarkhatApps.notes = { open, openNote };
