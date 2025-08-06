// src/engine/renderer/SharedAtlas.ts
import { packedBase64, mapBase64 } from "../../assets/img/embedded";

function makeAtlas(src: string) {
  const image = new Image();
  let ready = false;
  const load = new Promise<void>(res => {
    image.onload = () => {
      ready = true;
      res();
    };
  });
  image.src = src;
  return {
    image,
    get ready() { return ready },
    load
  };
}

const atlases = {
  anim: makeAtlas(packedBase64),
  tile: makeAtlas(mapBase64)
};

export const getAtlasImage = (key: "anim" | "tile") => atlases[key].image;
export const waitForAtlas = (key: "anim" | "tile") => atlases[key].load;
export const isAtlasReady = (key: "anim" | "tile") => atlases[key].ready;
