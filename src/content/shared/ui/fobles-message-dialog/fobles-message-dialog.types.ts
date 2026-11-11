export type FoblesMessageDialogAction = {
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onClick: () => void | Promise<void>;
};
