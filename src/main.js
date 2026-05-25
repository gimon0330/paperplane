import * as THREE from "three";

const canvas = document.querySelector("#game-canvas");
const distanceEl = document.querySelector("#distance");
const bestDistanceEl = document.querySelector("#best-distance");
const angleEl = document.querySelector("#angle");
const boostFillEl = document.querySelector("#boost-fill");
const phaseTextEl = document.querySelector("#phase-text");
const resultDialog = document.querySelector("#result-dialog");
const resultDistanceEl = document.querySelector("#result-distance");
const resultBestEl = document.querySelector("#result-best");
const restartBtn = document.querySelector("#restart-btn");

const buttons = {
  left: document.querySelector("#left-btn"),
  down: document.querySelector("#down-btn"),
  right: document.querySelector("#right-btn"),
};

const BEST_KEY = "paperplane.bestDistance.v1";
const MAX_LAUNCH_ANGLE = 90;

const POSE_ARM_UP = {
  shoulderX: 2.16,
  shoulderY: -0.34,
  shoulderZ: -0.34,
  armZ: -0.64,
};

const POSE_ARM_BACK = {
  shoulderX: 1.18,
  shoulderY: 0.12,
  shoulderZ: -0.18,
  armZ: -0.2,
};

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8bd3ff);
scene.fog = new THREE.Fog(0x8bd3ff, 85, 260);

const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 700);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const clock = new THREE.Clock();

const input = { left: false, right: false, down: false };

const game = {
  state: "ready",
  launchAngle: 0,
  launchTimer: 0,
  boost: 100,
  distance: 0,
  bestDistance: Number(localStorage.getItem(BEST_KEY) || 0),
};

const physics = {
  position: new THREE.Vector3(0, 1.55, -1.2),
  velocity: new THREE.Vector3(),
  rollTarget: 0,
};

const world = { trees: [], clouds: [] };

const materials = {
  ground: new THREE.MeshStandardMaterial({ color: 0x6fcf79, roughness: 0.92 }),
  path: new THREE.MeshStandardMaterial({ color: 0xd8c68a, roughness: 0.96 }),
  paper: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55, side: THREE.DoubleSide }),
  paperFold: new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.58, side: THREE.DoubleSide }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x7c4a2d, roughness: 0.85 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x1f8a4c, roughness: 0.9 }),
  darkLeaf: new THREE.MeshStandardMaterial({ color: 0x146c43, roughness: 0.9 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xf3c7a5, roughness: 0.72 }),
  shirt: new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.78 }),
  pants: new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.82 }),
  cloud: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }),
};

const paperPlane = createPaperPlane();
const human = createHuman();

setupLights();
setupWorld();
setupControls();
resetGame();
animate();

function setupLights() {
  scene.add(new THREE.HemisphereLight(0xdff7ff, 0x69a36f, 1.8));

  const sun = new THREE.DirectionalLight(0xffffff, 2.4);
  sun.position.set(-35, 70, -20);
  sun.castShadow = true;
  sun.shadow.camera.left = -60;
  sun.shadow.camera.right = 60;
  sun.shadow.camera.top = 60;
  sun.shadow.camera.bottom = -60;
  sun.shadow.mapSize.width = 2048;
  sun.shadow.mapSize.height = 2048;
  scene.add(sun);
}

function setupWorld() {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 1200), materials.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = 420;
  ground.receiveShadow = true;
  scene.add(ground);

  const path = new THREE.Mesh(new THREE.PlaneGeometry(24, 1200), materials.path);
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.012, 420);
  path.receiveShadow = true;
  scene.add(path);

  for (let z = 28; z < 720; z += 18) {
    const safeGap = z < 90 ? 7.5 : 4.5;
    const side = Math.random() > 0.5 ? 1 : -1;
    addTree(side * (safeGap + Math.random() * 16), z, 0.85 + Math.random() * 0.75);

    if (Math.random() > 0.45) {
      addTree(-side * (safeGap + 7 + Math.random() * 22), z + Math.random() * 9, 0.75 + Math.random() * 0.8);
    }
  }

  for (let i = 0; i < 22; i += 1) {
    addCloud(-55 + Math.random() * 110, 22 + Math.random() * 28, 20 + Math.random() * 580, 0.7 + Math.random() * 1.4);
  }

  scene.add(human.group);
  scene.add(paperPlane.group);
}

function createPaperPlane() {
  const group = new THREE.Group();
  const vertices = new Float32Array([
    0, 0.05, 2.2, -1.25, 0, -1.15, 0, 0.12, -0.62,
    0, 0.05, 2.2, 0, 0.12, -0.62, 1.25, 0, -1.15,
    0, 0.05, 2.2, 0, -0.22, -0.42, 0, 0.12, -0.62,
    0, 0.12, -0.62, -0.42, 0.02, -1.08, 0, -0.22, -0.42,
    0, 0.12, -0.62, 0, -0.22, -0.42, 0.42, 0.02, -1.08,
  ]);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(vertices, 3));
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, materials.paper);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);

  const fold = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.035, 3.05), materials.paperFold);
  fold.position.z = 0.35;
  group.add(fold);

  group.scale.setScalar(0.85);
  return { group };
}

function createHuman() {
  const group = new THREE.Group();
  group.position.set(-1.2, 0, -5.4);
  group.rotation.y = -0.18;

  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.42, 1.25, 18), materials.shirt);
  body.position.y = 1.55;
  body.castShadow = true;
  group.add(body);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.28, 24, 16), materials.skin);
  head.position.y = 2.34;
  head.castShadow = true;
  group.add(head);

  const leftLeg = createLimb(0.13, 0.76, materials.pants);
  leftLeg.position.set(-0.16, 0.62, 0);
  group.add(leftLeg);

  const rightLeg = createLimb(0.13, 0.76, materials.pants);
  rightLeg.position.set(0.16, 0.62, 0);
  group.add(rightLeg);

  const rightShoulderSocket = new THREE.Mesh(new THREE.SphereGeometry(0.125, 16, 12), materials.shirt);
  rightShoulderSocket.position.set(0.38, 1.98, 0.08);
  rightShoulderSocket.castShadow = true;
  group.add(rightShoulderSocket);

  const shoulder = new THREE.Group();
  shoulder.position.copy(rightShoulderSocket.position);
  group.add(shoulder);

  const throwingArm = new THREE.Group();
  throwingArm.rotation.z = POSE_ARM_UP.armZ;
  shoulder.add(throwingArm);

  const arm = createLimb(0.09, 0.96, materials.skin);
  arm.position.y = -0.48;
  throwingArm.add(arm);

  const hand = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 12), materials.skin);
  hand.position.set(0, -1.0, 0);
  hand.castShadow = true;
  throwingArm.add(hand);

  const heldPlane = paperPlane.group.clone();
  heldPlane.name = "held-plane";
  heldPlane.scale.setScalar(0.42);
  heldPlane.position.set(0.02, -1.04, 0.43);
  heldPlane.rotation.x = 1.2;
  heldPlane.rotation.y = 0.03;
  heldPlane.rotation.z = 0;
  throwingArm.add(heldPlane);

  const leftShoulderSocket = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), materials.shirt);
  leftShoulderSocket.position.set(-0.36, 1.92, 0.04);
  leftShoulderSocket.castShadow = true;
  group.add(leftShoulderSocket);

  const leftShoulder = new THREE.Group();
  leftShoulder.position.copy(leftShoulderSocket.position);
  leftShoulder.rotation.z = 0.38;
  leftShoulder.rotation.x = -0.12;
  group.add(leftShoulder);

  const leftArm = createLimb(0.08, 0.78, materials.skin);
  leftArm.position.y = -0.39;
  leftShoulder.add(leftArm);

  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.105, 16, 12), materials.skin);
  leftHand.position.set(0, -0.82, 0);
  leftHand.castShadow = true;
  leftShoulder.add(leftHand);

  return {
    group,
    shoulder,
    throwingArm,
    hand,
    heldPlane,
    rightShoulderSocket,
    leftShoulder,
  };
}

function createLimb(radius, height, material) {
  const limb = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 14), material);
  limb.castShadow = true;
  return limb;
}

function addTree(x, z, scale) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);

  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.32, 2.1, 12), materials.trunk);
  trunk.position.y = 1.05;
  trunk.castShadow = true;
  group.add(trunk);

  const crown1 = new THREE.Mesh(new THREE.ConeGeometry(1.25, 2.6, 16), materials.leaf);
  crown1.position.y = 2.7;
  crown1.castShadow = true;
  group.add(crown1);

  const crown2 = new THREE.Mesh(new THREE.ConeGeometry(0.95, 2.15, 16), materials.darkLeaf);
  crown2.position.y = 3.75;
  crown2.castShadow = true;
  group.add(crown2);

  scene.add(group);
  world.trees.push({ group, x, z, radius: 1.15 * scale, height: 5.0 * scale });
}

function addCloud(x, y, z, scale) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.scale.setScalar(scale);

  for (let i = 0; i < 4; i += 1) {
    const puff = new THREE.Mesh(new THREE.SphereGeometry(1.15 - i * 0.1, 16, 10), materials.cloud);
    puff.position.set((i - 1.5) * 1.2, Math.sin(i) * 0.25, Math.cos(i) * 0.25);
    group.add(puff);
  }

  scene.add(group);
  world.clouds.push(group);
}

function setupControls() {
  bindButton(buttons.left, "left");
  bindButton(buttons.right, "right");
  bindButton(buttons.down, "down");
  restartBtn.addEventListener("click", resetGame);

  window.addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();

    if (key === "r" && game.state === "gameover") {
      resetGame();
      return;
    }

    if (key === "arrowleft" || key === "a") setInput("left", true);
    if (key === "arrowright" || key === "d") setInput("right", true);
    if ((key === "arrowdown" || key === "s") && !event.repeat) setInput("down", true);
  });

  window.addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();

    if (key === "arrowleft" || key === "a") setInput("left", false);
    if (key === "arrowright" || key === "d") setInput("right", false);

    if (key === "arrowdown" || key === "s") {
      if (game.state === "ready" && input.down) beginLaunch();
      setInput("down", false);
    }
  });

  window.addEventListener("resize", handleResize);
}

function bindButton(button, action) {
  const press = (event) => {
    event.preventDefault();
    if (game.state !== "gameover") setInput(action, true);
  };

  const release = (event) => {
    event.preventDefault();
    if (action === "down" && game.state === "ready" && input.down) beginLaunch();
    setInput(action, false);
  };

  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("pointerleave", (event) => {
    if (input[action]) release(event);
  });
}

function setInput(action, value) {
  input[action] = value;
  buttons[action]?.classList.toggle("is-pressed", value);
}

function resetGame() {
  resultDialog.close();

  game.state = "ready";
  game.launchAngle = 0;
  game.launchTimer = 0;
  game.boost = 100;
  game.distance = 0;

  physics.position.set(0, 1.55, -1.2);
  physics.velocity.set(0, 0, 0);
  physics.rollTarget = 0;

  setInput("left", false);
  setInput("right", false);
  setInput("down", false);

  paperPlane.group.visible = false;
  paperPlane.group.position.copy(physics.position);
  paperPlane.group.rotation.set(0, 0, 0);

  human.group.visible = true;
  human.heldPlane.visible = true;
  updateThrowingPose(false);
  updateUi();
}

function beginLaunch() {
  if (game.state !== "ready") return;
  game.state = "launch";
  game.launchTimer = 0;
  setInput("down", false);
}

function releasePlane() {
  const angleRad = THREE.MathUtils.degToRad(game.launchAngle);
  const angleBonus = 1 - Math.min(Math.abs(game.launchAngle - 45) / 45, 0.78);
  const speed = 22 + angleBonus * 7;

  physics.position.set(0, 1.65, -1.1);
  physics.velocity.set(0, Math.sin(angleRad) * speed, Math.cos(angleRad) * speed);

  paperPlane.group.visible = true;
  paperPlane.group.position.copy(physics.position);
  paperPlane.group.rotation.set(-angleRad, 0, 0);

  human.heldPlane.visible = false;
  game.boost = 100;
  game.state = "flight";
}

function updateReady(dt) {
  if (input.down) {
    game.launchAngle = Math.min(MAX_LAUNCH_ANGLE, game.launchAngle + dt * 62);
  }

  updateThrowingPose(input.down);
  camera.position.lerp(new THREE.Vector3(0, 4.6, -12.5), 0.08);
  camera.lookAt(0, 1.7, 0);
}

function updateThrowingPose(isCharging) {
  const angleT = THREE.MathUtils.clamp(game.launchAngle / MAX_LAUNCH_ANGLE, 0, 1);
  const idle = isCharging ? 0 : Math.sin(performance.now() * 0.004) * 0.018;

  human.shoulder.position.copy(human.rightShoulderSocket.position);
  human.shoulder.rotation.x = THREE.MathUtils.lerp(POSE_ARM_UP.shoulderX, POSE_ARM_BACK.shoulderX, angleT) + idle;
  human.shoulder.rotation.y = THREE.MathUtils.lerp(POSE_ARM_UP.shoulderY, POSE_ARM_BACK.shoulderY, angleT);
  human.shoulder.rotation.z = THREE.MathUtils.lerp(POSE_ARM_UP.shoulderZ, POSE_ARM_BACK.shoulderZ, angleT);
  human.throwingArm.rotation.z = THREE.MathUtils.lerp(POSE_ARM_UP.armZ, POSE_ARM_BACK.armZ, angleT);
}

function updateLaunch(dt) {
  game.launchTimer += dt;
  const t = Math.min(game.launchTimer / 0.34, 1);
  const angleT = THREE.MathUtils.clamp(game.launchAngle / MAX_LAUNCH_ANGLE, 0, 1);
  const startShoulderX = THREE.MathUtils.lerp(POSE_ARM_UP.shoulderX, POSE_ARM_BACK.shoulderX, angleT);
  const startShoulderY = THREE.MathUtils.lerp(POSE_ARM_UP.shoulderY, POSE_ARM_BACK.shoulderY, angleT);
  const startShoulderZ = THREE.MathUtils.lerp(POSE_ARM_UP.shoulderZ, POSE_ARM_BACK.shoulderZ, angleT);
  const startArmZ = THREE.MathUtils.lerp(POSE_ARM_UP.armZ, POSE_ARM_BACK.armZ, angleT);

  human.shoulder.position.copy(human.rightShoulderSocket.position);
  human.shoulder.rotation.x = THREE.MathUtils.lerp(startShoulderX, -1.05, easeOutCubic(t));
  human.shoulder.rotation.y = THREE.MathUtils.lerp(startShoulderY, 0.05, t);
  human.shoulder.rotation.z = THREE.MathUtils.lerp(startShoulderZ, 0.04, t);
  human.throwingArm.rotation.z = THREE.MathUtils.lerp(startArmZ, -0.06, t);

  camera.position.lerp(new THREE.Vector3(0, 4.4, -11.0), 0.1);
  camera.lookAt(0, 1.8, 0.8);

  if (game.launchTimer >= 0.34) releasePlane();
}

function updateFlight(dt) {
  const steer = Number(input.left) - Number(input.right);
  const horizontalSpeed = Math.hypot(physics.velocity.x, physics.velocity.z);

  physics.velocity.y -= 9.8 * dt;
  physics.velocity.y += Math.max(0, horizontalSpeed - 6) * 0.19 * dt;
  physics.velocity.x += steer * 9.2 * dt;
  physics.rollTarget = THREE.MathUtils.lerp(physics.rollTarget, -steer * 0.62, 0.12);

  if (input.down && game.boost > 0) {
    physics.velocity.y += 17.5 * dt;
    physics.velocity.z += 2.6 * dt;
    game.boost = Math.max(0, game.boost - 27 * dt);
  }

  physics.velocity.multiplyScalar(Math.max(0.965, 1 - 0.055 * dt));
  physics.position.addScaledVector(physics.velocity, dt);
  game.distance = Math.max(0, physics.position.z + 1.2);

  paperPlane.group.position.copy(physics.position);
  const yaw = Math.atan2(physics.velocity.x, physics.velocity.z);
  const pitch = -Math.atan2(physics.velocity.y, Math.max(0.001, horizontalSpeed));
  paperPlane.group.rotation.set(pitch, yaw, physics.rollTarget);

  recycleClouds();
  const target = physics.position.clone().add(new THREE.Vector3(-physics.velocity.x * 0.08, 4.2, -11.5));
  camera.position.lerp(target, 0.055);
  camera.lookAt(physics.position.x, physics.position.y + 0.45, physics.position.z + 7.5);

  if (physics.position.y <= 0.24) endGame("landed");
  else checkTreeCollision();
}

function checkTreeCollision() {
  for (const tree of world.trees) {
    if (Math.abs(physics.position.z - tree.z) > tree.radius + 1.35) continue;

    const horizontalDistance = Math.hypot(physics.position.x - tree.x, physics.position.z - tree.z);
    if (horizontalDistance < tree.radius + 0.55 && physics.position.y < tree.height) {
      endGame("hit a tree");
      return;
    }
  }
}

function endGame(reason) {
  if (game.state === "gameover") return;
  game.state = "gameover";

  if (game.distance > game.bestDistance) {
    game.bestDistance = game.distance;
    localStorage.setItem(BEST_KEY, String(game.bestDistance));
  }

  resultDistanceEl.textContent = `Distance: ${formatDistance(game.distance)} · ${reason}`;
  resultBestEl.textContent = `Best: ${formatDistance(game.bestDistance)}`;
  resultDialog.showModal();
  updateUi();
}

function recycleClouds() {
  for (const cloud of world.clouds) {
    if (cloud.position.z < physics.position.z - 65) {
      cloud.position.z = physics.position.z + 360 + Math.random() * 180;
      cloud.position.x = -60 + Math.random() * 120;
      cloud.position.y = 24 + Math.random() * 32;
    }
  }
}

function updateUi() {
  distanceEl.textContent = formatDistance(game.distance);
  bestDistanceEl.textContent = formatDistance(game.bestDistance);
  angleEl.textContent = `${Math.round(game.launchAngle)}°`;

  const launchMeter = game.state === "ready" || game.state === "launch";
  const meterPercent = launchMeter ? (game.launchAngle / MAX_LAUNCH_ANGLE) * 100 : game.boost;
  boostFillEl.style.width = `${THREE.MathUtils.clamp(meterPercent, 0, 100)}%`;

  if (launchMeter) {
    boostFillEl.style.background = "linear-gradient(90deg, #38bdf8, #a7f3d0)";
  } else if (game.boost < 15) {
    boostFillEl.style.background = "linear-gradient(90deg, #fb7185, #fda4af)";
  } else {
    boostFillEl.style.background = "linear-gradient(90deg, #34d399, #7dd3fc)";
  }

  if (game.state === "ready") {
    phaseTextEl.textContent = input.down
      ? game.launchAngle >= MAX_LAUNCH_ANGLE
        ? "Angle maxed at 90°. Release ↓ to throw."
        : "Charging launch angle... release ↓ to throw."
      : "Hold ↓ to raise angle from 0° to 90°, release to throw.";
  } else if (game.state === "launch") {
    phaseTextEl.textContent = "Throwing...";
  } else if (game.state === "flight") {
    phaseTextEl.textContent = "Use ← / → to steer. Hold ↓ to spend limited boost.";
  } else {
    phaseTextEl.textContent = "Game over. Press Restart or R.";
  }
}

function formatDistance(value) {
  return `${value.toFixed(1)} m`;
}

function handleResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function easeOutCubic(t) {
  return 1 - Math.pow(1 - t, 3);
}

function animate() {
  const dt = Math.min(clock.getDelta(), 1 / 30);

  if (game.state === "ready") updateReady(dt);
  else if (game.state === "launch") updateLaunch(dt);
  else if (game.state === "flight") updateFlight(dt);
  else {
    camera.position.lerp(new THREE.Vector3(physics.position.x, 4.5, physics.position.z - 10), 0.03);
    camera.lookAt(physics.position.x, physics.position.y + 0.25, physics.position.z + 6);
  }

  updateUi();
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
