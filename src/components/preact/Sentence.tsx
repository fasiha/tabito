import { type FunctionalComponent } from "preact";
import type { Sentence as SentenceType } from "../../interfaces/backend";
import { Furigana } from "./Furigana";

interface Props {
  sentence: Pick<SentenceType, "furigana">;
}
export const Sentence: FunctionalComponent<Props> = ({ sentence }) => {
  return (
    <span>
      <Furigana furigana={sentence.furigana} />
    </span>
  );
};
