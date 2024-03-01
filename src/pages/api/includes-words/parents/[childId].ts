import type { APIRoute } from "astro";
import { allParents, getJmdicts } from "../../../../db";

export const GET: APIRoute = ({ params }) => {
  const { childId } = params;
  if (childId) {
    const wordIds = allParents(childId, "includes");
    const words = getJmdicts(wordIds);
    return new Response(JSON.stringify(words), jsonOptions);
  }
  return new Response(null, { status: 400, statusText: "Bad request" });
};

const jsonOptions: ResponseInit = {
  headers: {
    "Content-Type": "application/json",
  },
};
