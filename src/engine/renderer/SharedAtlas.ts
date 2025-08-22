// src/engine/renderer/SharedAtlas.ts
import { packedBase64 } from "../../assets/img/embedded";

function makeAtlas(src: string) {
  const image = new Image();
  let ready = false;
  const load = new Promise<void>(res => {
    image.onload = () => { ready = true; res(); };
  });
  image.src = src;
  return { image, get ready(){ return ready; }, load };
}

const atlases = {
  anim: makeAtlas(packedBase64),
} as const;

export type AtlasKey = keyof typeof atlases; // "anim"

export const getAtlasImage = (key: AtlasKey) => atlases[key].image;
export const waitForAtlas  = (key: AtlasKey) => atlases[key].load;
export const isAtlasReady  = (key: AtlasKey) => atlases[key].ready;
