import * as THREE from "three";
import { WORLD_CONFIG } from "./config.js";

export function setupLights(scene) {
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

export function setupWorld(scene, world, materials, human, paperPlane) {
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_CONFIG.groundWidth, WORLD_CONFIG.groundLength), materials.ground);
  ground.rotation.x = -Math.PI / 2;
  ground.position.z = WORLD_CONFIG.centerZ;
  ground.receiveShadow = true;
  scene.add(ground);

  const path = new THREE.Mesh(new THREE.PlaneGeometry(WORLD_CONFIG.pathWidth, WORLD_CONFIG.groundLength), materials.path);
  path.rotation.x = -Math.PI / 2;
  path.position.set(0, 0.012, WORLD_CONFIG.centerZ);
  path.receiveShadow = true;
  scene.add(path);

  addBoundaryWalls(scene, world, materials);

  for (let z = 24; z < 310; z += 16) {
    const safeGap = z < 70 ? 7.5 : 4.5;
    const side = Math.random() > 0.5 ? 1 : -1;
    addTree(scene, world, materials, side * (safeGap + Math.random() * 16), z, 0.85 + Math.random() * 0.75);
    if (Math.random() > 0.45) {
      addTree(scene, world, materials, -side * (safeGap + 7 + Math.random() * 22), z + Math.random() * 8, 0.75 + Math.random() * 0.8);
    }
  }

  for (let z = 42; z <= 295; z += 18) {
    const x = -8.5 + Math.random() * 17;
    if (Math.random() > 0.45) addBuildingObstacle(scene, world, materials, x, z, 22 + Math.random() * 54, 1.6 + Math.random() * 1.4, 1.6 + Math.random() * 1.2);
    else addTallTreeObstacle(scene, world, materials, x, z, 24 + Math.random() * 58, 0.75 + Math.random() * 0.55);
  }

  for (let z = 56; z <= 296; z += 28) {
    const x = -9.5 + Math.random() * 19;
    if (Math.random() > 0.42) addBuildingObstacle(scene, world, materials, x, z, 86 + Math.random() * 92, 2.0 + Math.random() * 1.8, 1.8 + Math.random() * 1.6);
    else addTallTreeObstacle(scene, world, materials, x, z, 78 + Math.random() * 86, 0.95 + Math.random() * 0.6);
  }

  const movingSpecs = [
    ["ufo", -5, 22, 58, 1.05, 6.5, 1.15],
    ["plane", 6, 33, 86, 1.0, 7.8, 0.92],
    ["ufo", 4, 43, 122, 1.18, 8.5, 1.05],
    ["plane", -4, 18, 155, 0.92, 6.2, 1.25],
    ["ufo", -6, 37, 190, 1.0, 7.5, 1.32],
    ["plane", 5, 27, 218, 0.95, 8.2, 1.08],
    ["ufo", 3, 48, 252, 1.22, 6.8, 0.98],
    ["plane", -5, 39, 286, 1.05, 7.2, 1.18],
    ["ufo", -4, 76, 72, 1.18, 8.2, 1.08],
    ["plane", 5, 96, 112, 1.08, 8.8, 1.0],
    ["ufo", 6, 126, 164, 1.28, 7.6, 1.22],
    ["plane", -6, 152, 226, 1.12, 8.6, 1.12],
    ["ufo", 2, 182, 282, 1.35, 8.2, 0.96],
  ];

  for (const [type, x, y, z, scale, amplitude, speed] of movingSpecs) {
    if (type === "ufo") addMovingUfo(scene, world, materials, x, y, z, scale, amplitude, speed);
    else addMovingPlane(scene, world, materials, x, y, z, scale, amplitude, speed);
  }

  for (let i = 0; i < 28; i += 1) {
    addCloud(scene, world, materials, -55 + Math.random() * 110, 28 + Math.random() * 90, 20 + Math.random() * 320, 0.7 + Math.random() * 1.4);
  }

  scene.add(human.group, paperPlane.group);
}

export function addBoundaryWalls(scene, world, materials) {
  for (const side of [-1, 1]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(0.75, WORLD_CONFIG.wallHeight, WORLD_CONFIG.groundLength), materials.sideWall);
    wall.position.set(side * WORLD_CONFIG.wallX, WORLD_CONFIG.wallHeight / 2, WORLD_CONFIG.centerZ);
    wall.receiveShadow = true;
    scene.add(wall);

    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.42, WORLD_CONFIG.groundLength), materials.wallEdge);
    rail.position.set(side * WORLD_CONFIG.wallX, 0.28, WORLD_CONFIG.centerZ);
    rail.castShadow = true;
    rail.receiveShadow = true;
    scene.add(rail);

    const topRail = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.7, WORLD_CONFIG.groundLength), materials.wallEdge);
    topRail.position.set(side * WORLD_CONFIG.wallX, WORLD_CONFIG.wallHeight, WORLD_CONFIG.centerZ);
    topRail.castShadow = true;
    scene.add(topRail);

    world.walls.push(wall, rail, topRail);
  }
}

export function addTree(scene, world, materials, x, z, scale) {
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

export function addBuildingObstacle(scene, world, materials, x, z, height, width, depth) {
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

export function addTallTreeObstacle(scene, world, materials, x, z, height, scale) {
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

export function addMovingUfo(scene, world, materials, x, y, z, scale, amplitude, speed) {
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

export function addMovingPlane(scene, world, materials, x, y, z, scale, amplitude, speed) {
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

export function addCloud(scene, world, materials, x, y, z, scale) {
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

export function recycleClouds(world, physics) {
  for (const cloud of world.clouds) {
    if (cloud.position.z < physics.position.z - 65) {
      cloud.position.z = physics.position.z + 240 + Math.random() * 120;
      cloud.position.x = -60 + Math.random() * 120;
      cloud.position.y = 42 + Math.random() * 110;
    }
  }
}
