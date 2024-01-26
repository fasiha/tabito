export interface Cell<T = unknown> {
  start: number;
  len: number;
  content: T;
}
export function cellFit<T>(cells: Cell<T>[]): Cell<T>[][] {
  const rows: Cell<T>[][] = [];
  const occupied = new Set<string>();
  for (const x of cells) {
    if (x.len < 1) {
      throw new Error("zero-length cells not handled");
    }
    const requiredColIds = Array.from(Array(x.len), (_, n) => n + x.start);

    // which index (row) of `rows` does this go into?
    let rowId = 0;
    for (; ; rowId++) {
      if (requiredColIds.every((colId) => !occupied.has(`${rowId}/${colId}`))) {
        break;
      }
    }

    // Make sure that row (element of `rows`) exists
    if (!rows[rowId]) {
      rows.push([]);
    }
    if (rows[rowId] === undefined) {
      throw new Error("unexpectedly grew table insufficiently?");
    }

    // append to the row
    rows[rowId].push(x);
    // record all relevant row/col tuples as occupied
    for (const colId of requiredColIds) {
      occupied.add(`${rowId}/${colId}`);
    }
  }

  // sort each row by the start
  for (const row of rows) {
    row.sort((a, b) => a.start - b.start);
  }

  return rows;
}

// in-source testing! https://vitest.dev/guide/in-source.html
if (import.meta.vitest) {
  const { describe, it, expect } = import.meta.vitest;

  describe("cellFit", () => {
    it("fits cells side by side", () => {
      const cells: Cell[] = [
        { start: 0, len: 1, content: "a" },
        { start: 1, len: 1, content: "b" },
      ];
      expect(cellFit(cells)).toStrictEqual([[cells[0], cells[1]]]);
    });
    it("puts cells below each other", () => {
      const cells: Cell[] = [
        { start: 0, len: 1, content: "a" },
        { start: 0, len: 1, content: "b" },
        { start: 1, len: 1, content: "c" },
      ];
      expect(cellFit(cells)).toStrictEqual([[cells[0], cells[2]], [cells[1]]]);
    });
    it("handles wide cells too up and down", () => {
      const cells: Cell[] = [
        { start: 0, len: 5, content: "a" },
        { start: 0, len: 1, content: "b" },
      ];
      expect(cellFit(cells)).toStrictEqual([[cells[0]], [cells[1]]]);
    });
    it("handles wide cells too left and right", () => {
      const cells: Cell[] = [
        { start: 0, len: 5, content: "a" },
        { start: 10, len: 5, content: "b" },
      ];
      expect(cellFit(cells)).toStrictEqual([[cells[0], cells[1]]]);
    });
  });
}
