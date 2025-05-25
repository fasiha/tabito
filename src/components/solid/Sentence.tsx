/** @jsxImportSource solid-js */
import type { Component } from "solid-js";
import type { Sentence as SentenceType } from "../../interfaces/backend";
import { Furigana } from "./Furigana";

interface Props {
  sentence: Pick<SentenceType, "furigana">;
}

export const Sentence: Component<Props> = (props) => {
  return (
    <span>
      <Furigana furigana={props.sentence.furigana} />
    </span>
  );
};
