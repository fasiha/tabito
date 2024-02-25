/** @jsxImportSource solid-js */
import type { Component } from "solid-js";
import type { Furigana, Sense, Word } from "curtiz-japanese-nlp/interfaces";
import type { SenseAndSub } from "../commonInterfaces";
import {
  furiganaToPlain,
  furiganaToReading,
  prefixNumber,
  printXrefs,
} from "../../utils/utils";
import { db } from "../../indexeddb";
import { createDexieSignalQuery } from "../../indexeddb/solid-dexie";
import { makeEbisuSplit3, makeVocabMemory } from "../../utils/make";

import "./WordPicked.scss";
import type { VocabMemory } from "../../interfaces/frontend";

interface Props {
  word: Word;
  tags: Record<string, string>;
  alreadyPicked: SenseAndSub[];
  relevantFurigana?: Furigana[];
}

export const WordPicked: Component<Props> = ({
  word,
  tags,
  alreadyPicked,
  relevantFurigana,
}) => {
  const memory = createDexieSignalQuery(() => db.vocab.get(word.id));
  const handleToggleLearn = () => {
    if (memory()) {
      db.vocab.delete(word.id);
    } else {
      db.vocab
        .put(
          makeVocabMemory({ word, readingsSeen: [word.kana[0].text] }),
          word.id
        )
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

      // empty means we don't know this
      if (newVocab.readingsSeen.length === 0) {
        db.vocab.delete(word.id);
      } else {
        if (newVocab.kanjiSeen.length) {
          if (!newVocab.models.readingMeaningToWritten)
            newVocab.models.readingMeaningToWritten = makeEbisuSplit3();
          if (!newVocab.models.writtenToReading)
            newVocab.models.writtenToReading = makeEbisuSplit3();
        }

        db.vocab.put(newVocab, word.id);
      }
    } else {
      db.vocab.put(
        makeVocabMemory({
          word,
          readingsSeen:
            readingOrKanji === "reading" ? [text] : [word.kana[0].text],
          kanjiSeen: readingOrKanji === "kanji" ? [text] : [],
        }),
        word.id
      );
    }
  };

  const snippet = relevantFurigana
    ? furiganaToPlain(relevantFurigana) + furiganaToReading(relevantFurigana)
    : undefined;

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
          {k.text
            .split("")
            .map((c) =>
              snippet?.includes(c) ? <span class="in-snippet">{c}</span> : c
            )}{" "}
          <input
            type="checkbox"
            checked={memory()?.kanjiSeen.includes(k.text)}
            onChange={() => toggleReadingOrKanji(k.text, "kanji")}
          />{" "}
        </label>
      ))}
      {word.kana.map((k) => (
        <label>
          「
          {k.text
            .split("")
            .map((c) =>
              snippet?.includes(c) ? <span class="in-snippet">{c}</span> : c
            )}
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

const ADD_WORD_TO_SENTENCE = true;
const DELETE_WORD_FROM_SENTENCE = false;

function updateSentenceMemoryWithVocab(
  plain: string,
  wordId: VocabMemory["wordId"],
  addNotDelete: boolean
): void {
  db.transaction("rw", db.sentence, async () => {
    const sentence = await db.sentence.get(plain);
    if (sentence) {
      if (addNotDelete) {
        if (!sentence.relatedWordIds.includes(wordId)) {
          sentence.relatedWordIds.push(wordId);
          await db.sentence.put(sentence, plain);
        }
      } else {
        const origLength = sentence.relatedWordIds.length;
        sentence.relatedWordIds = sentence.relatedWordIds.filter(
          (w) => w !== wordId
        );
        if (origLength !== sentence.relatedWordIds.length) {
          await db.sentence.put(sentence, plain);
        }
      }
    }
  });
}
