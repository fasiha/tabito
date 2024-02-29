import type { APIRoute } from "astro";
import { connectWordIds, getConnectedWordIds } from "../../../db";

export const GET: APIRoute = ({ params }) => {
  const { wordId } = params;
  if (wordId) {
    const result = getConnectedWordIds(wordId, "equivalent");
    return new Response(JSON.stringify(result), jsonOptions);
  }
  return new Response(null, { status: 400, statusText: "Bad request" });
};

export const POST: APIRoute = async ({ params, request }) => {
  const { wordId } = params;
  const payload = await request.json();

  if (wordId && "wordId" in payload) {
    if (wordId === payload.wordId) {
      return new Response();
    }
    const result = connectWordIds(wordId, payload.wordId, "equivalent");
    return new Response(JSON.stringify(result), jsonOptions);
  }
  return new Response(null, { status: 400, statusText: "Bad request" });
};

const jsonOptions: ResponseInit = {
  headers: {
    "Content-Type": "application/json",
  },
};
