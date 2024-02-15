import type { Word } from "curtiz-japanese-nlp";
import type { EbisuUpdate } from "./ebisu";
import type { SentenceMemory, VocabMemory } from "./frontend";

interface BaseQuiz {
  style: "multipleChoice" | "typed" | "strokes";
  data: unknown; // alternatives, timings, edit history, etc.
  update: EbisuUpdate;
}

export interface VocabQuiz extends BaseQuiz {
  type: "vocab";
  wordId: Word["id"];
  direction: keyof VocabMemory["models"];
  style: "multipleChoice" | "typed" | "strokes";
}

export interface SentenceQuiz extends BaseQuiz {
  type: "sentence";
  plain: string;
  direction: keyof SentenceMemory["models"];
  style: "typed";
}
