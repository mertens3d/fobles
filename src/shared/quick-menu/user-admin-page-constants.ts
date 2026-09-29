export const USER_ADMIN_PAGE = {
  // Unicorn's own icon (see menu-groups.ts) - reused here as the example/default since a
  // user-defined admin page is the exact same shape (label + relative url + icon).
  DEFAULT_ICON_PATH: "applicationsv2/32x32/arrow_up_right_green.png",
  EXAMPLE_LABEL: "Unicorn",
  EXAMPLE_URL: "/unicorn.aspx",
  // Purely to keep a runaway settings list from bloating chrome.storage.sync's per-item quota -
  // no real user needs anywhere close to this many cross-site favorite pages.
  MAX_ENTRIES: 30,
} as const;
