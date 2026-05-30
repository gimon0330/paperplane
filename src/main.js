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
const buttons = { left: document.querySelector("#left-btn"), down: document.querySelector("#down-btn"), right: document.querySelector("#right-btn") };

const BEST_KEY = "paperplane.bestDistance.v1";
const MAX_LAUNCH_ANGLE = 90;
const PLAYABLE_HALF_WIDTH = 12.6;
const WALL_X = 13.4;
const WALL_HEIGHT = 240;
const WALL_CENTER_Y = WALL_HEIGHT / 2;
const POSE_ARM_UP = { shoulderX: 2.16, shoulderY: -0.34, shoulderZ: -0.34, armZ: -0.64 };
const POSE_ARM_BACK = { shoulderX: 1.18, shoulderY: 0.12, shoulderZ: -0.18, armZ: -0.2 };

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8bd3ff);
scene.fog = new THREE.Fog(0x8bd3ff, 75, 260);

const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 700);
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const clock = new THREE.Clock();

const input = { left: false, right: false, down: false };
const game = { state: "ready", launchAngle: 0, launchTimer: 0, boost: 100, distance: 0, bestDistance: Number(localStorage.getItem(BEST_KEY) || 0) };
const physics = { position: new THREE.Vector3(0, 1.55, -1.2), velocity: new THREE.Vector3(), rollTarget: 0 };
const world = { trees: [], clouds: [], dangerObstacles: [], movingObstacles: [], walls: [] };

const materials = {
  ground: new THREE.MeshStandardMaterial({ color: 0x6fcf79, roughness: 0.92 }),
  path: new THREE.MeshStandardMaterial({ color: 0xd8c68a, roughness: 0.96 }),
  sideWall: new THREE.MeshStandardMaterial({ color: 0x7dd3fc, roughness: 0.35, transparent: true, opacity: 0.19, side: THREE.DoubleSide }),
  wallEdge: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 }),
  paper: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.55, side: THREE.DoubleSide }),
  paperFold: new THREE.MeshStandardMaterial({ color: 0xdbeafe, roughness: 0.58, side: THREE.DoubleSide }),
  trunk: new THREE.MeshStandardMaterial({ color: 0x7c4a2d, roughness: 0.85 }),
  leaf: new THREE.MeshStandardMaterial({ color: 0x1f8a4c, roughness: 0.9 }),
  darkLeaf: new THREE.MeshStandardMaterial({ color: 0x146c43, roughness: 0.9 }),
  skin: new THREE.MeshStandardMaterial({ color: 0xf3c7a5, roughness: 0.72 }),
  shirt: new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.78 }),
  pants: new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.82 }),
  cloud: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 }),
  building: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.82 }),
  buildingDark: new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.86 }),
  window: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.2, emissive: 0xf59e0b, emissiveIntensity: 0.35 }),
  beacon: new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.35, emissive: 0xef4444, emissiveIntensity: 0.6 }),
  ufoBase: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.38, metalness: 0.2 }),
  ufoDome: new THREE.MeshStandardMaterial({ color: 0x67e8f9, roughness: 0.22, transparent: true, opacity: 0.8 }),
  bigPlane: new THREE.MeshStandardMaterial({ color: 0xe5e7eb, roughness: 0.48, metalness: 0.08 }),
  bigPlaneWing: new THREE.MeshStandardMaterial({ color: 0x60a5fa, roughness: 0.52 })
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
  sun.shadow.mapSize.set(2048, 2048);
  scene.add(sun);
}

function setupWorld() {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(220, 650), materials.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = 245;
  ground.receiveShadow = true;
  scene.add(ground);

  const path = new THREE.Mesh(new THREE.PlaneGeometry(24, 650), materials.path);
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.012, 245);
  path.receiveShadow = true;
  scene.add(path);

  addBoundaryWalls();

  for (let z = 24; z < 310; z += 16) {
    const safeGap = z < 70 ? 7.5 : 4.5;
    const side = Math.random() > 0.5 ? 1 : -1;
    addTree(side * (safeGap + Math.random() * 16), z, 0.85 + Math.random() * 0.75);
    if (Math.random() > 0.45) addTree(-side * (safeGap + 7 + Math.random() * 22), z + Math.random() * 8, 0.75 + Math.random() * 0.8);
  }

  for (let z = 42; z <= 295; z += 18) {
    const x = -8.5 + Math.random() * 17;
    if (Math.random() > 0.45) addBuildingObstacle(x, z, 22 + Math.random() * 54, 1.6 + Math.random() * 1.4, 1.6 + Math.random() * 1.2);
    else addTallTreeObstacle(x, z, 24 + Math.random() * 58, 0.75 + Math.random() * 0.55);
  }

  for (let z = 56; z <= 296; z += 28) {
    const x = -9.5 + Math.random() * 19;
    if (Math.random() > 0.42) addBuildingObstacle(x, z, 86 + Math.random() * 92, 2.0 + Math.random() * 1.8, 1.8 + Math.random() * 1.6);
    else addTallTreeObstacle(x, z, 78 + Math.random() * 86, 0.95 + Math.random() * 0.6);
  }

  addMovingUfo(-5, 22, 58, 1.05, 6.5, 1.15);
  addMovingPlane(6, 33, 86, 1.0, 7.8, 0.92);
  addMovingUfo(4, 43, 122, 1.18, 8.5, 1.05);
  addMovingPlane(-4, 18, 155, 0.92, 6.2, 1.25);
  addMovingUfo(-6, 37, 190, 1.0, 7.5, 1.32);
  addMovingPlane(5, 27, 218, 0.95, 8.2, 1.08);
  addMovingUfo(3, 48, 252, 1.22, 6.8, 0.98);
  addMovingPlane(-5, 39, 286, 1.05, 7.2, 1.18);
  addMovingUfo(-4, 76, 72, 1.18, 8.2, 1.08);
  addMovingPlane(5, 96, 112, 1.08, 8.8, 1.0);
  addMovingUfo(6, 126, 164, 1.28, 7.6, 1.22);
  addMovingPlane(-6, 152, 226, 1.12, 8.6, 1.12);
  addMovingUfo(2, 182, 282, 1.35, 8.2, 0.96);

  for (let i = 0; i < 28; i += 1) addCloud(-55 + Math.random() * 110, 28 + Math.random() * 90, 20 + Math.random() * 320, 0.7 + Math.random() * 1.4);
  scene.add(human.group, paperPlane.group);
}

function addBoundaryWalls() {
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.75, WALL_HEIGHT, 650), materials.sideWall);
    wall.position.set(side * WALL_X, WALL_CENTER_Y, 245);
    wall.receiveShadow = true;
    scene.add(wall);

    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.42, 650), materials.wallEdge);
    rail.position.set(side * WALL_X, 0.28, 245);
    rail.castShadow = true;
    rail.receiveShadow = true;
    scene.add(rail);

    const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.7, 650), materials.wallEdge);
    topRail.position.set(side * WALL_X, WALL_HEIGHT, 245);
    topRail.castShadow = true;
    scene.add(topRail);

    world.walls.push(wall, rail, topRail);
  }
}

function createPaperPlane() {
  const group = new THREE.Group();
  const vertices = new Float32Array([
    0, 0.05, 2.2, -1.25, 0, -1.15, 0, 0.12, -0.62,
    0, 0.05, 2.2, 0, 0.12, -0.62, 1.25, 0, -1.15,
    0, 0.05, 2.2, 0, -0.22, -0.42, 0, 0.12, -0.62,
    0, 0.12, -0.62, -0.42, 0.02, -1.08, 0, -0.22, -0.42,
    0, 0.12, -0.62, 0, -0.22, -0.42, 0.42, 0.02, -1.08
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
  group.scale.setScalar(0.72);
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
  heldPlane.scale.setScalar(0.36);
  heldPlane.position.set(0.02, -1.04, 0.43);
  heldPlane.rotation.x = 1.2;
  heldPlane.rotation.y = 0.03;
  throwingArm.add(heldPlane);
  const leftShoulderSocket = new THREE.Mesh(new THREE.SphereGeometry(0.11, 16, 12), materials.shirt);
  leftShoulderSocket.position.set(-0.36, 1.92, 0.04);
  leftShoulderSocket.castShadow = true;
  group.add(leftShoulderSocket);
  const leftShoulder = new THREE.Group();
  leftShoulder.position.copy(leftShoulderSocket.position);
  leftShoulder.rotation.set(-0.12, 0, 0.38);
  group.add(leftShoulder);
  const leftArm = createLimb(0.08, 0.78, materials.skin);
  leftArm.position.y = -0.39;
  leftShoulder.add(leftArm);
  const leftHand = new THREE.Mesh(new THREE.SphereGeometry(0.105, 16, 12), materials.skin);
  leftHand.position.set(0, -0.82, 0);
  leftHand.castShadow = true;
  leftShoulder.add(leftHand);
  return { group, shoulder, throwingArm, hand, heldPlane, rightShoulderSocket, leftShoulder };
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
  world.trees.push({ group, x, z, radius: 1.15 * scale, height: 5 * scale });
}

function addBuildingObstacle(x, z, height, width, depth) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), Math.random() > 0.5 ? materials.building : materials.buildingDark);
  body.position.y = height / 2;
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);
  for (let floor = 3; floor < height - 2; floor += 4.2) {
    for (let side = -1; side <= 1; side += 2) {
      const windowRow = new THREE.Mesh(new THREE.BoxGeometry(width * 0.72, 0.6, 0.035), materials.window);
      windowRow.position.set(0, floor, side * (depth / 2 + 0.02));
      group.add(windowRow);
    }
  }
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8), materials.beacon);
  beacon.position.y = height + 0.35;
  beacon.castShadow = true;
  group.add(beacon);
  scene.add(group);
  world.dangerObstacles.push({ group, kind: "building", type: "box", halfWidth: width / 2, halfDepth: depth / 2, height });
}

function addTallTreeObstacle(x, z, height, scale) {
  const group = new THREE.Group();
  group.position.set(x, 0, z);
  group.scale.setScalar(scale);
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.48, height * 0.62, 12), materials.trunk);
  trunk.position.y = height * 0.31;
  trunk.castShadow = true;
  group.add(trunk);
  const crownA = new THREE.Mesh(new THREE.ConeGeometry(2.0, height * 0.34, 16), materials.leaf);
  crownA.position.y = height * 0.64;
  crownA.castShadow = true;
  group.add(crownA);
  const crownB = new THREE.Mesh(new THREE.ConeGeometry(1.55, height * 0.3, 16), materials.darkLeaf);
  crownB.position.y = height * 0.82;
  crownB.castShadow = true;
  group.add(crownB);
  scene.add(group);
  world.dangerObstacles.push({ group, kind: "very tall tree", type: "cylinder", radius: 1.85 * scale, height: height * scale });
}

function addMovingUfo(x, y, z, scale, amplitude, speed) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.scale.setScalar(scale);
  const base = new THREE.Mesh(new THREE.SphereGeometry(1.25, 24, 12), materials.ufoBase);
  base.scale.set(1.8, 0.28, 1.8);
  base.castShadow = true;
  group.add(base);
  const dome = new THREE.Mesh(new THREE.SphereGeometry(0.72, 20, 10), materials.ufoDome);
  dome.scale.set(1, 0.52, 1);
  dome.position.y = 0.3;
  dome.castShadow = true;
  group.add(dome);
  scene.add(group);
  world.movingObstacles.push({ group, baseX: x, baseY: y, radius: 2 * scale, amplitude, speed, phase: Math.random() * Math.PI * 2, kind: "UFO" });
}

function addMovingPlane(x, y, z, scale, amplitude, speed) {
  const group = new THREE.Group();
  group.position.set(x, y, z);
  group.rotation.y = Math.PI / 2;
  group.scale.setScalar(scale);
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.22, 2.8, 14), materials.bigPlane);
  body.rotation.x = Math.PI / 2;
  body.castShadow = true;
  group.add(body);
  const wing = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.12, 0.48), materials.bigPlaneWing);
  wing.castShadow = true;
  group.add(wing);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 0.38), materials.bigPlaneWing);
  tail.position.z = -1.2;
  tail.castShadow = true;
  group.add(tail);
  scene.add(group);
  world.movingObstacles.push({ group, baseX: x, baseY: y, radius: 2.35 * scale, amplitude, speed, phase: Math.random() * Math.PI * 2, kind: "big plane" });
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
  addEventListener("keydown", (event) => {
    const key = event.key.toLowerCase();
    if (key === "r" && game.state === "gameover") return resetGame();
    if (key === "arrowleft" || key === "a") setInput("left", true);
    if (key === "arrowright" || key === "d") setInput("right", true);
    if ((key === "arrowdown" || key === "s") && !event.repeat) setInput("down", true);
  });
  addEventListener("keyup", (event) => {
    const key = event.key.toLowerCase();
    if (key === "arrowleft" || key === "a") setInput("left", false);
    if (key === "arrowright" || key === "d") setInput("right", false);
    if (key === "arrowdown" || key === "s") {
      if (game.state === "ready" && input.down) beginLaunch();
      setInput("down", false);
    }
  });
  addEventListener("resize", handleResize);
}

function bindButton(button, action) {
  const press = (event) => { event.preventDefault(); if (game.state !== "gameover") setInput(action, true); };
  const release = (event) => {
    event.preventDefault();
    if (action === "down" && game.state === "ready" && input.down) beginLaunch();
    setInput(action, false);
  };
  button.addEventListener("pointerdown", press);
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("pointerleave", (event) => { if (input[action]) release(event); });
}

function setInput(action, value) {
  input[action] = value;
  buttons[action]?.classList.toggle("is-pressed", value);
}

function resetGame() {
  if (resultDialog.open) resultDialog.close();
  Object.assign(game, { state: "ready", launchAngle: 0, launchTimer: 0, boost: 100, distance: 0 });
  physics.position.set(0, 1.55, -1.2);
  physics.velocity.set(0, 0, 0);
  physics.rollTarget = 0;
  setInput("left", false); setInput("right", false); setInput("down", false);
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
  if (input.down) game.launchAngle = Math.min(MAX_LAUNCH_ANGLE, game.launchAngle + dt * 62);
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
  const sx = THREE.MathUtils.lerp(POSE_ARM_UP.shoulderX, POSE_ARM_BACK.shoulderX, angleT);
  const sy = THREE.MathUtils.lerp(POSE_ARM_UP.shoulderY, POSE_ARM_BACK.shoulderY, angleT);
  const sz = THREE.MathUtils.lerp(POSE_ARM_UP.shoulderZ, POSE_ARM_BACK.shoulderZ, angleT);
  const az = THREE.MathUtils.lerp(POSE_ARM_UP.armZ, POSE_ARM_BACK.armZ, angleT);
  human.shoulder.position.copy(human.rightShoulderSocket.position);
  human.shoulder.rotation.x = THREE.MathUtils.lerp(sx, -1.05, easeOutCubic(t));
  human.shoulder.rotation.y = THREE.MathUtils.lerp(sy, 0.05, t);
  human.shoulder.rotation.z = THREE.MathUtils.lerp(sz, 0.04, t);
  human.throwingArm.rotation.z = THREE.MathUtils.lerp(az, -0.06, t);
  camera.position.lerp(new THREE.Vector3(0, 4.4, -11), 0.1);
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
  updateMovingObstacles(dt);
  recycleClouds();
  const target = physics.position.clone().add(new THREE.Vector3(-physics.velocity.x * 0.08, 4.2, -11.5));
  camera.position.lerp(target, 0.055);
  camera.lookAt(physics.position.x, physics.position.y + 0.45, physics.position.z + 7.5);
  if (physics.position.y <= 0.24) endGame("landed"); else checkCollisions();
}

function updateMovingObstacles(dt) {
  for (const obstacle of world.movingObstacles) {
    obstacle.phase += obstacle.speed * dt;
    obstacle.group.position.x = obstacle.baseX + Math.sin(obstacle.phase) * obstacle.amplitude;
    obstacle.group.position.y = obstacle.baseY + Math.cos(obstacle.phase * 0.7) * 1.8;
    obstacle.group.rotation.y += dt * 0.55;
  }
}

function checkCollisions() {
  checkBoundaryCollision();
  if (game.state !== "flight") return;
  checkTreeCollision();
  if (game.state === "flight") checkDangerObstacleCollision();
  if (game.state === "flight") checkMovingObstacleCollision();
}

function checkBoundaryCollision() {
  if (Math.abs(physics.position.x) > PLAYABLE_HALF_WIDTH) {
    endGame("hit a wall");
  }
}

function checkTreeCollision() {
  for (const tree of world.trees) {
    if (Math.abs(physics.position.z - tree.z) > tree.radius + 1.35) continue;
    const horizontalDistance = Math.hypot(physics.position.x - tree.x, physics.position.z - tree.z);
    if (horizontalDistance < tree.radius + 0.55 && physics.position.y < tree.height) return endGame("hit a tree");
  }
}

function checkDangerObstacleCollision() {
  for (const obstacle of world.dangerObstacles) {
    const dx = physics.position.x - obstacle.group.position.x;
    const dz = physics.position.z - obstacle.group.position.z;
    if (obstacle.type === "box") {
      if (Math.abs(dx) < obstacle.halfWidth + 0.45 && Math.abs(dz) < obstacle.halfDepth + 0.65 && physics.position.y < obstacle.height + 0.8) return endGame(`hit a ${obstacle.kind}`);
    } else {
      const horizontalDistance = Math.hypot(dx, dz);
      if (horizontalDistance < obstacle.radius + 0.55 && physics.position.y < obstacle.height) return endGame(`hit a ${obstacle.kind}`);
    }
  }
}

function checkMovingObstacleCollision() {
  for (const obstacle of world.movingObstacles) {
    if (physics.position.distanceTo(obstacle.group.position) < obstacle.radius + 0.55) return endGame(`hit a ${obstacle.kind}`);
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
      cloud.position.z = physics.position.z + 240 + Math.random() * 120;
      cloud.position.x = -60 + Math.random() * 120;
      cloud.position.y = 42 + Math.random() * 110;
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
  boostFillEl.style.background = launchMeter ? "linear-gradient(90deg, #38bdf8, #a7f3d0)" : game.boost < 15 ? "linear-gradient(90deg, #fb7185, #fda4af)" : "linear-gradient(90deg, #34d399, #7dd3fc)";
  if (game.state === "ready") phaseTextEl.textContent = input.down ? game.launchAngle >= MAX_LAUNCH_ANGLE ? "Angle maxed at 90°. Release ↓ to throw." : "Charging launch angle... release ↓ to throw." : "Hold ↓ to raise angle from 0° to 90°, release to throw.";
  else if (game.state === "launch") phaseTextEl.textContent = "Throwing...";
  else if (game.state === "flight") phaseTextEl.textContent = "Use ← / → to steer. Hold ↓ to spend limited boost.";
  else phaseTextEl.textContent = "Game over. Press Restart or R.";
}

function formatDistance(value) { return `${value.toFixed(1)} m`; }
function handleResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
}
function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
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
