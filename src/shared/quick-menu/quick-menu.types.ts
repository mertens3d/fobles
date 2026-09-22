// Persisted per-button customization, keyed by the button's stable GUID (see button-ids.ts).
export type QuickMenuButtonSetting = {
  // Snapshot of the button's label at save time, so raw storage is readable without cross-referencing code.
  label: string;
  enabled: boolean;
  pathSuffix: string;
};

export type QuickMenuButtonSettings = Record<string, QuickMenuButtonSetting>;

export type QuickMenuButtonDescriptor = {
  id: string;
  label: string;
  column: string;
  supportsPathSuffix: boolean;
  group?: string;
  basePath?: string;
};

// A user-defined Tree Jump shortcut (src/shared/quick-menu/user-tree-jump-settings.ts) - unlike
// QuickMenuButtonDescriptor, these aren't a fixed catalog entry; the user creates any number of
// them (up to USER_TREE_JUMP.MAX_ENTRIES), each rooted at SITECORE.RELATIVE_PATHS.ROOT.
export type UserTreeJump = {
  id: string;
  label: string;
  enabled: boolean;
  icon: string;
  pathSuffix: string;
};
