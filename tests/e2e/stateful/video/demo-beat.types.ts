export type DemoBeat = {
  speechText: string;
  action: () => Promise<unknown>;
  name: string;
  init?: () => Promise<unknown>;
  speechPosition?: { xPercent: number; yPercent: number };
  highlightResult?: (() => Promise<unknown>) | false;
};
