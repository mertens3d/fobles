// @source-path [fobles] src/content/toolbar/jump-flyout/jump-flyout-trigger.tsx

import { CLASS, TEXT } from "../../../constants/fobles.constants";
import { FOBLES } from "../../../constants/fobles";
import { FlyoutTrigger } from "../shared-flyout/flyout-trigger";
import { ToolbarNavButton } from "../toolbar-buttons";
import type { FlyoutVisibilityState } from "../shared-flyout/FlyoutVisibilityState.types";
import { JumpFlyout } from "./jump-flyout";

export type JumpFlyoutTriggerProps = {
  doc: Document;
  jumpFlyout: FlyoutVisibilityState;
  onOpen: () => void;
  onToggle: () => void;
};

export function JumpFlyoutTrigger({ doc, jumpFlyout, onOpen, onToggle }: JumpFlyoutTriggerProps) {
  return (
    <FlyoutTrigger
      className={CLASS.JUMP_FLYOUT.TRIGGER}
      onHoverOpen={onOpen}
      onHoverScheduleClose={jumpFlyout.scheduleHide}
      onOutsidePointerDown={jumpFlyout.hide}
      button={
        <ToolbarNavButton
          className={CLASS.FOBLES_NAV_BUTTON}
          role={FOBLES.ATTRIBUTES.DATA.NAV_BUTTON_ROLE.JUMPS_FLYOUT_TRIGGER}
          text={TEXT.JUMP_FLYOUT}
          title={TEXT.QUICK_MENU_TITLE}
          onClick={onToggle}
        />
      }
    >
      <JumpFlyout
        doc={doc}
        visible={jumpFlyout.visible}
        onOptionActivated={jumpFlyout.hide}
        onCancelHide={jumpFlyout.cancelHide}
        onScheduleHide={jumpFlyout.scheduleHide}
      />
    </FlyoutTrigger>
  );
}
