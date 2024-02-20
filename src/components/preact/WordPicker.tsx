import { type FunctionComponent } from "preact";
import type { Sense, Word, Xref } from "curtiz-japanese-nlp/interfaces";
import type { SenseAndSub } from "../commonInterfaces";

interface Props {
  word: Word;
  tags: Record<string, string>;
  onNewVocab: (x: SenseAndSub) => void;
  alreadyPicked: SenseAndSub[];
}

export const WordPicker: FunctionComponent<Props> = ({
  word,
  tags,
  onNewVocab,
  alreadyPicked,
}) => {
  const handleSense = (sense: number) => onNewVocab({ sense });
  const handleSubSense = (sense: number, subsense: number) =>
    onNewVocab({ sense, subsense });

  return (
    <>
      {word.kanji.map((k) => k.text).join("・")}「
      {word.kana.map((k) => k.text).join("・")}」{" "}
      {word.sense.map((sense, n) => {
        const wholeSenseClass = alreadyPicked.find(
          (a) => a.sense === n && a.subsense === undefined
        )
          ? "already-picked"
          : undefined;

        return (
          <span class={wholeSenseClass} key={n}>
            {" "}
            <button onClick={() => handleSense(n)}>{n + 1}</button>
            {sense.gloss.map((g, gi) => {
              const subSenseClass = alreadyPicked.find(
                (a) => a.sense === n && a.subsense === gi
              )
                ? "already-picked"
                : undefined;

              return (
                <span class={subSenseClass} key={gi}>
                  {" "}
                  <button onClick={() => handleSubSense(n, gi)}>
                    {n + 1}.{gi + 1}
                  </button>{" "}
                  {g.text}
                </span>
              );
            })}{" "}
            <Related sense={sense} /> <Antonym sense={sense} />{" "}
            <Tags sense={sense} tags={tags} />
          </span>
        );
      })}
    </>
  );
};

export const Related: FunctionComponent<{ sense: Sense }> = ({ sense }) =>
  sense.related.length > 0 ? <>(👉 {printXrefs(sense.related)})</> : null;
export const Antonym: FunctionComponent<{ sense: Sense }> = ({ sense }) =>
  sense.antonym.length > 0 ? <>(👉 {printXrefs(sense.antonym)})</> : null;
export const Tags: FunctionComponent<{
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
