import type { SenseAndSub } from "../components/commonInterfaces";

export function isSubAndSense(x: SenseAndSub): x is SenseAndSub {
  return (
    x &&
    typeof x === "object" &&
    typeof x.sense === "number" &&
    (x.subsense === undefined || typeof x.subsense === "number")
  );
}
