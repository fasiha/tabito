import type { Word } from "curtiz-japanese-nlp";
import type { VocabMemory } from "../interfaces/frontend";
import type { EbisuModel } from "../interfaces/ebisu";
import { initModel, modelToPercentileDecay } from "../ebisu/split3";

export function makeVocabMemory(
  word: Word,
  readingsSeen: string[] = [],
  kanjiSeen: string[] = [],
  personalDefinition?: string
): VocabMemory {
  const initKanji = kanjiSeen.length > 0 && word.kanji.length > 0;
  return {
    type: "vocab",
    wordId: word.id,
    readingsSeen,
    kanjiSeen,
    personalDefinition,
    models: {
      meaningToReading: makeEbisuSplit3(),
      readingToMeaning: makeEbisuSplit3(),
      readingMeaningToWritten: initKanji ? makeEbisuSplit3() : undefined,
      writtenToReading: initKanji ? makeEbisuSplit3() : undefined,
    },
  };
}

export function makeEbisuSplit3(): EbisuModel {
  const init = initModel({
    alphaBeta: 1.25,
    halflifeHours: 24,
    primaryWeight: 0.35,
    secondaryWeight: 0.35,
    secondaryScale: 5,
  });
  return { version: "3-split3", model: init, timestampMillis: Date.now() };
}
