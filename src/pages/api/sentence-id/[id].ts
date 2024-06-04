import type { APIRoute } from "astro";
import { getSentence } from "../../../db";

const DONT_PARSE = true;
export const GET: APIRoute = async ({ params }) => {
  const id = Number(params.id);
  if (isFinite(id)) {
    return new Response(await getSentence(id, DONT_PARSE), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
  return new Response(null, { status: 400, statusText: "Bad request" });
};
