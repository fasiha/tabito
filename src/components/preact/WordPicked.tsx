import { type FunctionComponent } from "preact";
import type { Sense, Word, Xref } from "curtiz-japanese-nlp/interfaces";
import type { SenseAndSub } from "../commonInterfaces";
import { prefixNumber } from "../../utils/utils";
import { Antonym, Related } from "./WordPicker";

interface Props {
  word: Word;
  tags: Record<string, string>;
  alreadyPicked: SenseAndSub[];
}

export const WordPicked: FunctionComponent<Props> = ({
  word,
  tags,
  alreadyPicked,
}) => {
  alreadyPicked
    .slice()
    .sort(
      (a, b) =>
        a.sense - b.sense ||
        (a.subsense !== undefined && b.subsense !== undefined
          ? a.subsense - b.subsense
          : 0)
    );
  return (
    <>
      {word.kanji.map((k) => k.text).join("・")}「
      {word.kana.map((k) => k.text).join("・")}」{" "}
      {word.sense.map((sense, n) => {
        const extra = (
          <sub>
            <Related sense={sense} /> <Antonym sense={sense} />{" "}
            <Tags sense={sense} tags={tags} />
          </sub>
        );

        const wholeSensePicked = alreadyPicked.find(
          (a) => a.sense === n && a.subsense === undefined
        );
        if (wholeSensePicked) {
          return (
            <>
              {prefixNumber(n)}
              {sense.gloss.map((g, gi) => (
                <>
                  <sup>{prefixNumber(gi)}</sup> {g.text}{" "}
                </>
              ))}
              {extra}{" "}
            </>
          );
        }

        const subsensesPicked = alreadyPicked
          .filter(
            (a): a is Required<typeof a> =>
              a.sense === n && a.subsense !== undefined
          )
          .sort((a, b) => a.subsense - b.subsense);
        if (subsensesPicked.length) {
          return (
            <>
              {prefixNumber(n)}
              {subsensesPicked.map(({ subsense }) => (
                <>
                  <sup>{prefixNumber(subsense)}</sup>{" "}
                  {sense.gloss[subsense].text}{" "}
                </>
              ))}
              {extra}{" "}
            </>
          );
        }
      })}
    </>
  );
};

export const Tags: FunctionComponent<{
  sense: Sense;
  tags: Record<string, string>;
}> = ({ sense, tags }) => {
  const make = (key: keyof typeof tagFields) =>
    sense[key].length > 0 ? (
      <span title={sense[key].map((d) => tags[d]).join("; ")}>
        {tagFields[key]}
      </span>
    ) : null;

  const partOfSpeech = make("partOfSpeech");
  const dialect = make("dialect");
  const field = make("field");
  const misc = make("misc");
  return (
    <>
      {dialect}
      {field}
      {misc}
      {partOfSpeech}
    </>
  );
};

const tagFields = {
  dialect: "🗣",
  field: "🀄️",
  misc: "✋",
  partOfSpeech: "🫦",
} as const;
