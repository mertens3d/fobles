// @source-path [fobles] src/content/toolbar/shared-flyout/flyout-trigger.tsx

import { useEffect, useRef } from "react";

export type FlyoutTriggerProps = {
  className: string;
  button: React.ReactNode;
  onHoverOpen: () => void;
  onHoverScheduleClose: () => void;
  onOutsidePointerDown: () => void;
  children?: React.ReactNode;
};

// The flyout panel (children) renders outside the trigger's own hit box, so a pointerdown
// anywhere outside this wrapper also closes it - not just the trigger's own mouseleave.
export function FlyoutTrigger({ className, button, onHoverOpen, onHoverScheduleClose, onOutsidePointerDown, children }: FlyoutTriggerProps) {
  const triggerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const doc = triggerRef.current?.ownerDocument;
    if (!doc) return;
    function onPointerDown(event: PointerEvent): void {
      if (triggerRef.current && !triggerRef.current.contains(event.target as Node)) onOutsidePointerDown();
    }
    doc.addEventListener("pointerdown", onPointerDown);
    return () => doc.removeEventListener("pointerdown", onPointerDown);
  }, [onOutsidePointerDown]);

  return (
    <div ref={triggerRef} className={className} onMouseEnter={onHoverOpen} onMouseLeave={onHoverScheduleClose}>
      {button}
      {children}
    </div>
  );
}
