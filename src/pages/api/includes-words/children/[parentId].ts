import type { APIRoute } from "astro";
import { allChildren, getJmdicts } from "../../../../db";

export const GET: APIRoute = ({ params }) => {
  const { parentId } = params;
  if (parentId) {
    const wordIds = allChildren(parentId, "includes");
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
