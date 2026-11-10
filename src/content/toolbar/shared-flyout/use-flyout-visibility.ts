// @source-path [fobles] src/content/toolbar/shared-flyout/use-flyout-visibility.ts

import { useCallback, useEffect, useRef, useState } from "react";
import type { FlyoutVisibilityState } from "./FlyoutVisibilityState";

const CLOSE_DELAY_MS = 250;

export function useFlyoutVisibility(win: Window): FlyoutVisibilityState {
  const [visible, setVisible] = useState(false);
  const [pinned, setPinnedState] = useState(false);
  const pinnedRef = useRef(false);
  const closeTimerRef = useRef<number | null>(null);

  const cancelHide = useCallback(() => {
    if (closeTimerRef.current === null) {
      return;
    }
    win.clearTimeout(closeTimerRef.current);
    closeTimerRef.current = null;
  }, [win]);

  useEffect(() => cancelHide, [cancelHide]);

  const hide = useCallback(() => {
    cancelHide();
    pinnedRef.current = false;
    setPinnedState(false);
    setVisible(false);
  }, [cancelHide]);

  const show = useCallback(() => {
    cancelHide();
    setVisible(true);
  }, [cancelHide]);

  const scheduleHide = useCallback(() => {
    if (pinnedRef.current) {
      return;
    }
    cancelHide();
    closeTimerRef.current = win.setTimeout(() => {
      closeTimerRef.current = null;
      hide();
    }, CLOSE_DELAY_MS);
  }, [cancelHide, hide, win]);

  const setPinned = useCallback(
    (next: boolean) => {
      pinnedRef.current = next;
      setPinnedState(next);
      if (next) {
        show();
      }
    },
    [show],
  );

  return { visible, pinned, show, hide, scheduleHide, cancelHide, setPinned };
}
