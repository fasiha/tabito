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

export interface IchiranBasic {
  reading: string;
  text: string;
  kana: string;
  score: number;
  suffix?: string;
}

export interface IchiranSingle extends IchiranBasic {
  conj: IchiranConj[];
  seq: number;
  gloss?: IchiranGloss[];
}
export interface IchiranCompound extends IchiranBasic {
  compound: string[];
  components: IchiranHit[];
}

// export type IchiranHit =  IchiranCompound | IchiranSingle;
export type Exclusive<T, U> = T | U extends object
  ?
      | (T & Partial<Record<Exclude<keyof U, keyof T>, never>>)
      | (U & Partial<Record<Exclude<keyof T, keyof U>, never>>)
  : never;
export type IchiranHit = Exclusive<IchiranCompound, IchiranSingle>;
export type IchiranHitOrAlt = IchiranHit | { alternative: IchiranHit[] };

export type IchiranWord = [string, IchiranHitOrAlt, []];
export type IchiranLine = [IchiranWord[], number];
export type Ichiran = (string | [IchiranLine])[];
