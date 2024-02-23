/** @jsxImportSource solid-js */
import type { Component } from "solid-js";
import type { Sense, Word } from "curtiz-japanese-nlp/interfaces";
import type { SenseAndSub } from "../commonInterfaces";
import { prefixNumber, printXrefs } from "../../utils/utils";
import { db } from "../../indexeddb";
import { createDexieSignalQuery } from "../../indexeddb/solid-dexie";
import { makeVocabMemory } from "../../utils/make";

interface Props {
  word: Word;
  tags: Record<string, string>;
  alreadyPicked: SenseAndSub[];
}

export const WordPicked: Component<Props> = ({ word, tags, alreadyPicked }) => {
  alreadyPicked
    .slice()
    .sort(
      (a, b) =>
        a.sense - b.sense ||
        (a.subsense !== undefined && b.subsense !== undefined
          ? a.subsense - b.subsense
          : 0)
    );
  const memory = createDexieSignalQuery(() => db.vocab.get(word.id));
  const handleToggleLearn = () => {
    if (memory()) {
      db.vocab.delete(word.id);
    } else {
      db.vocab
        .put(makeVocabMemory(word), word.id)
        .then((res) => console.log("Put in Dexie", res));
    }
  };
  return (
    <>
      <button onClick={handleToggleLearn}>
        {memory() ? "Unlearn" : "Learn!"}
      </button>
      {word.kanji.map((k) => k.text).join("・")}「
      {word.kana.map((k) => k.text).join("・")}」{" "}
      {word.sense.map((sense, n) => {
        const wholeSensePicked = alreadyPicked.find(
          (a) => a.sense === n && a.subsense === undefined
        );
        if (wholeSensePicked) {
          return (
            <>
              {prefixNumber(n)}
              {sense.gloss.map((g, gi) => (
                <>
                  <sup>{prefixNumber(gi)}</sup> {g.text}{" "}
                </>
              ))}
              <sub>
                <Related sense={sense} /> <Antonym sense={sense} />{" "}
                <Tags sense={sense} tags={tags} />
              </sub>{" "}
            </>
          );
        }

        const subsensesPicked = alreadyPicked
          .filter(
            (a): a is Required<typeof a> =>
              a.sense === n && a.subsense !== undefined
          )
          .sort((a, b) => a.subsense - b.subsense);
        if (subsensesPicked.length) {
          return (
            <>
              {prefixNumber(n)}
              {subsensesPicked.map(({ subsense }) => (
                <>
                  <sup>{prefixNumber(subsense)}</sup>{" "}
                  {sense.gloss[subsense].text}{" "}
                </>
              ))}
              <sub>
                <Related sense={sense} /> <Antonym sense={sense} />{" "}
                <Tags sense={sense} tags={tags} />
              </sub>{" "}
            </>
          );
        }
      })}
    </>
  );
};

export const Tags: Component<{
  sense: Sense;
  tags: Record<string, string>;
}> = ({ sense, tags }) => {
  const make = (key: keyof typeof tagFields) =>
    sense[key].length > 0 ? (
      <span title={sense[key].map((d) => tags[d]).join("; ")}>
        {tagFields[key]}
      </span>
    ) : null;

  const partOfSpeech = make("partOfSpeech");
  const dialect = make("dialect");
  const field = make("field");
  const misc = make("misc");
  return (
    <>
      {dialect}
      {field}
      {misc}
      {partOfSpeech}
    </>
  );
};

const tagFields = {
  dialect: "🗣",
  field: "🀄️",
  misc: "✋",
  partOfSpeech: "🫦",
} as const;

export const Related: Component<{ sense: Sense }> = ({ sense }) =>
  sense.related.length > 0 ? <>(👉 {printXrefs(sense.related)})</> : null;
export const Antonym: Component<{ sense: Sense }> = ({ sense }) =>
  sense.antonym.length > 0 ? <>(👉 {printXrefs(sense.antonym)})</> : null;
