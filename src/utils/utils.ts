import type { Furigana } from "curtiz-japanese-nlp";

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

export function join<T, U>(arr: T[], sep: U): (T | U)[] {
  return arr.flatMap((x) => [x, sep]).slice(0, -1);
}
