const API_BASE = "https://eb9cf3b5-3631-4734-ba12-331df0439e00-00-2qjbd20nz0vcp.spock.replit.dev/api";

const symbols = [
  { icon: "🍀", rarity: "Common",  chance: 50,   reward: 10     },
  { icon: "💎", rarity: "Rare",    chance: 25,   reward: 50     },
  { icon: "🔥", rarity: "Epic",    chance: 12,   reward: 120    },
  { icon: "👑", rarity: "Legendary",chance: 7,   reward: 500    },
  { icon: "🌌", rarity: "Mythic",  chance: 4,    reward: 1200   },
  { icon: "⚡", rarity: "Divine",  chance: 1.5,  reward: 3500   },
  { icon: "🌀", rarity: "Cosmic",  chance: 0.4,  reward: 12000  },
  { icon: "♾️", rarity: "Infinite",chance: 0.1,  reward: 100000 }
];

const game = {
  coins:     Number(localStorage.getItem("coins"))    || 0,
  luck:      Number(localStorage.getItem("luck"))     || 1,
  spins:     Number(localStorage.getItem("spins"))    || 0,
  jackpots:  Number(localStorage.getItem("jackpots")) || 0,
  rebirths:  Number(localStorage.getItem("rebirths")) || 0,
  inventory: JSON.parse(localStorage.getItem("inventory") || "[]"),
  autoSpin:  false,
  fastSpin:  false,
};

let authToken    = localStorage.getItem("authToken")    || null;
let authUsername = localStorage.getItem("authUsername") || null;
let scoreSubmitTimer = null;

// ── Auth helpers ──────────────────────────────────────────────────────────────

function authHeaders() {
  return authToken
    ? { "Content-Type": "application/json", "Authorization": "Bearer " + authToken }
    : { "Content-Type": "application/json" };
}

function setAuth(token, username) {
  authToken    = token;
  authUsername = username;
  localStorage.setItem("authToken",    token);
  localStorage.setItem("authUsername", username);
  updateAuthUI();
}

function clearAuth() {
  authToken    = null;
  authUsername = null;
  localStorage.removeItem("authToken");
  localStorage.removeItem("authUsername");
  updateAuthUI();
}

function updateAuthUI() {
  const btn   = document.getElementById("auth-btn");
  const label = document.getElementById("player-label");
  if (authUsername) {
    btn.textContent   = "👤 " + authUsername;
    label.textContent = "Logged in as: " + authUsername;
    label.style.color = "#ffd700";
  } else {
    btn.textContent   = "🔑 Log In";
    label.textContent = "Playing as guest — log in to appear on the leaderboard!";
    label.style.color = "#bb88ff";
  }
  label.style.marginTop = "12px";
}

// ── Auth modal ────────────────────────────────────────────────────────────────

function openAuthModal() {
  if (authUsername) {
    if (confirm("Log out of " + authUsername + "?")) {
      doLogout();
    }
    return;
  }
  document.getElementById("auth-modal").classList.remove("hidden");
}

function closeAuthModal() {
  document.getElementById("auth-modal").classList.add("hidden");
}

function showTab(tab) {
  document.getElementById("auth-form-login").classList.toggle("hidden",    tab !== "login");
  document.getElementById("auth-form-register").classList.toggle("hidden", tab !== "register");
  document.getElementById("tab-login").classList.toggle("active",    tab === "login");
  document.getElementById("tab-register").classList.toggle("active", tab === "register");
}

function showError(id, msg) {
  const el = document.getElementById(id);
  el.textContent = msg;
  el.classList.remove("hidden");
}

function clearError(id) {
  document.getElementById(id).classList.add("hidden");
}

async function doLogin() {
  clearError("login-error");
  const username = document.getElementById("login-username").value.trim();
  const password = document.getElementById("login-password").value;
  if (!username || !password) { showError("login-error", "Please fill in all fields."); return; }

  try {
    const res  = await fetch(API_BASE + "/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) { showError("login-error", data.error || "Login failed."); return; }
    setAuth(data.token, data.username);
    closeAuthModal();
    notify("Welcome back, " + data.username + "!");
    pushScoreToServer(false);
  } catch {
    showError("login-error", "Could not reach server.");
  }
}

async function doRegister() {
  clearError("reg-error");
  const username = document.getElementById("reg-username").value.trim();
  const password = document.getElementById("reg-password").value;
  if (!username || !password) { showError("reg-error", "Please fill in all fields."); return; }

  try {
    const res  = await fetch(API_BASE + "/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (!res.ok) { showError("reg-error", data.error || "Registration failed."); return; }
    setAuth(data.token, data.username);
    closeAuthModal();
    notify("Account created! Welcome, " + data.username + "!");
    pushScoreToServer(false);
  } catch {
    showError("reg-error", "Could not reach server.");
  }
}

async function doLogout() {
  try {
    await fetch(API_BASE + "/auth/logout", { method: "POST", headers: authHeaders() });
  } catch { /* ignore */ }
  clearAuth();
  notify("Logged out.");
}

// ── Game state ────────────────────────────────────────────────────────────────

function saveGame() {
  localStorage.setItem("coins",     game.coins);
  localStorage.setItem("luck",      game.luck);
  localStorage.setItem("spins",     game.spins);
  localStorage.setItem("jackpots",  game.jackpots);
  localStorage.setItem("rebirths",  game.rebirths);
  localStorage.setItem("inventory", JSON.stringify(game.inventory));
  scheduleScoreSubmit();
}

function scheduleScoreSubmit() {
  if (!authToken) return;
  clearTimeout(scoreSubmitTimer);
  scoreSubmitTimer = setTimeout(() => pushScoreToServer(false), 3000);
}

async function pushScoreToServer(showFeedback) {
  if (!authToken) return;
  try {
    const res = await fetch(API_BASE + "/leaderboard", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        coins:    game.coins,
        spins:    game.spins,
        jackpots: game.jackpots,
        rebirths: game.rebirths,
      }),
    });
    if (res.ok && showFeedback) notify("Score submitted!");
  } catch {
    if (showFeedback) notify("Could not reach server.");
  }
}

function updateUI() {
  document.getElementById("coins").textContent    = game.coins.toLocaleString();
  document.getElementById("luck").textContent     = game.luck.toFixed(1);
  document.getElementById("spins").textContent    = game.spins;
  document.getElementById("jackpots").textContent = game.jackpots;
  document.getElementById("rebirths").textContent = game.rebirths;

  const luckCost    = Math.floor(game.luck * 500);
  const rebirthCost = 100000;
  document.getElementById("luck-cost").textContent    = "Cost: " + luckCost.toLocaleString() + " 🪙";
  document.getElementById("rebirth-cost").textContent = "Cost: " + rebirthCost.toLocaleString() + " 🪙";
}

// ── RNG ───────────────────────────────────────────────────────────────────────

function randomSymbol() {
  const adjusted = symbols.map(s => ({ ...s, w: s.chance * game.luck }));
  const total    = adjusted.reduce((a, b) => a + b.w, 0);
  let rand       = Math.random() * total;
  for (const s of adjusted) {
    if (rand < s.w) return s;
    rand -= s.w;
  }
  return adjusted[0];
}

// ── Spin ──────────────────────────────────────────────────────────────────────

async function spin() {
  const btn = document.getElementById("spin-btn");
  btn.disabled = true;
  game.spins++;

  const reels = ["reel1","reel2","reel3"].map(id => document.getElementById(id));

  for (let i = 0; i < 15; i++) {
    reels.forEach(r => r.textContent = symbols[Math.floor(Math.random()*symbols.length)].icon);
    await sleep(game.fastSpin ? 35 : 80);
  }

  const result = [randomSymbol(), randomSymbol(), randomSymbol()];
  reels.forEach((r,i) => r.textContent = result[i].icon);

  const reward = result.reduce((a, b) => a + b.reward, 0);
  game.coins += reward;
  result.forEach(r => game.inventory.push(r.rarity + " Aura"));
  floatingText("+" + reward + " coins");

  if (result.every(r => r.rarity === "Infinite")) jackpot();

  updateUI();
  saveGame();
  btn.disabled = false;
}

function jackpot() {
  game.jackpots++;
  game.coins += 1000000;
  document.body.animate(
    [{ transform:"translate(0)" },{ transform:"translate(10px)" },{ transform:"translate(-10px)" }],
    { duration: 500, iterations: 4 }
  );
  notify("♾️ INFINITE JACKPOT!!! ♾️");
}

// ── Upgrades / actions ────────────────────────────────────────────────────────

function buyLuck() {
  const cost = Math.floor(game.luck * 500);
  if (game.coins >= cost) {
    game.coins -= cost;
    game.luck  += 0.2;
    notify("Luck upgraded!");
    updateUI(); saveGame();
  } else {
    notify("Not enough coins!");
  }
}

function rebirth() {
  if (game.coins >= 100000) {
    game.rebirths++;
    game.coins  = 0;
    game.luck  += 1;
    notify("REBIRTH SUCCESSFUL");
    updateUI(); saveGame();
  }
}

function toggleAutoSpin() {
  game.autoSpin = !game.autoSpin;
  notify(game.autoSpin ? "Auto Spin ON" : "Auto Spin OFF");
}

function toggleFastSpin() {
  game.fastSpin = !game.fastSpin;
  notify(game.fastSpin ? "Fast Spin ON" : "Fast Spin OFF");
}

setInterval(() => { if (game.autoSpin) spin(); }, 1500);

function claimDaily() {
  game.coins += 5000;
  notify("Daily reward claimed!");
  updateUI(); saveGame();
}

function redeemCode() {
  const code = prompt("Enter code:");
  if (code === "LUCKY") {
    game.coins += 10000;
    notify("Code redeemed!");
    updateUI(); saveGame();
  }
}

// ── Inventory ─────────────────────────────────────────────────────────────────

function openInventory() {
  document.getElementById("inventory").classList.remove("hidden");
  const list = document.getElementById("inventory-list");
  list.innerHTML = "";
  game.inventory.slice(-100).forEach(item => {
    const div      = document.createElement("div");
    div.innerText  = item;
    list.appendChild(div);
  });
}

function closeInventory() {
  document.getElementById("inventory").classList.add("hidden");
}

// ── Leaderboard ───────────────────────────────────────────────────────────────

async function openLeaderboard() {
  document.getElementById("leaderboard-modal").classList.remove("hidden");
  await loadLeaderboard();
}

function closeLeaderboard() {
  document.getElementById("leaderboard-modal").classList.add("hidden");
}

async function loadLeaderboard() {
  const list = document.getElementById("leaderboard-list");
  list.innerHTML = "<p>Loading...</p>";
  try {
    const res     = await fetch(API_BASE + "/leaderboard");
    if (!res.ok) throw new Error();
    const entries = await res.json();

    if (!entries.length) {
      list.innerHTML = "<p style='color:#ccc'>No scores yet. Be the first!</p>";
      return;
    }

    const medals = ["🥇","🥈","🥉"];
    list.innerHTML = `
      <table class="lb-table">
        <thead>
          <tr><th>#</th><th>Player</th><th>🪙 Coins</th><th>Spins</th><th>Jackpots</th><th>Rebirths</th></tr>
        </thead>
        <tbody>
          ${entries.map((e, i) => `
            <tr class="${e.playerName === authUsername ? "lb-me" : ""}">
              <td>${medals[i] || (i+1)}</td>
              <td>${esc(e.playerName)}</td>
              <td>${e.coins.toLocaleString()}</td>
              <td>${e.spins.toLocaleString()}</td>
              <td>${e.jackpots}</td>
              <td>${e.rebirths}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>`;
  } catch {
    list.innerHTML = "<p style='color:#ff6666'>Could not load leaderboard.</p>";
  }
}

async function submitScore() {
  if (!authToken) {
    notify("Log in to submit your score!");
    return;
  }
  await pushScoreToServer(true);
  await loadLeaderboard();
}

// ── Utils ─────────────────────────────────────────────────────────────────────

function esc(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
}

function notify(text) {
  const n        = document.getElementById("notification");
  n.innerText    = text;
  n.style.display = "block";
  setTimeout(() => n.style.display = "none", 3000);
}

function floatingText(text) {
  const div      = document.createElement("div");
  div.className  = "floating";
  div.innerText  = text;
  div.style.left = Math.random() * 80 + "%";
  div.style.top  = "70%";
  document.body.appendChild(div);
  setTimeout(() => div.remove(), 2000);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Boot ──────────────────────────────────────────────────────────────────────

setInterval(() => {
  document.getElementById("online-count").textContent =
    "Players Online: " + Math.floor(Math.random() * 4000 + 1000);
}, 2000);

setTimeout(() => {
  document.getElementById("loading-screen").style.display = "none";
  if (!authToken) {
    document.getElementById("auth-modal").classList.remove("hidden");
  }
}, 2500);

updateUI();
updateAuthUI();
