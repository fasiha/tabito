import { createHash } from "crypto";
import Database from "better-sqlite3";
import { readFileSync } from "fs";
import { resolve } from "path";

import { type Sentence } from "tabito-lib";
// import { furiganaToString } from "curtiz-japanese-nlp";

import type * as Table from "./interfaces/DbTablesV1";
import type { Db, Selected } from "./interfaces";

import path from "path";
import { fileURLToPath } from "url";
import type { SentenceExists } from "./restDecoders";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// We have a very basic system of handling database schema upgrades. This code will work with
// databases with this schema version
const SCHEMA_VERSION_REQUIRED = 1;

const DEFAULT_AUTHOR_ID = 1;
const DEFAULT_DOCUMENT_ID = 1;
const DEFAULT_SHARE_STATUS = "default";

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
        resolve(__dirname, "..", "sql", `db-v${SCHEMA_VERSION_REQUIRED}.sql`),
        "utf8"
      )
    );
    dbVersionCheck(db);
  }
  function dbVersionCheck(db: Db) {
    const s = db.prepare(`select schemaVersion from _tabito_db_state`);
    const dbState = s.get() as Selected<Table._tabito_db_stateRow>;
    if (dbState?.schemaVersion !== SCHEMA_VERSION_REQUIRED) {
      throw new Error("db wrong version: need " + SCHEMA_VERSION_REQUIRED);
    }
  }
}

// Let's make sure we have a default document and user for sentences to go into
{
  db.prepare<Table.userRow>(
    `insert or ignore into user (id, displayName) values ($id, $displayName)`
  ).run({ id: DEFAULT_AUTHOR_ID, displayName: "default" });
  db.prepare<Table.documentRow>(
    `insert or ignore into document (id, title, authorId, shareStatus) values ($id, $title, $authorId, $shareStatus)`
  ).run({
    id: DEFAULT_DOCUMENT_ID,
    title: "default",
    authorId: DEFAULT_AUTHOR_ID,
    shareStatus: DEFAULT_SHARE_STATUS,
  });
}

const upsertSentenceStatement =
  db.prepare<Table.sentenceRow>(`insert into sentence 
(jsonEncoded, plain, plainSha256, authorId, documentId) 
values
($jsonEncoded, $plain, $plainSha256, $authorId, $documentId)
on conflict do
update set
  jsonEncoded=$jsonEncoded, 
  plain=$plain, 
  plainSha256=$plainSha256, 
  authorId=$authorId, 
  documentId=$documentId
where 
  plain=$plain and 
  documentId=$documentId`);
export function upsertSentence(
  sentence: Sentence,
  {
    authorId = DEFAULT_AUTHOR_ID,
    documentId = DEFAULT_DOCUMENT_ID,
  }: Partial<Table.sentenceRow> = {}
) {
  const plain = sentence.furigana
    .map((f) => (typeof f === "string" ? f : f.ruby))
    .join("");
  const plainSha256 = createHash("sha256").update(plain).digest("base64url");
  const jsonEncoded = JSON.stringify(sentence);
  upsertSentenceStatement.run({
    authorId,
    documentId,
    // 👆 from input options, 👇 from `sentence`
    plain,
    plainSha256,
    jsonEncoded,
  });
}

const getSentencesInDocumentStatement = db.prepare<{
  documentId: string | number;
}>(`select * from sentence where documentId=$documentId`);
export function getSentencesInDocument(
  documentId: string | number = DEFAULT_DOCUMENT_ID
): Table.sentenceRow[] {
  return getSentencesInDocumentStatement.all({
    documentId,
  }) as Table.sentenceRow[];
}

const sentenceExistPlain = db.prepare<{
  plain: string;
  documentId: string | number;
}>(`select id from sentence where documentId=$documentId and plain=$plain`);
const sentenceExistHash = db.prepare<{
  plainSha256: string;
  documentId: string | number;
}>(
  `select id from sentence where documentId=$documentId and plainSha256=$plainSha256`
);
export function sentenceExists(args: SentenceExists): boolean {
  const { documentId = DEFAULT_DOCUMENT_ID } = args;
  if (args.plainSha256) {
    const plainSha256 = args.plainSha256;
    const res = sentenceExistHash.get({ documentId, plainSha256 });
    return !!res;
  } else if (args.plain) {
    const plain = args.plain;
    const res = sentenceExistPlain.get({ documentId, plain });
    return !!res;
  }
  // Branded type will ensure one of the above is true
  throw new Error("Typescript pacification");
}

type PlainOrHashSelect = undefined | Pick<Table.sentenceRow, "jsonEncoded">;
const sentencePlain = db.prepare<{
  plain: string;
  documentId: string | number;
}>(
  `select jsonEncoded from sentence where documentId=$documentId and plain=$plain`
);
const sentenceHash = db.prepare<{
  plainSha256: string;
  documentId: string | number;
}>(
  `select jsonEncoded from sentence where documentId=$documentId and plainSha256=$plainSha256`
);
export function getSentence(
  args: SentenceExists,
  stringOnly = false
): undefined | Sentence | string {
  const { documentId = DEFAULT_DOCUMENT_ID } = args;

  let res: PlainOrHashSelect;

  if (args.plainSha256) {
    const plainSha256 = args.plainSha256;
    res = sentenceHash.get({ documentId, plainSha256 }) as PlainOrHashSelect;
  } else if (args.plain) {
    const plain = args.plain;
    res = sentencePlain.get({ documentId, plain }) as PlainOrHashSelect;
  }

  if (!res) return undefined;
  return stringOnly ? res.jsonEncoded : JSON.parse(res.jsonEncoded);
}

/* to test: uncomment the following

// upsertSentence({ furigana: ["hello"], citation: "", english: [""] });
// upsertSentence({ furigana: ["goodbye"], citation: "", english: [""] });
// upsertSentence({ furigana: ["hello"], citation: "new citation", english: [""] });
// upsertSentence({ furigana: ["hello"], citation: "new citation", english: ["new translation"] });
// sentenceExists({plain: "foo"})
// sentenceExists({plain: "hello"})
// sentenceExists({plain: "goodbye"})
// sentenceExists({plainSha256: "LPJNul-wow4m6DsqxbninhsWHlwfp0JecwQzYpOLmCQ"})

then run (from top-level tabito-full-stack directory):
```console
npm run server:build && touch /tmp/tabito.db && rm /tmp/tabito.db && TABITO_DB=/tmp/tabito.db node server/src/db.js && sqlite3 /tmp/tabito.db 'select * from sentence'
```
this should print out the above two sentences ("hello" and "goodbye")
*/
