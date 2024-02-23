import * as ebisu from "ebisu-js";
// import { fmin } from "./fmin";
import fmin from "minimize-golden-section-1d";

import { type Model } from "ebisu-js/interfaces";

const HOURS_PER_YEAR = 24 * 365.25;

function betaPowerlawPredictRecall(model: Model, elapsed: number): number {
  const t = model[2];
  const delta = elapsed / t;
  const l = Math.log2(1 + delta);
  return ebisu.predictRecall(model, l * t, true);
}

export type SubModel = [number, Model];
export type Split3Model = [SubModel, SubModel, SubModel];

export interface InitModel {
  alphaBeta: number;
  halflifeHours: number;
  primaryWeight: number;
  secondaryWeight: number;
  secondaryScale: number;
}
export function initModel({
  alphaBeta = 1.25,
  halflifeHours = 24,
  primaryWeight: w1 = 0.35,
  secondaryWeight: w2 = 0.35,
  secondaryScale: scale2 = 5,
}: Partial<InitModel> = {}): Split3Model {
  if (!(0 < w1 && w1 < 1 && 0 < w2 && w2 < 1 && w1 + w2 < 1)) {
    throw new Error("unable to achieve requested weights");
  }
  const ws = [w1, w2, 1 - w1 - w2];
  return [
    [ws[0], [alphaBeta, alphaBeta, halflifeHours]],
    [ws[1], [alphaBeta, alphaBeta, halflifeHours * scale2]],
    [ws[2], [alphaBeta, alphaBeta, HOURS_PER_YEAR]],
  ];
}

export function predictRecall(
  [primary, strength, longterm]: Split3Model,
  elapsed: number
): number {
  return (
    primary[0] * ebisu.predictRecall(primary[1], elapsed, true) +
    strength[0] * ebisu.predictRecall(strength[1], elapsed, true) +
    longterm[0] * betaPowerlawPredictRecall(longterm[1], elapsed)
  );
}

export function updateRecall(
  [primary, strength, longterm]: Split3Model,
  successes: number,
  total: number,
  elapsed: number,
  q0?: number
): Split3Model {
  const scale2 = strength[1][2] / primary[1][2];
  const newPrimary = ebisu.updateRecall(
    primary[1],
    successes,
    total,
    elapsed,
    q0
  );
  const newStrength: Model = [
    strength[1][0],
    strength[1][1],
    newPrimary[2] * scale2,
  ];
  return [[primary[0], newPrimary], [strength[0], newStrength], longterm];
}

export function modelToPercentileDecay(
  model: Split3Model,
  percentile = 0.5,
  tolerance = 1e-4
): number {
  const status = {};
  const solution = fmin(
    (x) => Math.abs(percentile - predictRecall(model, x)),
    { lowerBound: 0, tolerance },
    status
  );
  if (!("converged" in status) || !status.converged) {
    throw new Error("failed to converge");
  }
  return solution;
}
