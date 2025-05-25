import { enrollSentenceIntoDoc, getSentence } from "../db";
import type { AnnotatedSentence, Sentence as SentenceType } from "../interfaces/backend";

interface Args {
  plain: string;
  docName: string;
}

/**
 * For use in Astro frontmatter
 */
export async function loadSentence({ plain, docName }: Args): Promise<AnnotatedSentence | undefined> {
  try {
    await enrollSentenceIntoDoc(plain, docName);
  } catch {
    // noop
  }

  const sentence = await getSentence(plain, false);
  if (!sentence) return sentence;

  const { nlp, ...rest } = sentence;
  const curtiz = typeof nlp?.curtiz === "object" ? nlp.curtiz : undefined;
  const annotated: AnnotatedSentence = {
    ...rest,
    kanjidic: curtiz?.kanjidic,
    lemmaFurigana: curtiz?.lemmaFurigana ?? [],
  };
  return annotated;
}
