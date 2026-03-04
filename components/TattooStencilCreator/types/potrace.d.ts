declare module 'potrace' {
  interface PotraceOptions {
    /** Colour threshold (0-255, default 128). */
    threshold?: number;
    /** Suppress speckles up to this size (default 2). */
    turdSize?: number;
    /** Turn-policy for path decomposition. */
    turnPolicy?: string;
    /** Corner-threshold parameter (default 1). */
    alphaMax?: number;
    /** Enable curve optimisation (default true). */
    optCurve?: boolean;
    /** Curve-optimisation tolerance (default 0.2). */
    optTolerance?: number;
    /** Background colour (CSS value). */
    background?: string;
    /** Foreground colour (CSS value). */
    color?: string;
  }

  type TraceCallback = (err: Error | null, svg: string) => void;

  export function trace(
    image: Buffer | string,
    options: PotraceOptions,
    callback: TraceCallback,
  ): void;

  export function trace(
    image: Buffer | string,
    callback: TraceCallback,
  ): void;

  export function posterize(
    image: Buffer | string,
    options: PotraceOptions,
    callback: TraceCallback,
  ): void;

  export function posterize(
    image: Buffer | string,
    callback: TraceCallback,
  ): void;
}
