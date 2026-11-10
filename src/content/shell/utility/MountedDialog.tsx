import type { Root } from "react-dom/client";

export type MountedDialog = { host: HTMLDivElement; root: Root; dispose: () => void; };
