import { unlinkSync } from "node:fs";
import { afterAll, beforeEach, expect, test } from "vitest";
import {
  _overwriteDb,
  allChildren,
  allParents,
  clearDocument,
  connectWordIds,
  db,
  deleteParentChildEdge,
  disconnectWordId,
  enrollSentenceIntoDoc,
  getAllPlains,
  getConnectedWordIds,
  getSentence,
  newParentChildEdge,
  sentenceExists,
  upsertSentence,
} from ".";
import type { Sentence } from "../interfaces/backend";

afterAll(() => unlinkSync("temp1.db"));
beforeEach(async () => {
  await _overwriteDb("temp1.db");
});

test("the overwrite works", async () => {
  const plains = await getAllPlains();
  expect(plains).toStrictEqual([]);
});

test("enroll and clear doc", async () => {
  const query = db.selectFrom("document").select(["docName", "plain"]).where("docName", "=", "myDoc");

  await enrollSentenceIntoDoc("hi", "myDoc");
  expect(await query.execute()).toStrictEqual([{ docName: "myDoc", plain: "hi" }]);

  await clearDocument("myDoc");
  expect(await query.execute()).toStrictEqual([]);
});

test("upsertSentence", async () => {
  const pretendSentence: Partial<Sentence> = { furigana: ["hi there"], citation: "a" };
  await upsertSentence(pretendSentence as any);
  expect(await sentenceExists("hi there")).toBeTruthy();
});

test("upsertSentence conflict", async () => {
  const pretendSentence: Partial<Sentence> = { furigana: ["hi there"], citation: "a" };
  await upsertSentence(pretendSentence as any);

  expect(await getSentence("hi there")).toStrictEqual(pretendSentence);

  // overwrite, with new citation
  const pretendSentence2: Partial<Sentence> = { ...pretendSentence, citation: "b" };
  await upsertSentence(pretendSentence2 as any);

  expect(await getSentence("hi there")).toStrictEqual(pretendSentence2);

  expect((await getAllPlains()).length).toEqual(1);
});

test("connect words", async () => {
  await connectWordIds("a", "b", "equivalent");
  expect(await db.selectFrom("connectedWords").select("wordId").execute()).toStrictEqual([
    { wordId: "a" },
    { wordId: "b" },
  ]);

  expect(await getConnectedWordIds("a", "equivalent")).toStrictEqual(["a", "b"]);
  await connectWordIds("a", "c", "equivalent");
  expect(await getConnectedWordIds("a", "equivalent")).toStrictEqual(["a", "b", "c"]);

  await connectWordIds("x", "y", "equivalent");
  expect(await getConnectedWordIds("a", "equivalent")).toStrictEqual(["a", "b", "c"]);
});

test("connect/disconnect words without anything", async () => {
  expect(await getConnectedWordIds("a", "equivalent")).toStrictEqual([]);
  await disconnectWordId("a", "equivalent");
  expect(await getConnectedWordIds("a", "equivalent")).toStrictEqual([]);
});

test("disconnect words: 2 connected", async () => {
  await connectWordIds("a", "b", "equivalent");

  await disconnectWordId("a", "equivalent");
  expect(await db.selectFrom("connectedWords").select("wordId").execute()).toStrictEqual([]);

  expect(await getConnectedWordIds("a", "equivalent")).toStrictEqual([]);
  expect(await getConnectedWordIds("b", "equivalent")).toStrictEqual([]);
});

test("disconnect words: 3 connected", async () => {
  await connectWordIds("a", "b", "equivalent");
  await connectWordIds("a", "c", "equivalent");

  await disconnectWordId("a", "equivalent");

  expect(await getConnectedWordIds("a", "equivalent")).toStrictEqual([]);
  expect(await getConnectedWordIds("b", "equivalent")).toStrictEqual(["b", "c"]);
  expect(await getConnectedWordIds("c", "equivalent")).toStrictEqual(["b", "c"]);
});

// parent/child maps
test("create parent/child", async () => {
  await newParentChildEdge("a", "x", "includes", []);
  expect(await allParents("x", "includes")).toStrictEqual(["a"]);
  expect(await allChildren("a", "includes")).toStrictEqual([{ childId: "x", senses: [] }]);
  // unknown
  expect(await allParents("UNK", "includes")).toStrictEqual([]);
  expect(await allChildren("UNK", "includes")).toStrictEqual([]);
  // another child
  await newParentChildEdge("a", "y", "includes", []);
  expect(await allChildren("a", "includes")).toStrictEqual([
    { childId: "x", senses: [] },
    { childId: "y", senses: [] },
  ]);
});

test("delete parent/child", async () => {
  await newParentChildEdge("a", "x", "includes", []);
  await deleteParentChildEdge("a", "x", "includes");
  expect(await allParents("x", "includes")).toStrictEqual([]);
  expect(await allChildren("a", "includes")).toStrictEqual([]);

  await newParentChildEdge("a", "x", "includes", []);
  await newParentChildEdge("a", "y", "includes", []);
  await deleteParentChildEdge("a", "x", "includes");
  expect(await allChildren("a", "includes")).toStrictEqual([{ childId: "y", senses: [] }]);
});
