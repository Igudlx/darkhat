// js/main.js
import { initDesktop } from "./desktop.js";

window.addEventListener("darkhat:login-success", async () => {
  document.getElementById("desktop-root").classList.remove("hidden");
  try {
    if (window.DarkhatApps?.settings) await window.DarkhatApps.settings.applySettings();
  } catch (err) {
    // A Firestore hiccup here (rules not deployed yet, database not created, etc.)
    // should never be able to take down the whole desktop with it.
    console.warn("Couldn't load saved background settings, using defaults:", err);
  }
  initDesktop();
});
