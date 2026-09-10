// js/apps/extra.js
//
// Dev note: to add a new read-only text file inside Extra, just add an entry
// to CUSTOM_TEXT_FILES below — { name, content }. Users can open and read it
// but never edit it.
const CUSTOM_TEXT_FILES = [
  // { name: "Read Me First", content: "Whatever you want users to see here." },
];

// Dev note: this is the intentionally-trimmed link list for Extra. A few
// items from the original site were left out on purpose — see the README.
const EXTRA_LINKS = [
  { name: "Online Chat", url: "https://nodecrypt.runnertagvr.workers.dev/", message: "JOIN THE DARKHAT CHAT ROOM!" },
  { name: "Windows Emulator", url: "https://terminator.aeza.net/en/", message: "Service may be down at times." },
  { name: "Windows XP", url: "https://win32.run/", message: "Runs a real XP install in your browser." },
];

import { openWindow } from "../windowManager.js";
import * as FS from "../fileSystem.js";

let winHandle = null;

async function sha256Hex(str) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function checkStoredAccess() {
  const userDoc = await FS.getUserDoc();
  const storedHash = userDoc.extraAccessHash;
  if (!storedHash) return false;
  try {
    const res = await fetch("/api/verify-extra-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "check", hash: storedHash }),
    });
    const data = await res.json();
    return !!data.ok;
  } catch {
    return false;
  }
}

async function submitPassword(password) {
  const res = await fetch("/api/verify-extra-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "submit", password }),
  });
  const data = await res.json();
  if (data.ok && data.hash) {
    await FS.updateUserDoc({ extraAccessHash: data.hash });
    return true;
  }
  return false;
}

function buildGate(onUnlock) {
  const wrap = document.createElement("div");
  wrap.className = "gate";
  wrap.innerHTML = `
    <div style="font-weight:900;font-size:20px;color:var(--gray-100);">Extra</div>
    <input type="password" placeholder="Password" />
    <button class="app-btn primary">Unlock</button>
    <div class="login-error" style="min-height:14px;"></div>
  `;
  const input = wrap.querySelector("input");
  const btn = wrap.querySelector("button");
  const err = wrap.querySelector(".login-error");
  const attempt = async () => {
    btn.disabled = true;
    const ok = await submitPassword(input.value);
    btn.disabled = false;
    if (ok) onUnlock();
    else err.textContent = "Wrong password.";
  };
  btn.addEventListener("click", attempt);
  input.addEventListener("keydown", (e) => e.key === "Enter" && attempt());
  return wrap;
}

function buildContents() {
  const wrap = document.createElement("div");
  wrap.style.height = "100%";
  wrap.style.display = "flex";
  wrap.style.flexDirection = "column";

  const warn = document.createElement("div");
  warn.style.cssText = "padding:10px 14px;font-size:11.5px;color:var(--gray-500);border-bottom:1px solid var(--gray-800);";
  warn.textContent = "Some stuff in here might not work properly.";
  wrap.appendChild(warn);

  const grid = document.createElement("div");
  grid.className = "file-grid";
  wrap.appendChild(grid);

  EXTRA_LINKS.forEach((link) => {
    const el = document.createElement("div");
    el.className = "file-item";
    el.innerHTML = `<div class="icon-fallback">!</div><div class="name">${link.name}</div>`;
    el.addEventListener("dblclick", () => {
      if (link.message) alert(link.message);
      window.open(link.url, "_blank");
    });
    grid.appendChild(el);
  });

  CUSTOM_TEXT_FILES.forEach((doc) => {
    const el = document.createElement("div");
    el.className = "file-item";
    el.innerHTML = `<img class="icon-img" src="/images/file-text.png" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'icon-fallback',textContent:'?'}))" /><div class="name">${doc.name}</div>`;
    el.addEventListener("dblclick", () => openTextViewer(doc));
    grid.appendChild(el);
  });

  return wrap;
}

function openTextViewer(doc) {
  const content = document.createElement("div");
  content.className = "text-viewer";
  content.textContent = doc.content;
  openWindow({ appId: "extra-doc-" + doc.name, title: doc.name, iconSrc: "/images/file-text.png", width: 480, height: 400, content });
}

async function open() {
  if (winHandle) { openWindow({ appId: "extra", singleton: true }); return; }
  const placeholder = document.createElement("div");
  placeholder.style.height = "100%";
  winHandle = openWindow({ appId: "extra", title: "Extra", iconSrc: "/images/folder.png", width: 560, height: 420, content: placeholder, onClose: () => { winHandle = null; } });

  const hasAccess = await checkStoredAccess();
  if (hasAccess) {
    placeholder.replaceWith(buildContents());
  } else {
    const gate = buildGate(() => gate.replaceWith(buildContents()));
    placeholder.replaceWith(gate);
  }
}

window.DarkhatApps = window.DarkhatApps || {};
window.DarkhatApps.extra = { open };
