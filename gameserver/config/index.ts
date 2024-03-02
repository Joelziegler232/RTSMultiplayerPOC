export const SERVER_CONFIG = {
  TICKRATE: Number(process.env.TICKRATE || 60),
  COUNTDOWN: Number(process.env.COUNTDOWN || 5000),
  COUNTDOWN_SPAWN_SELECTIONS: Number(
    process.env.COUNTDOWN_SPAWN_SELECTION || 5000
  ),
  COUNTDOWN_DEFAULT: Number(process.env.COUNTDOWN_DEFAULT || 15000),
  MAX_SESSION_PER_WORKER: Number(process.env.MAX_SESSION_PER_WORKER || 10),
  MINIMUM_PLAYERS_PER_SESSION: Number(
    process.env.MINIMUM_PLAYERS_PER_SESSION || 10
  ),
};
export enum CoreErrorCodes {
  REMOVE_ITEM_FAILED = "remove_scene_item_failed",
  ADD_ITEM_FAILED = "add_scene_item_failed",
  MAX_SESSIONS_REACHED = "MAX_SESSIONS_REACHED",
  SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
}

export const MOVABLE_UNIT_CONSTANTS = {
  MAX_STEER_FORCE: 10,
  MAX_REPEL_FORCE: 50,

  DESIRED_DIST_FROM_TARGET: 30,
  ACCEPTABLE_DIST_FROM_EXPECTED_POS: 5,
  NEARBY_SEARCH_RADI: 150,
  ENEMY_SEARCH_RADIUS: 200,
  DESIRED_SEPERATION_DIST: 100, //to initiate repulsion force
  MAX_TARGETPOS_OVERLAP_DIST: 50,
};
