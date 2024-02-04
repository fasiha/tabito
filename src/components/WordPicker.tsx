import type { FunctionComponent } from "preact";
import type { Sense, Tag, Word, Xref } from "curtiz-japanese-nlp/interfaces";
import { prefixNumber } from "../utils/utils";

interface Props {
  word: Word;
  tags: Record<string, string>;
}

export const WordPicker: FunctionComponent<Props> = ({ word, tags }) => {
  return <>{displayWordLight(word, tags)}</>;
};

function printXrefs(v: Xref[]) {
  return v.map((x) => x.join(",")).join(";");
}
export function displayWordLight(w: Word, tags: Record<string, string>) {
  const kanji = w.kanji.map((k) => k.text).join("・");
  const kana = w.kana.map((k) => k.text).join("・");

  type TagKey = {
    [K in keyof Sense]: Sense[K] extends Tag[] ? K : never;
  }[keyof Sense];
  const tagFields: Partial<Record<TagKey, string>> = {
    dialect: "🗣",
    field: "🀄️",
    misc: "✋",
  };
  const s = w.sense
    .map(
      (sense, n) =>
        prefixNumber(n) +
        " " +
        sense.gloss.map((gloss) => gloss.text).join("/") +
        (sense.related.length ? ` (👉 ${printXrefs(sense.related)})` : "") +
        (sense.antonym.length ? ` (👈 ${printXrefs(sense.antonym)})` : "") +
        Object.entries(tagFields)
          .map(([k, v]) =>
            sense[k as TagKey].length
              ? ` (${v} ${sense[k as TagKey].map((k) => tags[k]).join("; ")})`
              : ""
          )
          .join("")
    )
    .join(" ");
  // console.error(related)
  return `${kanji}「${kana}」| ${s}`;
}
