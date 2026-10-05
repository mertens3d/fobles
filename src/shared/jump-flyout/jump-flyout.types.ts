// Persisted per-button customization, keyed by the button's stable GUID (see button-ids.ts).
export type JumpFlyoutButtonSetting = {
  // Snapshot of the button's label at save time, so raw storage is readable without cross-referencing code.
  label: string;
  enabled: boolean;
  encodedPathSuffix: string;
};

export type JumpFlyoutButtonSettings = Record<string, JumpFlyoutButtonSetting>;

export type JumpFlyoutButtonDescriptor = {
  id: string;
  label: string;
  column: string;
  supportsPathSuffix: boolean;
  group?: string;
  basePath?: string;
};

// A user-defined Tree Jump shortcut (src/shared/jump-flyout/user-tree-jump-settings.ts) - unlike
// JumpFlyoutButtonDescriptor, these aren't a fixed catalog entry; the user creates any number of
// them (up to USER_TREE_JUMP.MAX_ENTRIES), each rooted at SITECORE.RELATIVE_PATHS.ROOT.
export type UserTreeJump = {
  id: string;
  label: string;
  enabled: boolean;
  icon: string;
  pathSuffix: string;
};

// A user-defined Admin Page shortcut (src/shared/jump-flyout/user-admin-page-settings.ts) - like
// UserTreeJump, not a fixed catalog entry; the user creates any number of them (up to
// USER_ADMIN_PAGE.MAX_ENTRIES). Unlike a Tree Jump's pathSuffix, url is already relative to the
// current domain root (e.g. "/unicorn.aspx"), matching ADMIN_PAGE_GROUP's own catalog entries.
export type UserAdminPage = {
  id: string;
  label: string;
  enabled: boolean;
  icon: string;
  url: string;
};
export type FlyoutOption = {
  id: string;
  label: string;
  path?: string;
  url?: string;
  useCurrentItemId?: boolean;
  action?: (doc: Document) => void;
  icon?: string;
  // Hides the button entirely (e.g. not ready for use yet) without deleting its definition.
  isIncomplete?: boolean;
  isXPOnly?: boolean;
  isAIOnly?: boolean;
};

export type FlyoutGroup = {
  groupMembers: readonly FlyoutOption[];
  title?: string;
};
