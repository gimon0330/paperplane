import { isLeaderboardConfigured, loadLeaderboard, submitScore } from "./leaderboard.js";

const selfDestructBtn = document.querySelector("#self-destruct-btn");
const resultDialog = document.querySelector("#result-dialog");
const resultDistanceEl = document.querySelector("#result-distance");
const resultBestEl = document.querySelector("#result-best");
const distanceEl = document.querySelector("#distance");
const bestDistanceEl = document.querySelector("#best-distance");
const phaseTextEl = document.querySelector("#phase-text");
const scoreForm = document.querySelector("#score-form");
const nicknameInput = document.querySelector("#nickname-input");
const scoreStatus = document.querySelector("#score-status");
const leaderboardList = document.querySelector("#leaderboard-list");

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

function showResult(reason = "self destruct") {
  const distance = readMeters(distanceEl.textContent);
  const best = Math.max(distance, readMeters(bestDistanceEl.textContent));
  resultDistanceEl.textContent = `${distance.toFixed(1)} m · ${reason}`;
  resultBestEl.textContent = `Best ${best.toFixed(1)} m`;
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
    scoreStatus.textContent = scores.length ? "Top 5" : "No scores yet";
  } catch (error) {
    scoreStatus.textContent = "Ranking load failed";
    console.error(error);
  }
}

selfDestructBtn?.addEventListener("click", () => showResult("self destruct"));

scoreForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const distance = readMeters(resultDistanceEl.textContent);

  if (!isLeaderboardConfigured) {
    scoreStatus.textContent = "Add Firebase config first";
    return;
  }

  try {
    scoreStatus.textContent = "Saving...";
    await submitScore(nicknameInput.value, distance);
    scoreStatus.textContent = "Saved";
    await refreshLeaderboard();
  } catch (error) {
    scoreStatus.textContent = "Save failed";
    console.error(error);
  }
});

setInterval(compactPhaseText, 120);
refreshLeaderboard();
