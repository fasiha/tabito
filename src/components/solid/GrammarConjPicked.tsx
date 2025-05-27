/** @jsxImportSource solid-js */
import type { Furigana } from "curtiz-japanese-nlp";
import type { Component } from "solid-js";
import type { AdjDeconjugated, Deconjugated } from "kamiya-codec";
import { Furigana as FuriganaComponent } from "./Furigana";
import { furiganaToPlain, plainToFurigana } from "../../utils/utils";

interface Props {
  lemmas: Furigana[][];
  deconj: AdjDeconjugated | Deconjugated;
  relevantFurigana: Furigana[];
}

export const GrammarConjPicked: Component<Props> = ({ lemmas, deconj, relevantFurigana }) => {
  // We sometimes correct furigana because MeCab is wrong. Then the lemma might have the wrong furigana.
  // Put the user-customized furigana later, to override MeCab's.
  const lemmaUpdated = plainToFurigana(furiganaToPlain(lemmas[0]), [...lemmas[0], ...relevantFurigana]);

  return (
    <>
      <FuriganaComponent furigana={relevantFurigana} /> = <FuriganaComponent furigana={lemmaUpdated} /> +{" "}
      {"auxiliaries" in deconj && deconj.auxiliaries.length
        ? `${deconj.auxiliaries.join(" + ")} + ${deconj.conjugation}`
        : deconj.conjugation}
    </>
  );
};
