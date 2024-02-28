import { createHash } from "crypto";
import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { resolve } from "path";
import crypto from "crypto";

import type {
  Sentence,
  Selected,
  Tables,
  WordIdConnType,
} from "../interfaces/backend";

import path from "path";
import { fileURLToPath } from "url";
import type { Word } from "curtiz-japanese-nlp/interfaces";
import { newComponentId } from "../utils/randomId";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// We have a very basic system of handling database schema upgrades. This code will work with
// databases with this schema version
const SCHEMA_VERSION_REQUIRED = 1;

// Let's load the database
export const db = new Database(process.env.TABITO_DB || "sentences.db");
db.pragma("journal_mode = WAL");

// Let's check whether this database has anything in it
{
  const s = db.prepare(
    `SELECT name FROM sqlite_master WHERE type='table' AND name=?`
  );
  // Is this a Tabito database?
  const hit = s.get("_tabito_db_state");
  if (hit) {
    // Yes. So ensure it's the correct version, else bail; implement up/down migration later
    dbVersionCheck(db);
  } else {
    // nope this is a fresh/clean database. Initialize it with our schema
    db.exec(
      readFileSync(
        resolve(
          __dirname,
          "..",
          "..",
          "sql",
          `db-v${SCHEMA_VERSION_REQUIRED}.sql`
        ),
        "utf8"
      )
    );
    dbVersionCheck(db);
  }
  function dbVersionCheck(thisDb: typeof db) {
    const s = thisDb.prepare(`select schemaVersion from _tabito_db_state`);
    const dbState = s.get() as Selected<Tables._tabito_db_stateRow>;
    if (dbState?.schemaVersion !== SCHEMA_VERSION_REQUIRED) {
      throw new Error("db wrong version: need " + SCHEMA_VERSION_REQUIRED);
    }
  }
}

// Functions

const clearDocumentStatement = db.prepare<Pick<Tables.documentRow, "docName">>(
  `delete from document where docName=$docName`
);
export function clearDocument(docName: string) {
  return clearDocumentStatement.run({ docName });
}

const enrollSentenceIntoDocStatement =
  db.prepare<Tables.documentRow>(`insert into document
(docName, plain)
values
($docName, $plain)`);
export function enrollSentenceIntoDoc(plain: string, docName: string) {
  return enrollSentenceIntoDocStatement.run({ plain, docName });
}

const upsertSentenceStatement =
  db.prepare<Tables.sentenceRow>(`insert into sentence 
(jsonEncoded, plain, plainSha256) 
values
($jsonEncoded, $plain, $plainSha256)
on conflict do
update set
  jsonEncoded=$jsonEncoded, 
  plain=$plain, 
  plainSha256=$plainSha256
where 
  plain=$plain`);
export function upsertSentence(sentence: Sentence) {
  const plain = sentence.furigana
    .map((f) => (typeof f === "string" ? f : f.ruby))
    .join("");
  const plainSha256 = createHash("sha256").update(plain).digest("base64url");
  const jsonEncoded = JSON.stringify(sentence);
  upsertSentenceStatement.run({
    plain,
    plainSha256,
    jsonEncoded,
  });
}

const sentenceExistsStatement = db.prepare<Pick<Tables.sentenceRow, "plain">>(
  `select id from sentence where plain=$plain`
);
export function sentenceExists(plain: string): boolean {
  return !!sentenceExistsStatement.get({ plain });
}

const getSentenceFromPlainStatement = db.prepare<
  Pick<Tables.sentenceRow, "plain">
>(`select jsonEncoded from sentence where plain=$plain`);
const getSentenceFromIdStatement = db.prepare<Pick<Tables.sentenceRow, "id">>(
  `select jsonEncoded from sentence where id=$id`
);
export function getSentence<T extends boolean>(
  plainOrId: string | number,
  dontParse?: T
): undefined | (T extends false ? Sentence : string) {
  const result = (
    typeof plainOrId === "string"
      ? getSentenceFromPlainStatement.get({ plain: plainOrId })
      : getSentenceFromIdStatement.get({ id: plainOrId })
  ) as undefined | { jsonEncoded: string };
  if (result)
    return dontParse ? result.jsonEncoded : JSON.parse(result.jsonEncoded);
  return undefined;
}

const getAllPlainsStatement = db.prepare(`select plain from sentence`);
export function getAllPlains(): string[] {
  return (getAllPlainsStatement.all() as Tables.sentenceRow[]).map(
    (x) => x.plain
  );
}

// Connected

const checkForComponents = db.prepare<{
  type: WordIdConnType;
  a: Word["id"];
  b: Word["id"];
}>(
  `select componentId, wordId from connectedWords where type=$type and wordId in ($a, $b)`
);

const idCollision = db.prepare<{
  type: WordIdConnType;
  componentId: string;
}>(
  `select type from connectedWords where type=$type and componentId=$componentId limit 1`
);

const insertComponent = db.prepare<Required<Tables.connectedWordsRow>>(
  `insert into connectedWords (type, componentId, wordId) values ($type, $componentId, $wordId)`
);

const mergeComponents = db.prepare<{
  new: string;
  old: string;
  type: WordIdConnType;
}>(
  `update connectedWords set componentId=$new where componentId=$old and type=$type`
);

export function connectWordIds(
  a: Word["id"],
  b: Word["id"],
  type: WordIdConnType
) {
  db.transaction(() => {
    const components = checkForComponents.all({ a, b, type }) as Required<
      Pick<Tables.connectedWordsRow, "componentId" | "wordId">
    >[];
    if (components.length === 0) {
      // two brand new nodes
      let componentId: string;
      for (let i = 0; ; i++) {
        componentId = newComponentId();
        const collision = idCollision.get({ type, componentId });
        if (!collision) break;
        if (i > 3) throw new Error("cannot find unique component id?");
      }

      insertComponent.run({ type, componentId, wordId: a });
      insertComponent.run({ type, componentId, wordId: b });
    } else if (components.length === 1) {
      insertComponent.run({
        type,
        componentId: components[0].componentId,
        wordId: components[0].wordId === a ? b : a,
      });
    } else if (components.length === 2) {
      if (components[0].componentId === components[1].componentId) return;
      mergeComponents.run({
        new: components[0].componentId,
        old: components[1].componentId,
        type,
      });
    } else {
      throw new Error("more than two returned?");
    }
  });
}
