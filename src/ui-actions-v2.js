import { getLocalRankingBest, getSavedNickname, isLeaderboardConfigured, loadLeaderboard, submitScore } from "./leaderboard.js";

const quitBtn = document.querySelector("#self-" + "destruct-btn");
const resultDialog = document.querySelector("#result-dialog");
const resultDistanceEl = document.querySelector("#result-distance");
const resultBestEl = document.querySelector("#result-best");
const distanceEl = document.querySelector("#distance");
const bestDistanceEl = document.querySelector("#best-distance");
const phaseTextEl = document.querySelector("#phase-text");
const scoreForm = document.querySelector("#score-form");
const nicknameInput = document.querySelector("#nickname-input");
const saveScoreBtn = document.querySelector("#save-score-btn");
const scoreStatus = document.querySelector("#score-status");
const leaderboardList = document.querySelector("#leaderboard-list");

let currentResultDistance = 0;
let hasSavedCurrentResult = false;
let isSaving = false;

function readMeters(text) {
  const value = Number.parseFloat(String(text || "0").replace(/[^0-9.]/g, ""));
  return Number.isFinite(value) ? value : 0;
}

function compactPhaseText() {
  const text = phaseTextEl.textContent || "";
  if (text.includes("Charging")) phaseTextEl.textContent = "Release ↓";
  else if (text.includes("Angle maxed")) phaseTextEl.textContent = "Max · Release";
  else if (text.includes("Hold ↓ to raise")) phaseTextEl.textContent = "Hold ↓ · Release";
  else if (text.includes("Use ←")) phaseTextEl.textContent = "← → · ↓ Boost";
  else if (text.includes("Game over")) phaseTextEl.textContent = "Game Over";
}

function syncNickname() {
  const savedNickname = getSavedNickname();
  if (savedNickname) {
    nicknameInput.value = savedNickname;
    nicknameInput.disabled = true;
    nicknameInput.title = "Nickname is locked on this device.";
  } else {
    nicknameInput.disabled = false;
    nicknameInput.title = "";
  }
}

function syncSaveState() {
  const localBest = getLocalRankingBest();
  const canSave = isLeaderboardConfigured && !hasSavedCurrentResult && !isSaving && currentResultDistance > localBest;
  saveScoreBtn.disabled = !canSave;

  if (!isLeaderboardConfigured) scoreStatus.textContent = "Ranking DB not connected";
  else if (hasSavedCurrentResult) scoreStatus.textContent = "Saved for this run";
  else if (currentResultDistance <= localBest) scoreStatus.textContent = `Local best ${localBest.toFixed(1)} m`;
}

function prepareResult(distance) {
  currentResultDistance = distance;
  hasSavedCurrentResult = false;
  isSaving = false;
  syncNickname();
  syncSaveState();
}

function showResult(reason = "quit") {
  const distance = readMeters(distanceEl.textContent);
  const best = Math.max(distance, readMeters(bestDistanceEl.textContent));
  resultDistanceEl.textContent = `${distance.toFixed(1)} m · ${reason}`;
  resultBestEl.textContent = `Best ${best.toFixed(1)} m`;
  phaseTextEl.textContent = "Game Over";
  prepareResult(distance);
  if (!resultDialog.open) resultDialog.showModal();
  refreshLeaderboard();
}

async function refreshLeaderboard() {
  leaderboardList.innerHTML = "";
  if (!isLeaderboardConfigured) {
    scoreStatus.textContent = "Ranking DB not connected";
    return;
  }

  try {
    const scores = await loadLeaderboard();
    for (const score of scores) {
      const item = document.createElement("li");
      item.innerHTML = `${score.nickname || "pilot"} <span>${Number(score.distance || 0).toFixed(1)} m</span>`;
      leaderboardList.appendChild(item);
    }
    if (!scoreStatus.textContent || scoreStatus.textContent === "Ranking DB not connected") {
      scoreStatus.textContent = scores.length ? "Top 5" : "No scores yet";
    }
  } catch (error) {
    scoreStatus.textContent = "Ranking load failed";
    console.error(error);
  }
}

quitBtn?.addEventListener("click", () => showResult("quit"));

scoreForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (isSaving || hasSavedCurrentResult) return;

  const distance = currentResultDistance || readMeters(resultDistanceEl.textContent);

  if (!isLeaderboardConfigured) {
    scoreStatus.textContent = "Add Firebase config first";
    return;
  }

  try {
    isSaving = true;
    syncSaveState();
    scoreStatus.textContent = "Saving...";

    const result = await submitScore(nicknameInput.value, distance);
    hasSavedCurrentResult = true;
    syncNickname();

    if (result.saved) scoreStatus.textContent = result.reason === "created" ? "Saved" : "Updated best";
    else if (result.reason === "not_local_best" || result.reason === "not_remote_best") scoreStatus.textContent = `Best stays ${Number(result.distance || 0).toFixed(1)} m`;
    else scoreStatus.textContent = "Not saved";

    await refreshLeaderboard();
  } catch (error) {
    hasSavedCurrentResult = false;
    scoreStatus.textContent = "Save failed";
    console.error(error);
  } finally {
    isSaving = false;
    syncSaveState();
  }
});

new MutationObserver(() => {
  if (resultDialog.open) {
    prepareResult(readMeters(resultDistanceEl.textContent));
    refreshLeaderboard();
  }
}).observe(resultDialog, { attributes: true, attributeFilter: ["open"] });

syncNickname();
setInterval(compactPhaseText, 120);
refreshLeaderboard();
