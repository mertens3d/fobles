
export type FlyoutVisibilityState = {
  visible: boolean;
  pinned: boolean;
  show: () => void;
  hide: () => void;
  scheduleHide: () => void;
  cancelHide: () => void;
  setPinned: (pinned: boolean) => void;
};
