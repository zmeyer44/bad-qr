export type Level = "L" | "M" | "Q" | "H";

/**
 * "hidden" = text + end marker, then free filler bits (ignored by readers)
 * "fragment" = text + "#", then a numeric segment of free digits (fully standard)
 * "standard" = ordinary QR padding (no freedom; for comparison/tests)
 */
export type Mode = "hidden" | "fragment" | "standard";

export type Phase = "start" | "tune" | "pairs" | "triples" | "done";

export interface Snapshot {
  phase: Phase;
  progress: number;
  /** n × n modules, row-major, 1 = dark */
  matrix: Uint8Array;
  n: number;
  mask: number;
  painted: number;
  decoded: string;
  freeBits: number;
  v: number;
  lvl: Level;
  margin: number;
  /** true when the search aimed for light modules */
  light: boolean;
}

export interface OptimizeOptions {
  text: string;
  v: number;
  lvl: Level;
  mode: Mode;
  /** share of each block's repair capacity spent on painted codewords, 0..1 */
  budget?: number;
  seed?: number;
  tripleMs?: number;
  mask?: number;
  /** aim for as little ink as possible instead of as much */
  light?: boolean;
}

export interface Block {
  k: number;
  e: number;
}

declare const QRCore: {
  optimize(opts: OptimizeOptions, now?: () => number): Generator<Snapshot, Snapshot, void>;
  minVersion(text: string, lvl: Level, mode: Mode): number;
  fits(text: string, v: number, lvl: Level, mode: Mode): boolean;
  standard(text: string, v: number, lvl: Level, mask: number): Uint8Array;
  dataCapacity(v: number, lvl: Level): number;
  blocksOf(v: number, lvl: Level): Block[];
  correctable(v: number, lvl: Level, e: number): number;
  plan(text: string, v: number, lvl: Level, mode: Mode): unknown;
  setTables(t: unknown): void;
};

export default QRCore;
