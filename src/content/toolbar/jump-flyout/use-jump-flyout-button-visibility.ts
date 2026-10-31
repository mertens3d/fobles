// @source-path [fobles] src/content/toolbar/jump-flyout/use-jump-flyout-button-visibility.ts

import { useJumpFlyoutButtonSettings } from "./use-jump-flyout-button-settings";

export function useJumpFlyoutButtonVisibility(id: string): boolean {
  const settings = useJumpFlyoutButtonSettings();
  return settings[id]?.enabled !== false;
}
