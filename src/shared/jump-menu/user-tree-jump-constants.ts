export const USER_TREE_JUMP = {
  // Bare (no prefix) - shown to the user as the default icon path; normalized at save time.
  DEFAULT_ICON_PATH: "imaging/32x32/line_bezier_green_h.png",
  // Purely to keep a runaway settings list from bloating chrome.storage.sync's per-item quota -
  // no real user needs anywhere close to this many cross-site favorite paths.
  MAX_ENTRIES: 30,
} as const;
