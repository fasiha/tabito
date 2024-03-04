import type { FunctionalComponent, VNode } from "preact";
import { memo } from "preact/compat";
import type { GrammarConj, Sentence } from "../../interfaces/backend";
import { cellFit, type Cell } from "../../utils/cellFit";
import type { ContextCloze } from "curtiz-japanese-nlp/interfaces";
import type { AdjDeconjugated, Deconjugated } from "kamiya-codec";
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

interface NlpTableProps {
  grammarConj: Sentence["grammarConj"];
  nlp: Sentence["nlp"];
  onNewVocabGrammar: (x: VocabGrammarProps) => void;
  plain: string;
  vocab: Sentence["vocab"];
}
export const NlpTable: FunctionalComponent<NlpTableProps> = memo(
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
  },
  (prev, next) =>
    prev.grammarConj === next.grammarConj &&
    prev.vocab === next.vocab &&
    prev.plain === next.plain
);
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

export const ConjProp = (prop: IchiranConjProp[]) => (
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
