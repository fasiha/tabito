/** @jsxImportSource solid-js */
import type { Component } from "solid-js";
import type { Sentence } from "../../interfaces/backend";
import { WordPicked } from "./WordPicked";
import { furiganaSlice, furiganaToPlain } from "../../utils/utils";

interface Props {
  sentence: Sentence;
}

export const SentenceAnnotations: Component<Props> = ({ sentence }) => {
  return (
    <ul>
      {sentence.vocab?.map((v) => (
        <li>
          <WordPicked
            word={v.entry}
            tags={v.tags}
            alreadyPicked={v.senses}
            relevantFurigana={furiganaSlice(sentence.furigana, v.start, v.len)}
          />
        </li>
      ))}
    </ul>
  );
};
