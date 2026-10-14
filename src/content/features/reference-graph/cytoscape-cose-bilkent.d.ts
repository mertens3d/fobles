// cytoscape-cose-bilkent ships no TypeScript types of its own, and none exist on DefinitelyTyped
// (unlike cytoscape-dagre/cytoscape-fcose) - this just fills that gap with the same loose shape
// every other cytoscape layout extension uses (a plain cytoscape.Ext registration function).
declare module "cytoscape-cose-bilkent" {
  import type cytoscape from "cytoscape";
  const register: cytoscape.Ext;
  export = register;
}
