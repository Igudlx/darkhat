// js/main.js
import { initDesktop } from "./desktop.js";

window.addEventListener("darkhat:login-success", () => {
  document.getElementById("desktop-root").classList.remove("hidden");

  // These don't depend on each other — run them at the same time instead of
  // making the desktop wait on a settings read before it can even appear.
  initDesktop();

  Promise.resolve(window.DarkhatApps?.settings?.applySettings()).catch((err) => {
    console.warn("Couldn't load saved background settings, using defaults:", err);
  });
});
