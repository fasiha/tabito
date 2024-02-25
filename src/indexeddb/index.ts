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
    const vocabKeys: (keyof VocabMemory)[] = ["wordId"];
    const sentenceKeys: (keyof SentenceMemory)[] = ["plain", "relatedWordIds"];
    const quizKeys: (keyof Quiz)[] = ["type", "memoryKey", "style"];
    this.version(1).stores({
      vocab: `${vocabKeys[0]}`,
      sentence: `${sentenceKeys[0]}, *${sentenceKeys[1]}`,
      quiz: `++id, ${quizKeys[0]}, ${quizKeys[1]}, ${quizKeys[2]}`,
    });
  }
}

export const db = new TabitoDb();
