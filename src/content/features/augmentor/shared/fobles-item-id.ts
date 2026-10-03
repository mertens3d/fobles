import { FOBLES } from "../constants";

// Sets data-fobles-item-id to the raw item id. Deliberately not deduplicated - a field and the
// tree can reference the same item, and test selectors (tests/macros/fobles-macros.ts,
// tests/e2e/pages/pages-with-toolbar-visible.spec.ts) rely on exact-matching this raw id, scoped
// to the button's own class, to disambiguate.
export function assignFoblesItemId(element: HTMLElement, itemId: string): void {
  element.setAttribute(FOBLES.ATTRIBUTES.ITEM_ID, itemId);
}
