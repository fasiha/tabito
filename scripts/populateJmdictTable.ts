/*

npx esbuild --external:better-sqlite3 --bundle scripts/populateJmdictTable.ts --format=esm --platform=node --outfile=scripts/populateJmdictTable.mjs && node scripts/populateJmdictTable.mjs

*/
import { db, addJmdict, getAllPlains, getSentence } from "../src/db";

// first delete all jmdicts
db.prepare("DELETE FROM jmdict").run();

const plains = getAllPlains();
for (const plain of plains) {
  const sentence = getSentence(plain);
  if (sentence && typeof sentence === "object") {
    const { vocab = [] } = sentence;
    for (const v of vocab) {
      addJmdict(v.entry);
    }
  }
}
