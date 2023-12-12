import { type Sentence, type Furigana } from "tabito-lib";
import { spawn } from "child_process";
import * as t from "io-ts";
import { isRight } from "fp-ts/Either";

const IchiranGloss = t.union([
  t.type({ pos: t.string, gloss: t.string }),
  t.partial({ info: t.string }),
]);
const IchiranConjProp = t.union([
  t.type({
    pos: t.string,
    type: t.string,
  }),
  t.partial({ fml: t.boolean }),
]);
const IchiranConj = t.type({
  prop: t.array(IchiranConjProp),
  reading: t.string,
  gloss: t.array(IchiranGloss),
  readok: t.boolean,
});

const InnerIchiranHit = t.union([
  t.type({
    reading: t.string,
    text: t.string,
    kana: t.string,
    score: t.number,
    seq: t.number,
    conj: t.array(IchiranConj),
    gloss: t.array(IchiranGloss),
  }),
  t.partial({ suffix: t.string }),
]);
const IchiranHit = t.union([
  t.type({
    reading: t.string,
    text: t.string,
    kana: t.string,
    score: t.number,
    seq: t.number,
    conj: t.array(IchiranConj),
  }),
  t.partial({
    gloss: t.array(IchiranGloss),
    compound: t.array(t.string),
    suffix: t.string,
    components: t.array(InnerIchiranHit),
  }),
]);

const IchiranWord = t.tuple([t.string, IchiranHit, t.array(t.unknown)]);
const IchiranLine = t.tuple([t.array(IchiranWord), t.number]);
const Ichiran = t.array(t.union([t.string, t.array(IchiranLine)]));

// export type IchiranGloss = t.TypeOf<typeof IchiranGloss>;
// export type IchiranConjProp = t.TypeOf<typeof IchiranConjProp>;
// export type IchiranConj = t.TypeOf<typeof IchiranConj>;
// export type IchiranHit = t.TypeOf<typeof IchiranHit>;
// export type IchiranWord = t.TypeOf<typeof IchiranWord>;
// export type IchiranLine = t.TypeOf<typeof IchiranLine>;
export type Ichiran = t.TypeOf<typeof Ichiran>;

/*
Raw TypeScript interfaces:

interface IchiranGloss {
  pos: string;
  gloss: string;
  info?: string;
}

interface IchiranConjProp {
  pos: string;
  type: string;
  fml?: boolean;
}
interface IchiranConj {
  prop: IchiranConjProp[];
  reading: string;
  gloss: IchiranGloss[];
  readok: boolean;
}
interface IchiranHit {
  reading: string;
  text: string;
  kana: string;
  score: number;
  seq: number;
  conj: IchiranConj[];
  suffix?: string;
  gloss?: IchiranGloss[];
  compound?: string[];
  components?: IchiranHit[];
}
type IchiranWord = [string, IchiranHit, []];
type IchiranLine = [IchiranWord[], number];
type Ichiran = (string | [IchiranLine])[];



*/
export function rawToIchiran(raw: string): Promise<Ichiran> {
  // docker exec -it ichiran-main-1 ichiran-cli -f "京都でたくさん写真を撮りました"

  return new Promise((resolve, reject) => {
    let spawned = spawn("docker", [
      "exec",
      "-it",
      "ichiran-main-1",
      "ichiran-cli",
      "-f",
      raw,
    ]);
    spawned.stdin.end();
    let arr: string[] = [];
    spawned.stdout.on("data", (data: Buffer) =>
      arr.push(data.toString("utf8"))
    );
    spawned.on("close", (code: number) => {
      if (code !== 0) {
        reject(code);
      }

      try {
        const decoded = Ichiran.decode(JSON.parse(arr.join("")));
        if (isRight(decoded)) {
          resolve(decoded.right);
          return;
        }
        // io-ts decoder errors
        console.error("Unexpected output from Ichiran", decoded.left);
        reject(decoded.left);
      } catch (e) {
        reject(e);
      }
    });
  });
}

function ichiranToFurigana(ichiran: Ichiran): Furigana[] {
  // TODO
  return [];
}

// Examples

const multiline: Ichiran = [
  [
    [
      [
        [
          "ohay\u014dgozaimasu",
          {
            reading: "\u304a\u306f\u3088\u3046\u3054\u3056\u3044\u307e\u3059",
            text: "\u304a\u306f\u3088\u3046\u3054\u3056\u3044\u307e\u3059",
            kana: "\u304a\u306f\u3088\u3046\u3054\u3056\u3044\u307e\u3059",
            score: 1134,
            seq: 1002340,
            gloss: [
              {
                pos: "[int]",
                gloss: "good morning",
                info: "may be used more generally at any time of day",
              },
            ],
            conj: [],
          },
          [],
        ],
      ],
      1134,
    ],
  ],
  "\\n",
  [
    [
      [
        [
          "ta",
          {
            reading: "\u7530 \u3010\u305f\u3011",
            text: "\u7530",
            kana: "\u305f",
            score: 16,
            seq: 1442730,
            gloss: [
              {
                pos: "[n]",
                gloss: "rice field",
              },
            ],
            conj: [],
          },
          [],
        ],
        [
          "ch\u016b",
          {
            reading: "\u4e2d \u3010\u3061\u3085\u3046\u3011",
            text: "\u4e2d",
            kana: "\u3061\u3085\u3046",
            score: 16,
            seq: 1620400,
            gloss: [
              {
                pos: "[n,pref,suf]",
                gloss: "medium; average; middle",
              },
              {
                pos: "[n]",
                gloss: "moderation",
              },
              {
                pos: "[n]",
                gloss: "middle school",
              },
              {
                pos: "[n]",
                gloss: "China",
              },
              {
                pos: "[n]",
                gloss: "volume two (of three)",
              },
              {
                pos: "[n-suf]",
                gloss:
                  "during (a certain time when one did or is doing something); under (construction, etc.); while",
              },
              {
                pos: "[n-suf]",
                gloss: "in; out of; of the",
              },
            ],
            conj: [],
          },
          [],
        ],
        [
          "desu",
          {
            reading: "\u3067\u3059",
            text: "\u3067\u3059",
            kana: "\u3067\u3059",
            score: 64,
            seq: 1628500,
            gloss: [
              {
                pos: "[cop]",
                gloss: "be; is",
              },
            ],
            conj: [
              {
                prop: [
                  {
                    pos: "cop",
                    type: "Non-past",
                    fml: true,
                  },
                ],
                reading: "\u3060",
                gloss: [
                  {
                    pos: "[cop,cop-da]",
                    gloss: "be; is",
                    info: "plain copula",
                  },
                ],
                readok: true,
              },
            ],
          },
          [],
        ],
      ],
      118,
    ],
  ],
];

const example: Ichiran = [
  [
    [
      [
        [
          "ky\u014dto",
          {
            reading: "\u4eac\u90fd \u3010\u304d\u3087\u3046\u3068\u3011",
            text: "\u4eac\u90fd",
            kana: "\u304d\u3087\u3046\u3068",
            score: 325,
            seq: 1652350,
            gloss: [
              {
                pos: "[n]",
                gloss: "Kyoto (city, prefecture)",
              },
              {
                pos: "[n]",
                gloss: "Kyoto (city), Kyoto Prefecture",
              },
            ],
            conj: [],
          },
          [],
        ],
        [
          "de",
          {
            reading: "\u3067",
            text: "\u3067",
            kana: "\u3067",
            score: 11,
            seq: 2028980,
            gloss: [
              {
                pos: "[prt]",
                gloss: "at; in",
                info: "indicates location of action; \u306b\u3066 is the formal literary form",
              },
              {
                pos: "[prt]",
                gloss: "at; when",
                info: "indicates time of action",
              },
              {
                pos: "[prt]",
                gloss: "by; with",
                info: "indicates means of action",
              },
              {
                pos: "[conj]",
                gloss: "and then; so",
              },
              {
                pos: "[aux]",
                gloss: "and; then",
                info: "indicates continuing action; alternative form of \u301c\u3066 used for some verb types",
              },
              {
                pos: "[prt]",
                gloss: "let me tell you; don't you know",
                info: "at sentence-end; indicates certainty, emphasis, etc.",
              },
            ],
            conj: [
              {
                prop: [
                  {
                    pos: "cop",
                    type: "Conjunctive (~te)",
                  },
                ],
                reading: "\u3060",
                gloss: [
                  {
                    pos: "[cop,cop-da]",
                    gloss: "be; is",
                    info: "plain copula",
                  },
                ],
                readok: true,
              },
            ],
          },
          [],
        ],
        [
          "takusan",
          {
            reading: "\u305f\u304f\u3055\u3093",
            text: "\u305f\u304f\u3055\u3093",
            kana: "\u305f\u304f\u3055\u3093",
            score: 336,
            seq: 1415870,
            gloss: [
              {
                pos: "[adj-no,adj-na,n,adv]",
                gloss:
                  "a lot; lots; plenty; many; a large number; much; a great deal; a good deal",
              },
              {
                pos: "[adj-no,adj-na,n,adv]",
                gloss: "enough; sufficient",
              },
              {
                pos: "[n-suf]",
                gloss: "enough; too many; too much",
                info: "after a noun; usu. read as \u3060\u304f\u3055\u3093",
              },
            ],
            conj: [],
          },
          [],
        ],
        [
          "shashin",
          {
            reading: "\u5199\u771f \u3010\u3057\u3083\u3057\u3093\u3011",
            text: "\u5199\u771f",
            kana: "\u3057\u3083\u3057\u3093",
            score: 325,
            seq: 1321900,
            gloss: [
              {
                pos: "[n]",
                gloss: "photograph; photo; picture; snapshot; snap",
              },
              {
                pos: "[n]",
                gloss: "moving picture; movie",
              },
            ],
            conj: [],
          },
          [],
        ],
        [
          "wo",
          {
            reading: "\u3092",
            text: "\u3092",
            kana: "\u3092",
            score: 11,
            seq: 2029010,
            gloss: [
              {
                pos: "[prt]",
                gloss: "indicates direct object of action",
              },
              {
                pos: "[prt]",
                gloss: "indicates subject of causative expression",
              },
              {
                pos: "[prt]",
                gloss: "indicates an area traversed",
              },
              {
                pos: "[prt]",
                gloss: "indicates time (period) over which action takes place",
              },
              {
                pos: "[prt]",
                gloss: "indicates point of departure or separation of action",
              },
              {
                pos: "[prt]",
                gloss: "indicates object of desire, like, hate, etc.",
              },
            ],
            conj: [],
          },
          [],
        ],
        [
          "torimashita",
          {
            reading:
              "\u64ae\u308a\u307e\u3057\u305f \u3010\u3068\u308a\u307e\u3057\u305f\u3011",
            text: "\u64ae\u308a\u307e\u3057\u305f",
            kana: "\u3068\u308a\u307e\u3057\u305f",
            score: 1380,
            seq: 10051581,
            conj: [
              {
                prop: [
                  {
                    pos: "v5r",
                    type: "Past (~ta)",
                    fml: true,
                  },
                ],
                reading: "\u64ae\u308b \u3010\u3068\u308b\u3011",
                gloss: [
                  {
                    pos: "[v5r,vt]",
                    gloss: "to take (a photo)",
                    info: "esp. \u64ae\u308b",
                  },
                  {
                    pos: "[v5r,vt]",
                    gloss: "to record (video, audio, etc.); to make (a film)",
                    info: "esp. \u9332\u308b",
                  },
                ],
                readok: true,
              },
            ],
          },
          [],
        ],
      ],
      2416,
    ],
  ],
];
const example2: Ichiran = [
  [
    [
      [
        [
          "kore",
          {
            reading: "\u3053\u308c",
            text: "\u3053\u308c",
            kana: "\u3053\u308c",
            score: 40,
            seq: 1628530,
            gloss: [
              {
                pos: "[pn]",
                gloss: "this; this one",
                info: "indicating an item near the speaker, the action of the speaker, or the current topic",
              },
              {
                pos: "[pn]",
                gloss: "this person",
                info: "usu. indicating someone in one's in-group",
              },
              {
                pos: "[pn]",
                gloss: "now; this point (in time)",
                info: "as \u3053\u308c\u304b\u3089, \u3053\u308c\u307e\u3067, etc.",
              },
              {
                pos: "[pn]",
                gloss: "here",
              },
              {
                pos: "[adv]",
                gloss: "used to stress the subject of a sentence",
              },
              {
                pos: "[pn]",
                gloss: "I; me",
              },
            ],
            conj: [],
          },
          [],
        ],
        [
          "wa",
          {
            reading: "\u306f",
            text: "\u306f",
            kana: "\u200c\u306f",
            score: 11,
            seq: 2028920,
            gloss: [
              {
                pos: "[prt]",
                gloss: "indicates sentence topic",
                info: "pronounced \u308f in modern Japanese",
              },
              {
                pos: "[prt]",
                gloss:
                  "indicates contrast with another option (stated or unstated)",
              },
              {
                pos: "[prt]",
                gloss: "adds emphasis",
              },
            ],
            conj: [],
          },
          [],
        ],
        [
          "ani",
          {
            reading: "\u5144 \u3010\u3042\u306b\u3011",
            text: "\u5144",
            kana: "\u3042\u306b",
            score: 21,
            seq: 1249900,
            gloss: [
              {
                pos: "[n]",
                gloss: "older brother; elder brother",
              },
            ],
            conj: [],
          },
          [],
        ],
        [
          "ga",
          {
            reading: "\u304c",
            text: "\u304c",
            kana: "\u304c",
            score: 11,
            seq: 2028930,
            gloss: [
              {
                pos: "[prt]",
                gloss: "indicates sentence subject (occasionally object)",
              },
              {
                pos: "[prt]",
                gloss: "indicates possessive (esp. in literary expressions)",
              },
              {
                pos: "[conj]",
                gloss: "but; however; still; and",
              },
              {
                pos: "[conj]",
                gloss: "regardless of; whether (or not)",
                info: "after the volitional form of a verb",
              },
            ],
            conj: [],
          },
          [],
        ],
        [
          "yoyaku shita",
          {
            reading:
              "\u4e88\u7d04\u3057\u305f \u3010\u3088\u3084\u304f \u3057\u305f\u3011",
            text: "\u4e88\u7d04\u3057\u305f",
            kana: "\u3088\u3084\u304f \u3057\u305f",
            score: 640,
            compound: ["\u4e88\u7d04", "\u3057\u305f"],
            components: [
              {
                reading: "\u4e88\u7d04 \u3010\u3088\u3084\u304f\u3011",
                text: "\u4e88\u7d04",
                kana: "\u3088\u3084\u304f",
                score: 0,
                seq: 1543750,
                gloss: [
                  {
                    pos: "[n,vs,vt]",
                    gloss: "reservation; appointment; booking; advance order",
                  },
                  {
                    pos: "[n,vs,vt]",
                    gloss: "contract; subscription; pledge",
                  },
                  {
                    pos: "[vt,vs,n]",
                    gloss:
                      "programming (e.g. a device); setting (e.g. a timer)",
                  },
                ],
                conj: [],
              },
              {
                reading: "\u3057\u305f",
                text: "\u3057\u305f",
                kana: "\u3057\u305f",
                score: 0,
                seq: 10285144,
                suffix: "makes a verb from a noun",
                conj: [
                  {
                    prop: [
                      {
                        pos: "vs-i",
                        type: "Past (~ta)",
                      },
                    ],
                    reading: "\u70ba\u308b \u3010\u3059\u308b\u3011",
                    gloss: [
                      {
                        pos: "[vs-i]",
                        gloss: "to do; to carry out; to perform",
                      },
                      {
                        pos: "[vs-i]",
                        gloss:
                          "to cause to become; to make (into); to turn (into)",
                      },
                      {
                        pos: "[vs-i]",
                        gloss: "to serve as; to act as; to work as",
                      },
                      {
                        pos: "[vs-i]",
                        gloss: "to wear (clothes, a facial expression, etc.)",
                      },
                      {
                        pos: "[vs-i]",
                        gloss:
                          "to judge as being; to view as being; to think of as; to treat as; to use as",
                        info: "as \u301c\u306b\u3059\u308b,\u301c\u3068\u3059\u308b",
                      },
                      {
                        pos: "[vs-i]",
                        gloss: "to decide on; to choose",
                        info: "as \u301c\u306b\u3059\u308b",
                      },
                      {
                        pos: "[vs-i,vi]",
                        gloss: "to be sensed (of a smell, noise, etc.)",
                        info: "as \u301c\u304c\u3059\u308b",
                      },
                      {
                        pos: "[vs-i,vi]",
                        gloss: "to be (in a state, condition, etc.)",
                      },
                      {
                        pos: "[vs-i,vi]",
                        gloss: "to be worth; to cost",
                      },
                      {
                        pos: "[vs-i,vi]",
                        gloss: "to pass (of time); to elapse",
                      },
                      {
                        pos: "[vs-i,vt]",
                        gloss:
                          "to place, or raise, person A to a post or status B",
                        info: "as A\u3092B\u306b\u3059\u308b",
                      },
                      {
                        pos: "[vs-i,vt]",
                        gloss:
                          "to transform A to B; to make A into B; to exchange A for B",
                        info: "as A\u3092B\u306b\u3059\u308b",
                      },
                      {
                        pos: "[vs-i,vt]",
                        gloss:
                          "to make use of A for B; to view A as B; to handle A as if it were B",
                        info: "as A\u3092B\u306b\u3059\u308b",
                      },
                      {
                        pos: "[vs-i,vt]",
                        gloss: "to feel A about B",
                        info: "as A\u3092B\u306b\u3059\u308b",
                      },
                      {
                        pos: "[suf,vs-i]",
                        gloss:
                          'verbalizing suffix (applies to nouns noted in this dictionary with the part of speech "vs")',
                      },
                      {
                        pos: "[aux-v,vs-i]",
                        gloss:
                          'creates a humble verb (after a noun prefixed with "o" or "go")',
                      },
                      {
                        pos: "[aux-v,vs-i]",
                        gloss:
                          "to be just about to; to be just starting to; to try to; to attempt to",
                        info: "as \u301c\u3046\u3068\u3059\u308b,\u301c\u3088\u3046\u3068\u3059\u308b",
                      },
                    ],
                    readok: true,
                  },
                ],
              },
            ],
          },
          [],
        ],
        [
          "ryokan",
          {
            reading: "\u65c5\u9928 \u3010\u308a\u3087\u304b\u3093\u3011",
            text: "\u65c5\u9928",
            kana: "\u308a\u3087\u304b\u3093",
            score: 221,
            seq: 1553130,
            gloss: [
              {
                pos: "[n]",
                gloss:
                  "ryokan; traditional inn; Japanese-style lodging, usu. professionally-run",
              },
            ],
            conj: [],
          },
          [],
        ],
        [
          "desu",
          {
            reading: "\u3067\u3059",
            text: "\u3067\u3059",
            kana: "\u3067\u3059",
            score: 64,
            seq: 1628500,
            gloss: [
              {
                pos: "[cop]",
                gloss: "be; is",
              },
            ],
            conj: [
              {
                prop: [
                  {
                    pos: "cop",
                    type: "Non-past",
                    fml: true,
                  },
                ],
                reading: "\u3060",
                gloss: [
                  {
                    pos: "[cop,cop-da]",
                    gloss: "be; is",
                    info: "plain copula",
                  },
                ],
                readok: true,
              },
            ],
          },
          [],
        ],
      ],
      1046,
    ],
  ],
];
