// @source-path [fobles] src/content/toolbar/diagnostics/toolbar-diagnostics-subscription.ts

import type { ToolbarDiagnosticsServices, ToolbarDiagnosticsState } from "./toolbar-diagnostics.types";

// Agent: Only the enabled setting is observed here. Progress itself comes from the work-session progress provider.
export function observeToolbarDiagnostics(
  services: ToolbarDiagnosticsServices,
  onChange: (state: ToolbarDiagnosticsState) => void,
): () => void {
  let disposed = false;
  let settingsVersion = 0;
  let enabled: boolean | undefined;

  function applyEnabled(next: boolean): void {
    if (!disposed && next !== enabled) {
      enabled = next;
      onChange({ enabled: next });
    }
  }

  const stopSettings = services.watchSettings((settings) => {
    settingsVersion++;
    applyEnabled(settings.showToolbarDiagnostics === true);
  });
  const initialVersion = settingsVersion;
  void services.getSettings().then((settings) => {
    if (settingsVersion === initialVersion) {
      applyEnabled(settings.showToolbarDiagnostics === true);
    }
  }).catch(() => undefined);

  return () => {
    disposed = true;
    stopSettings();
  };
}
