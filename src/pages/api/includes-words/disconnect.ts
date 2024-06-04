import type { APIRoute } from "astro";
import { deleteParentChildEdge } from "../../../db";

export const POST: APIRoute = async ({ request }) => {
  const { parentId, childId } = await request.json();
  if (parentId && childId && parentId !== childId) {
    await deleteParentChildEdge(parentId, childId, "includes");
    return new Response();
  }
  return new Response(null, { status: 400, statusText: "Bad request" });
};
