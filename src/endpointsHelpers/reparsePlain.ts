import type { v1ResSentence } from "curtiz-japanese-nlp";

export const reparsePlain = async (plain: string): Promise<v1ResSentence | undefined> => {
  const res = await fetch(`/api/reparse/${encodeURIComponent(plain)}`);
  if (res.ok) {
    return res.json() as Promise<v1ResSentence>;
  }
  return undefined;
};
