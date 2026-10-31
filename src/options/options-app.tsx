// @source-path [fobles] src/options/options-app.tsx

import { StorageSection } from "./storage/storage-section";
import { PersistedLogsSection } from "./persisted-logs/persisted-logs-section";
import { JumpFlyoutButtonsSection } from "./jump-flyout-buttons/jump-flyout-buttons-section";
import { AiPagesMappingsSection } from "./ai-pages-mappings/ai-pages-mappings-section";
import { DeveloperSettingsSection } from "./developer-settings/developer-settings-section";

export function OptionsApp() {
  return (
    <>
      <h1>Fobles Settings</h1>
      <StorageSection />
      <PersistedLogsSection />
      <JumpFlyoutButtonsSection />
      <AiPagesMappingsSection />
      <DeveloperSettingsSection />
    </>
  );
}
