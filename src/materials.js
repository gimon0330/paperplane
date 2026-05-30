import * as THREE from "three";

export function createMaterials() {
  return {
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
    bigPlaneWing: new THREE.MeshStandardMaterial({ color: 0x60a5fa, roughness: 0.52 }),
  };
}
