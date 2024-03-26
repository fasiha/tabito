import type { VNode } from "preact";
import type { GrammarConj, Sentence } from "../../interfaces/backend";
import { type Cell } from "../../utils/cellFit";
import type { ContextCloze, Word } from "curtiz-japanese-nlp/interfaces";
import { Furigana as FuriganaComponent } from "./Furigana";
import { WordPicker } from "./WordPicker";
import type {
  IchiranConjProp,
  IchiranWord,
} from "../../nlp-wrappers/ichiran-types";
import type { SenseAndSub, VocabGrammarProps } from "../commonInterfaces";
import { extractTags, join, prefixNumber } from "../../utils/utils";
import { grammarConjEqual } from "../../utils/equality";
import { IchiranGloss } from "./IchiranGloss";
import type { AdjDeconjugated, Deconjugated } from "kamiya-codec";

export interface Props {
  grammarConj: Sentence["grammarConj"];
  nlp: Sentence["nlp"];
  onNewVocabGrammar: (x: VocabGrammarProps) => void;
  plain: string;
  vocab: Sentence["vocab"];
}

export function parseNlp(props: Props): {
  cellsIchiran: Cell<VNode<{}>, Word>[];
  cellsCurtizVocab: Cell<VNode, Word>[];
  cellsCurtizGrammar: Cell<VNode, GrammarConj["deconj"][]>[];
} {
  const {
    nlp: { curtiz },
  } = props;

  const tags = typeof curtiz === "string" ? {} : curtiz.tags ?? {};

  const { cellsIchiran, jmdictSeqStartLenSeen, jmdictSeqSeen } = parseIchiran(
    props,
    tags
  );

  const { cellsCurtizVocab, cellsCurtizGrammar } = parseCurtiz(
    props,
    jmdictSeqStartLenSeen,
    jmdictSeqSeen
  );

  return { cellsIchiran, cellsCurtizGrammar, cellsCurtizVocab };
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

const seenId = (id: string | number, start: number, len: number) =>
  `${id}/${start}/${len}`;

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

function parseIchiran(args: Props, tags: Record<string, string>) {
  const { nlp, onNewVocabGrammar, plain, vocab } = args;
  const { words, ichiran } = nlp;

  const cellsIchiran: Cell<VNode, Word>[] = [];
  const jmdictSeqStartLenSeen = new Set<string>();
  const jmdictSeqSeen = new Set<string>();

  const ichiWords: (string | IchiranWord)[] = ichiran.flatMap(
    (i) => (typeof i === "string" ? [i] : i[0][0]) as (string | IchiranWord)[]
  );

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
        jmdictSeqStartLenSeen.add(seenId(x.seq, start, x.text.length));
        jmdictSeqSeen.add(x.seq.toString());
        jmdictSeqSeen.add(words[x.seq]?.id ?? -1);
        cellsIchiran.push({
          start,
          len: x.text.length,
          extra: words[x.seq],
          content: (
            <>
              {x.counter && <em>({x.counter.value}) </em>}
              <IchiranGloss
                origGloss={x.gloss}
                word={words[x.seq]}
                tags={tags}
                onNewVocabGrammar={onNewVocabGrammar}
                start={start}
                len={x.text.length}
                vocab={vocab}
              />
            </>
          ),
        });
      }
      if ("conj" in x && x.conj?.length) {
        // IchiranSingle with NO gloss but with conj
        jmdictSeqStartLenSeen.add(seenId(x.seq, start, x.text.length));
        jmdictSeqSeen.add(x.seq.toString());
        jmdictSeqSeen.add(words[x.seq]?.id ?? -1);
        for (const conj of x.conj) {
          cellsIchiran.push({
            start: start,
            len: x.text.length,
            extra: words[x.seq],
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
            jmdictSeqStartLenSeen.add(seenId(y.seq, yStart, len));
            jmdictSeqSeen.add(y.seq.toString());
            jmdictSeqSeen.add(words[y.seq]?.id ?? -1);
            cellsIchiran.push({
              start: yStart,
              len,
              extra: words[y.seq],
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
            jmdictSeqStartLenSeen.add(seenId(y.seq, yStart, len));
            jmdictSeqSeen.add(y.seq.toString());
            jmdictSeqSeen.add(words[y.seq]?.id ?? -1);
            for (const conj of y.conj) {
              cellsIchiran.push({
                start: yStart,
                len: len,
                extra: words[y.seq],
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
  return { cellsIchiran, jmdictSeqStartLenSeen, jmdictSeqSeen };
}
function parseCurtiz(
  args: Props,
  jmdictSeqStartLenSeen: Set<string>,
  jmdictSeqSeen: Set<string>
) {
  const { nlp, onNewVocabGrammar, plain, vocab, grammarConj } = args;
  const { curtiz } = nlp;

  const cellsCurtizVocab: Cell<VNode, Word>[] = [];
  const cellsCurtizGrammar: Cell<VNode, GrammarConj["deconj"][]>[] = [];
  let start = 0;
  if (typeof curtiz !== "string") {
    for (const { startIdx, results } of curtiz.hits) {
      for (const { endIdx, results: subresults } of results) {
        start = curtiz.furigana
          .slice(0, startIdx)
          .flat()
          .map((s) => (typeof s === "string" ? s.length : s.ruby.length))
          .reduce((prev, curr) => prev + curr, 0);

        const len = curtiz.furigana
          .slice(startIdx, endIdx)
          .flat()
          .map((o) => (typeof o === "string" ? o.length : o.ruby.length))
          .reduce((a, b) => a + b, 0);
        for (const { wordId, word, tags } of subresults) {
          if (jmdictSeqStartLenSeen.has(seenId(wordId, start, len))) continue;
          jmdictSeqStartLenSeen.add(seenId(wordId, start, len));
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
          const next = {
            start,
            len,
            extra: word!,
            content: (
              <WordPicker
                onNewVocab={onNewVocab}
                word={word!}
                tags={tags}
                alreadyPicked={alreadyPicked}
              />
            ),
          };
          if (jmdictSeqSeen.has(wordId)) cellsCurtizVocab.unshift(next);
          else cellsCurtizVocab.push(next);
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
      cellsCurtizGrammar.push({ start, len, content, extra: deconj });
    }
  }
  return { cellsCurtizVocab, cellsCurtizGrammar };
}
