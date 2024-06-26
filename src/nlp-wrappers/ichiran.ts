import { spawn } from "child_process";
import type { Ichiran } from "./ichiran-types";

function seqAwareReviver(key: string, value: unknown, seqs: Set<number>) {
  if (key === "seq" && typeof value === "number") {
    seqs.add(value);
  }
  return value;
}

export function rawToIchiran(raw: string): Promise<{
  ichiran: Ichiran;
  jmdictSeqs: number[];
  seqMap: Record<number, number>;
}> {
  // docker exec -it ichiran-main-1 ichiran-cli -f "京都でたくさん写真を撮りました"

  return new Promise((resolve, reject) => {
    let spawned = spawn("docker", ["exec", "ichiran-main-1", "ichiran-cli", "-f", raw]);
    spawned.stdin.end();
    let arr: string[] = [];
    spawned.stdout.on("data", (data: Buffer) => arr.push(data.toString("utf8")));
    spawned.on("close", (code: number) => {
      if (code !== 0) {
        reject(`Ichiran error ${code}, is the container running?`);
      }

      try {
        const seqs = new Set<number>();
        const ichiran: Ichiran = JSON.parse(arr.join(""), (key, value) => seqAwareReviver(key, value, seqs));
        const jmdictSeqs = [...seqs];
        getRootJmdictSeqs(jmdictSeqs).then((seqMap) => {
          resolve({ ichiran, jmdictSeqs, seqMap });
        });
      } catch (e) {
        reject(e);
      }
    });
  });
}

/**
 * This is needed because Ichiran will return a non-JMdict Ichiran-only
 * seq number for conjugated phrases, see
 * https://github.com/tshatrov/ichiran/issues/21
 *
 * This function digs through the database (via Docker) to map such
 * sequence numbers to JMdict-native roots
 */
export async function getRootJmdictSeqs(seqs: number[]): Promise<Record<number, number>> {
  // docker exec -it ichiran-pg-1 psql -U postgres -h 127.0.0.1 jmdict --csv -t  -c "select \"from\" from conjugation where seq in (10132248, 10149587, -123)"

  // If this gets slow, cuz we're asking for like thousands of seqs in
  // `in`, maybe we can make a temp table and insert these into there
  // and ask Postgres to join?
  return new Promise((resolve, reject) => {
    let spawned = spawn("docker", [
      "exec",
      "ichiran-pg-1",
      "psql",
      "-U",
      "postgres",
      "-h",
      "127.0.0.1",
      "jmdict",
      "--csv",
      "-t",
      "-c",
      `select seq, "from" from conjugation where seq in (${seqs
        // `select min(seq) from conjugation` is > 1e6, but maybe this isn't worth it
        .filter((s) => s >= 1e6)
        .join(",")})`,
    ]);
    spawned.stdin.end();
    let arr: string[] = [];
    spawned.stdout.on("data", (data: Buffer) => arr.push(data.toString("utf8")));
    spawned.on("close", (code: number) => {
      if (code !== 0) {
        reject(code);
      }

      resolve(
        Object.fromEntries(
          arr
            .join("")
            .split("\n")
            .filter((x) => x) // use this instead of `trim` because we want `''` to map to `[]`
            .map((l) => l.split(",").map((x) => Number(x)) as [number, number]),
        ),
      );
    });
  });
}

// Examples
const conj2: Ichiran = [
  [
    [
      [
        [
          "shinjimae",
          {
            reading: "死んじまえ 【しんじまえ】",
            text: "死んじまえ",
            kana: "しんじまえ",
            score: 602,
            compound: ["死んで", "じまえ"],
            components: [
              {
                reading: "死んで 【しんで】",
                text: "死んで",
                kana: "しんで",
                score: 0,
                seq: 10232231,
                conj: [
                  {
                    prop: [
                      {
                        pos: "v5n",
                        type: "Conjunctive (~te)",
                      },
                    ],
                    reading: "死ぬ 【しぬ】",
                    gloss: [
                      {
                        pos: "[v5n,vn,vi]",
                        gloss: "to die; to pass away",
                      },
                      {
                        pos: "[v5n,vn,vi]",
                        gloss: "to lose spirit; to lose vigor; to look dead",
                      },
                      {
                        pos: "[vi,vn,v5n]",
                        gloss: "to cease; to stop",
                      },
                    ],
                    readok: true,
                  },
                ],
              },
              {
                reading: "じまえ",
                text: "じまえ",
                kana: "じまえ",
                score: 0,
                seq: 10447901,
                suffix: "indicates completion (to finish ...)",
                conj: [
                  {
                    prop: [
                      {
                        pos: "v5u",
                        type: "Imperative",
                      },
                    ],
                    reading: "じまう",
                    gloss: [
                      {
                        pos: "[aux-v,v5u]",
                        gloss: "to do completely",
                        info: "contraction of ..て or で plus しまう",
                      },
                      {
                        pos: "[v5u,aux-v]",
                        gloss: "to do accidentally; to do without meaning to; to happen to do",
                      },
                    ],
                    readok: true,
                  },
                  {
                    prop: [
                      {
                        pos: "v1",
                        type: "Continuative (~i)",
                      },
                    ],
                    via: [
                      {
                        prop: [
                          {
                            pos: "v5u",
                            type: "Potential",
                          },
                        ],
                        reading: "じまう",
                        gloss: [
                          {
                            pos: "[aux-v,v5u]",
                            gloss: "to do completely",
                            info: "contraction of ..て or で plus しまう",
                          },
                          {
                            pos: "[v5u,aux-v]",
                            gloss: "to do accidentally; to do without meaning to; to happen to do",
                          },
                        ],
                        readok: true,
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
      ],
      602,
    ],
  ],
];

const alt: Ichiran = [
  [
    [
      [
        [
          "oto/on/ne",
          {
            alternative: [
              {
                reading: "音 【おと】",
                text: "音",
                kana: "おと",
                score: 24,
                seq: 1576900,
                gloss: [
                  {
                    pos: "[n]",
                    gloss: "sound; noise",
                  },
                  {
                    pos: "[n]",
                    gloss: "(musical) note",
                  },
                  {
                    pos: "[n]",
                    gloss: "fame",
                    info: "as 音に聞く, 音に聞こえた, etc.",
                  },
                ],
                conj: [],
              },
              {
                reading: "音 【おん】",
                text: "音",
                kana: "おん",
                score: 16,
                seq: 2859161,
                gloss: [
                  {
                    pos: "[n,n-suf]",
                    gloss: "sound; noise",
                  },
                  {
                    pos: "[n]",
                    gloss: "(speech) sound",
                  },
                  {
                    pos: "[n]",
                    gloss: "Chinese-derived reading of a kanji",
                  },
                ],
                conj: [],
              },
              {
                reading: "音 【ね】",
                text: "音",
                kana: "ね",
                score: 16,
                seq: 2859162,
                gloss: [
                  {
                    pos: "[n]",
                    gloss: "sound; tone; note; ring; chirp",
                  },
                ],
                conj: [],
              },
            ],
          },
          [],
        ],
        [
          "ga",
          {
            reading: "が",
            text: "が",
            kana: "が",
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
          "suki",
          {
            reading: "好き 【すき】",
            text: "好き",
            kana: "すき",
            score: 128,
            seq: 1277450,
            gloss: [
              {
                pos: "[adj-na,n]",
                gloss: "liking; being fond of; to one's liking; to one's taste; preferred; favourite",
              },
              {
                pos: "[adj-na,n]",
                gloss: "liking (romantically); being in love with; beloved",
              },
              {
                pos: "[n,adj-na]",
                gloss: "faddism; eccentricity",
              },
              {
                pos: "[adj-na,n]",
                gloss: "as one likes; as it suits one",
              },
              {
                pos: "[n,adj-na]",
                gloss: "lecherous; lustful; salacious",
              },
            ],
            conj: [
              {
                prop: [
                  {
                    pos: "v5k",
                    type: "Continuative (~i)",
                  },
                ],
                reading: "好く 【すく】",
                gloss: [
                  {
                    pos: "[vt,v5k]",
                    gloss: "to like; to love; to be fond of",
                  },
                ],
                readok: true,
              },
            ],
          },
          [],
        ],
      ],
      177,
    ],
  ],
];
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
                gloss: "during (a certain time when one did or is doing something); under (construction, etc.); while",
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
                gloss: "a lot; lots; plenty; many; a large number; much; a great deal; a good deal",
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
            reading: "\u64ae\u308a\u307e\u3057\u305f \u3010\u3068\u308a\u307e\u3057\u305f\u3011",
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
                gloss: "indicates contrast with another option (stated or unstated)",
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
            reading: "\u4e88\u7d04\u3057\u305f \u3010\u3088\u3084\u304f \u3057\u305f\u3011",
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
                    gloss: "programming (e.g. a device); setting (e.g. a timer)",
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
                        gloss: "to cause to become; to make (into); to turn (into)",
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
                        gloss: "to judge as being; to view as being; to think of as; to treat as; to use as",
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
                        gloss: "to place, or raise, person A to a post or status B",
                        info: "as A\u3092B\u306b\u3059\u308b",
                      },
                      {
                        pos: "[vs-i,vt]",
                        gloss: "to transform A to B; to make A into B; to exchange A for B",
                        info: "as A\u3092B\u306b\u3059\u308b",
                      },
                      {
                        pos: "[vs-i,vt]",
                        gloss: "to make use of A for B; to view A as B; to handle A as if it were B",
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
                        gloss: 'creates a humble verb (after a noun prefixed with "o" or "go")',
                      },
                      {
                        pos: "[aux-v,vs-i]",
                        gloss: "to be just about to; to be just starting to; to try to; to attempt to",
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
                gloss: "ryokan; traditional inn; Japanese-style lodging, usu. professionally-run",
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

const counterValue: Ichiran = [
  [
    [
      [
        [
          "yasumin",
          {
            reading: "ヤスミン",
            text: "ヤスミン",
            kana: "ヤスミン",
            score: 0,
          },
          [],
        ],
        [
          "wa",
          {
            reading: "は",
            text: "は",
            kana: "‌は",
            score: 11,
            seq: 2028920,
            gloss: [
              {
                pos: "[prt]",
                gloss: "indicates sentence topic",
                info: "pronounced わ in modern Japanese",
              },
              {
                pos: "[prt]",
                gloss: "indicates contrast with another option (stated or unstated)",
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
          "ichinichi/tsuitachi",
          {
            alternative: [
              {
                reading: "一日 【いちにち】",
                text: "一日",
                kana: "いちにち",
                score: 208,
                seq: 1576260,
                gloss: [
                  {
                    pos: "[n,adv]",
                    gloss: "one day",
                  },
                  {
                    pos: "[adv,n]",
                    gloss: "all day (long); the whole day; from morning till night",
                  },
                  {
                    pos: "[n]",
                    gloss: "1st day of the month",
                  },
                ],
                conj: [],
              },
              {
                reading: "一日 【ついたち】",
                text: "一日",
                kana: "ついたち",
                score: 143,
                seq: 2225040,
                gloss: [
                  {
                    pos: "[n]",
                    gloss: "1st day of the month",
                  },
                  {
                    pos: "[n]",
                    gloss: "first 10 days of the lunar month",
                  },
                ],
                conj: [],
              },
            ],
          },
          [],
        ],
        [
          "ni",
          {
            reading: "に",
            text: "に",
            kana: "に",
            score: 11,
            seq: 2028990,
            gloss: [
              {
                pos: "[prt]",
                gloss: "at (place, time); in; on; during",
              },
              {
                pos: "[prt]",
                gloss: "to (direction, state); toward; into",
              },
              {
                pos: "[prt]",
                gloss: "for (purpose)",
              },
              {
                pos: "[prt]",
                gloss: "because of (reason); for; with",
              },
              {
                pos: "[prt]",
                gloss: "by; from",
              },
              {
                pos: "[prt]",
                gloss: "as (i.e. in the role of)",
              },
              {
                pos: "[prt]",
                gloss: 'per; in; for; a (e.g. "once a month")',
              },
              {
                pos: "[prt]",
                gloss: "and; in addition to",
              },
              {
                pos: "[prt]",
                gloss: "if; although",
              },
            ],
            conj: [],
          },
          [],
        ],
        [
          "gokai",
          {
            reading: "五回 【ごかい】",
            text: "五回",
            kana: "ごかい",
            score: 221,
            counter: {
              value: "Value: 5",
              ordinal: [],
            },
            seq: 1199330,
            gloss: [
              {
                pos: "[ctr]",
                gloss: "counter for occurrences",
              },
            ],
          },
          [],
        ],
        [
          "oinori",
          {
            reading: "お祈り 【おいのり】",
            text: "お祈り",
            kana: "おいのり",
            score: 264,
            seq: 2269380,
            gloss: [
              {
                pos: "[n]",
                gloss: "prayer; supplication",
              },
            ],
            conj: [],
          },
          [],
        ],
        [
          "suru",
          {
            reading: "する",
            text: "する",
            kana: "する",
            score: 40,
            seq: 1157170,
            gloss: [
              {
                pos: "[vs-i]",
                gloss: "to do; to carry out; to perform",
              },
              {
                pos: "[vs-i]",
                gloss: "to cause to become; to make (into); to turn (into)",
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
                gloss: "to judge as being; to view as being; to think of as; to treat as; to use as",
                info: "as 〜にする,〜とする",
              },
              {
                pos: "[vs-i]",
                gloss: "to decide on; to choose",
                info: "as 〜にする",
              },
              {
                pos: "[vs-i,vi]",
                gloss: "to be sensed (of a smell, noise, etc.)",
                info: "as 〜がする",
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
                gloss: "to place, or raise, person A to a post or status B",
                info: "as AをBにする",
              },
              {
                pos: "[vs-i,vt]",
                gloss: "to transform A to B; to make A into B; to exchange A for B",
                info: "as AをBにする",
              },
              {
                pos: "[vs-i,vt]",
                gloss: "to make use of A for B; to view A as B; to handle A as if it were B",
                info: "as AをBにする",
              },
              {
                pos: "[vs-i,vt]",
                gloss: "to feel A about B",
                info: "as AをBにする",
              },
              {
                pos: "[suf,vs-i]",
                gloss: 'verbalizing suffix (applies to nouns noted in this dictionary with the part of speech "vs")',
              },
              {
                pos: "[aux-v,vs-i]",
                gloss: 'creates a humble verb (after a noun prefixed with "o" or "go")',
              },
              {
                pos: "[aux-v,vs-i]",
                gloss: "to be just about to; to be just starting to; to try to; to attempt to",
                info: "as 〜うとする,〜ようとする",
              },
            ],
            conj: [],
          },
          [],
        ],
        [
          "sō",
          {
            reading: "そう",
            text: "そう",
            kana: "そう",
            score: 40,
            seq: 1006610,
            gloss: [
              {
                pos: "[aux,adj-na]",
                gloss: "appearing that; seeming that; looking like; having the appearance of",
                info: "after -masu stem or adj. stem",
              },
            ],
            conj: [],
          },
          [],
        ],
        [
          "desu",
          {
            reading: "です",
            text: "です",
            kana: "です",
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
                reading: "だ",
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
      -1117,
    ],
  ],
];
