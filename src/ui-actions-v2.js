import { getLocalRankingBest, getSavedNickname, isLeaderboardConfigured, loadLeaderboard, submitScore, syncBestFromDatabase } from "./leaderboard.js";

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

const nicknameLabel = document.createElement("p");
nicknameLabel.className = "score-status";
nicknameLabel.hidden = true;
scoreForm.before(nicknameLabel);

let currentResultDistance = 0;
let isSaving = false;
let lastHandledResultKey = "";
let scoreFormRemoved = false;

function readMeters(text) {
  const value = Number.parseFloat(String(text || "0").replace(/[^0-9.]/g, ""));
  return Number.isFinite(value) ? value : 0;
}

function setBestText(distance) {
  const bestText = `${Number(distance || 0).toFixed(1)} m`;
  resultBestEl.textContent = `Best ${bestText}`;
  bestDistanceEl.textContent = bestText;
}

function compactPhaseText() {
  const text = phaseTextEl.textContent || "";
  if (text.includes("Charging")) phaseTextEl.textContent = "Release ↓";
  else if (text.includes("Angle maxed")) phaseTextEl.textContent = "Max · Release";
  else if (text.includes("Hold ↓ to raise")) phaseTextEl.textContent = "Hold ↓ · Release";
  else if (text.includes("Use ←")) phaseTextEl.textContent = "← → · ↓ Boost";
  else if (text.includes("Game over")) phaseTextEl.textContent = "Game Over";
}

function removeScoreForm() {
  if (!scoreFormRemoved) {
    scoreForm.remove();
    scoreFormRemoved = true;
  }
}

function syncNicknameUi() {
  const savedNickname = getSavedNickname();

  if (savedNickname) {
    nicknameLabel.hidden = false;
    nicknameLabel.textContent = `Pilot: ${savedNickname}`;
    removeScoreForm();
    return;
  }

  nicknameLabel.hidden = true;
  nicknameLabel.textContent = "";
  if (!scoreFormRemoved) {
    scoreForm.hidden = false;
    nicknameInput.disabled = false;
    saveScoreBtn.disabled = !isLeaderboardConfigured || isSaving || currentResultDistance <= 0;
  }
}

function showResult(reason = "quit") {
  const distance = readMeters(distanceEl.textContent);
  const fallbackBest = Math.max(distance, readMeters(bestDistanceEl.textContent));
  resultDistanceEl.textContent = `${distance.toFixed(1)} m · ${reason}`;
  setBestText(fallbackBest);
  phaseTextEl.textContent = "Game Over";
  prepareResult(distance);
  if (!resultDialog.open) resultDialog.showModal();
  refreshLeaderboard();
}

async function prepareResult(distance) {
  currentResultDistance = distance;
  syncNicknameUi();

  if (!isLeaderboardConfigured) {
    scoreStatus.textContent = "Ranking DB not connected";
    return;
  }

  const savedNickname = getSavedNickname();
  if (!savedNickname) {
    scoreStatus.textContent = "Set nickname once";
    return;
  }

  try {
    scoreStatus.textContent = "Checking DB best...";
    const dbScore = await syncBestFromDatabase();
    const dbBest = Number(dbScore?.distance || 0);
    setBestText(dbBest);

    if (distance > dbBest) {
      await autoUpdateBest(distance, dbBest);
    } else {
      scoreStatus.textContent = `DB best ${dbBest.toFixed(1)} m`;
    }
  } catch (error) {
    const localBest = getLocalRankingBest();
    setBestText(localBest);
    scoreStatus.textContent = "DB sync failed";
    console.error(error);
  }
}

async function autoUpdateBest(distance, previousBest = getLocalRankingBest()) {
  const resultKey = `${distance.toFixed(1)}:${previousBest.toFixed(1)}:${getSavedNickname()}`;
  if (isSaving || lastHandledResultKey === resultKey) return;

  try {
    isSaving = true;
    lastHandledResultKey = resultKey;
    scoreStatus.textContent = "Updating best...";
    const result = await submitScore(getSavedNickname(), distance);
    const best = Number(result.distance || distance || previousBest || 0);
    setBestText(best);
    scoreStatus.textContent = result.saved ? "Best updated" : `DB best ${best.toFixed(1)} m`;
    await refreshLeaderboard();
  } catch (error) {
    scoreStatus.textContent = "Auto update failed";
    console.error(error);
  } finally {
    isSaving = false;
    syncNicknameUi();
  }
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
  } catch (error) {
    scoreStatus.textContent = "Ranking load failed";
    console.error(error);
  }
}

quitBtn?.addEventListener("click", () => showResult("quit"));

scoreForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (isSaving || getSavedNickname()) {
    syncNicknameUi();
    return;
  }

  if (!isLeaderboardConfigured) {
    scoreStatus.textContent = "Add Firebase config first";
    return;
  }

  const nickname = nicknameInput.value.trim();
  if (!nickname) {
    scoreStatus.textContent = "Enter nickname";
    return;
  }

  try {
    isSaving = true;
    saveScoreBtn.disabled = true;
    scoreStatus.textContent = "Saving...";
    const result = await submitScore(nickname, currentResultDistance);
    setBestText(result.distance || currentResultDistance);
    scoreStatus.textContent = result.saved ? "Nickname set · best saved" : "Nickname set";
    syncNicknameUi();
    await refreshLeaderboard();
  } catch (error) {
    scoreStatus.textContent = "Save failed";
    console.error(error);
  } finally {
    isSaving = false;
    syncNicknameUi();
  }
});

new MutationObserver(() => {
  if (resultDialog.open) {
    prepareResult(readMeters(resultDistanceEl.textContent));
    refreshLeaderboard();
  }
}).observe(resultDialog, { attributes: true, attributeFilter: ["open"] });

syncNicknameUi();
setInterval(compactPhaseText, 120);
refreshLeaderboard();
