import type { APIRoute } from "astro";
import { clearDocument, enrollSentenceIntoDoc } from "../../../db";

export const DELETE: APIRoute = async ({ params }) => {
  const { docName } = params;
  console.log("DELETING " + docName);
  if (docName) {
    return new Response(JSON.stringify(await clearDocument(docName)), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
  return new Response(null, { status: 400, statusText: "Bad request" });
};

export const POST: APIRoute = async ({ params, request }) => {
  const { docName } = params;
  const payload = await request.json();

  // TODO? io-ts
  if (docName && payload && "plain" in payload) {
    return new Response(JSON.stringify(await enrollSentenceIntoDoc(payload.plain, docName)), {
      headers: {
        "Content-Type": "application/json",
      },
    });
  }
  console.error(`Bad POST: ${docName} must be provided and payload ${payload} must have "plain"`);
  return new Response(null, { status: 400, statusText: "Bad request" });
};
