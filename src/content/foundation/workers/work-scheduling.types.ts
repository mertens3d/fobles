import type { WORK_SCHEDULING } from "./work-scheduling.const";

export type WorkClass = typeof WORK_SCHEDULING.FOREGROUND | typeof WORK_SCHEDULING.BACKGROUND;