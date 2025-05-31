import type { APIRoute } from "astro";
import { getSentence, hasJmdicts, upsertSentence } from "../../../db";
import type { Sentence } from "../../../interfaces/backend";

export interface GetResponse {
  sentence: Sentence;
  seenWordIds: Record<string, true>;
}
/**
 * This is about loading data from SQLite: it's already been parsed by Curtiz and Ichiran.
 */
export const GET: APIRoute = async ({ params }) => {
  const { plain } = params;
  if (plain) {
    const sentence = await getSentence(plain);
    if (!sentence) {
      return new Response(null, { status: 404, statusText: "Not found" });
    }
    let seenWordIds: Record<string, true> = {};
    if (typeof sentence.nlp.curtiz !== "string") {
      const allWordIds = sentence.nlp.curtiz.hits.flatMap((h) =>
        h.results.flatMap((r) => r.results.map((w) => w.wordId)),
      );
      seenWordIds = Object.fromEntries((await hasJmdicts(allWordIds)).map((id) => [id, true]));
    }
    const body: GetResponse = { sentence, seenWordIds };
    return new Response(JSON.stringify(body), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
  return new Response(null, { status: 400, statusText: "Bad request" });
};

export const POST: APIRoute = async ({ params, request }) => {
  const { plain } = params;
  const payload = await request.json();

  // TODO? io-ts
  if (plain && payload && "sentence" in payload) {
    return new Response(JSON.stringify(await upsertSentence(payload.sentence)), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
  console.error(`Bad POST: plain must be provided and payload payload=${payload} must have "sentence"`);
  return new Response(null, { status: 400, statusText: "Bad request" });
};
