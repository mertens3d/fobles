import type { BrowserContext } from "@playwright/test";
import { CONST } from "../../CONST";
import { type Page } from "../../fixtures/playwright";
import { openSitecorePage } from "../../fixtures/sitecore";
import { findFrameWithSelector } from "../../helpers/frame-finder";
import { humanPause } from "../../helpers/wait-helpers";
import { pressToggleLboltHotkey } from "../../macros/fobles-macros";
import { FOBLES_YML } from "../strategies/support/yml-fobles.CONST";

const LBOLT_SETTLE_MS = 1_000;

type FoSighting = {
  itemId: string;
  title: string;
};

// One sighting per Strategy Scenarios field item - title must match the field section's real
// Content Editor caption exactly (e.g. "Strategy Droplink"), since it's used to rebuild that
// section's id attribute (Section_<Title with underscores><ItemGuidNoDashesUppercase>).
export const FO_SIGHTINGS: readonly FoSighting[] = [
  { itemId: FOBLES_YML.CONTENT.STRATEGY_DROPLINK.id, title: "Strategy Droplink" },
  { itemId: FOBLES_YML.CONTENT.STRATEGY_DROPLIST.id, title: "Strategy Droplist" },
  { itemId: FOBLES_YML.CONTENT.STRATEGY_DROPTREE.id, title: "Strategy Droptree" },
  { itemId: FOBLES_YML.CONTENT.STRATEGY_GENERAL_LINK.id, title: "Strategy General Link" },
  { itemId: FOBLES_YML.CONTENT.STRATEGY_INTERNAL_LINK.id, title: "Strategy Internal Link" },
  { itemId: FOBLES_YML.CONTENT.STRATEGY_MULTILIST.id, title: "Strategy Multilist" },
  { itemId: FOBLES_YML.CONTENT.STRATEGY_MULTILIST_SEARCH.id, title: "Strategy Multilist Search" },
  { itemId: FOBLES_YML.CONTENT.STRATEGY_TAG_LIST.id, title: "Strategy Tag List" },
  { itemId: FOBLES_YML.CONTENT.STRATEGY_TREE_LIST.id, title: "Strategy Tree List" },
  { itemId: FOBLES_YML.CONTENT.STRATEGY_TREELIST_EX.id, title: "Strategy Treelist Ex" },
];

function buildSectionSelector(sighting: FoSighting): string {
  const noDashId = sighting.itemId.replace(/-/g, "").toUpperCase();
  const sectionId = `Section_${sighting.title.replace(/\s+/g, "_")}${noDashId}`;
  return `#${sectionId}`;
}

// Tours a list of fo endpoints (temp name per its WIP status) - opens each item's Content Editor
// page, scrolls its field section into view, then toggles LBolt on/off via the hotkey (not a
// button click) so the toolbar doesn't need to be visible on screen for the sighting.
export async function demoSightings(
  page: Page,
  context: BrowserContext,
  sightings: readonly FoSighting[] = FO_SIGHTINGS,
): Promise<void> {
  for (const sighting of sightings) {
    console.log(`[fobles] demoSightings: visiting ${sighting.title} (${sighting.itemId})`);
    try {
      await openSitecorePage(page, `${CONST.SITECORE.PATHS.CONTENT_EDITOR_BW}&fo=${sighting.itemId}`);

      const sectionSelector = buildSectionSelector(sighting);
      const contentFrame = await findFrameWithSelector(page, sectionSelector, `${sighting.title} section`, 10_000);
      await contentFrame.locator(sectionSelector).scrollIntoViewIfNeeded();

      await pressToggleLboltHotkey(context);
      await humanPause(page, LBOLT_SETTLE_MS);
      await pressToggleLboltHotkey(context);
    } catch (error) {
      console.log(
        `[fobles] demoSightings: skipping ${sighting.title} - ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
}
