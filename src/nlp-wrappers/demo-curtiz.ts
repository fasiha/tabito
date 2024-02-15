// npx esbuild --bundle demo-curtiz.ts --format=esm --platform=node --outfile=demo-curtiz.mjs && node demo-curtiz.mjs

import { analyzeString } from "./curtiz";
const res = await analyzeString("うどんが好き");
console.log(
  typeof res === "string" ? res : res.hits[0].results[0].results[0].tags
);
