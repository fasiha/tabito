export interface IchiranGloss {
  pos: string;
  gloss: string;
  info?: string;
}

export interface IchiranConjProp {
  pos: string;
  type: string;
  fml?: boolean;
}
export interface IchiranConj {
  prop: IchiranConjProp[];
  reading: string;
  gloss: IchiranGloss[];
  readok: boolean;
}
export interface IchiranConjVia {
  prop: IchiranConjProp[];
  readok: boolean;
  via: IchiranConj[];
}

export interface IchiranCounter {
  value: string;
  ordinal: unknown[];
}

export interface IchiranBasic {
  reading: string;
  text: string;
  kana: string;
  score: number;
  suffix?: string;
  counter?: IchiranCounter;
}

export interface IchiranSingle extends IchiranBasic {
  conj: (IchiranConj | IchiranConjVia)[];
  seq: number;
  gloss?: IchiranGloss[];
}
export interface IchiranCompound extends IchiranBasic {
  compound: string[];
  components: IchiranSingle[];
}

export type Exclusive<T, U> = T | U extends object
  ?
      | (T & Partial<Record<Exclude<keyof U, keyof T>, never>>)
      | (U & Partial<Record<Exclude<keyof T, keyof U>, never>>)
  : never;
export type IchiranHit =
  | IchiranBasic
  | Exclusive<IchiranCompound, IchiranSingle>;
export type IchiranHitOrAlt = IchiranHit | { alternative: IchiranHit[] };

export type IchiranWord = [string, IchiranHitOrAlt, []];
export type IchiranLine = [IchiranWord[], number];
export type Ichiran = (string | [IchiranLine])[];
