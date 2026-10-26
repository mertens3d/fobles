import { useRef, type ReactNode } from "react";
import { DialogIconButton } from "../../../shared/ui/dialog/dialog-icon-button";

const GRAPH_HELP = {
  TITLE: "Reference Graph Help",
  NAVIGATION: [
    { gesture: "Click", action: "Show node details" },
    { gesture: "Double-click", action: "Re-root graph at item" },
    { gesture: "Ctrl/Cmd + Click", action: "Open Sitecore item in a new tab" },
  ],
  POINTER_VIEW: [
    { gesture: "Right-click", action: "Zoom in at pointer" },
    { gesture: "Ctrl/Cmd + Right-click", action: "Zoom out at pointer" },
    { gesture: "Double-right-click", action: "Fit and center node or group" },
  ],
} as const;

type GraphHelpDialogProps = { dialogRef: React.RefObject<HTMLDialogElement | null> };
type HelpRowProps = { control: ReactNode; action: string };

function HelpRow({ control, action }: HelpRowProps) {
  return <div className="fobles-reference-graph-help-row"><div className="fobles-reference-graph-help-control">{control}</div><span>{action}</span></div>;
}

function ZoomControlExample() {
  return <span className="fobles-reference-graph-help-zoom-control" aria-hidden="true"><span>+</span><span>−</span></span>;
}

function NodeControlExample() {
  return <span className="fobles-reference-graph-help-node-controls" aria-hidden="true"><span>+</span><span>−</span></span>;
}

export function GraphHelpDialog({ dialogRef }: GraphHelpDialogProps) {
  const closeFromBackdrop = (event: React.MouseEvent<HTMLDialogElement>): void => {
    const dialog = event.currentTarget;
    const bounds = dialog.getBoundingClientRect();
    const outside =
      event.clientX < bounds.left ||
      event.clientX > bounds.right ||
      event.clientY < bounds.top ||
      event.clientY > bounds.bottom;

    if (outside) dialog.close();
  };

  return (
    <dialog
      ref={dialogRef}
      className="fobles-reference-graph-help"
      aria-labelledby="fobles-reference-graph-help-title"
      onClick={closeFromBackdrop}
    >
      <header className="fobles-reference-graph-help-header">
        <h2 id="fobles-reference-graph-help-title">{GRAPH_HELP.TITLE}</h2>

        <DialogIconButton
          kind="close"
          label="Close graph help"
          onClick={() => dialogRef.current?.close()}
          className="fobles-reference-graph-help-close"
        />
      </header>

      <div className="fobles-reference-graph-help-content">
        <section className="fobles-reference-graph-help-section">
          <h3>Navigation</h3>
          <div className="fobles-reference-graph-help-rows">
            {GRAPH_HELP.NAVIGATION.map((row) => (
              <HelpRow key={row.gesture} control={<kbd>{row.gesture}</kbd>} action={row.action} />
            ))}
          </div>
        </section>

        <section className="fobles-reference-graph-help-section">
          <h3>View</h3>
          <div className="fobles-reference-graph-help-rows">
            <HelpRow
              control={<ZoomControlExample />}
              action="Bottom-right graph controls: zoom in / zoom out"
            />

            {GRAPH_HELP.POINTER_VIEW.map((row) => (
              <HelpRow key={row.gesture} control={<kbd>{row.gesture}</kbd>} action={row.action} />
            ))}
          </div>
        </section>

        <section className="fobles-reference-graph-help-section">
          <h3>Node Expansion</h3>
          <div className="fobles-reference-graph-help-rows">
            <HelpRow
              control={<NodeControlExample />}
              action="Expand / collapse node"
            />

            <HelpRow
              control={
                <>
                  <kbd>Ctrl/Cmd</kbd>
                  <NodeControlExample />
                </>
              }
              action="Expand / collapse all nodes of this type"
            />

            <HelpRow
              control={
                <>
                  <kbd>Shift</kbd>
                  <NodeControlExample />
                </>
              }
              action="Expand / collapse subtree"
            />
          </div>
        </section>

        <section className="fobles-reference-graph-help-section">
          <h3>Processing State</h3>
          <div className="fobles-reference-graph-help-rows">
            <HelpRow
              control={
                <img
                  className="fobles-reference-graph-help-processing-icon"
                  src="/~/icon/people/16x16/hourglass.png"
                  alt=""
                  aria-hidden="true"
                />
              }
              action="Waiting for item data"
            />

            <HelpRow
              control={
                <img
                  className="fobles-reference-graph-help-processing-icon"
                  src="/~/icon/office/16x16/refresh.png"
                  alt=""
                  aria-hidden="true"
                />
              }
              action="Item changed; refreshing data"
            />

            <HelpRow
              control={
                <img
                  className="fobles-reference-graph-help-processing-icon"
                  src="/~/icon/office/16x16/warning.png"
                  alt=""
                  aria-hidden="true"
                />
              }
              action="Item data could not be verified"
            />

            <HelpRow
              control={<span className="fobles-reference-graph-help-item-icon">Sitecore icon</span>}
              action="Item processing complete"
            />
          </div>
        </section>
      </div>
    </dialog>
  );
}

export function useGraphHelpDialog() {
  const dialogRef = useRef<HTMLDialogElement | null>(null);
  return { dialogRef, showGraphHelp: (): void => dialogRef.current?.showModal() };
}
