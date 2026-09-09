// js/auth.js
// Handles the login screen: sign in / sign up, persistent sessions, the
// looping "Logging In." status text, and the zoom+fade handoff to the desktop.

function fb() { return window.__DARKHAT_FIREBASE__; }

const els = {};
function cacheEls() {
  els.screen = document.getElementById("login-screen");
  els.card = document.getElementById("login-card");
  els.form = document.getElementById("login-form");
  els.email = document.getElementById("login-email");
  els.password = document.getElementById("login-password");
  els.submit = document.getElementById("login-submit");
  els.error = document.getElementById("login-error");
  els.status = document.getElementById("login-status");
  els.tabs = Array.from(document.querySelectorAll(".login-tab"));
}

let mode = "login"; // "login" | "signup"

function setMode(next) {
  mode = next;
  els.tabs.forEach((t) => t.classList.toggle("active", t.dataset.tab === mode));
  els.submit.textContent = mode === "login" ? "Log In" : "Create Account";
  els.error.textContent = "";
}

function setError(msg) {
  els.error.textContent = msg || "";
}

// Loops "Logging In." > ".." > "..." for ~1s, then resolves.
function playLoggingInLoop(durationMs = 1000) {
  return new Promise((resolve) => {
    els.card.classList.add("hidden");
    els.status.classList.remove("hidden");
    const frames = ["Logging In.", "Logging In..", "Logging In..."];
    let i = 0;
    els.status.textContent = frames[0];
    const id = setInterval(() => {
      i = (i + 1) % frames.length;
      els.status.textContent = frames[i];
    }, 320);
    setTimeout(() => {
      clearInterval(id);
      resolve();
    }, durationMs);
  });
}

async function transitionToDesktop(user) {
  els.screen.classList.add("leaving");
  await new Promise((r) => setTimeout(r, 620)); // matches CSS transition duration
  els.screen.classList.add("hidden");
  window.dispatchEvent(new CustomEvent("darkhat:login-success", { detail: { user } }));
}

async function ensureUserDoc(uid, email) {
  const { db, FirestoreLib } = fb();
  const ref = FirestoreLib.doc(db, "users", uid);
  const snap = await FirestoreLib.getDoc(ref);
  if (!snap.exists()) {
    await FirestoreLib.setDoc(ref, {
      email,
      createdAt: Date.now(),
      settings: { wallpaperBlur: 6 },
      geminiKey: null,
    });
  }
}

function friendlyAuthError(err) {
  const code = err && err.code ? err.code : "";
  const map = {
    "auth/invalid-email": "That email doesn't look right.",
    "auth/missing-password": "Enter a password.",
    "auth/wrong-password": "Wrong password.",
    "auth/invalid-credential": "Email or password is wrong.",
    "auth/user-not-found": "No account with that email.",
    "auth/email-already-in-use": "That email is already registered.",
    "auth/weak-password": "Password should be at least 6 characters.",
    "auth/too-many-requests": "Too many attempts. Try again in a bit.",
  };
  return map[code] || "Something went wrong. Try again.";
}

async function handleSubmit(e) {
  e.preventDefault();
  setError("");
  const { auth, AuthLib } = fb();
  const email = els.email.value.trim();
  const password = els.password.value;
  els.submit.disabled = true;

  try {
    let cred;
    if (mode === "login") {
      cred = await AuthLib.signInWithEmailAndPassword(auth, email, password);
    } else {
      cred = await AuthLib.createUserWithEmailAndPassword(auth, email, password);
      await ensureUserDoc(cred.user.uid, email);
    }
    await playLoggingInLoop(1000);
    await transitionToDesktop(cred.user);
  } catch (err) {
    els.submit.disabled = false;
    setError(friendlyAuthError(err));
  }
}

let bootHandled = false;

function initAuth() {
  cacheEls();
  els.tabs.forEach((t) => t.addEventListener("click", () => setMode(t.dataset.tab)));
  els.form.addEventListener("submit", handleSubmit);

  const { auth, AuthLib } = fb();
  AuthLib.setPersistence(auth, AuthLib.browserLocalPersistence).catch(() => {});

  // Fires once Firebase resolves whether a session already exists.
  AuthLib.onAuthStateChanged(auth, async (user) => {
    if (bootHandled) return; // avoid re-triggering on later sign-outs mid-session
    bootHandled = true;
    if (user) {
      await ensureUserDoc(user.uid, user.email);
      await playLoggingInLoop(1000);
      await transitionToDesktop(user);
    }
    // else: leave the login card visible for the user to sign in.
  });
}

function boot() {
  // window.__DARKHAT_FIREBASE__ may already be set by the time this file runs
  // (module scripts execute in document order, and the Firebase setup script
  // runs before this one) — in that case the "darkhat:firebase-ready" event
  // already fired and we'd miss it by only listening for it. Check first.
  if (window.__DARKHAT_FIREBASE__) {
    initAuth();
  } else {
    window.addEventListener("darkhat:firebase-ready", initAuth, { once: true });
  }
}
boot();

// Exposed so Settings ("Log out") can send the user back to the login screen.
window.darkhatSignOut = async function () {
  const { auth, AuthLib } = fb();
  await AuthLib.signOut(auth);
  window.location.reload();
};

window.darkhatDeleteAccount = async function () {
  const { auth } = fb();
  const user = auth.currentUser;
  if (!user) return;
  try {
    await user.delete();
  } catch (err) {
    alert("For security, Firebase needs a recent login to delete your account. Log out, log back in, then try again.");
    return;
  }
  window.location.reload();
};
