import {
  getJumpMenuButtonSettings,
  onJumpMenuButtonSettingsChanged,
  type JumpMenuButtonSetting,
  type JumpMenuButtonSettings,
} from "../../../shared/jump-menu/button-settings";
import { FOBLES } from "../../features/augmentor/constants";

let buttonSettings: JumpMenuButtonSettings = {};
const registeredRows: Array<{ id: string; row: HTMLElement }> = [];

// Reuses the existing .fobles-hidden class instead of a hand-rolled !important override,
// since it already beats the row's own "display: flex !important" rule.
const setRowVisibility = (row: HTMLElement, visible: boolean): void => {
  row.classList.toggle(FOBLES.CLASSES.HIDDEN, !visible);
};

const applyJumpMenuButtonSettings = (): void => {
  registeredRows.forEach(({ id, row }) => {
    setRowVisibility(row, buttonSettings[id]?.enabled !== false);
  });
};

const loadJumpMenuButtonSettings = async (): Promise<void> => {
  buttonSettings = await getJumpMenuButtonSettings();
  applyJumpMenuButtonSettings();
};

void loadJumpMenuButtonSettings();
onJumpMenuButtonSettingsChanged((settings) => {
  buttonSettings = settings;
  applyJumpMenuButtonSettings();
});

export function getButtonSetting(id: string): JumpMenuButtonSetting | undefined {
  return buttonSettings[id];
}

// Applies the row's current visibility and registers it for future enable/disable updates.
export function registerButtonRow(id: string, row: HTMLElement): void {
  setRowVisibility(row, buttonSettings[id]?.enabled !== false);
  registeredRows.push({ id, row });
}
