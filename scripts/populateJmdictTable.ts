/*

npx esbuild --external:better-sqlite3 --bundle scripts/populateJmdictTable.ts --format=esm --platform=node --outfile=scripts/populateJmdictTable.mjs && node scripts/populateJmdictTable.mjs

*/
import { db, addJmdict, getAllPlains, getSentence } from "../src/db";

// first delete all jmdicts
await db.deleteFrom("jmdict").execute();

const plains = await getAllPlains();
for (const plain of plains) {
  const sentence = await getSentence(plain);
  if (sentence && typeof sentence === "object") {
    const { vocab = [] } = sentence;
    for (const v of vocab) {
      addJmdict(v.entry);
    }
  }
}
