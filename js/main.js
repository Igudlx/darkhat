// js/main.js
import { initDesktop } from "./desktop.js";

window.addEventListener("darkhat:login-success", async () => {
  document.getElementById("desktop-root").classList.remove("hidden");
  if (window.DarkhatApps?.settings) await window.DarkhatApps.settings.applySettings();
  initDesktop();
});
