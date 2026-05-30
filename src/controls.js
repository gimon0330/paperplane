export function setupControls(dom, input, actions) {
  bindButton(dom.buttons.left, "left", input, actions);
  bindButton(dom.buttons.right, "right", input, actions);
  bindButton(dom.buttons.down, "down", input, actions);

  dom.restartBtn.addEventListener("click", actions.resetGame);

  addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (key === "r" && actions.getGameState() === "gameover") return actions.resetGame();
    if (key === "arrowleft" || key === "a") setInput(dom, input, "left", true);
    if (key === "arrowright" || key === "d") setInput(dom, input, "right", true);
    if ((key === "arrowdown" || key === "s") && !event.repeat) setInput(dom, input, "down", true);
  });

  addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    if (key === "arrowleft" || key === "a") setInput(dom, input, "left", false);
    if (key === "arrowright" || key === "d") setInput(dom, input, "right", false);
    if (key === "arrowdown" || key === "s") {
      if (actions.getGameState() === "ready" && input.down) actions.beginLaunch();
      setInput(dom, input, "down", false);
    }
  });

  addEventListener("resize", actions.handleResize);
}

function bindButton(button, action, input, actions) {
  const press = (event) => {
    event.preventDefault();
    if (actions.getGameState() !== "gameover") setInput(actions.dom, input, action, true);
  };

  const release = (event) => {
    event.preventDefault();
    if (action === "down" && actions.getGameState() === "ready" && input.down) actions.beginLaunch();
    setInput(actions.dom, input, action, false);
  };

  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("pointerleave", (event) => {
    if (input[action]) release(event);
  });
}

export function setInput(dom, input, action, value) {
  input[action] = value;
  dom.buttons[action]?.classList.toggle("is-pressed", value);
}
