// @source-path [fobles] src/content/toolbar/proxy-flyout/proxy-flyout-trigger.tsx

import { CLASS, TEXT } from "../../../constants/fobles.constants";
import { FOBLES } from "../../../constants/fobles";
import { FlyoutTrigger } from "../shared-flyout/flyout-trigger";
import { ToolbarNavButton } from "../toolbar-buttons";
import type { FlyoutVisibilityState } from "../shared-flyout/use-flyout-visibility";
import { ProxyFlyout } from "./proxy-flyout";

export type ProxyFlyoutTriggerProps = {
  doc: Document;
  proxyFlyout: FlyoutVisibilityState;
  onOpen: () => void;
  onToggle: () => void;
};

export function ProxyFlyoutTrigger({ doc, proxyFlyout, onOpen, onToggle }: ProxyFlyoutTriggerProps) {
  return (
    <FlyoutTrigger
      className={CLASS.PROXY_BUTTONS_TRIGGER}
      onHoverOpen={onOpen}
      onHoverScheduleClose={proxyFlyout.scheduleHide}
      onOutsidePointerDown={proxyFlyout.hide}
      button={
        <ToolbarNavButton
          className={CLASS.FOBLES_NAV_BUTTON}
          role={FOBLES.ATTRIBUTES.DATA.NAV_BUTTON_ROLE.PROXY_FLYOUT_TRIGGER}
          text={TEXT.VIEW}
          title={TEXT.VIEW_TITLE}
          onClick={onToggle}
        />
      }
    >
      <ProxyFlyout
        doc={doc}
        visible={proxyFlyout.visible}
        onCancelHide={proxyFlyout.cancelHide}
        onScheduleHide={proxyFlyout.scheduleHide}
      />
    </FlyoutTrigger>
  );
}
