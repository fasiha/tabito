import "dotenv/config";
import { createHash } from "node:crypto";
import SQLite from "better-sqlite3";
import { Kysely, SqliteDialect } from "kysely";
import type { DB } from "./db";
import type { ParentChildType, Sentence, WordIdConnType } from "../interfaces/backend";
import type { Word } from "curtiz-japanese-nlp";
import { newComponentId } from "../utils/randomId";
import type { SenseAndSub } from "../components/commonInterfaces";

// just for testing
import { unlinkSync, existsSync } from "node:fs";
import { exec } from "node:child_process";
import { promisify } from "node:util";
import { join } from "node:path";

if (!process.env.DATABASE_URL) throw new Error("no url?");
const dialect = new SqliteDialect({
  database: new SQLite(process.env.DATABASE_URL),
});
export let db = new Kysely<DB>({ dialect });

const ver = await db.selectFrom("_tabito_db_state").select("schemaVersion").executeTakeFirstOrThrow();
// change this as the schema migrates?
if (ver.schemaVersion !== 1) throw new Error("bad ver?");

// HELPERS
export function clearDocument(docName: string) {
  return db.deleteFrom("document").where("docName", "=", docName).execute();
}

export function enrollSentenceIntoDoc(plain: string, docName: string) {
  return db.insertInto("document").values({ docName, plain, addedMs: Date.now() }).execute();
}

export async function upsertSentence(sentence: Sentence) {
  const plain = sentence.furigana.map((f) => (typeof f === "string" ? f : f.ruby)).join("");
  const plainSha256 = createHash("sha256").update(plain).digest("base64url");
  const jsonEncoded = JSON.stringify(sentence);
  const values = { jsonEncoded, plain, plainSha256, addedMs: Date.now() };
  await db
    .insertInto("sentence")
    .values(values)
    .onConflict((oc) => oc.column("plain").doUpdateSet(values))
    .execute();
  for (const vocab of sentence.vocab ?? []) {
    await addJmdict(vocab.entry);
  }
}

export async function sentenceExists(plain: string): Promise<boolean> {
  return !!(await db.selectFrom("sentence").select("id").where("plain", "=", plain).executeTakeFirst());
}

export async function getSentence<T extends boolean = false>(
  plainOrId: string | number,
  dontParse?: T,
): Promise<undefined | (T extends false ? Sentence : string)> {
  const result = await db
    .selectFrom("sentence")
    .select("jsonEncoded")
    .where(typeof plainOrId === "string" ? "plain" : "id", "=", plainOrId)
    .executeTakeFirst();

  if (result) return dontParse ? result.jsonEncoded : JSON.parse(result.jsonEncoded);
  return undefined;
}

export async function getAllPlains(): Promise<string[]> {
  return (await db.selectFrom("sentence").select("plain").execute()).map((x) => x.plain);
}

// Connected

export const connectWordIds = async (a: Word["id"], b: Word["id"], type: WordIdConnType) => {
  return db.transaction().execute(async (dbtx) => {
    const components = await dbtx
      .selectFrom("connectedWords")
      .select(["componentId", "wordId"])
      .where("type", "=", type)
      .where("wordId", "in", [a, b])
      .execute();
    if (components.length === 0) {
      // two brand new nodes
      let componentId: string;
      for (let i = 0; ; i++) {
        componentId = newComponentId();

        const collision = await dbtx
          .selectFrom("connectedWords")
          .select("type")
          .where("type", "=", type)
          .where("componentId", "=", componentId)
          .executeTakeFirst();
        if (!collision) break;
        if (i > 3) throw new Error("cannot find unique component id?");
      }

      const addedMs = Date.now();
      await dbtx
        .insertInto("connectedWords")
        .values([
          { type, componentId, wordId: a, addedMs },
          { type, componentId, wordId: b, addedMs },
        ])
        .execute();
    } else if (components.length === 1) {
      await dbtx
        .insertInto("connectedWords")
        .values([
          {
            type,
            componentId: components[0].componentId,
            wordId: components[0].wordId === a ? b : a,
            addedMs: Date.now(),
          },
        ])
        .execute();
    } else if (components.length === 2) {
      if (components[0].componentId === components[1].componentId) return;

      const keep = components[0].componentId;
      const erase = components[1].componentId;
      dbtx
        .updateTable("connectedWords")
        .set("componentId", keep)
        .where("componentId", "=", erase)
        .where("type", "=", type)
        .execute();
    } else {
      throw new Error("more than two returned?");
    }
  });
};

export async function getConnectedWordIds(wordId: Word["id"], type: WordIdConnType): Promise<Word["id"][]> {
  const subquery = db
    .selectFrom("connectedWords")
    .select("componentId")
    .where("type", "=", type)
    .where("wordId", "=", wordId)
    .limit(1); // limit is unnecessary since a `wordId` can only appear once in one kind of `type`
  return (
    await db
      .selectFrom("connectedWords")
      .select("wordId")
      .where("type", "=", type)
      .where("componentId", "in", subquery)
      .execute()
  ).map((o) => o.wordId);
}

export async function disconnectWordId(wordId: Word["id"], type: WordIdConnType) {
  await db.transaction().execute(async (dbtx) => {
    const res = await dbtx
      .selectFrom("connectedWords")
      .select("componentId")
      .where("type", "=", type)
      .where(
        "componentId",
        "in",
        dbtx
          .selectFrom("connectedWords")
          .select("componentId")
          .where("type", "=", type)
          .where("wordId", "=", wordId)
          .limit(1), // as above, limit is technically unnecessary
      )
      .limit(3) // not <=2: we need to know if the whole component can be deleted (<=2 nodes)
      .execute();

    if (res.length === 0) {
      return;
    } else if (res.length > 2) {
      // disconnect just this word from the larger component
      await dbtx.deleteFrom("connectedWords").where("type", "=", type).where("wordId", "=", wordId).execute();
    } else {
      // component with only 1-2 elements: delete whole component (no need to keep 1-element components)
      await dbtx
        .deleteFrom("connectedWords")
        .where("type", "=", type)
        .where("componentId", "=", res[0].componentId)
        .execute();
    }
  });
}

// JMDICT

export async function getJmdict(wordId: Word["id"]): Promise<Word | undefined> {
  const res = await db.selectFrom("jmdict").select("json").where("wordId", "=", wordId).executeTakeFirst();
  return res ? JSON.parse(res.json) : undefined;
}

export async function getJmdictsRaw(wordIds: Word["id"][]): Promise<string[]> {
  return (await db.selectFrom("jmdict").select("json").where("wordId", "in", wordIds).execute()).map((o) => o.json);
}

export async function getJmdicts(wordIds: Word["id"][]): Promise<Word[]> {
  return (await getJmdictsRaw(wordIds)).map((s) => JSON.parse(s)) as Word[];
}

export async function hasJmdicts(wordIds: Word["id"][]): Promise<Word["id"][]> {
  return (await db.selectFrom("jmdict").select("wordId").where("wordId", "in", wordIds).execute()).map((o) => o.wordId);
}

export async function addJmdict(word: Word, addedMs = Date.now()) {
  await db
    .insertInto("jmdict")
    .values({ wordId: word.id, json: JSON.stringify(word), addedMs })
    .onConflict((oc) => oc.doNothing()) // maybe overwrite in case the definitions are edited over time?
    .execute();
}

// parent child directed graph

export async function newParentChildEdge(
  parentId: Word["id"],
  childId: Word["id"],
  type: ParentChildType,
  childSenses: SenseAndSub[],
) {
  if (parentId !== childId) {
    const childSensesJson = JSON.stringify(childSenses);
    await db
      .insertInto("parentChildWords")
      .values({ type, parentId, childId, childSensesJson, addedMs: Date.now() })
      .onConflict((oc) => oc.doUpdateSet({ childSensesJson }))
      .execute();
  }
}

export async function deleteParentChildEdge(parentId: Word["id"], childId: Word["id"], type: ParentChildType) {
  await db
    .deleteFrom("parentChildWords")
    .where("type", "=", type)
    .where("parentId", "=", parentId)
    .where("childId", "=", childId)
    .execute();
}

export async function allParents(childId: Word["id"], type: ParentChildType): Promise<string[]> {
  return (
    await db
      .selectFrom("parentChildWords")
      .select("parentId")
      .where("childId", "=", childId)
      .where("type", "=", type)
      .execute()
  ).map((o) => o.parentId);
}

export async function allChildren(
  parentId: Word["id"],
  type: ParentChildType,
): Promise<{ childId: string; senses: SenseAndSub[] }[]> {
  const idsAndJson = await db
    .selectFrom("parentChildWords")
    .select(["childId", "childSensesJson"])
    .where("parentId", "=", parentId)
    .where("type", "=", type)
    .execute();
  return idsAndJson.map((x) => ({ childId: x.childId, senses: JSON.parse(x.childSensesJson) }));
}

// JUST FOR TESTING
const execP = promisify(exec);
export const _overwriteDb = async (newFile: string) => {
  const sqlPath = join(__dirname, "..", "..", "sql", "db-v1.sql");
  if (existsSync(newFile)) unlinkSync(newFile); // delete
  await execP(`sqlite3 ${newFile} < ${sqlPath}`);
  const dialect = new SqliteDialect({ database: new SQLite(newFile) });
  db = new Kysely<DB>({ dialect });
};
