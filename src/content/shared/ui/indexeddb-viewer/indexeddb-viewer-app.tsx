// @source-path [fobles] src/content/shared/ui/indexeddb-viewer/indexeddb-viewer-app.tsx
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { DetailsPanel } from "../details/details-panel";
import { DETAILS_PANEL } from "../details/details-panel.const";
import { JsonTree } from "../json-tree/json-tree";
import { JSON_TREE } from "../json-tree/json-tree.const";
import { INDEXEDDB_VIEWER } from "./indexeddb-viewer.const";
import { clearSitecoreDataCache, filterCacheRows, loadCacheRows } from "./indexeddb-viewer-service";
import type { CacheRow, CacheRowsByStore, IndexedDbStoreId, IndexedDbViewerAppProps } from "./indexeddb-viewer.types";
const { CLASS, TEXT } = INDEXEDDB_VIEWER;
const EMPTY_ROWS: CacheRowsByStore = { sitecoreItems: [], sitecoreFacts: [] };
export function IndexedDbViewerApp({ doc }: IndexedDbViewerAppProps) {
  const [rowsByStore, setRowsByStore] = useState<CacheRowsByStore>(EMPTY_ROWS);
  const [activeStore, setActiveStore] = useState<IndexedDbStoreId>("sitecoreItems");
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string>();
  const [query, setQuery] = useState("");
  const [selectedKey, setSelectedKey] = useState<string>();
  const [openDepth, setOpenDepth] = useState<number>(JSON_TREE.DEFAULT_OPEN_DEPTH);
  const [treeVersion, setTreeVersion] = useState(0);
  const deferredQuery = useDeferredValue(query);
  const win = doc.defaultView ?? window;
  const reload = useCallback(async (): Promise<void> => {
    try { setRowsByStore(await loadCacheRows()); setError(undefined); }
    catch (loadError) { setError(loadError instanceof Error ? loadError.message : String(loadError)); }
    finally { setLoaded(true); }
  }, []);
  useEffect(() => { void reload(); }, [reload]);
  const rows = rowsByStore[activeStore];
  const matches = useMemo(() => filterCacheRows(rows, deferredQuery), [rows, deferredQuery]);
  const shown = useMemo(() => matches.slice(0, INDEXEDDB_VIEWER.MAX_ROWS), [matches]);
  const selected = useMemo(() => rows.find((row) => row.key === selectedKey), [rows, selectedKey]);
  function selectStore(store: IndexedDbStoreId): void { setActiveStore(store); setSelectedKey(undefined); }
  function selectRow(row: CacheRow): void { setSelectedKey(row.key); setOpenDepth(JSON_TREE.DEFAULT_OPEN_DEPTH); setTreeVersion((current) => current + 1); }
  function setTreeDepth(depth: number): void { setOpenDepth(depth); setTreeVersion((current) => current + 1); }
  async function handleClear(): Promise<void> { if (win.confirm(TEXT.CONFIRM_CLEAR)) { await clearSitecoreDataCache(); setSelectedKey(undefined); await reload(); } }
  let status: string;
  if (error) status = `${TEXT.LOAD_FAILED}: ${error}`;
  else if (!loaded) status = TEXT.LOADING;
  else status = `${matches.length} of ${rows.length} records match. Showing ${shown.length}.`;
  return (
    <div className={CLASS.APP}>
      <div className={CLASS.TABS} role="tablist" aria-label={TEXT.STORE_TABS_LABEL}>
        <button type="button" role="tab" aria-selected={activeStore === "sitecoreItems"} className={activeStore === "sitecoreItems" ? CLASS.ACTIVE_TAB : undefined} onClick={() => selectStore("sitecoreItems")}>{TEXT.SITECORE_ITEMS}</button>
        <button type="button" role="tab" aria-selected={activeStore === "sitecoreFacts"} className={activeStore === "sitecoreFacts" ? CLASS.ACTIVE_TAB : undefined} onClick={() => selectStore("sitecoreFacts")}>{TEXT.SITECORE_FACTS}</button>
      </div>
      <div className={CLASS.TOOLBAR}>
        <input type="search" placeholder={TEXT.SEARCH_PLACEHOLDER} aria-label={TEXT.SEARCH_LABEL} value={query} onChange={(event) => setQuery(event.target.value)} />
        <button type="button" onClick={() => void reload()}>{TEXT.REFRESH}</button>
        <button type="button" className={CLASS.DANGER} onClick={() => void handleClear()}>{TEXT.CLEAR}</button>
      </div>
      <div className={CLASS.STATUS}>{status}</div>
      <div className={CLASS.WORKSPACE}>
        <div className={CLASS.TABLE_WRAP}>
          {loaded && shown.length === 0 ? <p>{TEXT.NO_ROWS}</p> : (
            <table className={CLASS.TABLE}>
              <thead><tr><th>{TEXT.KEY_HEADER}</th><th>{TEXT.VALUE_HEADER}</th></tr></thead>
              <tbody>{shown.map((row) => (
                <tr key={row.key} className={row.key === selectedKey ? CLASS.SELECTED_ROW : undefined}>
                  <td>{row.key}</td>
                  <td className={CLASS.VALUE_CELL} title={TEXT.VALUE_CELL_TITLE} tabIndex={0} onClick={() => selectRow(row)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); selectRow(row); } }}>{row.preview}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
        {selected ? (
          <aside className={CLASS.DETAILS}>
            <DetailsPanel title={TEXT.DETAILS_TITLE} closeLabel={TEXT.DETAILS_CLOSE} onClose={() => setSelectedKey(undefined)} getCopyText={() => JSON.stringify(selected.record, null, 2)} actions={<><button type="button" className={DETAILS_PANEL.CLASS.BUTTON} onClick={() => setTreeDepth(JSON_TREE.EXPAND_ALL_DEPTH)}>{TEXT.EXPAND_ALL}</button><button type="button" className={DETAILS_PANEL.CLASS.BUTTON} onClick={() => setTreeDepth(JSON_TREE.COLLAPSE_ALL_DEPTH)}>{TEXT.COLLAPSE_ALL}</button></>}>
              <div className={DETAILS_PANEL.CLASS.ROW}><strong>{TEXT.DETAILS_KEY}</strong><span>{selected.key}</span></div>
              <JsonTree key={`${selected.key}:${treeVersion}`} value={selected.record} defaultOpenDepth={openDepth} />
            </DetailsPanel>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
