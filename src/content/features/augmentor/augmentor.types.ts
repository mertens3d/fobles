export type ConfirmationState = {
  dialog: HTMLDialogElement;
  setting: HTMLInputElement;
  resolve?: (confirmed: boolean) => void;
};
