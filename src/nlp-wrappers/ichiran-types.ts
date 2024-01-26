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
  gloss: IchiranGloss[];
}
export interface IchiranCompound extends IchiranBasic {
  compound: string[];
  components: IchiranHit[];
}

export type IchiranHit = IchiranBasic | IchiranCompound | IchiranSingle;

export type IchiranWord = [string, IchiranHit, []];
export type IchiranLine = [IchiranWord[], number];
export type Ichiran = (string | [IchiranLine])[];
