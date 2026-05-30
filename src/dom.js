export function getDomRefs() {
  return {
    canvas: document.querySelector("#game-canvas"),
    distanceEl: document.querySelector("#distance"),
    bestDistanceEl: document.querySelector("#best-distance"),
    angleEl: document.querySelector("#angle"),
    boostFillEl: document.querySelector("#boost-fill"),
    phaseTextEl: document.querySelector("#phase-text"),
    resultDialog: document.querySelector("#result-dialog"),
    resultDistanceEl: document.querySelector("#result-distance"),
    resultBestEl: document.querySelector("#result-best"),
    restartBtn: document.querySelector("#restart-btn"),
    buttons: {
      left: document.querySelector("#left-btn"),
      down: document.querySelector("#down-btn"),
      right: document.querySelector("#right-btn"),
    },
  };
}
