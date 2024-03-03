import type { APIRoute } from "astro";
import { newParentChildEdge } from "../../../db";
import { isSubAndSense } from "../../../utils/isA";
import type { Word } from "curtiz-japanese-nlp";
import type { SenseAndSub } from "../../../components/commonInterfaces";

export interface IncludesWordsConnectPost {
  parentId: Word["id"];
  childId: Word["id"];
  childSenses: SenseAndSub[];
}

export const POST: APIRoute = async ({ request }) => {
  const { parentId, childId, childSenses } =
    (await request.json()) as IncludesWordsConnectPost;
  if (
    parentId &&
    childId &&
    parentId !== childId &&
    Array.isArray(childSenses) &&
    childSenses.every(isSubAndSense)
  ) {
    newParentChildEdge(parentId, childId, "includes", childSenses);
    return new Response();
  }
  return new Response(null, { status: 400, statusText: "Bad request" });
};
