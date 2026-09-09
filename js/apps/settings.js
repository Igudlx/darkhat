// js/apps/settings.js
import * as FS from "../fileSystem.js";

const WALLPAPER_PRESETS = {
  "Charcoal (default)": "linear-gradient(200deg, #2b2b2b 0%, #000 75%)",
  "Deep Fade": "linear-gradient(160deg, #1f1f1f 0%, #000 60%)",
  "Steel": "linear-gradient(135deg, #3a3a3a 0%, #0a0a0a 70%)",
  "Void": "radial-gradient(circle at 50% 30%, #262626 0%, #000 70%)",
};

let menuEl;

function fb() { return window.__DARKHAT_FIREBASE__; }

async function applySettings() {
  const doc = await FS.getUserDoc();
  const blur = doc.settings?.wallpaperBlur ?? 6;
  const preset = doc.settings?.wallpaperPreset || "Charcoal (default)";
  document.documentElement.style.setProperty("--wallpaper-blur", blur + "px");
  const wallpaper = document.getElementById("wallpaper");
  if (wallpaper) wallpaper.style.background = WALLPAPER_PRESETS[preset] || WALLPAPER_PRESETS["Charcoal (default)"];
  return { blur, preset };
}

async function build() {
  const { blur, preset } = await applySettings();
  const { auth } = fb();
  const email = auth.currentUser ? auth.currentUser.email : "";

  menuEl.innerHTML = "";
  const h = document.createElement("h3");
  h.textContent = email;
  menuEl.appendChild(h);

  // Wallpaper preset
  const presetRow = document.createElement("div");
  presetRow.className = "start-row";
  const presetLabel = document.createElement("span");
  presetLabel.textContent = "Background";
  const presetSelect = document.createElement("select");
  presetSelect.style.cssText = "background:var(--gray-850);color:var(--gray-100);border:1px solid var(--gray-600);border-radius:6px;padding:6px;";
  Object.keys(WALLPAPER_PRESETS).forEach((name) => {
    const opt = document.createElement("option");
    opt.value = name; opt.textContent = name;
    if (name === preset) opt.selected = true;
    presetSelect.appendChild(opt);
  });
  presetSelect.addEventListener("change", async () => {
    await FS.updateUserDoc({ settings: { wallpaperPreset: presetSelect.value, wallpaperBlur: blur } });
    applySettings();
  });
  presetRow.appendChild(presetLabel);
  presetRow.appendChild(presetSelect);
  menuEl.appendChild(presetRow);

  // Blur slider
  const blurRow = document.createElement("div");
  blurRow.className = "start-row";
  const blurLabel = document.createElement("span");
  blurLabel.textContent = "Background blur";
  const blurSlider = document.createElement("input");
  blurSlider.type = "range"; blurSlider.min = "0"; blurSlider.max = "16"; blurSlider.value = blur;
  blurSlider.addEventListener("input", () => {
    document.documentElement.style.setProperty("--wallpaper-blur", blurSlider.value + "px");
  });
  blurSlider.addEventListener("change", async () => {
    await FS.updateUserDoc({ settings: { wallpaperBlur: Number(blurSlider.value), wallpaperPreset: presetSelect.value } });
  });
  blurRow.appendChild(blurLabel);
  blurRow.appendChild(blurSlider);
  menuEl.appendChild(blurRow);

  menuEl.appendChild(divider());

  // Change password
  const pwRow = document.createElement("div");
  pwRow.className = "start-row";
  pwRow.textContent = "Change password";
  pwRow.style.cursor = "pointer";
  pwRow.addEventListener("click", async () => {
    const { AuthLib, auth } = fb();
    const newPw = prompt("New password (min 6 characters):");
    if (!newPw) return;
    try {
      await AuthLib.updatePassword(auth.currentUser, newPw);
      alert("Password updated.");
    } catch (err) {
      alert("Couldn't update password — log out and back in, then try again (Firebase requires a recent login for this).");
    }
  });
  menuEl.appendChild(pwRow);

  menuEl.appendChild(divider());

  const logoutRow = document.createElement("div");
  logoutRow.className = "start-row";
  logoutRow.textContent = "Log out";
  logoutRow.style.cursor = "pointer";
  logoutRow.addEventListener("click", () => window.darkhatSignOut());
  menuEl.appendChild(logoutRow);

  const deleteRow = document.createElement("div");
  deleteRow.className = "start-row start-btn-danger";
  deleteRow.textContent = "Delete account";
  deleteRow.style.cursor = "pointer";
  deleteRow.addEventListener("click", () => {
    if (confirm("This permanently deletes your account and everything saved to it. Continue?")) {
      window.darkhatDeleteAccount();
    }
  });
  menuEl.appendChild(deleteRow);
}

function divider() {
  const d = document.createElement("div");
  d.className = "start-divider";
  return d;
}

function toggle() {
  menuEl = document.getElementById("start-menu");
  const willOpen = menuEl.classList.contains("hidden");
  menuEl.classList.toggle("hidden");
  if (willOpen) build();
}

function close() {
  document.getElementById("start-menu").classList.add("hidden");
}

window.DarkhatApps = window.DarkhatApps || {};
window.DarkhatApps.settings = { toggle, close, applySettings };
