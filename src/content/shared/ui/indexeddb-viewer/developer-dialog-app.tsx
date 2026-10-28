// @source-path [fobles] src/content/shared/ui/indexeddb-viewer/developer-dialog-app.tsx
import { useState } from "react";
import { DEVELOPER_DIALOG } from "./developer-dialog.const";
import type { DeveloperTabId } from "./developer-dialog.types";
import { IndexedDbViewerApp } from "./indexeddb-viewer-app";
import type { IndexedDbViewerAppProps } from "./indexeddb-viewer.types";
import { RuntimeSettingsEditor } from "./runtime-settings-editor";
const { CLASS, ID_PREFIX, TAB_ID, TAB_LABEL, TEXT } = DEVELOPER_DIALOG;
const TABS: readonly { id: DeveloperTabId; label: string }[] = [
  { id: TAB_ID.INDEXEDDB, label: TAB_LABEL.INDEXEDDB },
  { id: TAB_ID.RUNTIME_SETTINGS, label: TAB_LABEL.RUNTIME_SETTINGS },
];
function tabDomId(id: DeveloperTabId): string { 
return `${ID_PREFIX}-tab-${id}`; }
function panelDomId(id: DeveloperTabId): string { 
return `${ID_PREFIX}-panel-${id}`; }
// Every tab stays mounted and is only hidden, so the IndexedDB search/selection and unsaved editor text survive tab switches.
export function DeveloperDialogApp({ doc }: IndexedDbViewerAppProps) {
  const [activeTab, setActiveTab] = useState<DeveloperTabId>(TAB_ID.INDEXEDDB);
  return (
    <div className={CLASS.SHELL}>
      <header className={CLASS.HEADER}>
        <h2>{TEXT.TITLE}</h2>
      </header>
      <div className={CLASS.TABLIST} role="tablist" aria-label={TEXT.TABLIST_LABEL}>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            id={tabDomId(tab.id)}
            aria-selected={tab.id === activeTab}
            aria-controls={panelDomId(tab.id)}
            className={tab.id === activeTab ? `${CLASS.TAB} ${CLASS.SELECTED}` : CLASS.TAB}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div className={CLASS.PANEL} role="tabpanel" id={panelDomId(TAB_ID.INDEXEDDB)} aria-labelledby={tabDomId(TAB_ID.INDEXEDDB)} hidden={activeTab !== TAB_ID.INDEXEDDB}>
        <IndexedDbViewerApp doc={doc} />
      </div>
      <div className={CLASS.PANEL} role="tabpanel" id={panelDomId(TAB_ID.RUNTIME_SETTINGS)} aria-labelledby={tabDomId(TAB_ID.RUNTIME_SETTINGS)} hidden={activeTab !== TAB_ID.RUNTIME_SETTINGS}>
        <RuntimeSettingsEditor />
      </div>
    </div>
  );
}
