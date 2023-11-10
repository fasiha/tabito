import { type Furigana } from "curtiz-japanese-nlp";

export function mergeFurigana(input: Furigana[]): Furigana[] {
  return input.reduce<Furigana[]>(
    (arr, curr) =>
      typeof curr === "string" && typeof arr[arr.length - 1] === "string"
        ? arr.slice(0, -1).concat(arr[arr.length - 1] + curr)
        : arr.concat(curr),
    []
  );
}
