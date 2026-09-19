import {
  getQuickMenuButtonSettings,
  onQuickMenuButtonSettingsChanged,
  type QuickMenuButtonSetting,
  type QuickMenuButtonSettings,
} from "../../../shared/quick-menu/button-settings";
import { FOBLES } from "../../features/augmentor/constants";

let buttonSettings: QuickMenuButtonSettings = {};
const registeredRows: Array<{ id: string; row: HTMLElement }> = [];

// Reuses the existing .fobles-hidden class instead of a hand-rolled !important override,
// since it already beats the row's own "display: flex !important" rule.
const setRowVisibility = (row: HTMLElement, visible: boolean): void => {
  row.classList.toggle(FOBLES.CLASSES.HIDDEN, !visible);
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
