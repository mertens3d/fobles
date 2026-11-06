import type { KnownSite, StructuralKind, StructuralScope } from "../../shared/structural/structural.types.ts";

export type StructuralSettingsDraft = {
  paths: Record<StructuralKind, string>;
  showToolbarDiagnostics: boolean;
};

export type KnownSitesPanelProps = { scope: StructuralScope };

export type KnownSiteEditorProps = {
  busy: boolean;
  onRemove: (id: string) => Promise<void>;
  onSave: (site: KnownSite) => Promise<void>;
  site: KnownSite;
};