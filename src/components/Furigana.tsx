import { Fragment, type FunctionalComponent } from "preact";
import type { Furigana as FuriganaType } from "curtiz-japanese-nlp";

interface Props {
  furigana: FuriganaType[];
}
export const Furigana: FunctionalComponent<Props> = ({ furigana }) => {
  return (
    <span>
      {furigana.map((f) => (
        <Fragment>
          {typeof f === "string" ? (
            f
          ) : (
            <ruby>
              {f.ruby}
              <rt>{f.rt}</rt>
            </ruby>
          )}
        </Fragment>
      ))}
    </span>
  );
};
