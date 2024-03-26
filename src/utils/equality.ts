import type { AdjDeconjugated, Deconjugated } from "kamiya-codec";
import type { GrammarConj, Vocab } from "../interfaces/backend";
import type { Furigana } from "curtiz-japanese-nlp";
import type { SenseAndSub } from "../components/commonInterfaces";

export function deconjEqual(
  a: AdjDeconjugated | Deconjugated,
  b: AdjDeconjugated | Deconjugated
): boolean {
  if ("auxiliaries" in a) {
    if (!("auxiliaries" in b)) return false;
    return (
      a.conjugation === b.conjugation &&
      a.auxiliaries.every((x, i) => x === b.auxiliaries[i]) &&
      a.result.every((x, i) => x === b.result[i])
    );
  }

  if ("auxiliaries" in b) return false;
  return (
    a.conjugation === b.conjugation &&
    a.result.every((x, i) => x === b.result[i])
  );
}

export function furiganaEqual(arr: Furigana[], bar: Furigana[]): boolean {
  return arr.every((x, i) => {
    const y = bar[i];
    if (typeof x === "string") return x === y;
    return typeof y !== "string" && x.rt === y.rt && x.ruby === y.ruby;
  });
}

export function grammarConjEqual(a: GrammarConj, b: GrammarConj): boolean {
  return (
    a.start === b.start &&
    a.len === b.len &&
    deconjEqual(a.deconj, b.deconj) &&
    a.lemmas.length === b.lemmas.length &&
    a.lemmas.every((x, i) => furiganaEqual(x, b.lemmas[i]))
  );
}

export function vocabEqual(a: Vocab, b: Vocab): boolean {
  return a.start === b.start && a.len === b.len && a.entry.id === b.entry.id;
}

export function senseAndSubEqual(a: SenseAndSub, b: SenseAndSub): boolean {
  return a.sense === b.sense && a.subsense === b.subsense;
}
