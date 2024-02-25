import type { Word } from "curtiz-japanese-nlp";
import type { EbisuModel } from "./ebisu";

export interface VocabMemory {
  type: "vocab";
  wordId: Word["id"];
  readingsSeen: string[];
  kanjiSeen: string[];
  personalDefinition?: string;
  models: {
    meaningToReading: EbisuModel;
    readingToMeaning: EbisuModel;
    readingMeaningToWritten?: EbisuModel;
    writtenToReading?: EbisuModel;
  };
}

export interface SentenceMemory {
  type: "sentence";
  plain: string;
  personalTranslations?: string[];
  relatedWordIds: Word["id"][];
  models: {
    meaningToSentence: EbisuModel;
  };
}

export type MemoryType = VocabMemory["type"] | SentenceMemory["type"];
export type MemoryKey = VocabMemory["wordId"] | SentenceMemory["plain"];
