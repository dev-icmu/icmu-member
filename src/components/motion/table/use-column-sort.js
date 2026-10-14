import { useCallback, useMemo, useState } from "react";
import { readSortValue } from "./utils";

export function useColumnSort(
  {
    rows,
    columns,
    sort: sortProp,
    defaultSort = null,
    onSortChange
  }
) {
  const [internalSort, setInternalSort] = useState(defaultSort);
  const sort = sortProp !== undefined ? sortProp : internalSort;

  const commit = useCallback(
    (next) => {
      if (sortProp === undefined) setInternalSort(next);
      onSortChange?.(next);
    },
    [sortProp, onSortChange],
  );

  const toggleSort = useCallback(
    (key) => {
      if (!sort || sort.key !== key) {
        commit({ key, direction: "asc" });
      } else if (sort.direction === "asc") {
        commit({ key, direction: "desc" });
      } else {
        commit(null);
      }
    },
    [sort, commit],
  );

  const sortedRows = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    if (!column) return rows;
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = readSortValue(a.row, column);
      const bv = readSortValue(b.row, column);
      let cmp;
      if (typeof av === "number" && typeof bv === "number") {
        cmp = av - bv;
      } else {
        cmp = String(av).localeCompare(String(bv));
      }
      return sort.direction === "asc" ? cmp : -cmp;
    });
    return copy;
  }, [rows, sort, columns]);

  return { sort, sortedRows, toggleSort };
}
