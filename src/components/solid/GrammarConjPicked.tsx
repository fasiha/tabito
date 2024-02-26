/** @jsxImportSource solid-js */
import type { Furigana } from "curtiz-japanese-nlp";
import type { Component } from "solid-js";
import type { AdjDeconjugated, Deconjugated } from "kamiya-codec";
import { FuriganaComponent } from "./FuriganaComponent";

interface Props {
  lemmas: Furigana[][];
  deconj: AdjDeconjugated | Deconjugated;
  relevantFurigana: Furigana[];
}

export const GrammarConjPicked: Component<Props> = ({
  lemmas,
  deconj,
  relevantFurigana,
}) => {
  return (
    <>
      <FuriganaComponent furigana={relevantFurigana} /> ={" "}
      <FuriganaComponent furigana={lemmas[0]} /> +{" "}
      {"auxiliaries" in deconj && deconj.auxiliaries.length
        ? `${deconj.auxiliaries.join(" + ")} + ${deconj.conjugation}`
        : deconj.conjugation}
    </>
  );
};
function renderDeconjugation(d: AdjDeconjugated | Deconjugated) {
  if ("auxiliaries" in d && d.auxiliaries.length) {
    return `${d.auxiliaries.join(" + ")} + ${d.conjugation}`;
  }
  return d.conjugation;
}
