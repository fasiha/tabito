import type { APIRoute } from "astro";
import { allParents, getJmdicts } from "../../../../db";
import type { Word } from "curtiz-japanese-nlp/interfaces";

export const POST: APIRoute = async ({ request }) => {
  const { wordIds } = await request.json();

  if (Array.isArray(wordIds) && wordIds.every((s) => typeof s === "string")) {
    const result: Record<string, Word[]> = {};
    for (const wordId of wordIds) {
      if (wordId in result) continue;
      const parentIds = await allParents(wordId, "includes");
      result[wordId] = await getJmdicts(parentIds);
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
