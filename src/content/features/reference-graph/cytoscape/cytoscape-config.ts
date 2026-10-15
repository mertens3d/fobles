// @source-path [fobles] src/content/features/reference-graph/cytoscape/cytoscape-config.ts

import cytoscapeDagre from "cytoscape-dagre";
import cytoscapeCoseBilkent from "cytoscape-cose-bilkent";
import cytoscapeFcose from "cytoscape-fcose";
import cytoscape from "cytoscape";

cytoscape.use(cytoscapeDagre);
cytoscape.use(cytoscapeCoseBilkent);
cytoscape.use(cytoscapeFcose);

// The one authoritative Cytoscape setup module - extension registration above always runs
// (module-evaluation order) before any importer below can call this to create a core, so
// dagre/cose-bilkent/fcose are guaranteed registered before any layout can request them.
// Nothing outside this file may import "cytoscape" for its default export - only for types.
export { cytoscape as cytoscapeFactory };
