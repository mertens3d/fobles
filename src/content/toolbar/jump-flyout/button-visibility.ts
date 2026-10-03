import {
  getJumpFlyoutButtonSettings,
  onJumpFlyoutButtonSettingsChanged,
  type JumpFlyoutButtonSetting,
  type JumpFlyoutButtonSettings,
} from "../../../shared/jump-flyout/button-settings";
import { FOBLES } from "../../features/augmentor/constants";

let buttonSettings: JumpFlyoutButtonSettings = {};
const registeredRows: Array<{ id: string; row: HTMLElement }> = [];

// Reuses the existing .fobles-hidden class instead of a hand-rolled !important override,
// since it already beats the row's own "display: flex !important" rule.
const setRowVisibility = (row: HTMLElement, visible: boolean): void => {
  row.classList.toggle(FOBLES.CLASSES.HIDDEN, !visible);
};

const applyJumpFlyoutButtonSettings = (): void => {
  registeredRows.forEach(({ id, row }) => {
    setRowVisibility(row, buttonSettings[id]?.enabled !== false);
  });
};

const loadJumpFlyoutButtonSettings = async (): Promise<void> => {
  buttonSettings = await getJumpFlyoutButtonSettings();
  applyJumpFlyoutButtonSettings();
};

void loadJumpFlyoutButtonSettings();
onJumpFlyoutButtonSettingsChanged((settings) => {
  buttonSettings = settings;
  applyJumpFlyoutButtonSettings();
});

export function getButtonSetting(id: string): JumpFlyoutButtonSetting | undefined {
  return buttonSettings[id];
}

// Applies the row's current visibility and registers it for future enable/disable updates.
export function registerButtonRow(id: string, row: HTMLElement): void {
  setRowVisibility(row, buttonSettings[id]?.enabled !== false);
  registeredRows.push({ id, row });
}
