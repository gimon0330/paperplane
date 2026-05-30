import * as THREE from "three";
import { BEST_KEY, CAMERA_CONFIG, FLIGHT_CONFIG, INITIAL_PLANE_POSITION, MAX_LAUNCH_ANGLE, POSE_ARM_BACK, POSE_ARM_UP } from "./config.js";
import { checkCollisions } from "./collisions.js";
import { setupControls, setInput } from "./controls.js";
import { getDomRefs } from "./dom.js";
import { createHuman, createPaperPlane } from "./factories.js";
import { createMaterials } from "./materials.js";
import { formatDistance, showGameOverDialog, updateUi } from "./ui.js";
import { recycleClouds, setupLights, setupWorld } from "./world.js";

const dom = getDomRefs();
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x8bd3ff);
scene.fog = new THREE.Fog(0x8bd3ff, 75, 260);

const camera = new THREE.PerspectiveCamera(62, innerWidth / innerHeight, 0.1, 700);
const renderer = new THREE.WebGLRenderer({ canvas: dom.canvas, antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
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
  position: new THREE.Vector3(INITIAL_PLANE_POSITION.x, INITIAL_PLANE_POSITION.y, INITIAL_PLANE_POSITION.z),
  velocity: new THREE.Vector3(),
  rollTarget: 0,
};
const world = { trees: [], clouds: [], dangerObstacles: [], movingObstacles: [], walls: [] };
const materials = createMaterials();
const paperPlane = createPaperPlane(materials);
const human = createHuman(materials, paperPlane);

setupLights(scene);
setupWorld(scene, world, materials, human, paperPlane);
setupControls(dom, input, {
  dom,
  beginLaunch,
  resetGame,
  handleResize,
  getGameState: () => game.state,
});
resetGame();
animate();

function resetGame() {
  if (dom.resultDialog.open) dom.resultDialog.close();
  Object.assign(game, { state: "ready", launchAngle: 0, launchTimer: 0, boost: 100, distance: 0 });
  physics.position.set(INITIAL_PLANE_POSITION.x, INITIAL_PLANE_POSITION.y, INITIAL_PLANE_POSITION.z);
  physics.velocity.set(0, 0, 0);
  physics.rollTarget = 0;

  setInput(dom, input, "left", false);
  setInput(dom, input, "right", false);
  setInput(dom, input, "down", false);

  paperPlane.group.visible = false;
  paperPlane.group.position.copy(physics.position);
  paperPlane.group.rotation.set(0, 0, 0);
  human.group.visible = true;
  human.heldPlane.visible = true;
  updateThrowingPose(false);
  updateUi(dom, game, input);
}

function beginLaunch() {
  if (game.state !== "ready") return;
  game.state = "launch";
  game.launchTimer = 0;
  setInput(dom, input, "down", false);
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
  const target = new THREE.Vector3(CAMERA_CONFIG.readyPosition.x, CAMERA_CONFIG.readyPosition.y, CAMERA_CONFIG.readyPosition.z);
  camera.position.lerp(target, 0.08);
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

  const target = new THREE.Vector3(CAMERA_CONFIG.launchPosition.x, CAMERA_CONFIG.launchPosition.y, CAMERA_CONFIG.launchPosition.z);
  camera.position.lerp(target, 0.1);
  camera.lookAt(0, 1.8, 0.8);
  if (game.launchTimer >= 0.34) releasePlane();
}

function updateFlight(dt) {
  const steer = Number(input.left) - Number(input.right);
  const horizontalSpeed = Math.hypot(physics.velocity.x, physics.velocity.z);

  physics.velocity.y -= FLIGHT_CONFIG.gravity * dt;
  physics.velocity.y += Math.max(0, horizontalSpeed - 6) * FLIGHT_CONFIG.liftFactor * dt;
  physics.velocity.x += steer * FLIGHT_CONFIG.steerAcceleration * dt;
  physics.rollTarget = THREE.MathUtils.lerp(physics.rollTarget, -steer * 0.62, 0.12);

  if (input.down && game.boost > 0) {
    physics.velocity.y += FLIGHT_CONFIG.boostVerticalAcceleration * dt;
    physics.velocity.z += FLIGHT_CONFIG.boostForwardAcceleration * dt;
    game.boost = Math.max(0, game.boost - FLIGHT_CONFIG.boostDrainPerSecond * dt);
  }

  physics.velocity.multiplyScalar(Math.max(FLIGHT_CONFIG.dragBase, 1 - FLIGHT_CONFIG.dragPerSecond * dt));
  physics.position.addScaledVector(physics.velocity, dt);
  game.distance = Math.max(0, physics.position.z + 1.2);

  paperPlane.group.position.copy(physics.position);
  const yaw = Math.atan2(physics.velocity.x, physics.velocity.z);
  const pitch = -Math.atan2(physics.velocity.y, Math.max(0.001, horizontalSpeed));
  paperPlane.group.rotation.set(pitch, yaw, physics.rollTarget);

  updateMovingObstacles(dt);
  recycleClouds(world, physics);

  const target = physics.position.clone().add(new THREE.Vector3(-physics.velocity.x * 0.08, CAMERA_CONFIG.flightOffset.y, CAMERA_CONFIG.flightOffset.z));
  camera.position.lerp(target, 0.055);
  camera.lookAt(physics.position.x, physics.position.y + 0.45, physics.position.z + 7.5);

  if (physics.position.y <= 0.24) endGame("landed");
  else checkCollisions({ game, physics, world, endGame });
}

function updateMovingObstacles(dt) {
  for (const obstacle of world.movingObstacles) {
    obstacle.phase += obstacle.speed * dt;
    obstacle.group.position.x = obstacle.baseX + Math.sin(obstacle.phase) * obstacle.amplitude;
    obstacle.group.position.y = obstacle.baseY + Math.cos(obstacle.phase * 0.7) * 1.8;
    obstacle.group.rotation.y += dt * 0.55;
  }
}

function endGame(reason) {
  if (game.state === "gameover") return;
  game.state = "gameover";
  if (game.distance > game.bestDistance) {
    game.bestDistance = game.distance;
    localStorage.setItem(BEST_KEY, String(game.bestDistance));
  }
  showGameOverDialog(dom, game, reason);
  updateUi(dom, game, input);
}

function handleResize() {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(innerWidth, innerHeight);
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

  updateUi(dom, game, input);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}
