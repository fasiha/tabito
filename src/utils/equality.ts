import type { AdjDeconjugated, Deconjugated } from "kamiya-codec";
import type { GrammarConj, Vocab } from "../interfaces";
import type { Furigana } from "curtiz-japanese-nlp";

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
    furiganaEqual(a.lemmas, b.lemmas)
  );
}

export function vocabEqual(a: Vocab, b: Vocab): boolean {
  return (
    a.start === b.start &&
    a.len === b.len &&
    a.entry.id === b.entry.id &&
    a.sense === b.sense &&
    a.subsense === b.subsense
  );
  // I don't love how the type system won't detect that I"m
  // checking all keys here if this object ever gets more keys
  // :(
}
