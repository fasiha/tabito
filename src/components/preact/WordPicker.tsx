import { type FunctionComponent } from "preact";
import type { Sense, Word, Xref } from "curtiz-japanese-nlp/interfaces";
import type { SenseAndSub } from "../commonInterfaces";
import {
  printXrefs,
  senseSeenClass,
  subsenseSeenClass,
} from "../../utils/utils";

interface Props {
  word: Word;
  tags: Record<string, string>;
  onNewVocab: (x: SenseAndSub) => void;
  alreadyPicked: SenseAndSub[];
  isXref?: boolean;
}

export const WordPicker: FunctionComponent<Props> = ({
  word,
  tags,
  onNewVocab,
  alreadyPicked,
  isXref,
}) => {
  const handleSense = (sense: number) => onNewVocab({ sense });
  const handleSubSense = (sense: number, subsense: number) =>
    onNewVocab({ sense, subsense });

  const senseNodes = word.sense.map((sense, n) => {
    const wholeSenseClass = senseSeenClass(n, alreadyPicked);

    return (
      <span class={wholeSenseClass} key={n}>
        {" "}
        <button onClick={() => handleSense(n)}>{n + 1}</button>
        {sense.gloss.map((g, gi) => {
          const subSenseClass = subsenseSeenClass(n, gi, alreadyPicked);

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
        <Tags sense={sense} tags={tags} /> <Info sense={sense} />
      </span>
    );
  });

  if (word.id === "1157170" && word.kana.some((k) => k.text === "する")) {
    // suru. Shift #15 to top
    const special = senseNodes.splice(14, 1);
    senseNodes.unshift(special[0]);
  }

  return (
    <span class={isXref ? "xref-definition" : undefined}>
      {isXref ? <>🖇️ </> : null}
      {word.kanji.map((k) => k.text).join("・")}「
      {word.kana.map((k) => k.text).join("・")}」 {senseNodes}{" "}
      <code>{word.id}</code>
    </span>
  );
};

const Related: FunctionComponent<{ sense: Sense }> = ({ sense }) =>
  sense.related.length > 0 ? <>(👉 {printXrefs(sense.related)})</> : null;
const Antonym: FunctionComponent<{ sense: Sense }> = ({ sense }) =>
  sense.antonym.length > 0 ? <>(👉 {printXrefs(sense.antonym)})</> : null;
const Info: FunctionComponent<{ sense: Sense }> = ({ sense }) =>
  sense.info?.length ? <>[{sense.info.join(";")}]</> : null;
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

const tagFields = {
  dialect: "🗣",
  field: "🀄️",
  misc: "✋",
  partOfSpeech: "🫦",
} as const;
