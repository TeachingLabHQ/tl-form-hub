import { Button } from "@mantine/core";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import { useRef } from "react";

export type RepeatableRowContext<T> = {
  updateRow: (patch: Partial<T>) => void;
  deleteRow: () => void;
  canDelete: boolean;
};

export type RepeatableRowWidgetProps<T> = {
  rows: T[];
  setRows: Dispatch<SetStateAction<T[]>>;
  emptyRow: T;
  renderRow: (row: T, index: number, ctx: RepeatableRowContext<T>) => ReactNode;
  header?: ReactNode | ((ctx: { canDelete: boolean }) => ReactNode);
  minRows?: number;
  addRowLabel?: string;
};

export const RepeatableRowWidget = <T,>({
  rows,
  setRows,
  emptyRow,
  renderRow,
  header,
  minRows = 1,
  addRowLabel = "Add New Row",
}: RepeatableRowWidgetProps<T>) => {
  const canDelete = rows.length > minRows;
  const rowIdsRef = useRef<string[] | null>(null);
  if (rowIdsRef.current === null) {
    rowIdsRef.current = rows.map(() => crypto.randomUUID());
  } else if (rowIdsRef.current.length > rows.length) {
    rowIdsRef.current = rowIdsRef.current.slice(0, rows.length);
  }

  const handleAddRow = () => {
    rowIdsRef.current!.push(crypto.randomUUID())
    setRows((prev) => [...prev, {...emptyRow}]);
  };

  return (
    <div className="grid grid-rows gap-4">
      {typeof header === "function" ? header({ canDelete }) : header}

      {rows.map((row, index) => {
        const updateRow = (patch: Partial<T>) => {
          setRows((prev) =>
            prev.map((r, i) => (i === index ? { ...r, ...patch } : r))
          );
        };
        const deleteRow = () => {
          rowIdsRef.current = rowIdsRef.current!.filter((_,i)=>{return i !== index})
          setRows((prev) => prev.filter((_, i) => i !== index));
        };
        const rowKey = rowIdsRef.current![index]
        return (
          <div key={rowKey}>
            {renderRow(row, index, { updateRow, deleteRow, canDelete })}
          </div>
        );
      })}

      <Button onClick={handleAddRow}>{addRowLabel}</Button>
    </div>
  );
};
