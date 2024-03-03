import type { Furigana, Word, Xref } from "curtiz-japanese-nlp";
import type { SenseAndSub } from "../components/commonInterfaces";

export function furiganaToPlain(furigana: Furigana[]): string {
  return furigana.map((s) => (typeof s === "string" ? s : s.ruby)).join("");
}
export function furiganaToReading(furigana: Furigana[]): string {
  return furigana.map((s) => (typeof s === "string" ? s : s.rt)).join("");
}

/**
 * Does NOT split string or Ruby
 */
export function furiganaSlice(
  furigana: Furigana[],
  start: number,
  len: number
): Furigana[] {
  const mapping: (Furigana | undefined)[] = [];
  for (const f of furigana) {
    mapping.push(f);
    const extra = Math.max(
      0,
      (typeof f === "string" ? f.length : f.ruby.length) - 1
    );
    for (let i = 0; i < extra; i++) {
      mapping.push(undefined);
    }
  }
  const subset = mapping
    .slice(start, start + len)
    .filter((f): f is Furigana => !!f);

  const expectedPlain = furiganaToPlain(furigana).slice(start, start + len);
  const subsetPlain = furiganaToPlain(subset);
  if (expectedPlain !== subsetPlain) {
    throw new Error("unable to split furigana");
  }
  return subset;
}

if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;
  const orig = [
    "aa", // 0-1
    { ruby: "bc", rt: "BC!" }, // 2-3
    "d", // 4
    "e", // 5
    { ruby: "f", rt: "FFF" }, // 6
    { ruby: "gg", rt: "G" }, // 7-8
  ];

  describe("furiganaSlice", () => {
    it("works for the happy case", () => {
      expect(furiganaToPlain(furiganaSlice(orig, 0, 4))).toEqual("aabc");
      expect(furiganaToPlain(furiganaSlice(orig, 2, 2))).toEqual("bc");
    });
    it("throws if you try to split", () => {
      expect(() => furiganaToPlain(furiganaSlice(orig, 0, 1))).toThrow();
      expect(() => furiganaToPlain(furiganaSlice(orig, 1, 1))).toThrow();
      expect(() => furiganaToPlain(furiganaSlice(orig, 1, 2))).toThrow();

      expect(() => furiganaToPlain(furiganaSlice(orig, 2, 1))).toThrow();
      expect(() => furiganaToPlain(furiganaSlice(orig, 3, 2))).toThrow();

      expect(() => furiganaToPlain(furiganaSlice(orig, 6, 2))).toThrow();
    });
    it("returns originally-split strings", () => {
      expect(furiganaSlice(orig, 0, 2)).toEqual(orig.slice(0, 1));
      expect(furiganaSlice(orig, 0, 4)).toEqual(orig.slice(0, 2));
      expect(furiganaSlice(orig, 4, 1)).toEqual(["d"]);
      expect(furiganaSlice(orig, 4, 2)).toEqual(["d", "e"]);
    });
  });
}

export function compressFurigana(input: Furigana[]): Furigana[] {
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

/**
 * More efficient than `Object.keys(obj).length === 0`
 */
export function objectIsEmpty(obj: Record<string, unknown>): boolean {
  for (const _ in obj) return false;
  return true;
}

export function senseSeenClass(
  senseIdx: number,
  senses?: SenseAndSub[]
): string | undefined {
  return senses?.find(
    ({ sense, subsense }) => sense === senseIdx && subsense === undefined
  )
    ? "already-picked"
    : undefined;
}

export function subsenseSeenClass(
  senseIdx: number,
  subsenseIdx: number,
  senses?: SenseAndSub[]
): string | undefined {
  return senses?.find(
    ({ sense, subsense }) => sense === senseIdx && subsense === subsenseIdx
  )
    ? "already-picked"
    : undefined;
}

function furiganaIdxToPlain(
  furigana: Furigana[][],
  startIdx: number = 0,
  endIdx: undefined | number = undefined
): string {
  return furigana
    .slice(startIdx, endIdx)
    .flat()
    .map((o) => (typeof o === "string" ? o : o.ruby))
    .join("");
}
