import { WORLD_CONFIG } from "./config.js";

export function checkCollisions({ game, physics, world, endGame }) {
  checkBoundaryCollision(physics, endGame);
  if (game.state !== "flight") return;

  checkTreeCollision(world, physics, endGame);
  if (game.state === "flight") checkDangerObstacleCollision(world, physics, endGame);
  if (game.state === "flight") checkMovingObstacleCollision(world, physics, endGame);
}

function checkBoundaryCollision(physics, endGame) {
  if (Math.abs(physics.position.x) > WORLD_CONFIG.playableHalfWidth) {
    endGame("hit a wall");
  }
}

function checkTreeCollision(world, physics, endGame) {
  for (const tree of world.trees) {
    if (Math.abs(physics.position.z - tree.z) > tree.radius + 1.35) continue;
    const horizontalDistance = Math.hypot(physics.position.x - tree.x, physics.position.z - tree.z);
    if (horizontalDistance < tree.radius + 0.55 && physics.position.y < tree.height) {
      endGame("hit a tree");
      return;
    }
  }
}

function checkDangerObstacleCollision(world, physics, endGame) {
  for (const obstacle of world.dangerObstacles) {
    const dx = physics.position.x - obstacle.group.position.x;
    const dz = physics.position.z - obstacle.group.position.z;

    if (obstacle.type === "box") {
      if (Math.abs(dx) < obstacle.halfWidth + 0.45 && Math.abs(dz) < obstacle.halfDepth + 0.65 && physics.position.y < obstacle.height + 0.8) {
        endGame(`hit a ${obstacle.kind}`);
        return;
      }
    } else {
      const horizontalDistance = Math.hypot(dx, dz);
      if (horizontalDistance < obstacle.radius + 0.55 && physics.position.y < obstacle.height) {
        endGame(`hit a ${obstacle.kind}`);
        return;
      }
    }
  }
}

function checkMovingObstacleCollision(world, physics, endGame) {
  for (const obstacle of world.movingObstacles) {
    if (physics.position.distanceTo(obstacle.group.position) < obstacle.radius + 0.55) {
      endGame(`hit a ${obstacle.kind}`);
      return;
    }
  }
}
