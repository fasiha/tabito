/** @jsxImportSource solid-js */
import type { Component } from "solid-js";
import type { AnnotatedSentence } from "../../interfaces/backend";
import { WordPicked } from "./WordPicked";
import { furiganaSlice, furiganaToPlain } from "../../utils/utils";
import { GrammarConjPicked } from "./GrammarConjPicked";
import { SentencePicked } from "./SentencePicked";
import { Kanjidic } from "./Kanjidic";

interface Props {
  sentence: AnnotatedSentence;
}

export const SentenceAnnotations: Component<Props> = ({ sentence }) => {
  const plain = furiganaToPlain(sentence.furigana);
  return (
    <>
      <SentencePicked sentence={sentence} />
      <ul>
        {sentence.vocab?.map((v) => (
          <li>
            <WordPicked
              word={v.entry}
              tags={v.tags}
              alreadyPicked={v.senses}
              relevantFurigana={furiganaSlice(
                sentence.furigana,
                v.start,
                v.len
              )}
            />
          </li>
        ))}

        {sentence.grammarConj?.map((g) => (
          <li>
            <GrammarConjPicked
              lemmas={g.lemmas}
              deconj={g.deconj}
              relevantFurigana={furiganaSlice(
                sentence.furigana,
                g.start,
                g.len
              )}
            />
          </li>
        ))}
      </ul>
      <Kanjidic plain={plain} kanjidic={sentence.kanjidic} />
    </>
  );
};
