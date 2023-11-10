import * as t from "io-ts";
import { type Furigana, type Sentence } from "tabito-lib";
import type * as Table from "./interfaces/DbTablesV1";

// It sucks I have to define these io-ts parsers here, far far away from Tabito. Maybe they can be
// moved there? Make io-ts an optional/peer dependency…?
const Furigana: t.Type<Furigana> = t.union([
  t.string,
  t.type({
    ruby: t.string,
    rt: t.string,
  }),
]);
export const SentenceCodec: t.Type<Sentence> = t.intersection([
  t.type({
    furigana: t.array(Furigana),
  }),
  t.partial({
    synonyms: t.array(t.tuple([t.string, t.array(Furigana)])),
    english: t.array(t.string),
    citation: t.string,
  }),
]);

export const DocumentRowCodec: t.Type<Table.documentRow> = t.intersection([
  t.type({
    authorId: t.union([t.number, t.bigint]),
    shareStatus: t.string,
    title: t.string,
  }),
  t.partial({ id: t.union([t.number, t.bigint]) }),
]);

export const PostSentenceCodec = t.intersection([
  t.type({ sentence: SentenceCodec }),
  t.partial({
    authorId: t.union([t.number, t.bigint]),
    documentId: t.union([t.number, t.bigint]),
  }),
]);
export type PostSentence = t.TypeOf<typeof PostSentenceCodec>;
