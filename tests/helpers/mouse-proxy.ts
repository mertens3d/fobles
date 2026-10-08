export {
  ensureMouseMarkerExists,
  pulseMouseMarkerClick,
  verifyMouseMarker,
} from "./mouse-proxy-support/mouse-marker";
export {
  clickWithMouseMarker,
  getButtonSize,
  highlightClickTarget,
  moveMouseOutsideHoverArea,
  moveMouseToBoundingBox,
  moveMouseToLocatorCenter,
} from "./mouse-proxy-support/mouse-interactions";
export {
  moveMouseToDefault,
  moveMouseToPosition,
  resolveCornerPosition,
} from "./mouse-proxy-support/mouse-movement";
export {
  getLastKnownMousePosition,
  isSprintMode,
} from "./mouse-proxy-support/mouse-proxy-state";
