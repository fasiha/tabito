// minimize-golden-section-1d.d.ts
declare module "minimize-golden-section-1d" {
  export interface Options {
    tolerance: number;
    lowerBound: number;
    upperBound: number;
    maxIterations: number;
    guess: number;
    initialIncrement: number;
  }

  export interface Status {
    converged: boolean;
    iterations: number;
    minimum: number;
    argmin: number;
  }

  export default function minimize(
    objective: (x: number) => number,
    options?: Partial<Options>,
    status?: {} | Status
  ): number;
}
