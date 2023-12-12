import fetch from "node-fetch";
import type { v1ResSentence, Furigana } from "curtiz-japanese-nlp/interfaces";

const CURTIZ_URL = process.env["CURTIZ_URL"] || "http://127.0.0.1:8133";

export async function stringToFurigana(raw: string): Promise<Furigana[]> {
  const reply = await fetch(
    CURTIZ_URL + "/api/v1/sentence?includeWord=1&includeClozes=1",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sentence: raw }),
    }
  );
  const data: v1ResSentence[] = (await reply.json()) as any;
  if (typeof data[0] === "string") {
    return [data[0]];
  }
  return data[0].furigana.flat();
}
