// @source-path [fobles] src/content/shell/utility/fobles-utility-windows.tsx

import { FoblesWindow } from "../../shared/dialog/fobles-window";
import { unmountFoblesUtility, useFoblesUtilities } from "./fobles-utility-store";

export function FoblesUtilityWindows({ doc }: { doc: Document }) {
  const utilities = useFoblesUtilities(doc);
  return utilities.map((utility) => {
    let closing = false;
    function handleClose(): void {
      if (!closing) {
        closing = true;
        void Promise.resolve(utility.onClose?.()).finally(() => unmountFoblesUtility(doc, utility.id));
      }
    }
    return (
      <div key={utility.id} className="fobles-utility-root">
        <div className="fobles-utility-content">
          <FoblesWindow id={utility.id} className={utility.className} title={utility.title} storageKey={utility.storageKey}
            defaultWidth={utility.defaultWidth} defaultHeight={utility.defaultHeight} minWidth={utility.minWidth}
            minHeight={utility.minHeight} onClose={handleClose} onHelp={utility.onHelp}>
            {utility.children}
          </FoblesWindow>
        </div>
      </div>
    );
  });
}
