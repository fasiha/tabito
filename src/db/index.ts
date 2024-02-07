import { createHash } from "crypto";
import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { resolve } from "path";

// import { furiganaToString } from "curtiz-japanese-nlp";

import type { Sentence, Selected, Tables } from "../interfaces";

import path from "path";
import { fileURLToPath } from "url";

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
