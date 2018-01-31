declare module 'onoff' {
  export class Gpio {
    constructor(
      gpio: number,
      direction: Direction | 'high' | 'low',
      edge?: Edge,
      options?: { activeLow?: boolean },
    );

    public read(callback: PinStateCallback): void;

    public readSync(): PinState;

    public write(value: PinState, callback: (err: MaybeError) => void): void;

    public writeSync(value: PinState): void;

    public watch(callback: PinStateCallback): void;

    public unwatch(callback: PinStateCallback): void;

    public direction(): Direction;

    public setDirection(direction: Direction): void;

    public edge(): Edge;

    public setEdge(edge: Edge): void;

    public activeLow(): boolean;

    public setActiveLow(invert: boolean): void;

    public unexport(): void;
  }

  type Direction = 'in' | 'out';
  type Edge = 'none' | 'rising' | 'falling' | 'both';
  type PinState = 0 | 1;
  type MaybeError = Error | null;
  type PinStateCallback = (err: MaybeError, value: PinState) => void;
}
