import { CONST } from "../../CONST";
import type { MouseCoordinates } from "../mouse-proxy.types";

let lastKnownMousePosition: MouseCoordinates | null = null;

export function getLastKnownMousePosition(): MouseCoordinates {
  if (lastKnownMousePosition === null) {
    console.error(
      "[getLastKnownMousePosition] No last known mouse position, using fallback { x: 0, y: 0 }",
    );

    return { x: 0, y: 0 };
  }

  return { ...lastKnownMousePosition };
}

export function setLastKnownMousePosition(position: MouseCoordinates): void {
  lastKnownMousePosition = { ...position };
}

export function hasLastKnownMousePosition(): boolean {
  return lastKnownMousePosition !== null;
}

export function isSprintMode(): boolean {
  return CONST.TESTING.SPEED.SELECTED === "SPRINT";
}