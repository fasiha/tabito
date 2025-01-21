import type { ConjugatedPhrase, ContextCloze } from "curtiz-japanese-nlp";

import type { GrammarConj } from "../interfaces/backend";

import { grammarConjEqual } from "./equality";
import { findClozeIdx } from "./utils";

export const selectedGrammarConjsNotFromCurtiz = (
  plain: string,
  fromCurtiz: ConjugatedPhrase[],
  selectedConj: GrammarConj[],
): GrammarConj[] => {
  // This is a pain because the Curtiz deconjugations are different format from the ones saved here
  // and we have to convert them.
  const curtizDeconjToGrammarConj = (conjugated: ConjugatedPhrase): GrammarConj | undefined => {
    const { deconj, cloze, lemmas } = conjugated;
    if (deconj.length !== 1) {
      return undefined;
    }
    const start = findClozeIdx(plain, cloze);
    const len = cloze.cloze.length;
    return { start, len, deconj: deconj[0], lemmas };
  };
  // then we have to find which if any of our saved conjugations are NOT
  // from Curtiz
  const curtizGrammarConjs = fromCurtiz.map(curtizDeconjToGrammarConj).filter((x) => !!x);

  return selectedConj.filter((selected) => !curtizGrammarConjs.some((auto) => grammarConjEqual(auto, selected)));
};
