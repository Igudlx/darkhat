// js/contextMenu.js
// Reusable right-click context menu used by the desktop and file explorer windows.

let currentMenu = null;

function closeMenu() {
  if (currentMenu) { currentMenu.remove(); currentMenu = null; }
}

document.addEventListener("click", closeMenu);
document.addEventListener("contextmenu", (e) => {
  // Close any open menu unless the new right-click is what opened another one
  // (individual callers call show() themselves, which calls closeMenu() first).
});
window.addEventListener("blur", closeMenu);

/**
 * @param {number} x
 * @param {number} y
 * @param {Array<{label:string,onClick:Function,disabled?:boolean,danger?:boolean}|{sep:true}>} items
 */
export function showContextMenu(x, y, items) {
  closeMenu();
  const menu = document.createElement("div");
  menu.className = "ctx-menu";

  items.forEach((item) => {
    if (item.sep) {
      const sep = document.createElement("div");
      sep.className = "ctx-sep";
      menu.appendChild(sep);
      return;
    }
    const row = document.createElement("div");
    row.className = "ctx-item" + (item.disabled ? " disabled" : "");
    row.style.color = item.danger ? "var(--danger)" : "";
    row.textContent = item.label;
    if (!item.disabled) {
      row.addEventListener("click", (e) => {
        e.stopPropagation();
        closeMenu();
        item.onClick && item.onClick();
      });
    }
    menu.appendChild(row);
  });

  document.body.appendChild(menu);

  // keep on screen
  const rect = menu.getBoundingClientRect();
  const maxX = window.innerWidth - rect.width - 8;
  const maxY = window.innerHeight - rect.height - 8;
  menu.style.left = Math.min(x, maxX) + "px";
  menu.style.top = Math.min(y, maxY) + "px";

  currentMenu = menu;
}

window.DarkhatContextMenu = { show: showContextMenu, close: closeMenu };
