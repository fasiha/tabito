import type { FunctionalComponent, VNode } from "preact";
import { Signal, useComputed, useSignal, useSignalEffect } from "@preact/signals";
import { addSynonym, validateSynonyms } from "tabito-lib";
import { memo, useMemo, type TargetedEvent } from "preact/compat";
import { Sentence as SentenceComponent } from "./Sentence";
import type { Furigana } from "curtiz-japanese-nlp";
import type { GrammarConj, Sentence } from "../../interfaces/backend";
import type { Word } from "curtiz-japanese-nlp/interfaces";
import type { SenseAndSub, VocabGrammarProps } from "../commonInterfaces";
import { deconjEqual, grammarConjEqual, senseAndSubEqual, vocabEqual } from "../../utils/equality";
import type {
  IncludesWordsChildrenArrayPost,
  IncludesWordsChildrenArrayPostResponse,
} from "../../pages/api/includes-words/children/array";
import type { IncludesWordsConnectPost } from "../../pages/api/includes-words/connect";
import { SimpleWord } from "./SimpleWord";
import { NlpTable } from "./NlpTable";
import { parseNlp } from "./parseNlp";
import { dedupeBy, furiganaToPlain } from "../../utils/utils";
import type { Cell } from "../../utils/cellFit";
import { Jdepp } from "./Jdepp";
import type { GetResponse } from "../../pages/api/sentence/[plain]";

interface Props {
  plain: string;
}

async function plainToSentenceSignal(
  plain: string,
  sentence: Pick<Signal<Sentence | undefined>, "value">,
  networkFeedback: Signal<string>,
  seenWordIds?: Signal<Record<string, true>>,
) {
  const res = await fetch(`/api/sentence/${plain}`);
  if (res.ok) {
    const { sentence: sentenceObj, seenWordIds: seenWordIdsObj }: GetResponse = await res.json();
    sentenceObj.furigana.filter((x) => x !== ""); // ignore empty strings in case we get any
    sentence.value = sentenceObj;
    if (seenWordIds) seenWordIds.value = seenWordIdsObj;
    networkFeedback.value = "";
  } else {
    networkFeedback.value = `${res.status} ${res.statusText}`;
  }
}

async function sentenceSignalToGraphs(
  wordIds: Signal<string[]>,
  connected: Signal<Record<string, Word[]>>,
  connectedNetworkFeedback: Signal<string>,
  parentToChildren: Signal<Record<string, { word: Word; senses: SenseAndSub[] }[]>>,
  parentToChildrenNetworkFeedback: Signal<string>,
) {
  if (!wordIds.value.length) return;
  {
    const res = await fetch(`/api/connected-words/array`, {
      ...jsonHeaders,
      method: "POST",
      body: JSON.stringify({ wordIds }),
    });
    if (res.ok) {
      connected.value = await res.json();
      connectedNetworkFeedback.value = "";
    } else {
      connectedNetworkFeedback.value = `${res.status} ${res.statusText}`;
    }
  }
  {
    const body: IncludesWordsChildrenArrayPost = { wordIds: wordIds.value };
    const res = await fetch(`/api/includes-words/children/array`, {
      ...jsonHeaders,
      method: "POST",
      body: JSON.stringify(body),
    });
    if (res.ok) {
      parentToChildren.value = (await res.json()) as IncludesWordsChildrenArrayPostResponse;
      parentToChildrenNetworkFeedback.value = "";
    } else {
      parentToChildrenNetworkFeedback.value = `${res.status} ${res.statusText}`;
    }
  }
}

export const SentenceEditor: FunctionalComponent<Props> = ({ plain }) => {
  const sentence = useSignal<Sentence | undefined>(undefined);
  const seenWordIds = useSignal<Record<string, true>>({});
  const networkFeedback = useSignal("");
  const newTranslation = useSignal("");
  const synonymSentence = useSignal("");
  const synonymWord = useSignal<[string, string]>(["", ""]);
  const newCitation = useSignal<undefined | string>(undefined);
  const newFurigana = useSignal<Record<number, string>>({});
  const connected = useSignal<Record<Word["id"], Word[]>>({});
  const connectedNetworkFeedback = useSignal("");
  const importFrom = useSignal<string>("");

  const parentToChildren = useSignal<Record<Word["id"], { word: Word; senses: SenseAndSub[] }[]>>({});
  const parentToChildrenNetworkFeedback = useSignal("");

  useSignalEffect(() => {
    plainToSentenceSignal(plain, sentence, networkFeedback, seenWordIds);
  });

  const wordIds = useComputed(() => sentence.value?.vocab?.map((v) => v.entry.id) ?? []);

  useSignalEffect(() => {
    sentenceSignalToGraphs(
      wordIds,
      connected,
      connectedNetworkFeedback,
      parentToChildren,
      parentToChildrenNetworkFeedback,
    );
  });

  const nlp = useMemo(() => {
    if (sentence.value) {
      return parseNlp({
        plain,
        nlp: sentence.value.nlp,
        vocab: sentence.value.vocab,
        grammarConj: sentence.value.grammarConj,
        onNewVocabGrammar: handleNewVocabGrammar,
      });
    }
  }, [plain, sentence.value?.nlp, sentence.value?.vocab, sentence.value?.grammarConj]);

  function handleInputTranslation(ev: TargetedEvent<HTMLInputElement, InputEvent>) {
    newTranslation.value = ev.currentTarget.value;
  }

  async function handleSubmitTranslation(ev: TargetedEvent<HTMLFormElement, SubmitEvent>) {
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
    if (newCitation.value === undefined) {
      newCitation.value = sentence.value?.citation || "";
    } else {
      newCitation.value = undefined;
    }
  }

  function handleInputCitation(ev: TargetedEvent<HTMLInputElement, InputEvent>) {
    newCitation.value = ev.currentTarget.value;
  }

  async function handleSubmitCitation(ev: TargetedEvent<HTMLFormElement, SubmitEvent>) {
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

  function handleInputSynonymSent(ev: TargetedEvent<HTMLInputElement, InputEvent>) {
    synonymSentence.value = ev.currentTarget.value;
  }

  async function handleSubmitSynonymSent(ev: TargetedEvent<HTMLFormElement, SubmitEvent>) {
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
      const newSynonyms = sentence.value.synonyms?.filter(([oldSyn, oldAlt]) => !(oldSyn === syn && oldAlt === alt));
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

  function handleInputSynonymWord1(ev: TargetedEvent<HTMLInputElement, InputEvent>) {
    synonymWord.value = [ev.currentTarget.value, synonymWord.value[1]];
  }
  function handleInputSynonymWord2(ev: TargetedEvent<HTMLInputElement, InputEvent>) {
    synonymWord.value = [synonymWord.value[0], ev.currentTarget.value];
  }

  async function handleSubmitSynonymWord(ev: TargetedEvent<HTMLFormElement, SubmitEvent>) {
    ev.preventDefault();
    if (sentence.value && synonymWord.value[0]) {
      const furiganaResponse = synonymWord.value[1] ? await fetch(`/api/furigana/${synonymWord.value[1]}`) : undefined;
      if (furiganaResponse === undefined || furiganaResponse.ok) {
        const newSynonyms = sentence.value.synonyms ?? [];
        if (furiganaResponse) {
          const synFurigana: Furigana[] = await furiganaResponse.json();
          newSynonyms.push([synonymWord.value[0], synFurigana]);
        } else {
          newSynonyms.push([synonymWord.value[0], []]);
        }

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

        const existingIdx = newSentence.vocab.findIndex((v) => vocabEqual(v, vocab));
        if (existingIdx >= 0) {
          const existing = newSentence.vocab[existingIdx];
          for (const newSense of vocab.senses) {
            const senseIdx = existing.senses.findIndex((s) => senseAndSubEqual(s, newSense));
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

        const existingIdx = newSentence.grammarConj.findIndex((g) => grammarConjEqual(g, grammar));
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

  const wordIdBeingDragged = useSignal<string | undefined>(undefined);
  const wordIdUnder = useSignal<string | undefined>(undefined);
  const dropValid = useSignal<boolean>(false);
  const dragType = useSignal<undefined | "connected" | "parentChild">(undefined);

  function handleDragStart(event: TargetedEvent<HTMLButtonElement, DragEvent>) {
    const targetDragType = event.currentTarget.dataset.dragtype;
    if (targetDragType === "connected" || targetDragType === "parentChild") {
      dragType.value = targetDragType;
      wordIdBeingDragged.value = event.currentTarget.dataset.wordid;
      dropValid.value = false;
    }
  }

  function handleDragOver(event: TargetedEvent<HTMLLIElement, DragEvent>) {
    event.preventDefault();
    const under = event.currentTarget.dataset.wordid;
    if (under !== wordIdUnder.value) {
      if (dragType.value === "connected") {
        wordIdUnder.value = under;
        if (under === wordIdBeingDragged.value) {
          dropValid.value = false;
        } else if (
          !(under! in connected.value) ||
          connected.value[under!].every((w) => w.id !== wordIdBeingDragged.value)
        ) {
          dropValid.value = true;
        } else {
          dropValid.value = false;
        }
      } else if (dragType.value === "parentChild") {
        wordIdUnder.value = under;

        dropValid.value =
          under !== wordIdBeingDragged.value &&
          !!sentence.value?.vocab?.find((v) => v.entry.id === wordIdBeingDragged.value)?.senses;
      }
    }
  }

  async function handleDrop(event: TargetedEvent<HTMLLIElement, DragEvent>) {
    const wordIdDropped = event.currentTarget.dataset.wordid;
    if (dragType.value === "connected" && wordIdBeingDragged.value !== wordIdDropped && dropValid) {
      console.log(`will merge ${wordIdBeingDragged.value} into ${wordIdDropped}`);
      const fetchResult = await fetch("/api/connected-words/connect", {
        ...jsonHeaders,
        method: "POST",
        body: JSON.stringify({
          wordIds: [wordIdBeingDragged.value, wordIdDropped],
        }),
      });
      if (fetchResult.ok) {
        sentenceSignalToGraphs(
          wordIds,
          connected,
          connectedNetworkFeedback,
          parentToChildren,
          parentToChildrenNetworkFeedback,
        );
      }
      // TODO: update connectedNetworkFeedback
    } else if (dragType.value === "parentChild" && wordIdBeingDragged.value !== wordIdDropped && dropValid) {
      const parentId = wordIdDropped;
      const childId = wordIdBeingDragged.value;
      console.log(`child=${childId}, parent=${parentId}`);

      const newChildSenses = sentence.value?.vocab?.find((v) => v.entry.id === childId)?.senses;
      const origChildSenses = parentToChildren.value[parentId ?? ""]?.find((w) => w.word.id === childId)?.senses;
      const childSenses = dedupeBy(
        (newChildSenses || []).concat(origChildSenses || []),
        (s) => `${s.sense}/${s.subsense ?? -1}`,
      );

      if (!(childSenses.length && parentId && childId)) {
        return;
      }
      const body: IncludesWordsConnectPost = {
        childId,
        parentId,
        childSenses,
      };
      const fetchResult = await fetch("/api/includes-words/connect", {
        ...jsonHeaders,
        method: "POST",
        body: JSON.stringify(body),
      });
      if (fetchResult.ok) {
        sentenceSignalToGraphs(
          wordIds,
          connected,
          connectedNetworkFeedback,
          parentToChildren,
          parentToChildrenNetworkFeedback,
        );
        parentToChildrenNetworkFeedback.value = "";
      } else {
        parentToChildrenNetworkFeedback.value = `${fetchResult.status} ${fetchResult.statusText}`;
      }
    }
    wordIdUnder.value = undefined;
    dragType.value = undefined;
    dropValid.value = false;
  }

  // new furigana
  function handleToggleFurigana(idx: number) {
    if (idx in newFurigana.value) {
      const copy = { ...newFurigana.value };
      delete copy[idx];
      newFurigana.value = copy;
    } else {
      const thisFuri = sentence.value?.furigana[idx];
      if (thisFuri && typeof thisFuri === "object" && thisFuri.rt) {
        newFurigana.value = { ...newFurigana.value, [idx]: thisFuri.rt };
      }
    }
  }
  function handleEditFurigana(idx: number, next: string) {
    if (idx in newFurigana.value) {
      newFurigana.value = { ...newFurigana.value, [idx]: next };
    }
  }
  async function handleSubmitFurigana(idx: number, ev: TargetedEvent<HTMLFormElement, Event>) {
    ev.preventDefault();
    const orig = sentence.value?.furigana[idx];
    if (
      sentence.value &&
      newFurigana.value[idx] &&
      newFurigana.value[idx] !== (typeof orig === "object" ? orig.rt : undefined)
    ) {
      const body: Sentence = structuredClone(sentence.value);
      const f = body.furigana[idx];
      if (typeof f === "object") {
        f.rt = newFurigana.value[idx];
      } else {
        throw new Error("TypeScript failed?");
      }

      const request = await fetch(`/api/sentence/${plain}`, {
        ...jsonHeaders,
        body: JSON.stringify({ sentence: body }),
        method: "POST",
      });
      if (request.ok) {
        sentence.value = body; // new value!
        // clear
        networkFeedback.value = "";
        const copy = { ...newFurigana.value };
        delete copy[idx];
        newFurigana.value = copy;
      } else {
        networkFeedback.value = `${request.status} ${request.statusText}. Retry?`;
      }
    }
  }

  function handleEditImportFrom(event: TargetedEvent<HTMLInputElement, InputEvent>) {
    importFrom.value = event.currentTarget.value;
  }

  async function handleSubmitImportFrom(event: TargetedEvent<HTMLFormElement, SubmitEvent>) {
    event.preventDefault();
    const fakeOldSentence = { value: undefined };
    // download old sentence data
    await plainToSentenceSignal(importFrom.value, fakeOldSentence, networkFeedback);
    if (fakeOldSentence.value && sentence.value && nlp) {
      const newSentence = copyAnnotations(
        fakeOldSentence.value,
        sentence.value,
        nlp.cellsIchiran,
        nlp.cellsCurtizVocab,
        nlp.cellsCurtizGrammar,
      );

      const request = await fetch(`/api/sentence/${plain}`, {
        body: JSON.stringify({ sentence: newSentence }),
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (request.ok) {
        sentence.value = newSentence; // new value!
        // clear
        networkFeedback.value = "";
        importFrom.value = "";
      } else {
        networkFeedback.value = `${request.status} ${request.statusText}. Retry?`;
      }
    }
  }

  return (
    <div>
      {networkFeedback.value && <p>Network feedback: {networkFeedback}</p>}
      {connectedNetworkFeedback.value && <p>Network feedback 2: {connectedNetworkFeedback}</p>}
      {parentToChildrenNetworkFeedback.value && <p>Network feedback 3: {parentToChildrenNetworkFeedback}</p>}
      {sentence.value && (
        <>
          {typeof sentence.value.nlp.curtiz !== "string" && (
            <Jdepp furigana={sentence.value.nlp.curtiz.furigana} origBunsetsus={sentence.value.nlp.curtiz.bunsetsus} />
          )}
          <h2>
            <SentenceComponent sentence={sentence.value} />
          </h2>

          {/* Vocab selected and equivalent */}
          <VocabList
            sentence={sentence}
            handleDragOver={handleDragOver}
            handleDrop={handleDrop}
            wordIdUnder={wordIdUnder}
            dropValid={dropValid}
            handleDragStart={handleDragStart}
            handleNewVocabGrammar={handleNewVocabGrammar}
            connected={connected}
            parentToChildren={parentToChildren}
          />

          <NlpTable
            plain={plain}
            cellsIchiran={nlp!.cellsIchiran}
            cellsCurtizVocab={nlp!.cellsCurtizVocab}
            cellsCurtizGrammar={nlp!.cellsCurtizGrammar}
            seenWordIds={seenWordIds.value}
          />

          <p>
            Synonyms (plain: {plain}, boundaries:{" "}
            {sentence.value.furigana.map((f) => (typeof f === "string" ? f : f.ruby)).join("|")} ):
          </p>
          <ul>
            {(sentence.value.synonyms ?? []).map(([syn, alt]) => (
              <li>
                {syn}: {alt.length ? <SentenceComponent sentence={{ furigana: alt }} /> : "-"}{" "}
                <button onClick={() => handleDeleteSynonym(syn, alt)}>Delete</button>
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
                  disabled={
                    !synonymWord.value[0] ||
                    !validateSynonyms({
                      furigana: sentence.value.furigana,
                      synonyms: [[synonymWord.value[0], []]],
                    })
                  }
                >
                  Submit
                </button>
              </form>
            </li>
          </ul>

          <p>Furigana:</p>
          <ul>
            {sentence.value.furigana
              .map((f, i) => [f, i] as const)
              .filter((pair): pair is [Exclude<Furigana, string>, number] => typeof pair[0] !== "string")
              .map(([{ ruby, rt }, idx]) => (
                <li>
                  {ruby}:{" "}
                  {idx in newFurigana.value ? (
                    <form onSubmit={(e) => handleSubmitFurigana(idx, e)}>
                      <input
                        onInput={(e) => handleEditFurigana(idx, e.currentTarget.value)}
                        placeholder="Reading"
                        type="text"
                        value={newFurigana.value[idx]}
                      />{" "}
                      <button type="submit">Submit</button>
                      <button onClick={() => handleToggleFurigana(idx)}>Cancel</button>
                    </form>
                  ) : (
                    <>
                      {rt} <button onClick={() => handleToggleFurigana(idx)}>Edit</button>
                    </>
                  )}
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
                <span>{sentence.value.citation || "(none)"}</span> <button onClick={handleEditCitation}>Edit</button>
              </>
            ) : (
              <>
                <form onSubmit={handleSubmitCitation}>
                  <input onInput={handleInputCitation} type="text" value={newCitation.value} />{" "}
                  <button type="submit">Submit</button>
                  <button onClick={handleEditCitation}>Cancel</button>
                </form>
              </>
            )}
          </p>
          <p>
            Import from{" "}
            <form onSubmit={handleSubmitImportFrom}>
              <input type="text" value={importFrom} onInput={handleEditImportFrom} />
              <button type="submit" disabled={!importFrom.value}>
                Submit
              </button>
            </form>
          </p>
        </>
      )}
    </div>
  );
};

const jsonHeaders = { headers: { "Content-Type": "application/json" } };

interface VocabListProps {
  sentence: Signal<Sentence | undefined>;
  handleDragOver: (event: TargetedEvent<HTMLLIElement, DragEvent>) => void;
  handleDrop: (event: TargetedEvent<HTMLLIElement, DragEvent>) => Promise<void>;
  wordIdUnder: Signal<string | undefined>;
  dropValid: Signal<boolean>;
  handleDragStart: (event: TargetedEvent<HTMLButtonElement, DragEvent>) => void;
  handleNewVocabGrammar: ({ vocab, grammar }: VocabGrammarProps) => Promise<void>;
  connected: Signal<Record<string, Word[]>>;
  parentToChildren: Signal<Record<string, { word: Word; senses: SenseAndSub[] }[]>>;
}

const VocabList: FunctionalComponent<VocabListProps> = memo(
  ({
    sentence,
    handleDragOver,
    handleDrop,
    wordIdUnder,
    dropValid,
    handleDragStart,
    handleNewVocabGrammar,
    connected,
    parentToChildren,
  }) => {
    if (!sentence.value?.vocab?.length) return null;
    return (
      <ul>
        {sentence.value.vocab.map((v) => (
          <li
            data-wordid={v.entry.id}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            style={{
              backgroundColor:
                v.entry.id === wordIdUnder.value ? (dropValid.value ? "DarkGreen" : "DarkRed") : undefined,
            }}
          >
            <button
              title="Drag to equivalent definition"
              data-wordid={v.entry.id}
              data-dragtype={"connected"}
              draggable
              onDragStart={handleDragStart}
            >
              🔗
            </button>
            <button
              title="Drag to parent definition"
              data-wordid={v.entry.id}
              data-dragtype={"parentChild"}
              draggable
              onDragStart={handleDragStart}
            >
              👶
            </button>
            <button title="Remove" onClick={() => handleNewVocabGrammar({ vocab: v })}>
              ❌
            </button>
            <SimpleWord word={v.entry} />
            {v.senses
              .map((s) =>
                s.subsense
                  ? v.entry.sense[s.sense].gloss[s.subsense].text
                  : v.entry.sense[s.sense].gloss.map((g) => g.text).join(", "),
              )
              .join("; ")}
            {v.entry.id in connected.value && (
              <ul>
                <li>Also acceptable</li>
                <ul>
                  {connected.value[v.entry.id].map((word) =>
                    word.id !== v.entry.id ? (
                      <li>
                        <SimpleWord word={word} gloss />
                      </li>
                    ) : null,
                  )}
                </ul>
              </ul>
            )}
            {v.entry.id in parentToChildren.value && (
              <ul>
                <li>Implicit reviews</li>
                <ul>
                  {parentToChildren.value[v.entry.id].map(({ word, senses }) => (
                    <li key={word.id}>
                      <SimpleWord word={word} gloss senses={senses} />
                    </li>
                  ))}
                </ul>
              </ul>
            )}
          </li>
        ))}
      </ul>
    );
  },
);

/**
 * Pure function, returns new copy of `nextOrig`
 */
function copyAnnotations(
  prev: Sentence,
  nextOrig: Sentence,
  cellsIchiran: Cell<VNode<{}>, { word: Word }>[],
  cellsCurtizVocab: Cell<VNode, { word: Word }>[],
  cellsCurtizGrammar: Cell<VNode, GrammarConj["deconj"][]>[],
) {
  const next = structuredClone(nextOrig);

  const prevPlain = furiganaToPlain(prev.furigana);
  const nextPlain = furiganaToPlain(next.furigana);

  // copy some basics
  if (prev.translations) {
    if (!next.translations) next.translations = { en: [] };
    next.translations.en = next.translations.en.concat(prev.translations.en);
  }
  if (!next.citation && prev.citation) next.citation = prev.citation;

  // copy vocab
  for (const v of prev.vocab || []) {
    const prevSnippet = prevPlain.slice(v.start, v.start + v.len);
    const hit = cellsIchiran.concat(cellsCurtizVocab).find((x) => {
      const thisSnippet = nextPlain.slice(x.start, x.start + x.len);
      return prevSnippet === thisSnippet && x.extra.word.id === v.entry.id;
    });
    if (hit) {
      if (!next.vocab) next.vocab = [];
      next.vocab.push({
        ...v,
        start: hit.start,
        len: hit.len,
      });
    }
  }

  // copy grammar conjugations (very similar to above, just slightly
  // different matcher function)
  for (const c of prev.grammarConj || []) {
    const prevSnippet = prevPlain.slice(c.start, c.start + c.len);
    const hit = cellsCurtizGrammar.find((x) => {
      const thisSnippet = nextPlain.slice(x.start, x.start + x.len);
      return prevSnippet === thisSnippet && x.extra.some((dec) => deconjEqual(dec, c.deconj));
    });
    if (hit) {
      if (!next.grammarConj) next.grammarConj = [];
      next.grammarConj.push({
        ...c,
        start: hit.start,
        len: hit.len,
      });
    }
  }

  return next;
}
