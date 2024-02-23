declare module 'blinkt-kit' {
  interface BlinktOptions {
    clearOnExit?: boolean;
  }

  interface PixelOptions {
    pixel?: number;
    r?: number;
    g?: number;
    b?: number;
    brightness?: number;
  }

  export class Blinkt {
    constructor(options?: BlinktOptions);
    setPixel(options: PixelOptions): void;
    setAll(options: PixelOptions): void;
    clear(): void;
    show(): void;
  }
}
