// @source-path [fobles] src/content/toolbar/use-toolbar-background.ts

import { useEffect, useState } from "react";
import { CSS_PROPERTIES } from "../../constants/fobles-b.const";
import { CONST } from "../../constants/const";
import type { ToolbarContext } from "./toolbarcontext.types";

export function useToolbarBackgroundColor(context: ToolbarContext): React.CSSProperties {
  const [backgroundColor, setBackgroundColor] = useState<string | undefined>(undefined);

  useEffect(() => {
    function update(): void {
      const globalHeader = context.doc.querySelector<HTMLElement>(CONST.SITECORE.SELECTORS.GLOBAL_HEADER);
      if (!globalHeader) {
        setBackgroundColor(undefined);
        return;
      }
      const color = context.win.getComputedStyle(globalHeader).backgroundColor;
      setBackgroundColor(color && color !== "transparent" && color !== "rgba(0, 0, 0, 0)" ? color : undefined);
    }

    update();
    const header = context.doc.querySelector(CONST.SITECORE.SELECTORS.GLOBAL_HEADER);
    if (!header) {
      return;
    }
    const observer = new MutationObserver(update);
    observer.observe(header, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [context.doc, context.win]);

  return backgroundColor ? ({ [CSS_PROPERTIES.TOOLBAR_BACKGROUND]: backgroundColor } as React.CSSProperties) : {};
}
