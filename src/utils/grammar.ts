import type { ConjugatedPhrase } from "curtiz-japanese-nlp";

import type { GrammarConj } from "../interfaces/backend";

import { deconjEqual, grammarConjEqual } from "./equality";
import { findClozeIdx } from "./utils";

export const selectedGrammarConjsNotFromCurtiz = (
  plain: string,
  fromCurtiz: ConjugatedPhrase[],
  selectedConj: GrammarConj[],
): GrammarConj[] => {
  // This is a pain because the Curtiz deconjugations are different format from the ones saved here
  // and we have to convert them.
  const curtizDeconjToGrammarConj = (conjugated: ConjugatedPhrase): Omit<GrammarConj, "deconj"> => {
    const { cloze, lemmas } = conjugated;
    const start = findClozeIdx(plain, cloze);
    const len = cloze.cloze.length;
    return { start, len, lemmas };
  };
  // then we have to find which if any of our saved conjugations are NOT
  // from Curtiz
  const curtizGrammarConjs = fromCurtiz.map(curtizDeconjToGrammarConj).filter((x) => !!x);

  const res = selectedConj.filter(
    (selected) =>
      !curtizGrammarConjs.some(
        (curt, ci) =>
          grammarConjEqualIgnoreDeconj(curt, selected) &&
          fromCurtiz[ci].deconj.some((d) => deconjEqual(d, selected.deconj)),
      ),
  );
  if (res.length) {
    console.log({ res, curtizGrammarConjs, selectedConj });
  }
  return res;
};

const grammarConjEqualIgnoreDeconj = (fromCurtiz: Omit<GrammarConj, "deconj">, selected: GrammarConj): boolean =>
  grammarConjEqual({ ...fromCurtiz, deconj: selected.deconj }, selected);
// copy the same deconj
