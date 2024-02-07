import type { Word, v1ResSentence } from "curtiz-japanese-nlp/interfaces";
import { type Sentence as TabitoSentence } from "tabito-lib";
import type { Ichiran } from "../nlp-wrappers/ichiran-types";

export * as Tables from "./DbTablesV1";

export type FullRow<T> = {
  [k in keyof T]-?: NonNullable<T[k]>;
};
export type Selected<T> = FullRow<T> | undefined;
export type SelectedAll<T> = FullRow<T>[];

export interface Sentence extends TabitoSentence {
  translations?: Record<"en", string[]>; // add more target languages someday
  citation?: string;
  nlp: {
    curtiz: v1ResSentence;
    ichiran: Ichiran;
    /**
     * Extra JMdict entries for non-standard IDs that Ichiran might give us
     */
    words: Record<string, Word>;
  };
}
