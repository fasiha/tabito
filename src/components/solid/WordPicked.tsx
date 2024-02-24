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
  sentenceSnippet?: string;
}

export const WordPicked: Component<Props> = ({
  word,
  tags,
  alreadyPicked,
  sentenceSnippet,
}) => {
  const memory = createDexieSignalQuery(() => db.vocab.get(word.id));
  const handleToggleLearn = () => {
    if (memory()) {
      db.vocab.delete(word.id);
    } else {
      db.vocab
        .put(makeVocabMemory(word, [word.kana[0].text]), word.id)
        .then((res) => console.log("Put in Dexie", res));
    }
  };
  const toggleReadingOrKanji = (
    text: string,
    readingOrKanji: "reading" | "kanji"
  ) => {
    const readingKanjiKey =
      readingOrKanji === "reading" ? "readingsSeen" : "kanjiSeen";

    if (memory()) {
      // word exists

      const newVocab = structuredClone(memory()!);
      if (memory()![readingKanjiKey].includes(text)) {
        // we're removing this
        newVocab[readingKanjiKey] = newVocab[readingKanjiKey].filter(
          (s) => s !== text
        );
      } else {
        // we're adding this reading
        newVocab[readingKanjiKey].push(text);
      }
      db.vocab.put(newVocab, word.id);
    } else {
      db.vocab.put(
        makeVocabMemory(
          word,
          readingOrKanji === "reading" ? [text] : [word.kana[0].text],
          readingOrKanji === "kanji" ? [text] : []
        ),
        word.id
      );
    }
  };
  return (
    <>
      <button
        onClick={handleToggleLearn}
        title={
          memory() ? "Learned! Click to unlearn" : "Unlearned. Click to learn"
        }
      >
        {memory() ? "✅" : "❓"}
      </button>{" "}
      {word.kanji.map((k) => (
        <label>
          {k.text}{" "}
          <input
            type="checkbox"
            checked={memory()?.kanjiSeen.includes(k.text)}
            onChange={() => toggleReadingOrKanji(k.text, "kanji")}
          />{" "}
        </label>
      ))}
      {word.kana.map((k) => (
        <label>
          「{k.text}
          <input
            type="checkbox"
            checked={memory()?.readingsSeen.includes(k.text)}
            onChange={() => toggleReadingOrKanji(k.text, "reading")}
          />
          」{" "}
        </label>
      ))}{" "}
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
