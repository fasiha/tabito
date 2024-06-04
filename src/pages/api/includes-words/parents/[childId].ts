import type { APIRoute } from "astro";
import { allParents, getJmdicts } from "../../../../db";

export const GET: APIRoute = async ({ params }) => {
  const { childId } = params;
  if (childId) {
    const wordIds = await allParents(childId, "includes");
    const words = await getJmdicts(wordIds);
    return new Response(JSON.stringify(words), jsonOptions);
  }
  return new Response(null, { status: 400, statusText: "Bad request" });
};

const jsonOptions: ResponseInit = {
  headers: {
    "Content-Type": "application/json",
  },
};
