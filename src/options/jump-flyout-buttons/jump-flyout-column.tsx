// @source-path [fobles] src/options/jump-flyout-buttons/jump-flyout-column.tsx

export type JumpFlyoutColumnProps = {
  title: string;
  open: boolean;
  onToggle: (open: boolean) => void;
  children: React.ReactNode;
};

export function JumpFlyoutColumn({ title, open, onToggle, children }: JumpFlyoutColumnProps) {
  return (
    <details
      className="jump-flyout-column"
      name="jump-flyout-column"
      open={open}
      onToggle={(event) => onToggle(event.currentTarget.open)}
    >
      <summary>{title}</summary>
      {children}
    </details>
  );
}
