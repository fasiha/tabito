import Dexie from "dexie";
import type { SentenceMemory, VocabMemory } from "../interfaces/frontend";
import type { Quiz } from "../interfaces/quiz";

type VocabMemoryKey = VocabMemory["wordId"];
type SentenceMemoryKey = SentenceMemory["plain"];

class TabitoDb extends Dexie {
  vocab!: Dexie.Table<VocabMemory, VocabMemoryKey>;
  sentence!: Dexie.Table<SentenceMemory, SentenceMemoryKey>;
  quiz!: Dexie.Table<Quiz, number>;

  constructor() {
    super("TabitoDb");
    this.version(1).stores({
      vocab: "wordId",
      sentence: "plain",
      quiz: "++id",
    });
  }
}

export const db = new TabitoDb();
