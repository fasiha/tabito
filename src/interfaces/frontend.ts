import type { Word } from "curtiz-japanese-nlp";
import type { EbisuModel } from "./ebisu";

export interface VocabMemory {
  type: "vocab";
  word: Word;
  readings: string[];
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
  models: {
    meaningToSentence: EbisuModel;
  };
}
