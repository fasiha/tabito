import type { FunctionComponent, FunctionalComponent, VNode } from "preact";
import {
  Signal,
  useComputed,
  useSignal,
  useSignalEffect,
} from "@preact/signals";
import { addSynonym } from "tabito-lib";
import { memo, type TargetedEvent } from "preact/compat";
import { Sentence as SentenceComponent } from "./Sentence";
import type { Furigana } from "curtiz-japanese-nlp";
import type { GrammarConj, Sentence } from "../../interfaces/backend";
import { cellFit, type Cell } from "../../utils/cellFit";
import type { ContextCloze, Word } from "curtiz-japanese-nlp/interfaces";
import type { AdjDeconjugated, Deconjugated } from "kamiya-codec";
import { Furigana as FuriganaComponent } from "./Furigana";
import { WordPicker } from "./WordPicker";
import type {
  IchiranConjProp,
  IchiranGloss as IchiranGlossType,
  IchiranWord,
} from "../../nlp-wrappers/ichiran-types";
import type { SenseAndSub, VocabGrammarProps } from "../commonInterfaces";
import { extractTags, join, prefixNumber } from "../../utils/utils";
import {
  grammarConjEqual,
  senseAndSubEqual,
  vocabEqual,
} from "../../utils/equality";

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

async function sentenceSignalToConnectedWords(
  wordIds: Signal<string[]>,
  connected: Signal<Record<string, Word[]> | undefined>,
  networkFeedback: Signal<string>
) {
  if (!wordIds.value.length) return;

  const res = await fetch(`/api/connected-words/array`, {
    method: "POST",
    body: JSON.stringify({ wordIds }),
    headers: { "Content-Type": "application/json" },
  });
  if (res.ok) {
    connected.value = await res.json();
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

  const connected = useSignal<Record<string, Word[]>>({});
  const connectedNetworkFeedback = useSignal("");

  useSignalEffect(() => {
    plainToSentenceSignal(plain, sentence, networkFeedback);
  });

  const wordIds = useComputed(
    () => sentence.value?.vocab?.map((v) => v.entry.id) ?? []
  );
  // const wordIds = useComputedArray(() => {
  //   return sentence.value?.vocab?.map((v) => v.entry.id) ?? [];
  // });

  useSignalEffect(() => {
    console.log("worIds", wordIds.value);
    sentenceSignalToConnectedWords(
      wordIds,
      connected,
      connectedNetworkFeedback
    );
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
      body.translations.en.push(newTranslation.value);

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

  async function handleNewVocabGrammar({ vocab, grammar }: VocabGrammarProps) {
    if (sentence.value) {
      const newSentence: Sentence = structuredClone(sentence.value);
      if (vocab) {
        if (!newSentence.vocab) {
          newSentence.vocab = [];
        }

        const existingIdx = newSentence.vocab.findIndex((v) =>
          vocabEqual(v, vocab)
        );
        if (existingIdx >= 0) {
          const existing = newSentence.vocab[existingIdx];
          for (const newSense of vocab.senses) {
            const senseIdx = existing.senses.findIndex((s) =>
              senseAndSubEqual(s, newSense)
            );
            if (senseIdx >= 0) {
              existing.senses.splice(senseIdx, 1);
            } else {
              existing.senses.push(newSense);
            }
          }
          if (existing.senses.length === 0) {
            // delete this vocab item if there's no senses in it
            newSentence.vocab.splice(existingIdx, 1);
          }
        } else {
          newSentence.vocab.push(vocab);
        }
        newSentence.vocab.sort((a, b) => a.start - b.start || b.len - a.len);
      }
      if (grammar) {
        if (!newSentence.grammarConj) {
          newSentence.grammarConj = [];
        }

        const existingIdx = newSentence.grammarConj.findIndex((g) =>
          grammarConjEqual(g, grammar)
        );
        if (existingIdx >= 0) {
          newSentence.grammarConj.splice(existingIdx, 1);
        } else {
          newSentence.grammarConj.push(grammar);
        }
      }

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

  return (
    <div>
      {networkFeedback.value && <p>Network feedback: {networkFeedback}</p>}
      {connectedNetworkFeedback.value && (
        <p>Network feedback 2: {connectedNetworkFeedback}</p>
      )}
      {sentence.value && (
        <>
          <h2>
            <SentenceComponent sentence={sentence.value} />
          </h2>

          {sentence.value.vocab?.length && (
            <ul>
              {sentence.value.vocab?.map((v) => (
                <li>
                  <SimpleWord word={v.entry} />
                  {v.senses
                    .map((s) =>
                      s.subsense
                        ? v.entry.sense[s.sense].gloss[s.subsense]
                        : v.entry.sense[s.sense].gloss
                            .map((g) => g.text)
                            .join(", ")
                    )
                    .join("; ")}
                  {v.entry.id in connected.value && (
                    <ul>
                      {connected.value[v.entry.id].map((word) =>
                        word.id !== v.entry.id ? (
                          <li>
                            <SimpleWord word={word} gloss />
                          </li>
                        ) : null
                      )}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}

          <NlpTable
            nlp={sentence.value.nlp}
            onNewVocabGrammar={handleNewVocabGrammar}
            plain={plain}
            vocab={sentence.value.vocab}
            grammarConj={sentence.value.grammarConj}
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
  grammarConj: Sentence["grammarConj"];
  nlp: Sentence["nlp"];
  onNewVocabGrammar: (x: VocabGrammarProps) => void;
  plain: string;
  vocab: Sentence["vocab"];
}

const NlpTable: FunctionalComponent<NlpTableProps> = memo(
  ({ grammarConj, nlp, onNewVocabGrammar, plain, vocab }) => {
    const { ichiran, curtiz, words } = nlp;
    const ichiWords: (string | IchiranWord)[] = ichiran.flatMap(
      (i) => (typeof i === "string" ? [i] : i[0][0]) as (string | IchiranWord)[]
    );

    const tags = typeof curtiz === "string" ? {} : curtiz.tags ?? {};

    const cells: Cell<VNode>[] = [];

    const jmdictSeqSeen = new Set<string>();
    const seenId = (id: string | number, start: number, len: number) =>
      `${id}/${start}/${len}`;
    let start = 0;
    for (const iword of ichiWords) {
      if (typeof iword === "string") {
        // `iword.length` is sometimes fake, like "、" becomes TWO
        // characters <sad>, so increment just by one and then we'll try
        // to recover later. See
        // https://github.com/tshatrov/ichiran/issues/19#issuecomment-1963208246
        start += 1;
        continue;
      }
      const wordOrAlt = iword[1];
      const wordArr =
        "alternative" in wordOrAlt ? wordOrAlt.alternative : [wordOrAlt];
      if (!wordArr.every((w) => w.text.length === wordArr[0].text.length)) {
        throw new Error(
          "invariant fail: expect all alternatives to have same length"
        );
      }

      // because sometimes Ichiran expands punctuation so try to adjust
      // start. See above and
      // https://github.com/tshatrov/ichiran/issues/19#issuecomment-1963208246
      {
        const proposedStarts = wordArr
          .map((w) => plain.indexOf(w.text, start))
          .filter((x) => x >= 0);
        if (proposedStarts.length) {
          start = Math.min(...proposedStarts);
        }
      }
      for (const x of wordArr) {
        // this is IchiranSingle WITH gloss
        if ("gloss" in x && x.gloss) {
          jmdictSeqSeen.add(seenId(x.seq, start, x.text.length));
          cells.push({
            start,
            len: x.text.length,
            content: (
              <IchiranGloss
                origGloss={x.gloss}
                word={words[x.seq]}
                tags={tags}
                onNewVocabGrammar={onNewVocabGrammar}
                start={start}
                len={x.text.length}
                vocab={vocab}
              />
            ),
          });
        }
        if (x.conj?.length) {
          // IchiranSingle with NO gloss but with conj
          jmdictSeqSeen.add(seenId(x.seq, start, x.text.length));
          for (const conj of x.conj) {
            cells.push({
              start: start,
              len: x.text.length,
              content: (
                <>
                  {x.suffix && <strong>{x.suffix} </strong>}
                  {ConjProp(conj.prop)}
                  {"via" in conj && conj.via && (
                    <>
                      via{" "}
                      {join(
                        conj.via.map((conj) => ConjProp(conj.prop)),
                        " or "
                      )}
                    </>
                  )}
                  <IchiranGloss
                    origGloss={
                      "gloss" in conj
                        ? conj.gloss
                        : conj.via.flatMap((conj) => conj.gloss)
                    }
                    word={words[x.seq]}
                    tags={tags}
                    onNewVocabGrammar={onNewVocabGrammar}
                    seq={x.seq}
                    start={start}
                    len={x.text.length}
                    vocab={vocab}
                  />
                </>
              ),
            });
          }
        }
        if ("components" in x && x.components) {
          let yStart = start;
          for (const y of x.components) {
            yStart = plain.indexOf(y.text, start);
            let len = y.text.length;
            if (yStart < 0 && len > 1) {
              // sometimes this happens, e.g., full text = "死んじまえ"
              // but components' text = ["死んで", "じまえ"], notice the
              // extra `で`

              // if this happens, try to shave off a character and retry
              yStart = plain.indexOf(y.text.slice(0, -1), start);
              len -= 1;
              if (yStart < 0) {
                yStart = 0;
                len = 1;
              }
            }

            // these two `if`s are very very similar to the above, but I
            // don't want to DRY this yet
            if ("gloss" in y && y.gloss) {
              jmdictSeqSeen.add(seenId(y.seq, yStart, len));
              cells.push({
                start: yStart,
                len,
                content: (
                  <IchiranGloss
                    origGloss={y.gloss}
                    word={words[y.seq]}
                    tags={tags}
                    onNewVocabGrammar={onNewVocabGrammar}
                    start={yStart}
                    len={len}
                    vocab={vocab}
                  />
                ),
              });
            }
            if (y.conj.length) {
              jmdictSeqSeen.add(seenId(y.seq, yStart, len));
              for (const conj of y.conj) {
                cells.push({
                  start: yStart,
                  len: len,
                  content: (
                    <>
                      {y.suffix && <strong>{y.suffix} </strong>}
                      {ConjProp(conj.prop)}
                      {"via" in conj && conj.via && (
                        <>
                          {" "}
                          via{" "}
                          {join(
                            conj.via.map((conj) => ConjProp(conj.prop)),
                            " or "
                          )}
                        </>
                      )}
                      <IchiranGloss
                        origGloss={
                          "gloss" in conj
                            ? conj.gloss
                            : conj.via.flatMap((conj) => conj.gloss)
                        }
                        word={words[y.seq]}
                        tags={tags}
                        onNewVocabGrammar={onNewVocabGrammar}
                        seq={y.seq}
                        start={yStart}
                        len={len}
                        vocab={vocab}
                      />
                    </>
                  ),
                });
              }
            }
          }
        }
      }
      start += wordArr[0].text.length;
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
          for (const { wordId, word, tags } of subresults) {
            if (jmdictSeqSeen.has(seenId(wordId, start, len))) continue;
            jmdictSeqSeen.add(seenId(wordId, start, len));
            const thisStart = start; // otherwise closure below will capture original scope
            const onNewVocab = (sense: SenseAndSub) =>
              onNewVocabGrammar({
                vocab: {
                  entry: word!,
                  start: thisStart,
                  len,
                  senses: [sense],
                  tags: extractTags(word!, tags),
                },
              });
            const alreadyPicked: SenseAndSub[] =
              vocab
                ?.filter(
                  (v) =>
                    v.entry.id === wordId && v.start === start && v.len === len
                )
                .flatMap((v) => v.senses) ?? [];
            cells.push({
              start,
              len,
              content: (
                <WordPicker
                  onNewVocab={onNewVocab}
                  word={word!}
                  tags={tags}
                  alreadyPicked={alreadyPicked}
                />
              ),
            });
          }
        }
      }

      const conjugated = curtiz.clozes?.conjugatedPhrases.slice() ?? [];
      conjugated.sort((a, b) => b.cloze.cloze.length - a.cloze.cloze.length);
      for (const { deconj, cloze, lemmas, startIdx, endIdx } of conjugated) {
        const start = findClozeIdx(plain, cloze);
        const len = cloze.cloze.length;

        const grammar = {
          start,
          len,
          lemmas,
        };
        const handleClick = (deconj: GrammarConj["deconj"]) =>
          onNewVocabGrammar({
            grammar: { ...grammar, deconj },
          });
        const content = (
          <>
            🟡 <FuriganaComponent furigana={lemmas[0]} /> →{" "}
            <FuriganaComponent
              furigana={curtiz.furigana.slice(startIdx, endIdx).flat()}
            />{" "}
            via
            <ul>
              {deconj.map((deconj, di) => {
                const className = grammarConj?.find((g) =>
                  grammarConjEqual(g, { ...grammar, deconj })
                )
                  ? "already-picked"
                  : undefined;
                return (
                  <li class={className}>
                    <button onClick={() => handleClick(deconj)}>
                      {prefixNumber(di)}
                    </button>{" "}
                    {renderDeconjugation(deconj)}
                  </li>
                );
              })}
            </ul>
          </>
        );
        cells.push({ start, len, content });
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
  }
);

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

interface IchiranGlossProps {
  /** Only used if JMdict `seq`/`word` not available */
  origGloss: IchiranGlossType[];
  onNewVocabGrammar: (x: VocabGrammarProps) => void;
  /** Only needed for conjugated phrases (fake Ichiran sequence IDs not
   * in JMdict) */
  seq?: number;
  tags: Record<string, string>;
  /** similarly might be missing if we can't recover the root Ichiran
   * sequence ID for conjugations */
  word: Word | undefined;
  start: number;
  len: number;
  vocab: Sentence["vocab"];
}
const IchiranGloss: FunctionalComponent<IchiranGlossProps> = ({
  origGloss,
  onNewVocabGrammar,
  seq,
  tags,
  word,
  start,
  len,
  vocab,
}) => {
  const onNewVocab = (sense: SenseAndSub) =>
    onNewVocabGrammar({
      vocab: {
        entry: word!,
        start,
        len,
        senses: [sense],
        tags: extractTags(word!, tags),
      },
    });
  const alreadyPicked: SenseAndSub[] =
    vocab
      ?.filter(
        (v) => v.entry.id === word!.id && v.start === start && v.len === len
      )
      .flatMap((v) => v.senses) ?? [];
  return word ? (
    <WordPicker
      onNewVocab={onNewVocab}
      word={word}
      tags={tags}
      alreadyPicked={alreadyPicked}
    />
  ) : (
    <>
      (❓ {seq}) {origGloss.map((g) => g.gloss).join("/")}
    </>
  );
};

const ConjProp = (prop: IchiranConjProp[]) => (
  <em>
    {join(
      prop.map((p) => (
        <>
          [{p.pos}: {p.type}
          {p.fml && Formal}]
        </>
      )),
      "; "
    )}{" "}
  </em>
);

const Formal = (
  <span class="unitalicize-emoji" title="Formal">
    {" "}
    🤵
  </span>
);

const SimpleWord: FunctionComponent<{ word: Word; gloss?: boolean }> = ({
  word,
  gloss,
}) => {
  return (
    <>
      {word.id} {word.kanji.map((k) => k.text).join("・")} 「
      {word.kana.map((k) => k.text).join("・")}」{" "}
      {gloss &&
        word.sense.map((s) => s.gloss.map((g) => g.text).join(", ")).join("; ")}
    </>
  );
};
