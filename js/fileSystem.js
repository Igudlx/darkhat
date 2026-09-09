// js/fileSystem.js
// A thin data layer over Firestore for everything an account "saves":
// notes, finished CodeR projects, CodeR drafts, desktop icon layout & user settings.
// Every read/write is scoped to users/{uid}/... so accounts never see each other's data.

function fb() { return window.__DARKHAT_FIREBASE__; }
function uid() {
  const { auth } = fb();
  return auth.currentUser ? auth.currentUser.uid : null;
}

// ---------- generic "files" collection: notes + finished projects ----------
// doc shape: { type: "note"|"project-finished", name, content?, html?, css?, js?,
//              location: "system"|"desktop"|"finished", x, y, createdAt, updatedAt }

function filesCol() {
  const { db, FirestoreLib } = fb();
  return FirestoreLib.collection(db, "users", uid(), "files");
}

export async function listFiles(location) {
  const { FirestoreLib } = fb();
  const q = FirestoreLib.query(filesCol(), FirestoreLib.where("location", "==", location));
  const snap = await FirestoreLib.getDocs(q);
  const out = [];
  snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
  out.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return out;
}

export async function getFile(id) {
  const { db, FirestoreLib } = fb();
  const ref = FirestoreLib.doc(db, "users", uid(), "files", id);
  const snap = await FirestoreLib.getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function createFile(data) {
  const { FirestoreLib } = fb();
  const ref = await FirestoreLib.addDoc(filesCol(), {
    ...data,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });
  return ref.id;
}

export async function updateFile(id, data) {
  const { db, FirestoreLib } = fb();
  const ref = FirestoreLib.doc(db, "users", uid(), "files", id);
  await FirestoreLib.updateDoc(ref, { ...data, updatedAt: Date.now() });
}

export async function deleteFile(id) {
  const { db, FirestoreLib } = fb();
  const ref = FirestoreLib.doc(db, "users", uid(), "files", id);
  await FirestoreLib.deleteDoc(ref);
}

export async function moveFileToLocation(id, location, x, y) {
  return updateFile(id, { location, x: x ?? null, y: y ?? null });
}

// ---------- CodeR drafts (separate collection; "finish" copies a snapshot into files) ----------
function projectsCol() {
  const { db, FirestoreLib } = fb();
  return FirestoreLib.collection(db, "users", uid(), "projects");
}

export async function listProjects() {
  const { FirestoreLib } = fb();
  const snap = await FirestoreLib.getDocs(projectsCol());
  const out = [];
  snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
  out.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return out;
}

export async function createProject(name) {
  const { FirestoreLib } = fb();
  const ref = await FirestoreLib.addDoc(projectsCol(), {
    name, html: "<h1>Hello, darkhat</h1>", css: "body{font-family:sans-serif;}", js: "",
    createdAt: Date.now(), updatedAt: Date.now(),
  });
  return ref.id;
}

export async function updateProject(id, data) {
  const { db, FirestoreLib } = fb();
  const ref = FirestoreLib.doc(db, "users", uid(), "projects", id);
  await FirestoreLib.updateDoc(ref, { ...data, updatedAt: Date.now() });
}

export async function deleteProject(id) {
  const { db, FirestoreLib } = fb();
  const ref = FirestoreLib.doc(db, "users", uid(), "projects", id);
  await FirestoreLib.deleteDoc(ref);
}

// Copies a project's current code into the "files" collection under Finished Projects.
export async function finishProject(project) {
  return createFile({
    type: "project-finished",
    name: project.name,
    html: project.html, css: project.css, js: project.js,
    sourceProjectId: project.id,
    location: "finished",
  });
}

// ---------- user doc: settings, desktop layout, AI chat, extra-access ----------
function userRef() {
  const { db, FirestoreLib } = fb();
  return FirestoreLib.doc(db, "users", uid());
}

export async function getUserDoc() {
  const { FirestoreLib } = fb();
  const snap = await FirestoreLib.getDoc(userRef());
  return snap.exists() ? snap.data() : {};
}

export async function updateUserDoc(data) {
  const { FirestoreLib } = fb();
  await FirestoreLib.setDoc(userRef(), data, { merge: true });
}

export async function saveDesktopLayout(layout) {
  return updateUserDoc({ desktopLayout: layout });
}

// ---------- AI chats: users/{uid}/aiChats/{chatId} ----------
function chatsCol() {
  const { db, FirestoreLib } = fb();
  return FirestoreLib.collection(db, "users", uid(), "aiChats");
}

export async function listChats() {
  const { FirestoreLib } = fb();
  const snap = await FirestoreLib.getDocs(chatsCol());
  const out = [];
  snap.forEach((d) => out.push({ id: d.id, ...d.data() }));
  out.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return out;
}

export async function createChat(title) {
  const { FirestoreLib } = fb();
  const ref = await FirestoreLib.addDoc(chatsCol(), {
    title: title || "New chat", messages: [], createdAt: Date.now(), updatedAt: Date.now(),
  });
  return ref.id;
}

export async function updateChat(id, data) {
  const { db, FirestoreLib } = fb();
  const ref = FirestoreLib.doc(db, "users", uid(), "aiChats", id);
  await FirestoreLib.updateDoc(ref, { ...data, updatedAt: Date.now() });
}

export async function deleteChat(id) {
  const { db, FirestoreLib } = fb();
  const ref = FirestoreLib.doc(db, "users", uid(), "aiChats", id);
  await FirestoreLib.deleteDoc(ref);
}

window.DarkhatFS = {
  listFiles, getFile, createFile, updateFile, deleteFile, moveFileToLocation,
  listProjects, createProject, updateProject, deleteProject, finishProject,
  getUserDoc, updateUserDoc, saveDesktopLayout,
  listChats, createChat, updateChat, deleteChat,
  uid,
};
