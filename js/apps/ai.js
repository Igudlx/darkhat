// js/apps/ai.js
import { openWindow } from "../windowManager.js";
import { showContextMenu } from "../contextMenu.js";
import * as FS from "../fileSystem.js";

let winHandle = null;
let sidebarWrap, chatLog, input, sendBtn, keyInput, lockBtn, sidebarToggleBtn;
let activeChatId = null;
let usingCustomKey = false;
let sidebarOpen = true;

function renderMessage(role, text) {
  const wrap = document.createElement("div");
  wrap.className = "msg " + (role === "user" ? "user" : "ai");

  const codeFence = /```([a-zA-Z]*)\n([\s\S]*?)```/g;
  let lastIndex = 0, match, hasCode = false;
  while ((match = codeFence.exec(text)) !== null) {
    hasCode = true;
    if (match.index > lastIndex) {
      wrap.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
    }
    const block = document.createElement("div");
    block.className = "code-block";
    const copyBtn = document.createElement("button");
    copyBtn.className = "app-btn code-copy-btn";
    copyBtn.textContent = "Copy";
    copyBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(match[2]).then(() => {
        copyBtn.textContent = "Copied!";
        setTimeout(() => (copyBtn.textContent = "Copy"), 1200);
      });
    });
    const pre = document.createElement("pre");
    pre.textContent = match[2];
    block.appendChild(copyBtn);
    block.appendChild(pre);
    wrap.appendChild(block);
    lastIndex = codeFence.lastIndex;
  }
  if (!hasCode) {
    wrap.textContent = text;
  } else if (lastIndex < text.length) {
    wrap.appendChild(document.createTextNode(text.slice(lastIndex)));
  }
  chatLog.appendChild(wrap);
  chatLog.scrollTop = chatLog.scrollHeight;
}

async function renderSidebarList() {
  const chats = await FS.listChats();
  sidebarWrap.innerHTML = "";
  const newBtn = document.createElement("button");
  newBtn.className = "app-btn primary";
  newBtn.style.margin = "10px";
  newBtn.textContent = "+ New Chat";
  newBtn.addEventListener("click", newChat);
  sidebarWrap.appendChild(newBtn);

  const list = document.createElement("div");
  list.style.flex = "1";
  list.style.overflowY = "auto";
  chats.forEach((c) => {
    const row = document.createElement("div");
    row.className = "sidebar-item" + (c.id === activeChatId ? " active" : "");
    row.innerHTML = `<span>${c.title}</span><span class="del" title="Delete">&#10005;</span>`;
    row.addEventListener("click", () => selectChat(c.id));
    row.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      showContextMenu(e.clientX, e.clientY, [
        { label: "Rename", onClick: () => renameChat(c) },
        { sep: true },
        { label: "Delete", danger: true, onClick: () => removeChat(c.id) },
      ]);
    });
    row.querySelector(".del").addEventListener("click", (e) => { e.stopPropagation(); removeChat(c.id); });
    list.appendChild(row);
  });
  sidebarWrap.appendChild(list);
}

async function selectChat(id) {
  activeChatId = id;
  const chats = await FS.listChats();
  const chat = chats.find((c) => c.id === id);
  chatLog.innerHTML = "";
  (chat ? chat.messages : []).forEach((m) => renderMessage(m.role, m.text));
  renderSidebarList();
}

async function newChat() {
  const id = await FS.createChat("New chat");
  await selectChat(id);
}

async function renameChat(c) {
  const title = prompt("Rename chat:", c.title);
  if (!title) return;
  await FS.updateChat(c.id, { title });
  renderSidebarList();
}

async function removeChat(id) {
  if (!confirm("Delete this chat?")) return;
  await FS.deleteChat(id);
  if (activeChatId === id) { activeChatId = null; chatLog.innerHTML = ""; }
  renderSidebarList();
}

async function sendMessage() {
  const text = input.value.trim();
  if (!text) return;
  if (!activeChatId) await newChat();
  input.value = "";
  renderMessage("user", text);
  sendBtn.disabled = true;

  const chats = await FS.listChats();
  const chat = chats.find((c) => c.id === activeChatId);
  const messages = [...(chat ? chat.messages : []), { role: "user", text }];

  try {
    const res = await fetch("/api/gemini", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages,
        customKey: usingCustomKey ? keyInput.value.trim() : null,
      }),
    });
    const data = await res.json();
    const reply = data.reply || "(No response — the API key may be out of tokens. Try adding your own key above.)";
    renderMessage("ai", reply);
    messages.push({ role: "ai", text: reply });
    await FS.updateChat(activeChatId, {
      messages,
      title: chat && chat.title !== "New chat" ? chat.title : text.slice(0, 32),
    });
  } catch (err) {
    renderMessage("ai", "Something went wrong reaching the AI. Please try again.");
  } finally {
    sendBtn.disabled = false;
    renderSidebarList();
  }
}

async function toggleKeyLock() {
  if (usingCustomKey) {
    usingCustomKey = false;
    keyInput.value = "";
    keyInput.disabled = false;
    lockBtn.textContent = "Lock In";
    await FS.updateUserDoc({ geminiKey: null });
  } else {
    const key = keyInput.value.trim();
    if (!key) { alert("Paste your Gemini API key first."); return; }
    usingCustomKey = true;
    keyInput.disabled = true;
    lockBtn.textContent = "Unlock";
    await FS.updateUserDoc({ geminiKey: key });
  }
}

function buildUI() {
  const root = document.createElement("div");
  root.style.height = "100%";
  root.style.display = "flex";
  root.style.flexDirection = "column";

  const topBar = document.createElement("div");
  topBar.className = "app-toolbar";
  topBar.style.flexWrap = "wrap";
  sidebarToggleBtn = document.createElement("button");
  sidebarToggleBtn.className = "app-btn";
  sidebarToggleBtn.textContent = "☰ Chats";
  sidebarToggleBtn.addEventListener("click", () => {
    sidebarOpen = !sidebarOpen;
    sidebarWrapOuter.classList.toggle("hidden", !sidebarOpen);
  });

  const keyRow = document.createElement("div");
  keyRow.className = "key-row";
  const note = document.createElement("div");
  note.className = "key-note";
  note.textContent = "Using a shared key — it can run out of tokens fast. Paste your own Gemini key here if replies stop working.";
  keyInput = document.createElement("input");
  keyInput.type = "password";
  keyInput.placeholder = "Your Gemini API key";
  lockBtn = document.createElement("button");
  lockBtn.className = "app-btn";
  lockBtn.textContent = "Lock In";
  lockBtn.addEventListener("click", toggleKeyLock);
  keyRow.appendChild(note);
  keyRow.appendChild(keyInput);
  keyRow.appendChild(lockBtn);

  topBar.appendChild(sidebarToggleBtn);
  topBar.appendChild(keyRow);

  const body = document.createElement("div");
  body.className = "split";
  body.style.flex = "1";
  body.style.minHeight = "0";

  const sidebarWrapOuter = document.createElement("div");
  sidebarWrapOuter.className = "sidebar";
  sidebarWrapOuter.style.display = "flex";
  sidebarWrapOuter.style.flexDirection = "column";
  sidebarWrap = document.createElement("div");
  sidebarWrap.style.display = "flex";
  sidebarWrap.style.flexDirection = "column";
  sidebarWrap.style.height = "100%";
  sidebarWrapOuter.appendChild(sidebarWrap);

  const chatArea = document.createElement("div");
  chatArea.style.flex = "1";
  chatArea.style.display = "flex";
  chatArea.style.flexDirection = "column";
  chatArea.style.minWidth = "0";

  chatLog = document.createElement("div");
  chatLog.className = "chat-log";
  chatLog.style.flex = "1";

  const inputRow = document.createElement("div");
  inputRow.className = "chat-input-row";
  input = document.createElement("textarea");
  input.rows = 1;
  input.placeholder = "Message the AI...";
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
  });
  sendBtn = document.createElement("button");
  sendBtn.className = "app-btn primary";
  sendBtn.textContent = "Send";
  sendBtn.addEventListener("click", sendMessage);
  inputRow.appendChild(input);
  inputRow.appendChild(sendBtn);

  chatArea.appendChild(chatLog);
  chatArea.appendChild(inputRow);

  body.appendChild(sidebarWrapOuter);
  body.appendChild(chatArea);

  root.appendChild(topBar);
  root.appendChild(body);
  return root;
}

async function open() {
  if (winHandle) { openWindow({ appId: "ai", singleton: true }); return; }
  const content = buildUI();
  winHandle = openWindow({ appId: "ai", title: "AI", iconSrc: "/images/ai.png", width: 760, height: 520, content, onClose: () => { winHandle = null; } });
  const userDoc = await FS.getUserDoc();
  if (userDoc.geminiKey) {
    usingCustomKey = true;
    keyInput.value = userDoc.geminiKey;
    keyInput.disabled = true;
    lockBtn.textContent = "Unlock";
  }
  renderSidebarList();
}

window.DarkhatApps = window.DarkhatApps || {};
window.DarkhatApps.ai = { open };
