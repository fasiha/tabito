import fetch from "node-fetch";
import type { v1ResSentence, Furigana, Word } from "curtiz-japanese-nlp/interfaces";

const CURTIZ_URL = process.env["CURTIZ_URL"] || "http://127.0.0.1:8133";

export async function stringToFurigana(raw: string): Promise<Furigana[]> {
  const data: v1ResSentence = await analyzeString(raw);
  if (typeof data === "string") {
    return [data];
  }
  return data.furigana.flat();
}

export async function analyzeString(raw: string): Promise<v1ResSentence> {
  const reply = await fetch(CURTIZ_URL + "/api/v1/sentence?includeWord=1&includeClozes=1", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sentence: raw }),
  });
  const data: v1ResSentence[] = (await reply.json()) as any;
  return data[0];
}

export async function jmdictSeqsToWords(seqs: number[]): Promise<(Word | undefined)[]> {
  const ret: (Word | undefined)[] = [];
  for (const x of seqs) {
    // serialize this, don't want to DDOS the Curtiz server. If we ever
    // want to parallelize this safely (say two concurrent workers), see
    // https://gist.github.com/fasiha/7f20043a12ce93401d8473aee037d90a#file-demo-ts-L29-L77
    const reply = await fetch(`${CURTIZ_URL}/api/v1/jmdict/${x}`);
    ret.push(reply.ok ? ((await reply.json()) as Word) : undefined);
  }
  return ret;
}
