// @source-path [fobles] src/content/shared/ui/dialog/dialog-icon-button.tsx
export type DialogIconButtonSurface = "light" | "dark";
export type DialogIconButtonProps = {
  kind: "close" | "help";
  label: string;
  onClick: () => void;
  surface?: DialogIconButtonSurface;
  className?: string;
};
export function DialogIconButton({ kind, label, onClick, surface = "light", className }: DialogIconButtonProps) {
  const classes = ["fobles-dialog-icon-button", `fobles-dialog-icon-button--${kind}`, `fobles-dialog-icon-button--on-${surface}`, className]
    .filter(Boolean)
    .join(" ");
  return (
    <button type="button" className={classes} title={label} aria-label={label} onClick={onClick}>
      {kind === "help" ? (
        <span aria-hidden="true">?</span>
      ) : (
        <img src="/sitecore/shell/themes/standard/Images/Window%20Management/page_close.png" alt="" />
      )}
    </button>
  );
}
