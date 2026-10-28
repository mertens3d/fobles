// @source-path [fobles] src/content/shared/ui/indexeddb-viewer/developer-dialog.types.ts
import type { DEVELOPER_DIALOG } from "./developer-dialog.const";
export type DeveloperTabId = (typeof DEVELOPER_DIALOG.TAB_ID)[keyof typeof DEVELOPER_DIALOG.TAB_ID];
export type RuntimeSettingsSaveResult = { ok: true; message: string; text: string } | { ok: false; message: string };
export type RuntimeSettingsEditorStatus = { ok: boolean; message: string };
