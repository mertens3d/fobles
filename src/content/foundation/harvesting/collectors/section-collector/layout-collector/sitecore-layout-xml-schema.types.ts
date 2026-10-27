export type SitecoreLayoutXml = {
    r: {
        d: SitecoreDeviceXml[];
    };
};
export type SitecoreDeviceXml = {
    id: string;
    l?: string;
    r?: SitecoreRenderingXml[];
};
export type RenderingAttributeName = "id" | "ds" | "ph" | "par";
// AI NOTE: The shared "Renderings" field writes plain attributes (id, ds, ph, par). The "Final renderings" delta writes the same
// AI NOTE: four with an "s:" namespace prefix. Read them through readRenderingAttribute, never by key, or one of the two formats is lost.
export type SitecoreRenderingXml = {
    uid?: string;
    id?: string;
    ds?: string;
    ph?: string;
    par?: string;
    "s:id"?: string;
    "s:ds"?: string;
    "s:ph"?: string;
    "s:par"?: string;
    "p:before"?: string;
    "p:after"?: string;
};
