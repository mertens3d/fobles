import { FOBLES } from "../constants";

let usedItemIdCounts = new Map<string, number>();

// Called whenever Fobles/tree buttons toggle on or off (feature-toggle.ts's toggleLightningBolt)
// so each fresh decoration pass starts counting from zero again.
export function resetFoblesItemIdCounts(): void {
  usedItemIdCounts = new Map<string, number>();
}

// Sets data-fobles-item-id, suffixing with -1, -2, etc. if the same item id has already been
// assigned to another button in this pass (e.g. a field and the tree both reference the same
// item) - keeps every button's attribute value unique without requiring the item id itself to be.
export function assignFoblesItemId(element: HTMLElement, itemId: string): void {
  const count = (usedItemIdCounts.get(itemId) ?? 0) + 1;
  usedItemIdCounts.set(itemId, count);
  const value = count === 1 ? itemId : `${itemId}-${count - 1}`;
  element.setAttribute(FOBLES.ATTRIBUTES.ITEM_ID, value);
}
