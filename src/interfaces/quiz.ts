import type { Word } from "curtiz-japanese-nlp";
import type { EbisuUpdate } from "./ebisu";
import type {
  MemoryKey,
  MemoryType,
  SentenceMemory,
  VocabMemory,
} from "./frontend";

interface BaseQuiz {
  timestampMillis: number;
  type: MemoryType;
  memoryKey: MemoryKey;
  style: "_learn" | "_rescale" | "multipleChoice" | "typed" | "strokes";
  data: unknown; // alternatives, timings, edit history, etc.
  update: EbisuUpdate;
}

export interface VocabQuiz extends BaseQuiz {
  type: "vocab";
  wordId: Word["id"];
  direction: keyof VocabMemory["models"];
  style: "_learn" | "_rescale" | "multipleChoice" | "typed" | "strokes";
}

export interface SentenceQuiz extends BaseQuiz {
  type: "sentence";
  plain: string;
  direction: keyof SentenceMemory["models"];
  style: "_learn" | "_rescale" | "typed";
}

export type Quiz = VocabQuiz | SentenceQuiz;
