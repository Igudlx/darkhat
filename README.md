# darkhat

A browser "OS" — login, a desktop with draggable icons, real windows (drag/resize/minimize/maximize/close), and five apps: GameHub, AI, Notes, CodeR, and a password-gated Extra folder. Plain HTML/CSS/JS, deployed on Vercel, data saved to Firebase.

## What's intentionally different from the site you pasted

Four items from the original button list aren't in here: **WeDo Proxy**, **"aa"** (a WiFi/WPS-network tool per its own code comment), **Gemini Method (unblock)**, and **Lens Cheat** (a tool for fooling screen-monitoring software). Those are built specifically to get around network security and monitoring, and that's not something I'll wire up regardless of framing. Every actual **game** from the list is still in GameHub, and **Online Chat**, **Windows Emulator**, and **Windows XP** are still in the Extra folder.

If you want to swap out the Gemini API key later, or point CodeR/GameHub at different services, all of that is easy to find and edit — see "Where things live" below.

## 1. Set up Firebase (accounts + saved data)

1. Go to [console.firebase.google.com](https://console.firebase.google.com) → **Add project**.
2. **Build → Authentication → Get started → Email/Password → Enable.**
3. **Build → Firestore Database → Create database** (start in production mode — the rules file below locks it down).
4. **Project settings (gear icon) → General → Your apps → Web (`</>`)** → register an app → copy the `firebaseConfig` object it gives you.
5. Paste those values into `js/firebase-config.js`, replacing the placeholders. This file is safe to commit — it's just an app identifier, not a secret.
6. Deploy the security rules: install the Firebase CLI (`npm i -g firebase-tools`), run `firebase login`, `firebase init firestore` (point it at this folder, use the existing `firestore.rules`), then `firebase deploy --only firestore:rules`. Or just paste the contents of `firestore.rules` into **Firestore → Rules** in the console and click Publish.

Without step 6, Firestore's default rules block everything and nothing will save.

## 2. Deploy on Vercel

1. Push this folder to a GitHub repo.
2. On [vercel.com](https://vercel.com), **Add New → Project**, import the repo. No build settings needed — it's static + two serverless functions in `/api`.
3. In **Project Settings → Environment Variables**, add:
   - `GEMINI_API_KEY` — the shared/global key the AI app falls back to. Paste in the key you gave me earlier: `AQ.Ab8RN6JTrEWwGmGsfhijGGSARMQbCShJjowFqUdg74wRtnZGcg`. (I deliberately didn't hardcode it into any file — this repo will likely end up public on GitHub, and a key sitting in plain source gets scraped and drained fast. An env var keeps it server-side and off GitHub entirely. Swap it out here any time it runs low.)
   - `EXTRA_PASSWORD` — whatever password should unlock the Extra folder.
   - `GEMINI_MODEL` (optional) — defaults to `gemini-2.0-flash` if unset.
4. Deploy. If you rotate `EXTRA_PASSWORD` later, everyone's saved Extra access is automatically invalidated and they'll be asked again — that's handled server-side in `api/verify-extra-password.js`, nothing else to do.

## 3. Add your icons

See `images/README.md` for the exact filenames to drop in. Anything missing just shows a black-square fallback (`?` for app/file icons, `!` for the plain link tiles in Extra) so the site works fine before you've made them all.

## Where things live

```
index.html                    login screen + desktop shell
css/style.css                 all styling (theme tokens at the top)
js/firebase-config.js         put your Firebase project keys here
js/auth.js                    login/signup, session persistence, the "Logging In..." loop + zoom transition
js/windowManager.js           draggable/resizable windows, taskbar
js/contextMenu.js             right-click menu used everywhere
js/fileSystem.js              all Firestore reads/writes (notes, projects, desktop layout, settings, chats)
js/desktop.js                 icon grid, drag-to-reposition, desktop context menu
js/apps/explorer.js           shared folder view, used by System + Finished Projects
js/apps/notes.js              Notes app
js/apps/coder.js              CodeR app (HTML/CSS/JS editor, Test, Finish)
js/apps/gamehub.js            GameHub, the GAMES array is here, edit freely
js/apps/ai.js                 AI chat app
js/apps/extra.js              Extra folder, CUSTOM_TEXT_FILES and EXTRA_LINKS are here, edit freely
js/apps/settings.js           Start menu: background, blur, password, log out, delete account
api/gemini.js                 serverless: proxies chat to Gemini, keeps the key server-side
api/verify-extra-password.js  serverless: checks the Extra password without exposing it to the client
firestore.rules               locks Firestore down to "you can only touch your own data"
```

### Adding a custom Extra text file
Open `js/apps/extra.js`, add to `CUSTOM_TEXT_FILES`:
```js
{ name: "Read Me First", content: "Anything you want, multiple lines are fine." }
```
It shows up as a read-only file inside Extra automatically.

### Adding/removing GameHub games
Open `js/apps/gamehub.js`, edit the `GAMES` array, each entry is just `{ id, name, url }`.

## Known rough edges (worth knowing before you ship it)

- **Desktop icon drag-to-grid** snaps to an approximate cell size — good enough to use, but not pixel-perfect on every screen size.
- **CodeR** doesn't have a live-preview pane while typing — "Test" opens a new tab instead. Easy to add an iframe preview later if you want it.
- **Delete account** uses Firebase's `user.delete()`, which requires a *recent* login — if it fails, the code tells the user to log out/in and retry. A "reauthenticate then delete" flow would be more seamless but adds another dialog; left as a TODO.
- **Folders** (right-click → New Folder) only go one level deep inside System, not infinitely nested.
- No automated tests. Everything above has been read through carefully but not run against a live Firebase project, since this environment doesn't have network access to test against real Firebase/Vercel/Gemini endpoints. Test the auth flow and one save in each app first after your first deploy.

Happy to keep iterating. Tell me what's broken or what you want built out further (live CodeR preview, nested folders, drag-reorder in chat/notes sidebars, etc.) and I'll pick it up from here.
