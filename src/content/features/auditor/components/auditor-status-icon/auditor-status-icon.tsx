// @source-path [fobles] src/content/features/auditor/components/auditor-status-icon/auditor-status-icon.tsx
import { CONST } from "../../../../../constants/const";
import type { AuditFindingStatus } from "../../audit-finding.types";

const STATUS_ICON: Readonly<Record<AuditFindingStatus, string>> = {
  pending: CONST.SITECORE.ICONS.APPLICATIONS.BULLET_BALL_GLASS_YELLOW_32,
  passed: CONST.SITECORE.ICONS.APPLICATIONS.BULLET_BALL_GLASS_GREEN_32,
  warning: CONST.SITECORE.ICONS.APPLICATIONS.BULLET_BALL_GLASS_YELLOW_32,
  error: CONST.SITECORE.ICONS.APPLICATIONS.BULLET_BALL_GLASS_RED_32,
};

export type AuditorStatusIconProps = { status: AuditFindingStatus; className?: string };

export function AuditorStatusIcon({ status, className }: AuditorStatusIconProps) {
  const classes = ["fobles-auditor-status-icon", `fobles-auditor-status-icon--${status}`, className]
    .filter(Boolean)
    .join(" ");
  return <img className={classes} src={STATUS_ICON[status]} alt="" aria-hidden="true" />;
}
