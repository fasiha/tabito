import type { APIRoute } from "astro";
import { deleteParentChildEdge, newParentChildEdge } from "../../../db";
import { isSubAndSense } from "../../../utils/isA";
import type { Word } from "curtiz-japanese-nlp";
import type { SenseAndSub } from "../../../components/commonInterfaces";

export interface IncludesWordsConnectPost {
  parentId: Word["id"];
  childId: Word["id"];
  childSenses: SenseAndSub[];
}

export const POST: APIRoute = async ({ request }) => {
  const { parentId, childId, childSenses } = (await request.json()) as IncludesWordsConnectPost;
  if (parentId && childId && parentId !== childId && Array.isArray(childSenses) && childSenses.every(isSubAndSense)) {
    await newParentChildEdge(parentId, childId, "includes", childSenses);
    return new Response();
  }
  return new Response(null, { status: 400, statusText: "Bad request" });
};

export const DELETE: APIRoute = async ({ request }) => {
  const { parentId, childId } = (await request.json()) as Pick<IncludesWordsConnectPost, "childId" | "parentId">;
  if (parentId && childId) {
    await deleteParentChildEdge(parentId, childId, "includes");
    return new Response();
  }
  return new Response(null, { status: 400, statusText: "Bad request" });
};
