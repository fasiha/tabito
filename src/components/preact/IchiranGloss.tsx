import type { FunctionalComponent } from "preact";
import type { Sentence } from "../../interfaces/backend";
import type { Word } from "curtiz-japanese-nlp/interfaces";
import { WordPicker } from "./WordPicker";
import type { IchiranGloss as IchiranGlossType } from "../../nlp-wrappers/ichiran-types";
import type { SenseAndSub, VocabGrammarProps } from "../commonInterfaces";
import { extractTags } from "../../utils/utils";

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
export const IchiranGloss: FunctionalComponent<IchiranGlossProps> = ({
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
