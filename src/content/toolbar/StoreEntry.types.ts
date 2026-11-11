import type { ToolbarContext } from "./toolbarcontext.types";

export type ToolbarState = { context: ToolbarContext; visible: boolean };

export type StoreEntry = { state: ToolbarState; listeners: Set<() => void> };
