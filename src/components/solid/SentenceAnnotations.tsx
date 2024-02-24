/** @jsxImportSource solid-js */
import type { Component } from "solid-js";
import type { Sentence } from "../../interfaces/backend";
import { WordPicked } from "./WordPicked";
import { furiganaToPlain } from "../../utils/utils";

interface Props {
  sentence: Sentence;
}

export const SentenceAnnotations: Component<Props> = ({ sentence }) => {
  const plain = furiganaToPlain(sentence.furigana);
  return (
    <ul>
      {sentence.vocab?.map((v) => (
        <li>
          <WordPicked
            word={v.entry}
            tags={v.tags}
            alreadyPicked={v.senses}
            sentenceSnippet={plain.slice(v.start, v.start + v.len)}
          />
        </li>
      ))}
    </ul>
  );
};
