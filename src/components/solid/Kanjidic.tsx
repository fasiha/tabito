/** @jsxImportSource solid-js */
import type { Component } from "solid-js";
import type { AnnotatedSentence } from "../../interfaces/backend";
import type { v1ResSentenceAnalyzed } from "curtiz-japanese-nlp/interfaces";
import type { SimpleCharacter } from "curtiz-japanese-nlp/kanjidic";

interface Props {
  kanjidic: AnnotatedSentence["kanjidic"];
  plain: string;
}

export const Kanjidic: Component<Props> = ({ kanjidic, plain }) => {
  if (!kanjidic) return null;
  return (
    <>
      <p>Kanji</p>
      <ul>
        {Object.values(kanjidic)
          .filter((dic) => plain.includes(dic.literal))
          .map((dic, i) => (
            <li>
              {renderKanjidicRoot(dic)}
              <ul>
                {dic.dependencies.map((root, i) => (
                  <KanjidicChild root={root} />
                ))}
              </ul>
            </li>
          ))}
      </ul>
    </>
  );
};

interface KanjidicChildProps {
  root: v1ResSentenceAnalyzed["kanjidic"][string]["dependencies"][number];
}
const KanjidicChild: Component<KanjidicChildProps> = ({ root }) => {
  if (!root.nodeMapped) {
    return <li>{root.node}</li>;
  }
  return (
    <li>
      {renderKanjidicRoot(root.nodeMapped)}
      <ul>
        {root.children.map((child, i) => (
          <KanjidicChild root={child} />
        ))}
      </ul>
    </li>
  );
};
function renderKanjidicRoot(k: SimpleCharacter) {
  const readings = k.readings.length ? `「${k.readings.join("・")}」` : "";
  const ret = `${k.literal} ${readings} ${k.meanings.join("; ")}`;
  if (k.nanori.length) {
    return ret + ` (名: ${k.nanori.join("・")})`;
  }
  return ret;
}
