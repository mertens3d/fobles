// @source-path [fobles] src/content/foundation/workers/worker-protocol.const.ts

import { CONST } from "../../../constants/const";

export const WORKER_MESSAGE_TYPE = {
	...CONST.FOBLES.WORKER.MESSAGE_TYPE,
	WORKER_POOL_STATUS: "FOBLES_WORKER_POOL_STATUS",
} as const;

export const DEBUG_WORKER_POOL = CONST.FOBLES.WORKER.DEBUG.POOL;

export const DEBUG_MEMORY = CONST.FOBLES.WORKER.DEBUG.MEMORY;
