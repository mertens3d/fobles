// @source-path [fobles] src/content/toolbar/jump-flyout/jump-flyout-option-button.tsx

import { useEffect, useRef } from "react";
import { CLASS } from "../../../constants/fobles.constants";
import { FOBLES } from "../../../constants/fobles";
import { attachFoblesTooltip } from "../../features/augmentor/shared/fobles-tooltip";
import { openFoblesUrl } from "../../features/augmentor/helper";
import type { FlyoutOption } from "../../../constants/FlyoutOption";
import { buildFlyoutOptionUrl } from "./flyout-option-url";
import { useJumpFlyoutButtonVisibility } from "./use-jump-flyout-button-visibility";
import { JUMP_FLYOUT_OPTION_ATTRIBUTE } from "./jump-flyout-option-button.const";

export type JumpFlyoutOptionButtonProps = { doc: Document; option: FlyoutOption; onOptionActivated: () => void };

export function JumpFlyoutOptionButton({ doc, option, onOptionActivated }: JumpFlyoutOptionButtonProps) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const enabled = useJumpFlyoutButtonVisibility(option.id);

  useEffect(() => {
    if (buttonRef.current) {
      attachFoblesTooltip(buttonRef.current);
    }
  }, []);

  function handleClick(event: React.MouseEvent<HTMLButtonElement>): void {
    if (option.action) {
      event.preventDefault();
      option.action(doc);
    } else {
      void openFoblesUrl(buildFlyoutOptionUrl(doc, option), event.nativeEvent);
    }
    onOptionActivated();
  }

  const attributes: Record<string, string> = {
    [FOBLES.ATTRIBUTES.BUTTON]: "1",
    [FOBLES.ATTRIBUTES.DATA.KEY.FOBLES_NAV_OWNER]: "1",
  };
  if (option.path !== undefined) {
    attributes[JUMP_FLYOUT_OPTION_ATTRIBUTE.TREE_JUMP_PATH] = option.path;
  }
  if (option.url !== undefined) {
    attributes[JUMP_FLYOUT_OPTION_ATTRIBUTE.PAGE_JUMP_URL] = option.url;
  }

  return (
    <div className={CLASS.JUMP_FLYOUT.ACTION}>
      <button
        type="button"
        ref={buttonRef}
        className={`${CLASS.FOBLES_NAV_BUTTON} ${CLASS.FOBLES_NAV_BUTTON_COMPACT}${enabled ? "" : ` ${FOBLES.CLASSES.HIDDEN}`}`}
        title={option.label}
        {...attributes}
        onClick={handleClick}
      >
        <span className={CLASS.JUMP_FLYOUT.OPTION_ICON_BOX}>
          {option.icon ? (
            <img className={CLASS.JUMP_FLYOUT.OPTION_ICON} src={option.icon} alt="" />
          ) : (
            <span className={CLASS.JUMP_FLYOUT.OPTION_ICON} />
          )}
        </span>
        <span className={CLASS.JUMP_FLYOUT.OPTION_LABEL}>{option.label}</span>
        {(option.isXPOnly || option.isAIOnly) && (
          <span className={CLASS.JUMP_FLYOUT.OPTION_BADGE}>{option.isXPOnly ? "XP" : "AI"}</span>
        )}
      </button>
    </div>
  );
}
