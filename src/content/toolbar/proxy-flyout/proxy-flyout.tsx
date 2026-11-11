// @source-path [fobles] src/content/toolbar/proxy-flyout/proxy-flyout.tsx

import { useEffect, useRef } from "react";
import { CLASS } from "../../../constants/fobles.constants";
import { FOBLES } from "../../../constants/fobles";
import { extensionLog } from "../../logger";
import { findRibbonCheckbox, postSitecoreEvent } from "../../features/augmentor/proxy-buttons-ribbon";
import { SC_PROXY_BUTTONS } from "./proxy-flyout.const";
import type { ProxyButtonOption } from "./ProxyButtonOption.types";

export type ProxyFlyoutProps = {
  doc: Document;
  visible: boolean;
  onCancelHide: () => void;
  onScheduleHide: () => void;
};

function ProxyButtonCheckbox({ doc, option, visible }: { doc: Document; option: ProxyButtonOption; visible: boolean }) {
  const checkboxRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    // Syncs the checkbox from the real ribbon checkbox (the source of truth) whenever this
    // panel is opened, in addition to once at creation.
    if (checkboxRef.current) {
      checkboxRef.current.checked = Boolean(findRibbonCheckbox(doc, option.checkboxId)?.checked);
    }
  }, [doc, option.checkboxId, visible]);

  function handleChange(): void {
    const checkbox = checkboxRef.current;
    const ribbonCheckbox = findRibbonCheckbox(doc, option.checkboxId);
    extensionLog.debug("Proxy button click", {
      checkboxFound: !!ribbonCheckbox,
      checkboxId: option.checkboxId,
      checked: checkbox?.checked,
      option: option.label,
    });
    if (ribbonCheckbox) {
      ribbonCheckbox.click();
      // Don't trust the browser's optimistic native toggle: reflect whatever Sitecore's
      // real checkbox actually ended up at, in case its own click handling diverges.
      if (checkbox) {
        checkbox.checked = ribbonCheckbox.checked;
      }
    } else {
      const posted = postSitecoreEvent(doc, option.eventName);
      extensionLog.debug("Proxy button fallback", { eventName: option.eventName, option: option.label, posted });
    }
  }

  return (
    <div className={CLASS.PROXY_BUTTONS_ACTION}>
      <label
        className={`${CLASS.PROXY_BUTTON} ${CLASS.FOBLES_NAV_BUTTON} ${CLASS.FOBLES_NAV_BUTTON_COMPACT}`}
        title={option.label}
      >
        <input
          ref={checkboxRef}
          type="checkbox"
          id={option.id}
          className={CLASS.PROXY_BUTTON_INPUT}
          {...{ [FOBLES.ATTRIBUTES.DATA.KEY.FOBLES_NAV_OWNER]: FOBLES.ATTRIBUTES.DATA.VALUE.PERSISTENT }}
          onChange={handleChange}
        />
        <span className={CLASS.PROXY_BUTTON_LABEL}>{option.label}</span>
      </label>
    </div>
  );
}

// These live in the main toolbar (not the editor header) since the editor header
// gets redrawn every time a tree item is picked. Proxy buttons mirror a real Sitecore ribbon
// checkbox and proxy clicks to it; the ribbon checkbox stays the source of truth.
export function ProxyFlyout({ doc, visible, onCancelHide, onScheduleHide }: ProxyFlyoutProps) {
  return (
    <div
      className={CLASS.PROXY_BUTTONS}
      data-visible={visible ? "true" : "false"}
      {...{ [FOBLES.ATTRIBUTES.DATA.KEY.PROXY_BUTTONS]: "1" }}
      onMouseEnter={onCancelHide}
      onMouseLeave={onScheduleHide}
    >
      <div className={CLASS.PROXY_BUTTONS_ACTIONS}>
        {SC_PROXY_BUTTONS.map((option) => (
          <ProxyButtonCheckbox key={option.id} doc={doc} option={option} visible={visible} />
        ))}
      </div>
    </div>
  );
}
