import { computed, useSignal, useSignalEffect, type Signal } from "@preact/signals";
import type { FunctionalComponent } from "preact";
import type { GrammarConj, Sentence } from "../../interfaces/backend";
import type { Furigana } from "tabito-lib";
import {
  auxiliaries,
  conjugateAuxiliaries,
  conjugations,
  type Auxiliary,
  type Conjugation,
  type Deconjugated,
  type AdjDeconjugated,
  adjConjugations,
  adjConjugate,
  type AdjConjugation,
} from "kamiya-codec";
import type { VocabGrammarProps } from "../commonInterfaces";

interface Props {
  onNewVocabGrammar: (x: VocabGrammarProps) => Promise<void>;
  sentence: Signal<Sentence | undefined>;
}

const furiganaToString = (fs: Furigana[]): string => fs.map((f) => (typeof f === "string" ? f : f.ruby)).join("");
const furiganasToString = (bunsetsu: Furigana[][]): string => bunsetsu.map(furiganaToString).join("");
const isConj = (s: string): s is Conjugation => conjugations.includes(s as any);
const isAux = (s: string): s is Auxiliary => auxiliaries.includes(s as any);
const isAdjConj = (s: string): s is AdjConjugation => adjConjugations.includes(s as any);

export const CustomDeconjugator: FunctionalComponent<Props> = ({ onNewVocabGrammar, sentence }) => {
  const curtiz = sentence.value?.nlp.curtiz;

  const startIndex = useSignal(0);
  const endIndex = useSignal(1);
  const auxs = useSignal<Auxiliary[]>([]);
  const finalConj = useSignal<Conjugation | AdjConjugation>("Dictionary");
  const ichidan = useSignal(false);
  const verb = useSignal(true);
  const iAdj = useSignal(true);

  useSignalEffect(() => {
    if (curtiz && typeof curtiz !== "string") {
      const lemma = curtiz.bunsetsus.flatMap((b) => b.morphemes)[startIndex.value].lemma;
      if (!verb.value && lemma.endsWith("い")) {
        iAdj.value = true;
      }
    }
  });

  if (!sentence.value || !curtiz || typeof curtiz === "string") {
    return null;
  }

  const lemma = curtiz.bunsetsus.flatMap((b) => b.morphemes)[startIndex.value].lemma;

  const handleChangeStart = (raw: string) => {
    startIndex.value = Number(raw);
    endIndex.value = Number(raw) + 1;
  };
  const handleChangeEnd = (raw: string) => {
    endIndex.value = Number(raw);
  };
  const handleToggleIchidan = () => {
    ichidan.value = !ichidan.value;
  };
  const handleToggleVerb = () => {
    verb.value = !verb.value;
  };
  const handleToggleIAdj = () => {
    iAdj.value = !iAdj.value;
  };
  const handleFinalConj = (conj: string) => {
    if (verb.value && isConj(conj)) {
      finalConj.value = conj;
    } else if (!verb.value && isAdjConj(conj)) {
      finalConj.value = conj;
    }
  };
  const handleAddAux = (aux: string) => {
    if (isAux(aux) && !auxs.value.includes(aux)) {
      auxs.value = auxs.value.concat(aux);
    }
  };
  const handleDeleteAux = (aux: string) => {
    auxs.value = auxs.value.filter((prop) => prop !== aux);
  };
  const handleSubmit = () => {
    if (results.value.results) {
      const left = furiganasToString(curtiz.furigana.slice(0, startIndex.value));
      const lemmas = curtiz.lemmaFurigana.slice(startIndex.value, endIndex.value);
      const grammar = {
        start: left.length,
        len: snippet.length,
        lemmas,
      };

      if (verb.value && isConj(finalConj.value)) {
        const deconj: Deconjugated = {
          auxiliaries: auxs.value,
          conjugation: finalConj.value,
          result: results.value.results,
        };
        onNewVocabGrammar({ grammar: { ...grammar, deconj } });
      } else if (!verb.value && isAdjConj(finalConj.value)) {
        const deconj: AdjDeconjugated = {
          conjugation: finalConj.value,
          result: results.value.results,
        };
        onNewVocabGrammar({ grammar: { ...grammar, deconj } });
      }
    }
  };

  const snippet = furiganasToString(curtiz.furigana.slice(startIndex.value, endIndex.value));

  type Results = { results: string[]; error?: never } | { error: string; results?: never };
  const results = computed((): Results => {
    try {
      if (verb.value && isConj(finalConj.value)) {
        return { results: conjugateAuxiliaries(lemma, auxs.value, finalConj.value, ichidan.value) };
      } else if (!verb.value && isAdjConj(finalConj.value)) {
        return { results: adjConjugate(lemma, finalConj.value, iAdj.value) };
      }
      return { error: "Unexpect verb/adjective conjugation state" };
    } catch (e) {
      return { error: String(e) };
    }
  });

  return (
    <details>
      <summary>Custom grammar conjugation</summary>
      <section
        style={{
          marginLeft: "1rem",
          paddingLeft: "1rem",
          borderLeft: "3px solid gray",
        }}
      >
        <div>
          From{" "}
          <select value={startIndex.value} onChange={(e) => handleChangeStart(e.currentTarget.value)}>
            {curtiz.furigana.map((morpheme, midx) => (
              <option value={midx} key={midx}>
                {furiganaToString(morpheme)}
              </option>
            ))}
          </select>{" "}
          →{" "}
          <select value={endIndex.value} onChange={(e) => handleChangeEnd(e.currentTarget.value)}>
            {curtiz.furigana.slice(startIndex.value).map((_, midx) => (
              <option value={startIndex.value + midx + 1} key={midx}>
                {furiganasToString(curtiz.furigana.slice(startIndex.value, startIndex.value + midx + 1))}
              </option>
            ))}
          </select>
        </div>

        <div>
          <ul>
            <li>
              <label>
                {verb.value ? "Verb" : "Adjective"} <input type="checkbox" checked={verb} onChange={handleToggleVerb} />
              </label>
            </li>
            <li>
              {verb.value ? (
                <label>
                  Ichidan verb? <input type="checkbox" checked={ichidan} onChange={handleToggleIchidan} />
                </label>
              ) : (
                <label>
                  い adjective? <input type="checkbox" checked={iAdj} onChange={handleToggleIAdj} />
                </label>
              )}
            </li>
            <li>{snippet} =</li>
            <ul>
              <li>{lemma}</li>
              {verb.value && (
                <>
                  <li>+ Auxiliaries</li>
                  <ol>
                    {auxs.value.map((aux) => (
                      <li key={aux}>
                        + {aux} <button onClick={() => handleDeleteAux(aux)}>❌</button>
                      </li>
                    ))}
                    <li>
                      <select value="" onChange={(e) => handleAddAux(e.currentTarget.value)}>
                        <option value="">--Pick another auxiliary</option>
                        {auxiliaries.map((aux) => (
                          <option value={aux} key={aux}>
                            {aux}
                          </option>
                        ))}
                      </select>
                    </li>
                  </ol>
                </>
              )}
              <li>
                + Final conjugation:{" "}
                <select value={finalConj.value} onChange={(e) => handleFinalConj(e.currentTarget.value)}>
                  {(verb.value ? conjugations : adjConjugations).map((conj) => (
                    <option value={conj} key={conj}>
                      {conj}
                    </option>
                  ))}
                </select>
              </li>
            </ul>
            {results.value.results && results.value.results.length > 0 && <li>= {results.value.results.join(", ")}</li>}
            {results.value.error && (
              <li>
                💀 error: <code>{results.value.error}</code>
              </li>
            )}
          </ul>
        </div>

        {!results.value.error && results.value.results && results.value.results.length > 0 && (
          <button onClick={handleSubmit}>Submit</button>
        )}
      </section>
    </details>
  );
};
