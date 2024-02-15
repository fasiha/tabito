import type { Vocab, GrammarConj } from "../interfaces/backend";

export interface VocabGrammarProps {
  vocab?: Vocab;
  grammar?: GrammarConj;
}

export interface SenseAndSub {
  sense: number;
  subsense?: number;
}
