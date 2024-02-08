import type { Furigana } from "curtiz-japanese-nlp";
import type { Vocab } from "../interfaces";

export function mergeFurigana(input: Furigana[]): Furigana[] {
  return input.reduce<Furigana[]>(
    (arr, curr) =>
      typeof curr === "string" && typeof arr[arr.length - 1] === "string"
        ? arr.slice(0, -1).concat(arr[arr.length - 1] + curr)
        : arr.concat(curr),
    []
  );
}

const circledNumbers =
  "①②③④⑤⑥⑦⑧⑨⑩⑪⑫⑬⑭⑮⑯⑰⑱⑲⑳㉑㉒㉓㉔㉕㉖㉗㉘㉙㉚㉛㉜㉝㉞㉟㊱㊲㊳㊴㊵㊶㊷㊸㊹㊺㊻㊼㊽㊾㊿".split(
    ""
  );
export const prefixNumber = (n: number) => circledNumbers[n] || `(${n + 1})`;

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
