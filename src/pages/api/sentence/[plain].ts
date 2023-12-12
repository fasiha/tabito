import type { APIRoute } from "astro";
import { getSentenceFromPlain, upsertSentence } from "../../../db";

const DONT_PARSE = true;
export const GET: APIRoute = ({ params }) => {
  const { plain } = params;
  if (plain) {
    return new Response(getSentenceFromPlain(plain, DONT_PARSE) as string, {
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
    return new Response(JSON.stringify(upsertSentence(payload.sentence)), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
  console.error(
    `Bad POST: plain must be provided and payload payload=${payload} must have "sentence"`
  );
  return new Response(null, { status: 400, statusText: "Bad request" });
};
