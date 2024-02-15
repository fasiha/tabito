export const ALLOWED_EBISU_VERSIONS = [
  "2",
  "3rc-ensemble",
  "3-betapowerlaw",
  "3-split3",
] as const;
export type EbisuVersion = (typeof ALLOWED_EBISU_VERSIONS)[number];

export interface EbisuModel {
  version: EbisuVersion;
  model: unknown;
  buried?: boolean; // i.e., skip?
  timestampMillis: number; // Unix millis
}

export interface EbisuUpdate {
  successes: number;
  total: number;
  q0?: number;
  rescale?: number;
}
