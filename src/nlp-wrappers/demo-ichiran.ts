// npx esbuild --bundle demo-ichiran.ts --format=esm --platform=node --outfile=demo-ichiran.mjs && node demo-ichiran.mjs

import { rawToIchiran, getRootJmdictSeqs } from "./ichiran";
const ichiran = await rawToIchiran("京都でたくさん写真を撮りました");
console.log(ichiran);
console.log(await getRootJmdictSeqs(ichiran.jmdictSeqs));
// console.log(await getRootJmdictSeqs([10132248, 10149587, -123]));
