import type { APIRoute } from "astro";
import { allChildren, getJmdicts } from "../../../../db";

export const GET: APIRoute = async ({ params }) => {
  const { parentId } = params;
  if (parentId) {
    const children = await allChildren(parentId, "includes");
    const words = await getJmdicts(children.map((c) => c.childId));
    return new Response(JSON.stringify(words), jsonOptions);
  }
  return new Response(null, { status: 400, statusText: "Bad request" });
};

const jsonOptions: ResponseInit = {
  headers: {
    "Content-Type": "application/json",
  },
};
