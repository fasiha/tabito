import type { ColumnType } from "kysely";

export type Generated<T> = T extends ColumnType<infer S, infer I, infer U>
  ? ColumnType<S, I | undefined, U>
  : ColumnType<T, T | undefined, T>;

export interface _TabitoDbState {
  schemaVersion: number;
}

export interface ConnectedWords {
  addedMs: number;
  componentId: string;
  type: string;
  wordId: string;
}

export interface Document {
  addedMs: number;
  docName: string;
  id: Generated<number>;
  plain: string;
}

export interface Jmdict {
  addedMs: number;
  json: string;
  wordId: string;
}

export interface ParentChildWords {
  addedMs: number;
  childId: string;
  childSensesJson: string;
  parentId: string;
  type: string;
}

export interface Sentence {
  addedMs: number;
  id: Generated<number>;
  jsonEncoded: string;
  plain: string;
  plainSha256: string;
}

export interface User {
  addedMs: number;
  displayName: string;
  id: Generated<number>;
}

export interface DB {
  _tabito_db_state: _TabitoDbState;
  connectedWords: ConnectedWords;
  document: Document;
  jmdict: Jmdict;
  parentChildWords: ParentChildWords;
  sentence: Sentence;
  user: User;
}
