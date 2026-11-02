// @source-path [fobles] src/content/features/auditor/components/auditor-status-icon/auditor-status-icon.tsx
import type { AuditFindingStatus } from "../../audit-finding.types";

const STATUS_ICON: Readonly<Record<AuditFindingStatus, string>> = {
  pending: "/~/icon/applications/32x32/bullet_ball_glass_yellow.png",
  passed: "/~/icon/applications/32x32/bullet_ball_glass_green.png",
  warning: "/~/icon/applications/32x32/bullet_ball_glass_yellow.png",
  error: "/~/icon/applications/32x32/bullet_ball_glass_red.png",
};

export type AuditorStatusIconProps = { status: AuditFindingStatus; className?: string };

export function AuditorStatusIcon({ status, className }: AuditorStatusIconProps) {
  const classes = ["fobles-auditor-status-icon", `fobles-auditor-status-icon--${status}`, className].filter(Boolean).join(" ");
  return <img className={classes} src={STATUS_ICON[status]} alt="" aria-hidden="true" />;
}
