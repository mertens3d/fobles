// @source-path [fobles] src/content/toolbar/toolbar-buttons.tsx

import { CLASS, ICONS, SYMBOLS, TEXT } from "../../constants/fobles.constants";
import { FOBLES } from "../../constants/fobles";
import { publishFoblesShellCommand } from "../shell/shell-events";
import { openIndexedDbViewer } from "../shared/ui/indexeddb-viewer/indexeddb-viewer";
import { getPowerShellIseScriptTitle } from "../ise-tab-title";
import type { ToolbarContext } from "./types";

export type ToolbarNavButtonProps = {
  className: string;
  title: string;
  onClick: (event: React.MouseEvent<HTMLButtonElement>) => void;
  role?: string;
  ariaLabel?: string;
  text?: string;
  children?: React.ReactNode;
};

export function ToolbarNavButton({ className, title, onClick, role, ariaLabel, text, children }: ToolbarNavButtonProps) {
  return (
    <button
      type="button"
      className={className}
      title={title}
      aria-label={ariaLabel}
      {...{ [FOBLES.ATTRIBUTES.DATA.KEY.FOBLES_NAV_OWNER]: FOBLES.ATTRIBUTES.DATA.VALUE.PERSISTENT }}
      {...(role ? { [FOBLES.ATTRIBUTES.DATA.KEY.NAV_BUTTON_ROLE]: role } : {})}
      onClick={onClick}
    >
      {children ?? text}
    </button>
  );
}

export function LboltButton({ context }: { context: ToolbarContext }) {
  return <ToolbarNavButton className={CLASS.TOOLBAR_LBOLT_BUTTON} role={FOBLES.ATTRIBUTES.DATA.NAV_BUTTON_ROLE.LBOLT} text={SYMBOLS.LIGHTNING} title={TEXT.TOGGLE_FEATURES} onClick={context.onToggleFeatures} />;
}

export function GraphButton({ context }: { context: ToolbarContext }) {
  return (
    <ToolbarNavButton className={CLASS.TOOLBAR_GRAPH_BUTTON} role={FOBLES.ATTRIBUTES.DATA.NAV_BUTTON_ROLE.GRAPH} title={TEXT.GRAPH_TITLE} ariaLabel={TEXT.GRAPH_TITLE} onClick={() => publishFoblesShellCommand("reference-graph:open", context.doc)}>
      <img className={CLASS.TOOLBAR_GRAPH_ICON} src={chrome.runtime.getURL(ICONS.GRAPH)} alt="" />
    </ToolbarNavButton>
  );
}

export function AuditorButton({ context }: { context: ToolbarContext }) {
  return <ToolbarNavButton className={CLASS.TOOLBAR_AUDITOR_BUTTON} role={FOBLES.ATTRIBUTES.DATA.NAV_BUTTON_ROLE.AUDITOR} text={SYMBOLS.MAGNIFIER} title={TEXT.AUDITOR_TITLE} onClick={() => publishFoblesShellCommand("auditor:open", context.doc)} />;
}

export function DeveloperButton({ context }: { context: ToolbarContext }) {
  return <ToolbarNavButton className={CLASS.TOOLBAR_DEVELOPER_BUTTON} role={FOBLES.ATTRIBUTES.DATA.NAV_BUTTON_ROLE.DEVELOPER} text={TEXT.DEVELOPER_BUTTON} title={TEXT.DEVELOPER_TITLE} onClick={() => openIndexedDbViewer(context.doc)} />;
}

export function SetIseTabTitleButton({ context }: { context: ToolbarContext }) {
  function handleClick(): void {
    const title = getPowerShellIseScriptTitle(context.doc);
    if (!title) {
      context.win.alert(TEXT.SET_ISE_TAB_TITLE_ERROR);
      return;
    }
    context.doc.title = title;
  }
  return <ToolbarNavButton className={`${CLASS.FOBLES_NAV_BUTTON} ${CLASS.TOOLBAR_SET_ISE_TITLE_BUTTON}`} text={TEXT.SET_ISE_TAB_TITLE} title={TEXT.SET_ISE_TAB_TITLE_TITLE} onClick={handleClick} />;
}

export function ToolbarCloseButton({ context }: { context: ToolbarContext }) {
  return (
    <button type="button" className={CLASS.TOOLBAR_CLOSE_BUTTON} title={TEXT.HIDE_NAV} aria-label={TEXT.HIDE_NAV} onClick={() => context.setVisible(false)}>
      <img className={CLASS.TOOLBAR_CLOSE_ICON} src={ICONS.CLOSE} alt="" />
    </button>
  );
}
