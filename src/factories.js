import * as THREE from "three";
import { POSE_ARM_UP } from "./config.js";

export function createPaperPlane(materials) {
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

  group.scale.setScalar(0.72);
  return { group };
}

export function createHuman(materials, paperPlane) {
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

export function createLimb(radius, height, material) {
  const limb = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 14), material);
  limb.castShadow = true;
  return limb;
}
