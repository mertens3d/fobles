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

export type SitecoreRenderingXml = {
    uid?: string;
    "s:id"?: string;
    "s:ds"?: string;
    "s:ph"?: string;
    "s:par"?: string;
    "p:before"?: string;
    "p:after"?: string;
};