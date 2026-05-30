export const BEST_KEY = "paperplane.bestDistance.v1";
export const MAX_LAUNCH_ANGLE = 90;

export const WORLD_CONFIG = {
  groundWidth: 220,
  groundLength: 650,
  centerZ: 245,
  pathWidth: 24,
  playableHalfWidth: 12.6,
  wallX: 13.4,
  wallHeight: 240,
};

export const POSE_ARM_UP = {
  shoulderX: 2.16,
  shoulderY: -0.34,
  shoulderZ: -0.34,
  armZ: -0.64,
};

export const POSE_ARM_BACK = {
  shoulderX: 1.18,
  shoulderY: 0.12,
  shoulderZ: -0.18,
  armZ: -0.2,
};

export const INITIAL_PLANE_POSITION = Object.freeze({ x: 0, y: 1.55, z: -1.2 });

export const FLIGHT_CONFIG = {
  gravity: 9.8,
  liftFactor: 0.19,
  steerAcceleration: 9.2,
  boostVerticalAcceleration: 17.5,
  boostForwardAcceleration: 2.6,
  boostDrainPerSecond: 27,
  dragBase: 0.965,
  dragPerSecond: 0.055,
};

export const CAMERA_CONFIG = {
  readyPosition: { x: 0, y: 4.6, z: -12.5 },
  launchPosition: { x: 0, y: 4.4, z: -11 },
  flightOffset: { y: 4.2, z: -11.5 },
};
