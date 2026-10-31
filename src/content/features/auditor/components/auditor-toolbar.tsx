// @source-path [fobles] src/content/features/auditor/components/auditor-toolbar.tsx

import { useEffect, useRef, useState, type ReactNode } from "react";
import { CONST } from "../../../../constants/const";
import type { SitecoreHarvestFiltersState } from "../../../foundation/harvesting/sitecore-harvester.types";
import { ViewReferenceModelButton } from "../../../shared/ui/reference-controls/view-reference-model-button";
import { AUDITOR_EXPORT_CSV_EVENT } from "../../../shared/ui/reference-model/reference-model-viewer";
import {
  AUDITOR_LAYOUT_VIEW_KEYS,
  DEFAULT_AUDITOR_LAYOUT_VIEW_SETTINGS,
  getAuditorLayoutViewSettings,
  setAuditorLayoutViewSettings,
  type AuditorLayoutViewKey,
  type AuditorLayoutViewSettings,
} from "../auditor-layout-view-settings";
import { getAuditorControlsExpanded, setAuditorControlsExpanded } from "../auditor-ui-settings";

const LAYOUT_VIEW_LABELS: Readonly<Record<AuditorLayoutViewKey, string>> = {
  device: "Devices",
  "page-layout": "Page Layouts",
  placeholder: "Placeholders",
  rendering: "Renderings",
  datasource: "Datasources",
  parameter: "Rendering Parameters",
};

export type AuditorToolbarProps = {
  selectedChecks?: ReadonlySet<string>;
  onToggleCheck?: (checkKey: string) => void;
  onReset?: () => void;
  onExport: () => void;
  onViewReferenceModel: () => void;
  graphFilters: SitecoreHarvestFiltersState;
  onGraphFilterChange: (key: keyof SitecoreHarvestFiltersState, checked: boolean) => void;
  onClearGraphFilters: () => void;
  footer: ReactNode;
};

export function AuditorToolbar(props: AuditorToolbarProps) {
  const [expanded, setExpanded] = useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [layoutView, setLayoutView] = useState<AuditorLayoutViewSettings>(DEFAULT_AUDITOR_LAYOUT_VIEW_SETTINGS);
  const clearedLegacyChecks = useRef(false);

  useEffect(() => {
    const exportCsv = (): void => props.onExport();
    window.addEventListener(AUDITOR_EXPORT_CSV_EVENT, exportCsv);
    return () => window.removeEventListener(AUDITOR_EXPORT_CSV_EVENT, exportCsv);
  }, [props.onExport]);

  useEffect(() => {
    let active = true;

    void Promise.all([getAuditorControlsExpanded(), getAuditorLayoutViewSettings()]).then(([storedExpanded, storedLayoutView]) => {
      if (active) {
        setExpanded(storedExpanded);
        setLayoutView(storedLayoutView);
        setSettingsLoaded(true);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!settingsLoaded || clearedLegacyChecks.current || !props.selectedChecks?.size) return;

    clearedLegacyChecks.current = true;
    props.onReset?.();
  }, [props, settingsLoaded]);

  function changeExpanded(next: boolean): void {
    setExpanded(next);
    void setAuditorControlsExpanded(next);
  }

  function changeLayoutView(key: AuditorLayoutViewKey, checked: boolean): void {
    const next = { ...layoutView, [key]: checked };
    setLayoutView(next);
    void setAuditorLayoutViewSettings(next);
  }

  return (
    <div className="fobles-auditor-controls-shell">
      <button type="button" className="fobles-auditor-controls-expander" disabled={!settingsLoaded} aria-expanded={expanded} onClick={() => changeExpanded(!expanded)}>Controls</button>
      {expanded ? (
        <div className="fobles-auditor-toolbar-controls">
          <div className="fobles-auditor-filter-list">
            <button type="button" className="fobles-auditor-clear-filters" onClick={props.onClearGraphFilters}>Clear Filters</button>
            {CONST.FOBLES.REFERENCE_GRAPH.FILTER_DEFS.map((filter) => (
              <label key={filter.key}>
                <input type="checkbox" checked={props.graphFilters[filter.key]} onChange={(event) => { props.onGraphFilterChange(filter.key, event.currentTarget.checked); window.dispatchEvent(new CustomEvent("fobles:auditor-graph-filter-change", { detail: { key: filter.key, checked: event.currentTarget.checked } })); }} />
                <span>{filter.label}</span>
              </label>
            ))}
          </div>
          <fieldset className={`fobles-auditor-layout-view-filters${props.graphFilters.layouts ? "" : " is-disabled"}`} disabled={!props.graphFilters.layouts}>
              <legend>Layout rows</legend>
              {AUDITOR_LAYOUT_VIEW_KEYS.map((key) => (
                <label key={key}>
                  <input type="checkbox" checked={layoutView[key]} onChange={(event) => changeLayoutView(key, event.currentTarget.checked)} />
                  <span>{LAYOUT_VIEW_LABELS[key]}</span>
                </label>
              ))}
          </fieldset>
          <div className="fobles-auditor-filter-actions">
            <ViewReferenceModelButton onViewReferenceModel={props.onViewReferenceModel} className="fobles-auditor-toolbar-action fobles-auditor-toolbar-action--primary" />
          </div>
        </div>
      ) : null}
      {props.footer}
    </div>
  );
}
