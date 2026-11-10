// @source-path [fobles] src/content/toolbar/use-developer-button-visible.ts

import { getDebugSettings, onShowDeveloperButtonChange } from "../../shared/debug-settings";
import { isCompactToolbarPage } from "../guard";
import { createStorageSyncedStore } from "./create-storage-synced-store";
import type { ToolbarContext } from "./toolbarcontext.types";

const showDeveloperButtonStore = createStorageSyncedStore<boolean>(
  async () => (await getDebugSettings()).showDeveloperButton,
  onShowDeveloperButtonChange,
  false,
);

export function useDeveloperButtonVisible(context: ToolbarContext): boolean {
  const showDeveloperButton = showDeveloperButtonStore.useValue();
  return showDeveloperButton && !isCompactToolbarPage(context.win.location.pathname);
}
