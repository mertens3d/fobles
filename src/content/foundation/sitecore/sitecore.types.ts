

export type BrowserNavigationOptions = { doc: Document; navigateToItem: (itemId: string) => void | Promise<void> };

export type QuickInfoTemplate = { path: string | undefined; id: string | undefined };

export type QuickInfo = {
  itemId: string | undefined;
  itemName: string | undefined;
  itemPath: string | undefined;
  template: QuickInfoTemplate | undefined;
  icon: string | undefined;
  // AI NOTE: Diagnostics only - the raw quick-info panel markup this was parsed from.
  rawMarkup: string | undefined;
};
