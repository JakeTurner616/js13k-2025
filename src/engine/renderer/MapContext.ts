export type GameMap={width:number;height:number;tiles:Uint32Array};
let $:GameMap|null=null;
export const setCurrentMap=(m:GameMap)=>($=m);
export const getCurrentMap=()=>$;
