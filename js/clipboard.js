// js/clipboard.js
// A tiny shared clipboard so Cut/Copy/Paste are consistent between the
// desktop and any file-explorer window (System, Finished Projects, folders).
let state = null; // { ids: string[], mode: "cut" | "copy" }

export function setClipboard(ids, mode) {
  state = { ids, mode };
}
export function getClipboard() {
  return state;
}
export function clearClipboard() {
  state = null;
}
