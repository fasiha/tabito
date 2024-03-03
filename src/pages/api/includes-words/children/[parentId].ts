import type { APIRoute } from "astro";
import { allChildren, getJmdicts } from "../../../../db";

export const GET: APIRoute = ({ params }) => {
  const { parentId } = params;
  if (parentId) {
    const children = allChildren(parentId, "includes");
    const words = getJmdicts(children.map((c) => c.childId));
    return new Response(JSON.stringify(words), jsonOptions);
  }
  return new Response(null, { status: 400, statusText: "Bad request" });
};

const jsonOptions: ResponseInit = {
  headers: {
    "Content-Type": "application/json",
  },
};
