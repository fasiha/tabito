import type { Furigana } from "curtiz-japanese-nlp/interfaces";
import type { Bunsetsu } from "curtiz-japanese-nlp/jdepp";
import type { FunctionalComponent } from "preact";
import { Furigana as FuriganaComponent } from "./Furigana";

interface Props {
  furigana: Furigana[][]; // what comes from NLP server
  origBunsetsus: Bunsetsu<unknown>[];
}

export const Jdepp: FunctionalComponent<Props> = ({ furigana, origBunsetsus }) => {
  const bunsetsu = origBunsetsus.map((o) => ({
    idx: o.idx,
    parent: o.parent,
    numMorphemes: o.morphemes.length,
  }));
  const bunsetsuIndexes: { startIdx: number; endIdx: number }[] = [];
  {
    let startIdx = 0;
    for (const b of bunsetsu) {
      const i = { startIdx, endIdx: startIdx + b.numMorphemes };
      bunsetsuIndexes.push(i);
      startIdx += b.numMorphemes;
    }
  }
  const idxToParentIdx: Map<number, number> = new Map();
  for (const b of bunsetsu) {
    idxToParentIdx.set(b.idx, b.parent);
  }

  function calcIdxToNumLevels(parent: number) {
    let n = 0;
    while (parent !== -1) {
      const hit = idxToParentIdx.get(parent);
      if (hit === undefined) {
        throw new Error("what");
      }
      parent = hit;
      n++;
    }
    return n;
  }
  const idxToNumLevels: Map<number, number> = new Map(bunsetsu.map((b) => [b.idx, calcIdxToNumLevels(b.idx)]));

  const maxLevels = Math.max(...Array.from(idxToNumLevels.values()));

  const parentsVisited: Set<number> = new Set();
  const prevRowIsChild = Array(maxLevels).fill(false);

  return (
    <table className={"jdepp"}>
      <tbody>
        {bunsetsu.map((b, bidx) => {
          const level = idxToNumLevels.get(b.idx); // 1, 2, ...
          const parent = idxToParentIdx.get(b.idx);
          if (!level || !parent) {
            throw new Error("what2");
          }

          const parentVisited = parentsVisited.has(parent);
          parentsVisited.add(parent);

          const tds = Array.from(Array(level), (_, n) => {
            const colSpan = n === 0 ? maxLevels - level + 1 : 1;
            let boxclass = "";
            if (n === 0) {
              boxclass = "bunsetsu";
            } else if (n === 1) {
              boxclass = `${"box-drawing"} ${parentVisited ? "box-drawing-T" : "box-drawing-7"}`;
            } else if (n > 1) {
              const actualColumn = maxLevels - level + 1 + n; // 1, 2, ...
              if (prevRowIsChild[actualColumn - 1]) {
                boxclass += ` ${"box-drawing"} ${"box-drawing-1"}`;
              }
            }

            return (
              <td key={n} colSpan={colSpan} className={boxclass}>
                {n === 0 && (
                  <FuriganaComponent
                    furigana={furigana.slice(bunsetsuIndexes[b.idx].startIdx, bunsetsuIndexes[b.idx].endIdx).flat()}
                  />
                )}
              </td>
            );
          });

          for (let l = 0; l < maxLevels; l++) {
            if (l <= maxLevels - level) {
              // we just populated these
              prevRowIsChild[l] = false;
            } else if (l === maxLevels - level + 1) {
              // but this is a child
              prevRowIsChild[l] = true;
            }
            // don't touch any other elements
          }

          return <tr key={b.idx}>{tds}</tr>;
        })}
      </tbody>
    </table>
  );
};
