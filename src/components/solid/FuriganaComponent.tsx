/** @jsxImportSource solid-js */
import type { Furigana } from "curtiz-japanese-nlp";
import type { Component } from "solid-js";
interface Props {
  furigana: Furigana[];
}
export const FuriganaComponent: Component<Props> = ({ furigana }) => (
  <>
    {furigana.map((f) =>
      typeof f === "string" ? (
        f
      ) : (
        <ruby>
          {f.ruby}
          <rt>{f.rt}</rt>
        </ruby>
      )
    )}
  </>
);
