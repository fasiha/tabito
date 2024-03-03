import type { FunctionComponent } from "preact";
import type { Word } from "curtiz-japanese-nlp/interfaces";
import type { SenseAndSub } from "../commonInterfaces";
import {
  prefixNumber,
  senseSeenClass,
  subsenseSeenClass,
} from "../../utils/utils";

interface SimpleWordProps {
  word: Word;
  senses?: SenseAndSub[];
  gloss?: boolean;
}
export const SimpleWord: FunctionComponent<SimpleWordProps> = ({
  word,
  gloss,
  senses,
}) => {
  return (
    <>
      {" "}
      {word.kanji.map((k) => k.text).join("・")} 「
      {word.kana.map((k) => k.text).join("・")}」{" "}
      {gloss &&
        word.sense.map((s, sidx) => (
          <span class={senseSeenClass(sidx, senses)}>
            {prefixNumber(sidx)}
            {s.gloss.map((g, gidx) => (
              <>
                <sup>{prefixNumber(gidx)}</sup>{" "}
                <span class={subsenseSeenClass(sidx, gidx, senses)}>
                  {g.text}
                </span>{" "}
              </>
            ))}
          </span>
        ))}
    </>
  );
};
