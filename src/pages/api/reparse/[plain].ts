import type { APIRoute } from "astro";
import { analyzeString } from "../../../nlp-wrappers/curtiz";

export const GET: APIRoute = async ({ params }) => {
  const { plain } = params;
  if (plain) {
    return new Response(JSON.stringify(await analyzeString(plain)), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
  return new Response(null, { status: 400, statusText: "Bad request" });
};
