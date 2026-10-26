export const AUDIT_CHECK = {
  REFERENCE_RESOLVED: {
    KEY: "reference-resolved",
    LABEL: "Referenced target resolved",
    SUMMARY: {
      NOT_FOUND: "The referenced item could not be found.",
      FAILED: "Unable to process this referenced item after worker recovery was exhausted.",
      UNVERIFIED: "The referenced item is unverified because its revision could not be read.",
      RESOLVED: "The referenced item resolves successfully.",
      PENDING: "Waiting for Resolve to check this reference.",
    },
  },
};
