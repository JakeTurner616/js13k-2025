export type InputState = {
  left: boolean;
  right: boolean;
  jump: boolean;
};

export type State = {
  enter?(player: any): void;
  update(player: any, input: InputState): void;
  exit?(player: any): void;
};
