import type { APIRoute } from "astro";
import { allChildren, getJmdicts } from "../../../../db";
import type { Word } from "curtiz-japanese-nlp/interfaces";
import type { SenseAndSub } from "../../../../components/commonInterfaces";

export interface IncludesWordsChildrenArrayPost {
  wordIds: string[];
}
export type IncludesWordsChildrenArrayPostResponse = Record<string, { word: Word; senses: SenseAndSub[] }[]>;

export const POST: APIRoute = async ({ request }) => {
  const { wordIds } = (await request.json()) as IncludesWordsChildrenArrayPost;

  if (Array.isArray(wordIds) && wordIds.every((s) => typeof s === "string")) {
    const result: IncludesWordsChildrenArrayPostResponse = {};
    for (const wordId of wordIds) {
      if (wordId in result) continue;
      const children = await allChildren(wordId, "includes");
      if (children.length) {
        result[wordId] = (await getJmdicts(children.map((c) => c.childId))).map((word, idx) => ({
          word,
          senses: children[idx].senses,
        }));
      }
    }
    return new Response(JSON.stringify(result), jsonOptions);
  }
  return new Response(null, { status: 400, statusText: "Bad request" });
};

const jsonOptions: ResponseInit = {
  headers: {
    "Content-Type": "application/json",
  },
};
