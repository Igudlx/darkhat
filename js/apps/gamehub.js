// js/apps/gamehub.js
//
// NOTE FOR THE DEV: this list is carried over from the original site, minus a
// few entries that were built specifically to bypass network filtering or
// defeat school monitoring software (a proxy tool, an "unblock" method, a
// screen-monitoring cheat, and a WiFi-network-cracking tool). Those aren't
// included here — see the README for the full explanation. Everything below
// is just a game (or a harmless tool like the click-speed test).
import { openWindow } from "../windowManager.js";

const GAMES = [
  { id: "vex6", name: "Vex 6", url: "https://script.google.com/macros/s/AKfycbzi5I00V5E4UoWKNwYMpazWyXDs1J4m0hui0937lFzMRKs31QGZ3rcUHRroAt13wmc9tw/exec" },
  { id: "slowRoads", name: "Slow.Roads", url: "https://script.google.com/macros/s/AKfycbzqDA2SnuVZ3DRelxxbUxSV9Z1RJz_gQfDRx06WUpgppWgrdDEErtZ1Lev9O6j2w9ioBQ/exec" },
  { id: "clusterTrucks", name: "Cluster Trucks", url: "https://script.google.com/macros/s/AKfycbw6e8fflbfydV7kom5id09nKaM6ix0hLlXHbs3XHOnxzrndUgPtHUHENrwKomI2Hpk3/exec" },
  { id: "motoX3M", name: "Moto.X3M", url: "https://script.google.com/macros/s/AKfycbw7_zG02ZMXnPSdwCx0CcmN8eX_0Bk3715TSP-Eglb1DyVhp7RxShuXq4qJ8Q2s7cnW/exec" },
  { id: "snowRider3D", name: "Snow Rider 3D", url: "https://script.google.com/macros/s/AKfycbw5Z-Ryg_JfIIDYH7pzzPKXlr2tN0HCw-tT_ZvxBGDPsDDY41ewPVneVeLzelfpnBab/exec" },
  { id: "happyWheels", name: "Happy Wheels", url: "https://script.google.com/macros/s/AKfycbyfMPVIGx6dJPrYKeE9e4Erj949-dH28pWVRjdV1vgnoylpBV8af03JNLoz2MwAIBLECg/exec" },
  { id: "theBackrooms", name: "Backrooms Game", url: "https://storage.googleapis.com/test-41376.appspot.com/broom.html" },
  { id: "cookieClicker", name: "Cookie Clicker", url: "https://script.google.com/macros/s/AKfycbxGM35J29NkO-2LYjxWj_cA9IUaaXypkUy-LqXyLRbGTz0R6lXmAEapz1STN1jlTIRavw/exec" },
  { id: "driftHunters", name: "Drift Hunters", url: "https://script.google.com/macros/s/AKfycbw8iHPqdVFEzquUYbNxFVAu1Tw4Nri5SWMRLdP_c7a84vCOHVG7YUWuhjSVptg1SVHr/exec" },
  { id: "clickSpeedTest", name: "Click Speed Test", url: "https://www.rapidtables.com/tools/click-test.html", newTabDirect: true },
  { id: "superMarioBros", name: "Super Mario Bros", url: "https://cim.alwaysdata.net/jeu/mario/index.html" },
  { id: "twentyFourtyEight", name: "2048", url: "https://juegosgratispuntocom.github.io/games/html5/2048/index.html" },
  { id: "onevOneLol", name: "1v1 Lol", url: "https://juegosgratispuntocom.github.io/games/html5/1v1.lol/index.html" },
  { id: "amongUs", name: "Among Us", url: "https://juegosgratispuntocom.github.io/games/html5/among-us/index.html" },
  { id: "baldisBasics", name: "Baldis Basics", url: "https://juegosgratispuntocom.github.io/games/html5/baldis-basics/index.html" },
  { id: "ballSort", name: "Ball Sort", url: "https://juegosgratispuntocom.github.io/games/html5/ball-sort-puzzle/index.html" },
  { id: "bitLife", name: "BitLife", url: "https://juegosgratispuntocom.github.io/games/html5/bitlife/index.html" },
  { id: "chromeDino", name: "Chrome Dino", url: "https://juegosgratispuntocom.github.io/games/html5/chrome-dino/index.html" },
  { id: "driftBoss", name: "Drift Boss", url: "https://juegosgratispuntocom.github.io/games/html5/drift-boss/index.html" },
  { id: "flappyBird", name: "Flappy Bird", url: "https://juegosgratispuntocom.github.io/games/html5/flappy-bird/index.html" },
  { id: "geometryDash", name: "Geometry Dash Lite", url: "https://juegosgratispuntocom.github.io/games/html5/geodash/index.html" },
  { id: "geometryDashSubzero", name: "Geometry Dash Subzero", url: "https://juegosgratispuntocom.github.io/games/html5/geodash-subzero/index.html" },
  { id: "googleSnake", name: "Google Snake", url: "https://juegosgratispuntocom.github.io/games/html5/google-snake/index.html" },
  { id: "minecraftWeb", name: "Minecraft", url: "https://juegosgratispuntocom.github.io/games/html5/minecraft-1.5.2/index.html" },
  { id: "slopeOne", name: "Slope", url: "https://juegosgratispuntocom.github.io/games/html5/slope/index.html" },
  { id: "stackGame", name: "Stack", url: "https://juegosgratispuntocom.github.io/games/html5/stack/index.html" },
  { id: "fiveNights", name: "FNAF", url: "https://juegosgratispuntocom.github.io/games/html5/fnaf-2/index.html" },
  { id: "templeRun", name: "Temple Run", url: "https://juegosgratispuntocom.github.io/games/html5/temple-run-2/index.html" },
  { id: "tunnelRush", name: "Tunnel Rush", url: "https://juegosgratispuntocom.github.io/games/html5/tunnel-rush/index.html" },
  { id: "memoryGame", name: "Memory Game", url: "https://memory-gameeee.netlify.app/" },
  { id: "coreBall", name: "Core Ball", url: "https://juegosgratispuntocom.github.io/games/html5/core-ball/index.html" },
  { id: "runThree", name: "Run 3", url: "https://juegosgratispuntocom.github.io/games/flash/run-3/index.html" },
  { id: "fruitNinja", name: "Fruit Ninja", url: "https://juegosgratispuntocom.github.io/games/html5/fruit-ninja/index.html" },
  { id: "raftwarsTwo", name: "Raft Wars 2", url: "https://juegosgratispuntocom.github.io/games/flash/raft-wars-2/index.html" },
  { id: "timeShooter", name: "Time Shooter", url: "https://krutansh123.github.io/kk-games-beta/timeshooter3.html" },
  { id: "stickDuel", name: "Stick Duel", url: "https://krutansh123.github.io/kk-games-beta/stickdual.html" },
  { id: "rooftopSnipers", name: "Rooftop Snipers", url: "https://juegosgratispuntocom.github.io/games/html5/rooftop-snipers/index.html" },
  { id: "tubeJumpers", name: "Tube Jumpers", url: "https://juegosgratispuntocom.github.io/games/html5/tube-jumpers/index.html" },
  { id: "gravityGuy", name: "Gravity Guy", url: "https://juegosgratispuntocom.github.io/games/flash/gravity-guy/index.html" },
  { id: "doodleJump", name: "Doodle Jump", url: "https://juegosgratispuntocom.github.io/games/html5/doodle-jump/index.html" },
  { id: "monkeyMart", name: "Monkey Mart", url: "https://juegosgratispuntocom.github.io/games/html5/monkeymart/index.html" },
  { id: "deathRun", name: "Death Run", url: "https://juegosgratispuntocom.github.io/games/html5/death-run-3d/index.html" },
  { id: "normalTetris", name: "Tetris", url: "https://juegosgratispuntocom.github.io/games/html5/twitch-tetris/index.html" },
  { id: "sandTetris", name: "Sand Tetris", url: "https://juegosgratispuntocom.github.io/games/html5/sandtrix/index.html" },
  { id: "duckLife", name: "Duck Life", url: "https://juegosgratispuntocom.github.io/games/flash/duck-life/index.html" },
  { id: "madalinstuntcarsOne", name: "Madalin Stunt Cars", url: "https://juegosgratispuntocom.github.io/games/html5/madalin-stunt-cars-2/index.html" },
  { id: "madalinstuntcarsOnline", name: "Madalin Stunt Cars Online", url: "https://juegosgratispuntocom.github.io/games/html5/madalin-stunt-cars-3/index.html" },
  { id: "fireboyandwaterGirl", name: "Fireboy and Watergirl", url: "https://juegosgratispuntocom.github.io/games/html5/fireboy-and-watergirl-1/index.html" },
  { id: "paperyPlanes", name: "Papery Planes", url: "https://juegosgratispuntocom.github.io/games/html5/papery-planes/index.html" },
  { id: "pacMan", name: "Pac Man", url: "https://juegosgratispuntocom.github.io/games/html5/pacman/index.html" },
  { id: "tomboftheMask", name: "Tomb Of The Mask", url: "https://juegosgratispuntocom.github.io/games/html5/totm/index.html" },
  { id: "crossyRoad", name: "Crossy Road", url: "https://juegosgratispuntocom.github.io/games/html5/crossy-road/index.html" },
  { id: "bobtheRobber", name: "Bob The Robber", url: "https://juegosgratispuntocom.github.io/games/html5/bob-the-robber-2/index.html" },
  { id: "doomGame", name: "Doom", url: "https://juegosgratispuntocom.github.io/games/html5/doom/index.html" },
  { id: "towercrashthreeDee", name: "Tower Crash 3D", url: "https://juegosgratispuntocom.github.io/games/html5/tower-crash-3d/index.html" },
  { id: "pouGame", name: "Pou", url: "https://juegosgratispuntocom.github.io/games/html5/pou/index.html" },
  { id: "mergeroundRacers", name: "Merge Round Racers", url: "https://juegosgratispuntocom.github.io/games/html5/merge-round-racers/index.html" },
  { id: "xx142b2Exe", name: "xx142-b2.exe", url: "https://juegosgratispuntocom.github.io/games/html5/xx142-b2.exe/index.html" },
  { id: "roadBlocks", name: "Road Blocks", url: "https://juegosgratispuntocom.github.io/games/html5/roadblocks/index.html" },
  { id: "stickmanHook", name: "Stickman Hook", url: "https://juegosgratispuntocom.github.io/games/html5/stickman-hook/index.html" },
  { id: "tinyFishing", name: "Tiny Fishing", url: "https://juegosgratispuntocom.github.io/games/html5/tiny-fishing/index.html" },
  { id: "subwaySurfers", name: "Subway Surfers", url: "https://juegosgratispuntocom.github.io/games/html5/subway-surfers-unity/miami.html" },
  { id: "tanukiSunset", name: "Tanuki Sunset", url: "https://juegosgratispuntocom.github.io/games/html5/tanuki-sunset/index.html" },
  { id: "nzPort", name: "NZ Portable", url: "https://juegosgratispuntocom.github.io/games/html5/nzp/index.html" },
  { id: "circleSurvivor", name: "Circle Survivor", url: "https://juegosgratispuntocom.github.io/games/html5/circl-survivor/index.html" },
  { id: "earntoDie", name: "Earn To Die", url: "https://juegosgratispuntocom.github.io/games/html5/earn-to-die-2/index.html" },
  { id: "bloonsTd", name: "Bloons TD", url: "https://juegosgratispuntocom.github.io/games/flash/bloons-td-4/index.html" },
  { id: "vampireSurvivors", name: "Vampire Survivors", url: "https://juegosgratispuntocom.github.io/games/html5/vampire-survivors/index.html" },
  { id: "idleRestaurants", name: "Idle Restaurants", url: "https://juegosgratispuntocom.github.io/games/html5/idle-restaurants/index.html" },
  { id: "getawayShootout", name: "Getaway Shootout", url: "https://juegosgratispuntocom.github.io/games/html5/getaway-shootout/index.html" },
  { id: "retroBowl", name: "Retro Bowl", url: "https://juegosgratispuntocom.github.io/games/html5/retro-bowl/index.html" },
  { id: "smashKarts", name: "Smash Karts", url: "https://juegosgratispuntocom.github.io/games/html5/smash-karts/index.html" },
  { id: "savetheDoge", name: "Save The Doge", url: "https://juegosgratispuntocom.github.io/games/html5/save-the-doge/index.html" },
  { id: "mineSweeper", name: "Minesweeper", url: "https://juegosgratispuntocom.github.io/games/html5/minesweeper/index.html" },
  { id: "crazycattleThreedee", name: "Crazy Cattle 3D", url: "https://juegosgratispuntocom.github.io/games/html5/crazy-cattle-3d/index.html" },
  { id: "googleFeud", name: "Google Feud", url: "https://juegosgratispuntocom.github.io/games/html5/google-feud/index.html" },
  { id: "solitaireGame", name: "Solitaire", url: "https://juegosgratispuntocom.github.io/games/html5/solitaire/index.html" },
  { id: "pokerGame", name: "Poker", url: "https://juegosgratispuntocom.github.io/games/html5/poker/poker.html" },
  { id: "blackJack", name: "Blackjack", url: "https://juegosgratispuntocom.github.io/games/html5/blackjack/index.html" },
  { id: "asmallworldCup", name: "A Small World Cup", url: "https://juegosgratispuntocom.github.io/games/html5/a-small-world-cup/index.html" },
  { id: "tenminutesuntilDawn", name: "10 Minutes Until Dawn", url: "https://juegosgratispuntocom.github.io/games/html5/10-minutes-till-dawn/index.html" },
];

let winHandle = null;

function openGame(game) {
  if (game.newTabDirect) { window.open(game.url, "_blank"); return; }
  const win = window.open("about:blank", "_blank");
  if (!win) { alert("Popup blocked! Allow popups for this site."); return; }
  win.document.body.style.margin = "0";
  win.document.body.style.height = "100vh";
  win.document.body.style.backgroundColor = "black";
  const iframe = win.document.createElement("iframe");
  iframe.src = game.url;
  iframe.style.border = "none";
  iframe.style.width = "100vw";
  iframe.style.height = "100vh";
  win.document.body.appendChild(iframe);
}

function buildUI() {
  const grid = document.createElement("div");
  grid.className = "gamehub-grid";
  GAMES.forEach((g) => {
    const tile = document.createElement("button");
    tile.className = "game-tile";
    tile.innerHTML = `<div class="icon-fallback">?</div><div class="g-name">${g.name}</div>`;
    tile.addEventListener("click", () => openGame(g));
    grid.appendChild(tile);
  });
  return grid;
}

function open() {
  if (winHandle) { openWindow({ appId: "gamehub", singleton: true }); return; }
  const content = buildUI();
  winHandle = openWindow({ appId: "gamehub", title: "GameHub", iconSrc: "/images/gamehub.png", width: 760, height: 520, content, onClose: () => { winHandle = null; } });
}

window.DarkhatApps = window.DarkhatApps || {};
window.DarkhatApps.gamehub = { open };
