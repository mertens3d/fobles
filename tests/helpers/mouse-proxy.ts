export {
  ensureMouseMarkerExists,
  pulseMouseMarkerClick,
  verifyMouseMarker,
} from "./mouse-proxy-support/mouse-marker";
export {
  clickWithMouseMarker,
  getButtonSize,
  highlightClick as highlightClick,
  moveMouseOutsideHoverArea,
  moveMouseToBoundingBox,
  moveMouseToLocatorCenter,
} from "./mouse-proxy-support/mouse-interactions";
export {
  drawMousePath,
  moveMouseToDefault,
  moveMouseToPosition,
  resolveCornerPosition,
} from "./mouse-proxy-support/mouse-movement";
export {
  getLastKnownMousePosition,
  isSprintMode,
} from "./mouse-proxy-support/mouse-proxy-state";
