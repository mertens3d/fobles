// Fobles-generated selectors/attributes/classes asserted against by the section-scenario tests.
// Duplicated (not imported) from src/content/features/augmentor/constants.ts, since these tests
// exercise the built extension at runtime rather than the TypeScript source.
export const FOBLES = {
  ATTRIBUTES: {
    BUTTON: "data-is-fobles-button",
    WRAPPER: "data-fobles-wrapper",
  },
  CLASSES: {
    HIDDEN: "fobles-hidden",
  },
  SELECTORS: {
    BUTTON: "[data-is-fobles-button='1']",
    WRAPPER: "[data-fobles-wrapper]",
  },
} as const;

export const FOBLES_HIDDEN_CLASS_PATTERN = new RegExp(FOBLES.CLASSES.HIDDEN);
