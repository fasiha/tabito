import { type FunctionalComponent } from "preact";
import type { Sentence as SentenceType } from "tabito-lib";
import { Sentence } from "./Sentence";

interface Props {
  sentences: SentenceType[];
}
export const Document: FunctionalComponent<Props> = ({ sentences }) => {
  return (
    <ul>
      {sentences.map((sentence) => (
        <li>
          <Sentence sentence={sentence} />
        </li>
      ))}
    </ul>
  );
};
