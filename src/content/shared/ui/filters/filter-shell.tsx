// @source-path [fobles] src/content/shared/ui/filters/filter-shell.tsx
export type FilterOption<TKey extends string> = { key: TKey; label: string; };
export type FilterGroupProps<TKey extends string> = { label: string; options: readonly FilterOption<TKey>[]; selected: ReadonlySet<TKey>; onToggle: (key: TKey) => void; };
export function FilterGroup<TKey extends string>({ label, options, selected, onToggle }: FilterGroupProps<TKey>) {
  return <div className="fobles-filter-group" role="group" aria-label={label}>{options.map((option) => <label key={option.key} className="fobles-filter-option"><input type="checkbox" checked={selected.has(option.key)} onChange={() => onToggle(option.key)} />{option.label}</label>)}</div>;
}
export type FilterShellProps = { query: string; onQueryChange: (value: string) => void; onReset: () => void; children: React.ReactNode; actions?: React.ReactNode; };
export function FilterShell({ query, onQueryChange, onReset, children, actions }: FilterShellProps) {
  return <div className="fobles-filter-shell"><input type="search" className="fobles-filter-search" placeholder="Search..." aria-label="Search" value={query} onChange={(event) => onQueryChange(event.target.value)} /><button type="button" className="fobles-filter-reset" onClick={onReset}>Reset</button>{children}{actions}</div>;
}
