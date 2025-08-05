// src/engine/renderer/SharedAtlas.ts

import { packedBase64, mapBase64 } from "../../assets/img/embedded";

type Atlas = {
  img: HTMLImageElement;
  ready: boolean;
  load: Promise<void>;
};

function makeAtlas(src: string): Atlas {
  const img = new Image();
  const atlas: Atlas = {
    img,
    ready: false,
    load: new Promise<void>(res => {
      img.onload = () => {
        atlas.ready = true;
        res();
      };
    })
  };
  img.src = src;
  return atlas;
}

const atlases = {
  anim: makeAtlas(packedBase64),
  tile: makeAtlas(mapBase64)
};

export const getAtlasImage = (k: "anim" | "tile") => atlases[k].img;
export const waitForAtlas = (k: "anim" | "tile") => atlases[k].load;
export const isAtlasReady = (k: "anim" | "tile") => atlases[k].ready;
