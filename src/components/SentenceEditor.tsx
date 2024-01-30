import type { FunctionalComponent, VNode } from "preact";
import { Signal, useSignal, useSignalEffect } from "@preact/signals";
import { addSynonym } from "tabito-lib";
import { type TargetedEvent } from "preact/compat";
import { Sentence as SentenceComponent } from "./Sentence";
import type { Furigana } from "curtiz-japanese-nlp";
import type { Sentence } from "../interfaces";
import { cellFit, type Cell } from "../utils/cellFit";
import type { ContextCloze } from "curtiz-japanese-nlp/interfaces";
import type { AdjDeconjugated, Deconjugated } from "kamiya-codec";
import { Furigana as FuriganaComponent } from "./Furigana";

interface Props {
  plain: string;
}

async function plainToSentenceSignal(
  plain: string,
  sentence: Signal<Sentence | undefined>,
  networkFeedback: Signal<string>
) {
  const res = await fetch(`/api/sentence/${plain}`);
  if (res.ok) {
    sentence.value = await res.json();
    networkFeedback.value = "";
  } else {
    networkFeedback.value = `${res.status} ${res.statusText}`;
  }
}

export const SentenceEditor: FunctionalComponent<Props> = ({ plain }) => {
  const sentence = useSignal<Sentence | undefined>(undefined);
  const networkFeedback = useSignal("");
  const newTranslation = useSignal("");
  const synonymSentence = useSignal("");
  const synonymWord = useSignal<[string, string]>(["", ""]);

  const newCitation = useSignal<undefined | string>(undefined);

  useSignalEffect(() => {
    plainToSentenceSignal(plain, sentence, networkFeedback);
  });

  function handleInputTranslation(
    ev: TargetedEvent<HTMLInputElement, InputEvent>
  ) {
    newTranslation.value = ev.currentTarget.value;
  }

  async function handleSubmitTranslation(
    ev: TargetedEvent<HTMLFormElement, SubmitEvent>
  ) {
    ev.preventDefault();
    if (newTranslation.value && sentence.value) {
      const body: Sentence = structuredClone(sentence.value);
      if (!body.translations) {
        body.translations = { en: [] };
      }
      body.translations.en.concat(newTranslation.value);

      const request = await fetch(`/api/sentence/${plain}`, {
        body: JSON.stringify({ sentence: body }),
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (request.ok) {
        sentence.value = body; // new value!
        // clear
        networkFeedback.value = "";
        newTranslation.value = "";
      } else {
        networkFeedback.value = `${request.status} ${request.statusText}. Retry?`;
      }
    }
  }

  function handleEditCitation() {
    newCitation.value = sentence.value?.citation || "";
  }

  function handleInputCitation(
    ev: TargetedEvent<HTMLInputElement, InputEvent>
  ) {
    newCitation.value = ev.currentTarget.value;
  }

  async function handleSubmitCitation(
    ev: TargetedEvent<HTMLFormElement, SubmitEvent>
  ) {
    ev.preventDefault();
    if (sentence.value && newCitation.value !== undefined) {
      const body: Sentence = {
        ...sentence.value,
        citation: newCitation.value,
      };
      const request = await fetch(`/api/sentence/${plain}`, {
        body: JSON.stringify({ sentence: body }),
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (request.ok) {
        sentence.value = body; // new value!
        // clear
        networkFeedback.value = "";
        newCitation.value = undefined;
      } else {
        networkFeedback.value = `${request.status} ${request.statusText}. Retry?`;
      }
    }
  }

  function handleInputSynonymSent(
    ev: TargetedEvent<HTMLInputElement, InputEvent>
  ) {
    synonymSentence.value = ev.currentTarget.value;
  }

  async function handleSubmitSynonymSent(
    ev: TargetedEvent<HTMLFormElement, SubmitEvent>
  ) {
    ev.preventDefault();
    if (sentence.value && synonymSentence.value) {
      const furiganaResponse = await fetch(`/api/furigana/${synonymSentence}`);
      if (furiganaResponse.ok) {
        const synFurigana: Furigana[] = await furiganaResponse.json();
        const newSentence: Sentence = {
          ...sentence.value,
          ...addSynonym(sentence.value, synFurigana),
        };

        const request = await fetch(`/api/sentence/${plain}`, {
          body: JSON.stringify({ sentence: newSentence }),
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (request.ok) {
          sentence.value = newSentence; // new value!
          // clear
          networkFeedback.value = "";
          synonymSentence.value = "";
        } else {
          networkFeedback.value = `${request.status} ${request.statusText}. Retry?`;
        }
      } else {
        networkFeedback.value = `${furiganaResponse.status} ${furiganaResponse.statusText}. Retry?`;
      }
    }
  }

  async function handleDeleteSynonym(syn: string, alt: Furigana[]) {
    if (sentence.value) {
      const newSynonyms = sentence.value.synonyms?.filter(
        ([oldSyn, oldAlt]) => !(oldSyn === syn && oldAlt === alt)
      );
      const newSentence: Sentence = {
        ...sentence.value,
        synonyms: newSynonyms,
      };

      const request = await fetch(`/api/sentence/${plain}`, {
        body: JSON.stringify({ sentence: newSentence }),
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (request.ok) {
        sentence.value = newSentence; // new value!
        // clear
        networkFeedback.value = "";
      } else {
        networkFeedback.value = `${request.status} ${request.statusText}. Retry?`;
      }
    }
  }

  function handleInputSynonymWord1(
    ev: TargetedEvent<HTMLInputElement, InputEvent>
  ) {
    synonymWord.value = [ev.currentTarget.value, synonymWord.value[1]];
  }
  function handleInputSynonymWord2(
    ev: TargetedEvent<HTMLInputElement, InputEvent>
  ) {
    synonymWord.value = [synonymWord.value[0], ev.currentTarget.value];
  }

  async function handleSubmitSynonymWord(
    ev: TargetedEvent<HTMLFormElement, SubmitEvent>
  ) {
    ev.preventDefault();
    if (sentence.value && synonymWord.value[0] && synonymWord.value[1]) {
      const furiganaResponse = await fetch(
        `/api/furigana/${synonymWord.value[1]}`
      );
      if (furiganaResponse.ok) {
        const synFurigana = await furiganaResponse.json();
        const newSynonyms = (sentence.value.synonyms ?? []).concat([
          [synonymWord.value[0], synFurigana],
        ]);
        const newSentence: Sentence = {
          ...sentence.value,
          synonyms: newSynonyms,
        };

        const request = await fetch(`/api/sentence/${plain}`, {
          body: JSON.stringify({ sentence: newSentence }),
          method: "POST",
          headers: { "Content-Type": "application/json" },
        });
        if (request.ok) {
          sentence.value = newSentence; // new value!
          // clear
          networkFeedback.value = "";
          synonymWord.value = ["", ""];
        } else {
          networkFeedback.value = `${request.status} ${request.statusText}. Retry?`;
        }
      } else {
        networkFeedback.value = `${furiganaResponse.status} ${furiganaResponse.statusText}. Retry?`;
      }
    }
  }

  return (
    <div>
      {networkFeedback.value && <p>Network feedback: {networkFeedback}</p>}
      {sentence.value && (
        <>
          <SentenceComponent sentence={sentence.value} />

          <NlpTable
            plain={plain}
            ichiran={sentence.value.ichiran}
            curtiz={sentence.value.curtiz}
          />

          <p>Synonyms:</p>
          <ul>
            {(sentence.value.synonyms ?? []).map(([syn, alt]) => (
              <li>
                {syn}: <SentenceComponent sentence={{ furigana: alt }} />{" "}
                <button onClick={() => handleDeleteSynonym(syn, alt)}>
                  Delete
                </button>
              </li>
            ))}
            <li>
              <form onSubmit={handleSubmitSynonymSent}>
                <input
                  onInput={handleInputSynonymSent}
                  placeholder="Synonymous sentence"
                  type="text"
                  value={synonymSentence.value}
                />{" "}
                <button disabled={!synonymSentence.value}>Submit</button>
              </form>
            </li>
            <li>
              <form onSubmit={handleSubmitSynonymWord}>
                <input
                  onInput={handleInputSynonymWord1}
                  placeholder="Original word/phrase"
                  type="text"
                  value={synonymWord.value[0]}
                />{" "}
                <input
                  onInput={handleInputSynonymWord2}
                  placeholder="Synonym"
                  type="text"
                  value={synonymWord.value[1]}
                />{" "}
                <button
                  disabled={!(synonymWord.value[0] && synonymWord.value[1])}
                >
                  Submit
                </button>
              </form>
            </li>
          </ul>

          <p>Furigana:</p>
          <ul>
            {sentence.value.furigana
              .filter(
                (f): f is Exclude<Furigana, string> => typeof f !== "string"
              )
              .map((r) => (
                <li>
                  {r.ruby}: {r.rt}
                </li>
              ))}
          </ul>

          <p>English translation(s):</p>
          <ul>
            {(sentence.value.translations?.en ?? []).map((english) => (
              <li>{english}</li>
            ))}
            <li>
              <form onSubmit={handleSubmitTranslation}>
                <input
                  onInput={handleInputTranslation}
                  placeholder="New translation"
                  type="text"
                  value={newTranslation.value}
                />{" "}
                <button disabled={!newTranslation.value}>Submit</button>
              </form>
            </li>
          </ul>

          <p>
            Citation:{" "}
            {newCitation.value === undefined ? (
              <>
                <span>{sentence.value.citation || "(none)"}</span>{" "}
                <button onClick={handleEditCitation}>Edit</button>
              </>
            ) : (
              <>
                <form onSubmit={handleSubmitCitation}>
                  <input
                    onInput={handleInputCitation}
                    type="text"
                    value={newCitation.value}
                  />{" "}
                  <button>Submit</button>
                </form>
              </>
            )}
          </p>
        </>
      )}
    </div>
  );
};

interface NlpTableProps {
  plain: string;
  ichiran: Sentence["ichiran"];
  curtiz: Sentence["curtiz"];
}

const NlpTable: FunctionalComponent<NlpTableProps> = ({
  plain,
  ichiran,
  curtiz,
}) => {
  if (typeof ichiran[0] === "string") {
    return <>no Japanese</>;
  }
  const ichiWords = ichiran[0][0][0];
  if (plain !== ichiWords.map((x) => x[1].text).join("")) {
    return <>ichiran mismatch?</>;
  }

  const cells: Cell<VNode>[] = [];

  const jmdictSeqSeen = new Set<number>();
  let start = 0;
  for (const [, x] of ichiWords) {
    if ("gloss" in x && x.gloss) {
      jmdictSeqSeen.add(x.seq);
      cells.push({
        start,
        len: x.text.length,
        content: <>{x.gloss.map((g) => g.gloss).join("/")}</>,
      });
      start += x.text.length;
    } else if (x.conj?.length) {
      jmdictSeqSeen.add(x.seq);
      for (const conj of x.conj) {
        cells.push({
          start: start,
          len: x.text.length,
          content: (
            <>
              {conj.prop && (
                <em>
                  {conj.prop
                    .map((p) => `[${p.pos}: ${p.type}]`)
                    .join("; ")
                    .concat(" — ")}
                </em>
              )}
              {x.suffix && <strong>{x.suffix}) </strong>}
              {conj.gloss?.map((g) => g.gloss).join("/")}
            </>
          ),
        });
      }
      start += x.text.length;
    } else if ("components" in x && x.components) {
      let yStart = start;
      for (const y of x.components) {
        yStart = plain.indexOf(y.text, yStart);
        if ("gloss" in y && y.gloss) {
          jmdictSeqSeen.add(y.seq);
          cells.push({
            start: yStart,
            len: y.text.length,
            content: <>{y.gloss.map((g) => g.gloss).join("/")}</>,
          });
        } else if ("conj" in y && y.conj?.length) {
          jmdictSeqSeen.add(y.seq);
          for (const conj of y.conj) {
            cells.push({
              start: yStart,
              len: y.text.length,
              content: (
                <>
                  {conj.prop && (
                    <em>
                      {conj.prop
                        .map((p) => `[${p.pos}: ${p.type}]`)
                        .join("; ")
                        .concat(" — ")}
                    </em>
                  )}
                  {y.suffix && <strong>{y.suffix}) </strong>}
                  {conj.gloss?.map((g) => g.gloss).join("/")}
                </>
              ),
            });
          }
        }
      }
      start += x.text.length;
    } else {
      start += x.text.length;
    }
  }

  start = 0;
  if (typeof curtiz !== "string") {
    for (const { startIdx, results } of curtiz.hits) {
      for (const { endIdx, run, results: subresults } of results) {
        if (typeof run === "string") {
          start = plain.indexOf(run, start);
        } else {
          const clozeHit = plain.indexOf(
            `${run.left}${run.cloze}${run.right}`,
            start
          );
          if (clozeHit < start) {
            throw new Error("unable to find cloze");
          }
          start = clozeHit + run.left.length;
        }
        const len = curtiz.furigana
          .slice(startIdx, endIdx)
          .flat()
          .map((o) => (typeof o === "string" ? o.length : o.ruby.length))
          .reduce((a, b) => a + b, 0);
        for (const { summary, wordId } of subresults) {
          if (jmdictSeqSeen.has(+wordId)) continue;
          cells.push({ start, len, content: <>{summary}</> });
        }
      }
    }

    const conjugated = curtiz.clozes?.conjugatedPhrases.slice() ?? [];
    conjugated.sort((a, b) => b.cloze.cloze.length - a.cloze.cloze.length);
    for (const { deconj, cloze, lemmas, startIdx, endIdx } of conjugated) {
      const plain = furiganaIdxToPlain(curtiz.furigana);
      const start = findClozeIdx(plain, cloze);
      const content = (
        <>
          🟡 <FuriganaComponent furigana={lemmas[0]} /> →{" "}
          {deconj.map(renderDeconjugation).join("/")} →{" "}
          <FuriganaComponent
            furigana={curtiz.furigana.slice(startIdx, endIdx).flat()}
          />
        </>
      );
      cells.push({ start, len: cloze.cloze.length, content });
    }
  }

  const table: VNode[] = [];
  for (const [rowId, row] of cellFit(cells).entries()) {
    const tds = Array.from(Array(plain.length), (_, i) => <td key={i}></td>);
    for (let i = row.length - 1; i >= 0; i--) {
      const x = row[i];
      tds.splice(
        x.start,
        x.len,
        <td key={x.start} colspan={x.len}>
          <div class="cell">{x.content}</div>
        </td>
      );
    }
    table.push(<tr key={rowId}>{tds}</tr>);
  }

  return (
    <table>
      <thead>
        <tr>
          {plain.split("").map((c, i) => (
            <td key={i}>{c}</td>
          ))}
        </tr>
      </thead>
      <tbody>{table}</tbody>
    </table>
  );
};

function furiganaIdxToPlain(
  furigana: Furigana[][],
  startIdx: number = 0,
  endIdx: undefined | number = undefined
): string {
  return furigana
    .slice(startIdx, endIdx)
    .flat()
    .map((o) => (typeof o === "string" ? o : o.ruby))
    .join("");
}

function findClozeIdx(plain: string, run: ContextCloze): number {
  const clozeHit = plain.indexOf(`${run.left}${run.cloze}${run.right}`);
  if (clozeHit >= 0) {
    return clozeHit + run.left.length;
  }
  throw new Error("cloze not found?");
}

function renderDeconjugation(d: AdjDeconjugated | Deconjugated) {
  if ("auxiliaries" in d && d.auxiliaries.length) {
    return `${d.auxiliaries.join(" + ")} + ${d.conjugation}`;
  }
  return d.conjugation;
}
