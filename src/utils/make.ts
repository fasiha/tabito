import type { Word } from "curtiz-japanese-nlp";
import type { VocabMemory } from "../interfaces/frontend";
import type { EbisuModel } from "../interfaces/ebisu";
import { initModel } from "../ebisu/split3";

interface MakeVocabMemoryArgs {
  word: Word;
  readingsSeen: string[];
  kanjiSeen?: string[];
  personalDefinition?: string;
  halflifeHours?: number;
}
export function makeVocabMemory({
  word,
  readingsSeen = [],
  kanjiSeen = [],
  personalDefinition,
  halflifeHours,
}: MakeVocabMemoryArgs): VocabMemory {
  const initKanji = kanjiSeen.length > 0 && word.kanji.length > 0;
  return {
    type: "vocab",
    wordId: word.id,
    readingsSeen,
    kanjiSeen,
    personalDefinition,
    models: {
      meaningToReading: makeEbisuSplit3(halflifeHours),
      readingToMeaning: makeEbisuSplit3(halflifeHours),
      readingMeaningToWritten: initKanji
        ? makeEbisuSplit3(halflifeHours)
        : undefined,
      writtenToReading: initKanji ? makeEbisuSplit3(halflifeHours) : undefined,
    },
  };
}

export function makeEbisuSplit3(halflifeHours = 24): EbisuModel {
  const init = initModel({
    alphaBeta: 1.25,
    halflifeHours,
    primaryWeight: 0.35,
    secondaryWeight: 0.35,
    secondaryScale: 5,
  });
  return { version: "3-split3", model: init, timestampMillis: Date.now() };
}
