import type { Furigana, Word, Xref } from "curtiz-japanese-nlp";

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

/**
 * Interleaves a separator between array elements
 */
export function join<T, U>(arr: T[], sep: U): (T | U)[] {
  const ret: (T | U)[] = [];
  for (const x of arr) {
    ret.push(x, sep);
  }
  return ret.slice(0, -1);
}

export function extractTags(
  word: Word,
  tags: Record<string, string>
): Record<string, string> {
  const relevant: typeof tags = {};
  const keys = ["partOfSpeech", "field", "misc", "dialect"] as const;
  for (const sense of word.sense) {
    for (const key of keys) {
      for (const tag of sense[key]) {
        relevant[tag] = tags[tag];
      }
    }
  }
  return relevant;
}

export function printXrefs(v: Xref[]) {
  return v.map((x) => x.join(",")).join(";");
}
