export const ACTIVITY_MESSAGE_TYPE = "FOBLES_ACTIVITY_EVENT" as const;
export type ActivityState = "queued" | "started" | "completed" | "error" | "cancelled";
export type ActivityEvent = { source: "worker" | "harvest" | "graph" | "enrichment" | "cache"; requestId?: string; activityId: string; kind: string; label: string; state: ActivityState; current?: number; total?: number; detail?: string; timestamp: number };
export type ActivityMessage = { type: typeof ACTIVITY_MESSAGE_TYPE; activity: ActivityEvent };
type ActivityListener = (event: ActivityEvent) => void;
const listeners = new Set<ActivityListener>();
export function emitActivity(event: Omit<ActivityEvent, "timestamp">): void { 
const activity={...event,timestamp:Date.now()}; 
listeners.forEach(listener=>listener(activity)); }
export function publishActivityToHost(hostTabId: number | undefined, event: Omit<ActivityEvent, "timestamp">): void { 
if(hostTabId===undefined)
return; 
const message:ActivityMessage={type:ACTIVITY_MESSAGE_TYPE,activity:{...event,timestamp:Date.now()}}; 
void chrome.tabs.sendMessage(hostTabId,message).catch(()=>undefined); }
export function receiveActivityMessage(message: unknown): boolean { 
if(!message||typeof message!=="object")
return false; 
const candidate=message as Partial<ActivityMessage>; 
if(candidate.type!==ACTIVITY_MESSAGE_TYPE||!candidate.activity)
return false; 
listeners.forEach(listener=>listener(candidate.activity!)); 
return true; }
export function subscribeActivity(listener: ActivityListener):()=>void { 
listeners.add(listener); 
return()=>listeners.delete(listener); }
