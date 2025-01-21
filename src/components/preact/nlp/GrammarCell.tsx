import { Fragment, type FunctionalComponent } from "preact";
import { Furigana as FuriganaComponent } from "../Furigana";
import { grammarConjEqual } from "../../../utils/equality";
import { prefixNumber } from "../../../utils/utils";
import type { AdjDeconjugated, Deconjugated } from "kamiya-codec";
import type { GrammarConj, Sentence } from "../../../interfaces/backend";
import type { Furigana } from "curtiz-japanese-nlp";
import type { VocabGrammarProps } from "../../commonInterfaces";

interface Props {
  alreadySelectedGrammarConj: Sentence["grammarConj"];
  custom?: boolean;
  deconjs: AdjDeconjugated[] | Deconjugated[] | (AdjDeconjugated | Deconjugated)[];
  lemmasFurigana: Furigana[][];
  len: number;
  literalFurigana: Furigana[];
  onNewVocabGrammar: (x: VocabGrammarProps) => void;
  start: number;
}

function renderDeconjugation(d: AdjDeconjugated | Deconjugated) {
  if ("auxiliaries" in d && d.auxiliaries.length) {
    return `${d.auxiliaries.join(" + ")} + ${d.conjugation}`;
  }
  return d.conjugation;
}

export const GrammarCell: FunctionalComponent<Props> = ({
  alreadySelectedGrammarConj,
  custom,
  deconjs,
  lemmasFurigana,
  len,
  literalFurigana,
  onNewVocabGrammar,
  start,
}) => {
  const handleClick = (deconj: GrammarConj["deconj"]) =>
    onNewVocabGrammar({
      grammar: { start, len, lemmas: lemmasFurigana, deconj },
    });

  return (
    <Fragment>
      {custom && "(Manual) "}
      <FuriganaComponent furigana={lemmasFurigana[0]} /> → <FuriganaComponent furigana={literalFurigana} /> via
      <ul>
        {deconjs.map((deconj, di) => {
          const proposal = { start, len, lemmas: lemmasFurigana, deconj };
          const className = alreadySelectedGrammarConj?.find((g) => grammarConjEqual(g, proposal))
            ? "already-picked"
            : undefined;
          return (
            <li class={className}>
              <button onClick={() => handleClick(deconj)}>{prefixNumber(di)}</button> {renderDeconjugation(deconj)}
            </li>
          );
        })}
      </ul>
    </Fragment>
  );
};
