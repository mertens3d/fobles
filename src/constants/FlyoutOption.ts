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
export type FlyoutGroup = { groupMembers: readonly FlyoutOption[]; title?: string };
