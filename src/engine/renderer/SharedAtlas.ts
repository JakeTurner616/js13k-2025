// src/engine/renderer/SharedAtlas.ts

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
  anim: makeAtlas("./packed.png"),
  tile: makeAtlas("./map.png")
};

export const getAtlasImage = (k: "anim" | "tile") => atlases[k].img;
export const waitForAtlas = (k: "anim" | "tile") => atlases[k].load;
export const isAtlasReady = (k: "anim" | "tile") => atlases[k].ready;
