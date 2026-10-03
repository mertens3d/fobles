export type HighlightStyle = {
  BACKGROUND_COLOR: string;
  COLOR: string;
  OUTLINE: string;
  OUTLINE_OFFSET: string;
  RESTORE_DELAY_MS: number;
  TRANSITION: string;
  VISIBLE_DELAY_MS: number;
};

export type PageJumpDefinition = {
  label: string;
  url: string;
  skipTestingAI: boolean;
};
