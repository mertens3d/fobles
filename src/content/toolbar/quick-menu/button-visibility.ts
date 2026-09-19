import {
  getQuickMenuButtonSettings,
  onQuickMenuButtonSettingsChanged,
  type QuickMenuButtonSetting,
  type QuickMenuButtonSettings,
} from "../../../shared/quick-menu/button-settings";

let buttonSettings: QuickMenuButtonSettings = {};
const registeredRows: Array<{ id: string; row: HTMLElement }> = [];

// The row's "display: flex !important" rule outranks the `hidden` attribute's UA style,
// so disabled rows must be hidden via an inline !important override instead.
const setRowVisibility = (row: HTMLElement, visible: boolean): void => {
  if (visible) {
    row.style.removeProperty("display");
  } else {
    row.style.setProperty("display", "none", "important");
  }
};

const applyQuickMenuButtonSettings = (): void => {
  registeredRows.forEach(({ id, row }) => {
    setRowVisibility(row, buttonSettings[id]?.enabled !== false);
  });
};

const loadQuickMenuButtonSettings = async (): Promise<void> => {
  buttonSettings = await getQuickMenuButtonSettings();
  applyQuickMenuButtonSettings();
};

void loadQuickMenuButtonSettings();
onQuickMenuButtonSettingsChanged((settings) => {
  buttonSettings = settings;
  applyQuickMenuButtonSettings();
});

export function getButtonSetting(id: string): QuickMenuButtonSetting | undefined {
  return buttonSettings[id];
}

// Applies the row's current visibility and registers it for future enable/disable updates.
export function registerButtonRow(id: string, row: HTMLElement): void {
  setRowVisibility(row, buttonSettings[id]?.enabled !== false);
  registeredRows.push({ id, row });
}
