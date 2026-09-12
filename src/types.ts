export type LatLng = { lat:number; lon:number };
export type ImagePoint = { x:number; y:number };
export type ControlPoint = { image:ImagePoint; geo:LatLng };
export type Checkpoint = { id:string; number:string; geo:LatLng; image?:ImagePoint; kind:'checkpoint'|'base'; first?:boolean; last?:boolean };
export type RouteResult = { order:Checkpoint[]; geometry:LatLng[]; segments:number[]; totalDistance:number; engine:'Valhalla'|'OSRM'|'geometria'; warning?:string; generatedAt:number };
export type RouteVariant = { name:string; route:RouteResult };
export type Project = { id:string; name:string; createdAt:number; updatedAt:number; image?:string; imageWidth?:number; imageHeight?:number; controlPoints:ControlPoint[]; checkpoints:Checkpoint[]; base?:LatLng; includeBaseStart?:boolean; includeBaseEnd?:boolean; route?:RouteResult; routeVariants?:RouteVariant[]; selectedRouteVariant?:number; opacity:number; imageTransform:{x:number;y:number;scale:number;rotation:number} };
