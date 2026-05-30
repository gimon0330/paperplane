import * as THREE from "three";
import { MAX_LAUNCH_ANGLE } from "./config.js";

export function formatDistance(value) {
  return `${value.toFixed(1)} m`;
}

export function updateUi(dom, game, input) {
  dom.distanceEl.textContent = formatDistance(game.distance);
  dom.bestDistanceEl.textContent = formatDistance(game.bestDistance);
  dom.angleEl.textContent = `${Math.round(game.launchAngle)}°`;

  const launchMeter = game.state === "ready" || game.state === "launch";
  const meterPercent = launchMeter ? (game.launchAngle / MAX_LAUNCH_ANGLE) * 100 : game.boost;
  dom.boostFillEl.style.width = `${THREE.MathUtils.clamp(meterPercent, 0, 100)}%`;

  dom.boostFillEl.style.background = launchMeter
    ? "linear-gradient(90deg, #38bdf8, #a7f3d0)"
    : game.boost < 15
      ? "linear-gradient(90deg, #fb7185, #fda4af)"
      : "linear-gradient(90deg, #34d399, #7dd3fc)";

  if (game.state === "ready") {
    dom.phaseTextEl.textContent = input.down
      ? game.launchAngle >= MAX_LAUNCH_ANGLE
        ? "Angle maxed at 90°. Release ↓ to throw."
        : "Charging launch angle... release ↓ to throw."
      : "Hold ↓ to raise angle from 0° to 90°, release to throw.";
  } else if (game.state === "launch") {
    dom.phaseTextEl.textContent = "Throwing...";
  } else if (game.state === "flight") {
    dom.phaseTextEl.textContent = "Use ← / → to steer. Hold ↓ to spend limited boost.";
  } else {
    dom.phaseTextEl.textContent = "Game over. Press Restart or R.";
  }
}

export function showGameOverDialog(dom, game, reason) {
  dom.resultDistanceEl.textContent = `Distance: ${formatDistance(game.distance)} · ${reason}`;
  dom.resultBestEl.textContent = `Best: ${formatDistance(game.bestDistance)}`;
  dom.resultDialog.showModal();
}
