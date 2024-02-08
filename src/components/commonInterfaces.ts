import type { Vocab, GrammarConj } from "../interfaces";

export interface VocabGrammarProps {
  vocab?: Vocab;
  grammar?: GrammarConj;
}

export interface SenseAndSub {
  sense: number;
  subsense?: number;
}
