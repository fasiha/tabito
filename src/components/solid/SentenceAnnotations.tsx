/** @jsxImportSource solid-js */
import type { Component } from "solid-js";
import type { Sentence } from "../../interfaces/backend";
import { WordPicked } from "./WordPicked";
import { furiganaSlice, furiganaToPlain } from "../../utils/utils";
import { GrammarConjPicked } from "./GrammarConjPicked";
import { SentencePicked } from "./SentencePicked";

interface Props {
  sentence: Sentence;
}

export const SentenceAnnotations: Component<Props> = ({ sentence }) => {
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
    </>
  );
};
