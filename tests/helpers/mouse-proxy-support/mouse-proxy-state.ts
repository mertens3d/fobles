import { CONST } from "../../CONST";
import type { MouseCoordinates } from "../mouse-proxy.types";

let lastKnownMousePosition: MouseCoordinates = { x: 0, y: 0 };

export function getLastKnownMousePosition(): MouseCoordinates {
  return { ...lastKnownMousePosition };
}

export function setLastKnownMousePosition(position: MouseCoordinates): void {
  lastKnownMousePosition = { ...position };
}

export function isSprintMode(): boolean {
  return CONST.TESTING.SPEED.SELECTED === "SPRINT";
}
