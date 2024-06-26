import type { FunctionComponent, FunctionalComponent, VNode } from "preact";
import { memo } from "preact/compat";
import type { GrammarConj } from "../../interfaces/backend";
import { cellFit, type Cell } from "../../utils/cellFit";
import type { Word } from "curtiz-japanese-nlp";

export interface NlpTableProps {
  plain: string;
  cellsIchiran: Cell<VNode<{}>, { word: Word }>[];
  cellsCurtizVocab: Cell<VNode, { word: Word; isXref?: boolean }>[];
  cellsCurtizGrammar: Cell<VNode, GrammarConj["deconj"][]>[];
  seenWordIds?: Record<string, true>;
}
export const NlpTable: FunctionalComponent<NlpTableProps> = memo(
  ({
    plain,
    cellsIchiran,
    cellsCurtizVocab,
    cellsCurtizGrammar,
    seenWordIds = {},
  }) => {
    return (
      <>
        <details open>
          <summary>
            <h3>Ichiran vocab</h3>
          </summary>
          <PlainHeadTable plain={plain}>
            {cellsToTable(plain, cellsIchiran)}
          </PlainHeadTable>
        </details>

        <details open>
          <summary>
            <h3>Curtiz grammar</h3>
          </summary>
          <PlainHeadTable plain={plain}>
            {cellsToTable(plain, cellsCurtizGrammar)}
          </PlainHeadTable>
        </details>

        <details open>
          <summary>
            <h3>Previously-seen Curtiz vocab</h3>
          </summary>
          <PlainHeadTable plain={plain}>
            {cellsToTable(
              plain,
              cellsCurtizVocab
                .filter(
                  ({ extra }) => extra.word.id in seenWordIds && !extra.isXref
                )
                .sort((a, b) => b.len - a.len)
            )}
          </PlainHeadTable>
        </details>

        <details open>
          <summary>
            <h3>Curtiz vocab</h3>
          </summary>
          <PlainHeadTable plain={plain}>
            {cellsToTable(plain, cellsCurtizVocab)}
          </PlainHeadTable>
        </details>
      </>
    );
  },
  (prev, next) =>
    prev.cellsCurtizGrammar === next.cellsCurtizGrammar &&
    prev.cellsCurtizVocab === next.cellsCurtizVocab &&
    prev.cellsIchiran === next.cellsIchiran &&
    prev.plain === next.plain
);

const PlainHeadTable: FunctionComponent<{
  plain: string;
  children: VNode[];
}> = ({ plain, children }) => {
  return (
    <table class="nlp-table">
      <thead>
        <tr>
          {plain.split("").map((c, i) => (
            <td key={i}>{c}</td>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
};

function cellsToTable(plain: string, cells: Cell<VNode>[]) {
  const table: VNode[] = [];
  for (const [rowId, row] of cellFit(cells).entries()) {
    const tds = Array.from(Array(plain.length), (_, i) => <td key={i}></td>);
    for (let i = row.length - 1; i >= 0; i--) {
      const x = row[i];
      tds.splice(
        x.start,
        x.len,
        <td key={x.start} colspan={x.len}>
          <div class="cell">{x.content}</div>
        </td>
      );
    }
    table.push(<tr key={rowId}>{tds}</tr>);
  }
  return table;
}
