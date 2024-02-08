import { Fragment, type FunctionComponent } from "preact";
import type { Sense, Word, Xref } from "curtiz-japanese-nlp/interfaces";
import type { SenseAndSub } from "./commonInterfaces";

interface Props {
  word: Word;
  tags: Record<string, string>;
  onNewVocab: (x: SenseAndSub) => void;
}

export const WordPicker: FunctionComponent<Props> = ({
  word,
  tags,
  onNewVocab,
}) => {
  const handleSense = (sense: number) => onNewVocab({ sense });
  const handleSubSense = (sense: number, subsense: number) =>
    onNewVocab({ sense, subsense });

  return (
    <>
      {word.kanji.map((k) => k.text).join("・")}「
      {word.kana.map((k) => k.text).join("・")}」{" "}
      {word.sense.map((sense, n) => (
        <Fragment key={n}>
          {" "}
          <button onClick={() => handleSense(n)}>{n + 1}</button>
          {sense.gloss.map((g, gi) => (
            <Fragment key={gi}>
              {" "}
              <button onClick={() => handleSubSense(n, gi)}>
                {n + 1}.{gi + 1}
              </button>{" "}
              {g.text}
            </Fragment>
          ))}
          <Related sense={sense} />
          <Antonym sense={sense} />
          <Tags sense={sense} tags={tags} />
        </Fragment>
      ))}
    </>
  );
};

const Related: FunctionComponent<{ sense: Sense }> = ({ sense }) =>
  sense.related.length > 0 ? <>(👉 {printXrefs(sense.related)})</> : null;
const Antonym: FunctionComponent<{ sense: Sense }> = ({ sense }) =>
  sense.antonym.length > 0 ? <>(👉 {printXrefs(sense.antonym)})</> : null;
const Tags: FunctionComponent<{
  sense: Sense;
  tags: Record<string, string>;
}> = ({ sense, tags }) => {
  const make = (key: keyof typeof tagFields) =>
    sense[key].length > 0 ? (
      <>
        ({tagFields[key]} {sense[key].map((d) => tags[d]).join("; ")})
      </>
    ) : null;

  const partOfSpeech = make("partOfSpeech");
  const dialect = make("dialect");
  const field = make("field");
  const misc = make("misc");
  return (
    <>
      {dialect} {field} {misc} {partOfSpeech}
    </>
  );
};

function printXrefs(v: Xref[]) {
  return v.map((x) => x.join(",")).join(";");
}

const tagFields = {
  dialect: "🗣",
  field: "🀄️",
  misc: "✋",
  partOfSpeech: "🫦",
} as const;
