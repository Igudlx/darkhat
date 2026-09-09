// js/apps/coder.js
import { openWindow } from "../windowManager.js";
import { showContextMenu } from "../contextMenu.js";
import * as FS from "../fileSystem.js";

let winHandle = null;
let sidebarEl, tabsEl, editorArea, finishBtn, testBtn;
let activeProject = null;
let activeTab = "html";
let saveTimer = null;

function buildDoc(project, { test }) {
  const watermark = test
    ? `<div style="position:fixed;bottom:10px;right:12px;color:rgba(255,60,60,0.55);font:700 12px/1 'Roboto Mono',monospace;pointer-events:none;z-index:999999;">TEST MODE</div>`
    : `<div style="position:fixed;bottom:10px;left:12px;color:rgba(255,255,255,0.35);font:700 12px/1 'Roboto Mono',monospace;pointer-events:none;z-index:999999;">Powered By darkhat</div>`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>${project.css || ""}</style></head>
<body>${project.html || ""}${watermark}<script>${project.js || ""}<\/script></body></html>`;
}

function launch(doc) {
  const win = window.open("", "_blank");
  if (!win) { alert("Popup blocked! Allow popups to run the project."); return; }
  win.document.open();
  win.document.write(doc);
  win.document.close();
}

async function renderSidebar() {
  const projects = await FS.listProjects();
  sidebarEl.innerHTML = "";
  projects.forEach((p) => {
    const row = document.createElement("div");
    row.className = "sidebar-item" + (activeProject && p.id === activeProject.id ? " active" : "");
    row.innerHTML = `<span>${p.name}</span><span class="del" title="Delete">&#10005;</span>`;
    row.addEventListener("click", () => selectProject(p.id));
    row.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, [
        { label: "Rename", onClick: () => renameProject(p) },
        { sep: true },
        { label: "Delete", danger: true, onClick: () => removeProject(p.id) },
      ]);
    });
    row.querySelector(".del").addEventListener("click", (e) => { e.stopPropagation(); removeProject(p.id); });
    sidebarEl.appendChild(row);
  });
  if (!projects.length) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    empty.textContent = "No projects yet.";
    sidebarEl.appendChild(empty);
  }
}

async function selectProject(id) {
  const projects = await FS.listProjects();
  activeProject = projects.find((p) => p.id === id) || null;
  const disabled = !activeProject;
  editorArea.querySelector("textarea").disabled = disabled;
  finishBtn.disabled = testBtn.disabled = disabled;
  renderEditor();
  renderSidebar();
}

function renderEditor() {
  tabsEl.querySelectorAll(".coder-tab").forEach((t) => t.classList.toggle("active", t.dataset.tab === activeTab));
  const ta = editorArea.querySelector("textarea");
  ta.value = activeProject ? (activeProject[activeTab] || "") : "";
}

function queueSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    if (!activeProject) return;
    await FS.updateProject(activeProject.id, { [activeTab]: editorArea.querySelector("textarea").value });
  }, 500);
}

async function renameProject(p) {
  const name = prompt("Rename project:", p.name);
  if (!name) return;
  await FS.updateProject(p.id, { name });
  renderSidebar();
}

async function removeProject(id) {
  if (!confirm("Delete this project?")) return;
  await FS.deleteProject(id);
  if (activeProject && activeProject.id === id) { activeProject = null; renderEditor(); finishBtn.disabled = testBtn.disabled = true; editorArea.querySelector("textarea").disabled = true; }
  renderSidebar();
}

async function newProject() {
  const name = prompt("Project name:", "My Project");
  if (!name) return;
  const id = await FS.createProject(name);
  await selectProject(id);
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
  newBtn.textContent = "+ New Project";
  newBtn.addEventListener("click", newProject);
  sidebarEl = document.createElement("div");
  sidebarEl.style.flex = "1";
  sidebarEl.style.overflowY = "auto";
  sidebarWrap.appendChild(newBtn);
  sidebarWrap.appendChild(sidebarEl);

  const main = document.createElement("div");
  main.className = "coder-layout";
  main.style.flex = "1";

  const bar = document.createElement("div");
  bar.className = "app-toolbar";
  testBtn = document.createElement("button");
  testBtn.className = "app-btn";
  testBtn.textContent = "Test";
  testBtn.disabled = true;
  testBtn.addEventListener("click", () => activeProject && launch(buildDoc(activeProject, { test: true })));
  finishBtn = document.createElement("button");
  finishBtn.className = "app-btn primary";
  finishBtn.textContent = "Finish → Finished Projects";
  finishBtn.disabled = true;
  finishBtn.addEventListener("click", async () => {
    if (!activeProject) return;
    await FS.finishProject(activeProject);
    finishBtn.textContent = "Saved ✓";
    setTimeout(() => (finishBtn.textContent = "Finish → Finished Projects"), 1200);
  });
  bar.appendChild(testBtn);
  bar.appendChild(finishBtn);

  tabsEl = document.createElement("div");
  tabsEl.className = "coder-tabs";
  ["html", "css", "js"].forEach((t) => {
    const tab = document.createElement("div");
    tab.className = "coder-tab" + (t === "html" ? " active" : "");
    tab.dataset.tab = t;
    tab.textContent = t.toUpperCase();
    tab.addEventListener("click", () => { activeTab = t; renderEditor(); });
    tabsEl.appendChild(tab);
  });

  editorArea = document.createElement("div");
  editorArea.className = "coder-editor";
  const ta = document.createElement("textarea");
  ta.disabled = true;
  ta.spellcheck = false;
  ta.addEventListener("input", queueSave);
  editorArea.appendChild(ta);

  main.appendChild(bar);
  main.appendChild(tabsEl);
  main.appendChild(editorArea);

  root.appendChild(sidebarWrap);
  root.appendChild(main);
  return root;
}

function open() {
  if (winHandle) { openWindow({ appId: "coder", singleton: true }); return; }
  const content = buildUI();
  winHandle = openWindow({ appId: "coder", title: "CodeR", iconSrc: "/images/coder.png", width: 760, height: 500, content, onClose: () => { winHandle = null; } });
  renderSidebar();
}

function openFinishedProject(fileItem) {
  launch(buildDoc(fileItem, { test: false }));
}

window.DarkhatApps = window.DarkhatApps || {};
window.DarkhatApps.coder = { open, openFinishedProject };
