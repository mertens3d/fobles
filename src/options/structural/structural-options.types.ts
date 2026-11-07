import type { KnownSite, StructuralScope } from "../../shared/structural/structural.types.ts";

export type StructuralSettingsDraft = { showToolbarDiagnostics: boolean };

export type KnownSitesPanelProps = { scope: StructuralScope };

export type KnownSiteEditorProps = {
  busy: boolean;
  onRemove: (id: string) => Promise<void>;
  onSave: (site: KnownSite) => Promise<void>;
  site: KnownSite;
};