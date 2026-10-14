import { useCallback, useRef, useState } from "react";
import { capturePointer, releasePointer } from "@/lib/touch";

export function useColumnResize(
  {
    orderedColumns,
    thRefs,
    minColumnWidth,
    onColumnResize
  }
) {
  const resizeRef = useRef(null);
  const [widths, setWidths] = useState({});

  const startResize = useCallback(
    (key, e) => {
      e.preventDefault();
      e.stopPropagation();
      // Freeze every column to its current pixel width so resizing one only
      // moves the trailing spacer, never the other columns.
      const snapshot = { ...widths };
      for (const column of orderedColumns) {
        if (snapshot[column.key] == null) {
          const measured = thRefs.current[column.key]?.getBoundingClientRect()
            .width;
          snapshot[column.key] = measured
            ? Math.round(measured)
            : minColumnWidth;
        }
      }
      resizeRef.current = {
        key,
        startX: e.clientX,
        startWidth: snapshot[key],
      };
      setWidths(snapshot);
      capturePointer(e.currentTarget, e.pointerId);
    },
    [minColumnWidth, orderedColumns, thRefs, widths],
  );

  const moveResize = useCallback(
    (e) => {
      const state = resizeRef.current;
      if (!state) return;
      const width = Math.max(
        minColumnWidth,
        state.startWidth + (e.clientX - state.startX),
      );
      setWidths((prev) => ({ ...prev, [state.key]: width }));
    },
    [minColumnWidth],
  );

  const endResize = useCallback(
    (e) => {
      const state = resizeRef.current;
      resizeRef.current = null;
      releasePointer(e.currentTarget, e.pointerId);
      if (state) {
        onColumnResize?.(state.key, widths[state.key] ?? state.startWidth);
      }
    },
    [onColumnResize, widths],
  );

  return { widths, startResize, moveResize, endResize };
}
