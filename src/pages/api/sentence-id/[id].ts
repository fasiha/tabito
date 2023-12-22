import type { APIRoute } from "astro";
import { getSentence } from "../../../db";

const DONT_PARSE = true;
export const GET: APIRoute = ({ params }) => {
  const id = Number(params.id);
  if (isFinite(id)) {
    return new Response(getSentence(id, DONT_PARSE) as string, {
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
  return new Response(null, { status: 400, statusText: "Bad request" });
};
