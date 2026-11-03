// @source-path [fobles] src/content/shared/ui/fobles-message-dialog/fobles-message-dialog.tsx
import type { ReactNode } from "react";

export type FoblesMessageDialogAction = {
  label: string;
  primary?: boolean;
  disabled?: boolean;
  onClick: () => void | Promise<void>;
};

export type FoblesMessageDialogProps = {
  title: string;
  message: ReactNode;
  actions: readonly FoblesMessageDialogAction[];
  ariaLabel?: string;
};

export function FoblesMessageDialog({ title, message, actions, ariaLabel = title }: FoblesMessageDialogProps) {
  return (
    <div className="fobles-message-dialog-backdrop">
      <section className="fobles-message-dialog" role="dialog" aria-modal="true" aria-label={ariaLabel}>
        <h2 className="fobles-message-dialog__title">{title}</h2>
        <div className="fobles-message-dialog__message">{message}</div>
        <div className="fobles-message-dialog__actions">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              className={action.primary ? "is-primary" : undefined}
              disabled={action.disabled}
              onClick={() => void action.onClick()}
            >
              {action.label}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}
