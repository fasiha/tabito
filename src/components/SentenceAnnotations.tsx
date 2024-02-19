import type { FunctionalComponent } from "preact";
import type { Sentence } from "../interfaces/backend";
import { WordPicker } from "./WordPicker";

interface Props {
  sentence: Sentence;
}

export const SentenceAnnotations: FunctionalComponent<Props> = ({
  sentence,
}) => {
  return (
    <ul>
      {sentence.vocab?.map((v) => (
        <li>
          <WordPicker
            word={v.entry}
            tags={v.tags}
            alreadyPicked={[{ sense: v.sense, subsense: v.subsense }]}
            onNewVocab={() => {}}
          />
        </li>
      ))}
    </ul>
  );
};
