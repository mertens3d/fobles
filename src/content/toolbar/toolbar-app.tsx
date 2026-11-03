// @source-path [fobles] src/content/toolbar/toolbar-app.tsx

import { CLASS, TEXT } from "../../constants/fobles.constants";
import { isCompactToolbarPage, isPowerShellIsePath } from "../guard";
import { useFlyoutVisibility } from "./shared-flyout/use-flyout-visibility";
import { ToolbarGrip } from "./toolbar-grip";
import {
  AuditorButton,
  DeveloperButton,
  GraphButton,
  LboltButton,
  SetIseTabTitleButton,
  ToolbarCloseButton,
} from "./toolbar-buttons";
import { useToolbarDrag } from "./use-toolbar-drag";
import { useToolbarBackgroundColor } from "./use-toolbar-background";
import { useDeveloperButtonVisible } from "./use-developer-button-visible";
import { JumpFlyoutTrigger } from "./jump-flyout/jump-flyout-trigger";
import { ProxyFlyoutTrigger } from "./proxy-flyout/proxy-flyout-trigger";
import { HistoryTrigger } from "./history/history-trigger";
import type { ToolbarContext } from "./types";

export type ToolbarAppProps = { context: ToolbarContext };

export function ToolbarApp({ context }: ToolbarAppProps) {
  const drag = useToolbarDrag(context);
  const backgroundStyle = useToolbarBackgroundColor(context);
  const showDeveloperButton = useDeveloperButtonVisible(context);
  const isCompact = isCompactToolbarPage(context.win.location.pathname);
  const isIse = isPowerShellIsePath(context.win.location.pathname);
  const jumpFlyout = useFlyoutVisibility(context.win);
  const proxyFlyout = useFlyoutVisibility(context.win);
  const historyFlyout = useFlyoutVisibility(context.win);

  function openJumpFlyout(): void {
    jumpFlyout.show();
    proxyFlyout.hide();
    historyFlyout.hide();
  }

  function openProxyFlyout(): void {
    proxyFlyout.show();
    jumpFlyout.hide();
    historyFlyout.hide();
  }

  function openHistoryFlyout(): void {
    historyFlyout.show();
    jumpFlyout.hide();
    proxyFlyout.hide();
  }

  function toggleHistoryFlyout(): void {
    if (historyFlyout.pinned) {
      historyFlyout.hide();
    } else {
      historyFlyout.setPinned(true);
      jumpFlyout.hide();
      proxyFlyout.hide();
    }
  }

  function toggleJumpFlyout(): void {
    if (jumpFlyout.pinned) {
      jumpFlyout.hide();
      return;
    }
    jumpFlyout.setPinned(true);
    proxyFlyout.hide();
    historyFlyout.hide();
  }

  function toggleProxyFlyout(): void {
    if (proxyFlyout.pinned) {
      proxyFlyout.hide();
      return;
    }
    proxyFlyout.setPinned(true);
    jumpFlyout.hide();
    historyFlyout.hide();
  }

  return (
    <div
      ref={drag.containerRef}
      className={drag.className}
      title={TEXT.DRAG_NAV}
      data-position={drag.dataPosition}
      style={{ ...drag.style, ...backgroundStyle }}
      onPointerDown={drag.onPointerDown}
      onPointerMove={drag.onPointerMove}
      onPointerUp={drag.onPointerUp}
      onPointerCancel={drag.onPointerCancel}
    >
      <ToolbarGrip />
      <div className={CLASS.TOOLBAR_BODY}>
        <LboltButton context={context} />
        {!isCompact && (
          <JumpFlyoutTrigger
            doc={context.doc}
            jumpFlyout={jumpFlyout}
            onOpen={openJumpFlyout}
            onToggle={toggleJumpFlyout}
          />
        )}
        {!isCompact && (
          <ProxyFlyoutTrigger
            doc={context.doc}
            proxyFlyout={proxyFlyout}
            onOpen={openProxyFlyout}
            onToggle={toggleProxyFlyout}
          />
        )}
        {!isCompact && <GraphButton context={context} />}
        {!isCompact && <AuditorButton context={context} />}
        {!isCompact && showDeveloperButton && <DeveloperButton context={context} />}
        {!isCompact && isIse && <SetIseTabTitleButton context={context} />}
        {!isCompact && <ToolbarCloseButton context={context} />}
      </div>
      {!isCompact && (
        <HistoryTrigger
          doc={context.doc}
          historyFlyout={historyFlyout}
          onOpen={openHistoryFlyout}
          onToggle={toggleHistoryFlyout}
        />
      )}
    </div>
  );
}
