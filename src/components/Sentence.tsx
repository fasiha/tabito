import { Fragment, type FunctionalComponent } from "preact";
import type { Sentence as SentenceType } from "../interfaces";

interface Props {
  sentence: Pick<SentenceType, "furigana">;
}
export const Sentence: FunctionalComponent<Props> = ({ sentence }) => {
  return (
    <span>
      {sentence.furigana.map((f) => (
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
