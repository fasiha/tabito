import type {
  Furigana,
  Word,
  v1ResSentence,
} from "curtiz-japanese-nlp/interfaces";
import { type Sentence as TabitoSentence } from "tabito-lib";
import type { Ichiran } from "../nlp-wrappers/ichiran-types";
import type { AdjDeconjugated, Deconjugated } from "kamiya-codec";
import type { SenseAndSub } from "../components/commonInterfaces";

export * as Tables from "./DbTablesV1";

export type FullRow<T> = {
  [k in keyof T]-?: NonNullable<T[k]>;
};
export type Selected<T> = FullRow<T> | undefined;
export type SelectedAll<T> = FullRow<T>[];

export interface Vocab {
  /** character index */
  start: number;
  /** number of characters */
  len: number;

  entry: Word;
  senses: SenseAndSub[];

  tags: Record<string, string>;
}

export interface GrammarConj {
  /** character index */
  start: number;
  /** number of characters */
  len: number;

  lemmas: Furigana[][];
  deconj: AdjDeconjugated | Deconjugated;
}

export type Bunsetsu = { idx: number; parent: number; numMorphemes: number };

export interface Sentence extends TabitoSentence {
  translations?: Record<"en", string[]>; // add more target languages someday
  citation?: string;
  vocab?: Vocab[];
  grammarConj?: GrammarConj[];
  nlp: {
    curtiz: v1ResSentence;
    ichiran: Ichiran;
    /**
     * Extra JMdict entries for non-standard IDs that Ichiran might give us
     */
    words: Record<string, Word>;
  };
}

export const ALLOWED_WORDID_CONNECTION_TYPES = [
  "equivalent",
  "confuser",
  "related",
] as const;
export type WordIdConnType = (typeof ALLOWED_WORDID_CONNECTION_TYPES)[number];

export const ALLOWED_PARENT_CHILD_TYPES = ["includes"] as const;
export type ParentChildType = (typeof ALLOWED_PARENT_CHILD_TYPES)[number];

export type WithoutNlp<T> = Omit<T, "nlp">;
