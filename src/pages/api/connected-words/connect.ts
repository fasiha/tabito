import type { APIRoute } from "astro";
import { connectWordIds } from "../../../db";

export const POST: APIRoute = async ({ request }) => {
  const { wordIds } = await request.json();
  if (
    Array.isArray(wordIds) &&
    wordIds.length === 2 &&
    wordIds.every((s) => typeof s === "string")
  ) {
    connectWordIds(wordIds[0], wordIds[1], "equivalent");
    return new Response();
  }
  return new Response(null, { status: 400, statusText: "Bad request" });
};
