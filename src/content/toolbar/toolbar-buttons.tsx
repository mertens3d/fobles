// @source-path [fobles] src/content/toolbar/toolbar-buttons.tsx
import { CLASS, ICONS, SYMBOLS, TEXT } from "../../constants/fobles-b.const";
import { FOBLES } from "../../constants/fobles.const";
import { getPowerShellIseScriptTitle } from "../ise-tab-title";
import { publishFoblesShellCommand } from "../shell/shell-events";
import { openDeveloperUtility } from "../shell/utility/fobles-utility-launchers";
import { setFoblesNavVisible } from "../../shared/nav-settings";
import { setToolbarStoreVisible } from "./toolbar-store";
import type { ToolbarContext } from "./toolbarcontext.types";

function resolveGraphIconUrl(): string | undefined {
  let url: string | undefined;
  try {
    url = chrome.runtime.getURL(ICONS.GRAPH);
  } catch {
    url = undefined;
  }
  return url;
}

const graphIconUrl = resolveGraphIconUrl();

export type ToolbarNavButtonProps = {
  className: string;
  title: string;
  onClick: (event: React.MouseEvent) => void;
  role?: string;
  ariaLabel?: string;
  text?: string;
  children?: React.ReactNode;
};

export function ToolbarNavButton({
  className,
  title,
  onClick,
  role,
  ariaLabel,
  text,
  children,
}: ToolbarNavButtonProps) {
  return (
    <button
      className={className}
      title={title}
      onClick={onClick}
      data-fobles-nav-button-role={role}
      aria-label={ariaLabel}
    >
      {children ?? text}
    </button>
  );
}

export function LboltButton({ context }: { context: ToolbarContext }) {
  return (
    <ToolbarNavButton
      className={CLASS.TOOLBAR_LBOLT_BUTTON}
      role={FOBLES.ATTRIBUTES.DATA.NAV_BUTTON_ROLE.LBOLT}
      title={TEXT.TOGGLE_FEATURES}
      onClick={context.onToggleFeatures}
    >
      {SYMBOLS.LIGHTNING}
    </ToolbarNavButton>
  );
}

export function GraphButton({ context }: { context: ToolbarContext }) {
  return (
    <ToolbarNavButton
      className={CLASS.TOOLBAR_GRAPH_BUTTON}
      role={FOBLES.ATTRIBUTES.DATA.NAV_BUTTON_ROLE.GRAPH}
      ariaLabel={TEXT.GRAPH_TITLE}
      title={TEXT.GRAPH_TITLE}
      onClick={() => publishFoblesShellCommand("reference-graph:open", context.doc)}
    >
      {graphIconUrl && <img className={CLASS.TOOLBAR_GRAPH_ICON} src={graphIconUrl} alt="" />}
    </ToolbarNavButton>
  );
}

export function AuditorButton({ context }: { context: ToolbarContext }) {
  return (
    <ToolbarNavButton
      className={CLASS.TOOLBAR_AUDITOR_BUTTON}
      role={FOBLES.ATTRIBUTES.DATA.NAV_BUTTON_ROLE.AUDITOR}
      title={TEXT.AUDITOR_TITLE}
      onClick={() => publishFoblesShellCommand("auditor:open", context.doc)}
    >
      {SYMBOLS.MAGNIFIER}
    </ToolbarNavButton>
  );
}

export function DeveloperButton({ context }: { context: ToolbarContext }) {
  return (
    <ToolbarNavButton
      className={CLASS.TOOLBAR_DEVELOPER_BUTTON}
      role={FOBLES.ATTRIBUTES.DATA.NAV_BUTTON_ROLE.DEVELOPER}
      title={TEXT.DEVELOPER_TITLE}
      text={TEXT.DEVELOPER_BUTTON}
      onClick={() => openDeveloperUtility(context.doc)}
    />
  );
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
  return (
    <ToolbarNavButton
      className={`${CLASS.FOBLES_NAV_BUTTON} ${CLASS.TOOLBAR_SET_ISE_TITLE_BUTTON}`}
      title={TEXT.SET_ISE_TAB_TITLE_TITLE}
      text={TEXT.SET_ISE_TAB_TITLE}
      onClick={handleClick}
    />
  );
}

export function ToolbarCloseButton({ context }: { context: ToolbarContext }) {
  return (
    <ToolbarNavButton
      className={CLASS.TOOLBAR_CLOSE_BUTTON}
      ariaLabel={TEXT.HIDE_NAV}
      title={TEXT.HIDE_NAV}
      onClick={() => {
        context.setVisible(false);
        setToolbarStoreVisible(context.doc, false);
        void setFoblesNavVisible(false);
      }}
    >
      <img className={CLASS.TOOLBAR_CLOSE_ICON} src={ICONS.CLOSE} alt="" />
    </ToolbarNavButton>
  );
}
