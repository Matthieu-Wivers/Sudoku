import { useEffect, useMemo, useRef } from 'react';
import SudokuCell from './SudokuCell.jsx';
import { rowOf, colOf } from '../utils/sudokuSolver.js';

function rectangleSelection(fromIndex, toIndex) {
  const startRow = rowOf(fromIndex);
  const startCol = colOf(fromIndex);
  const endRow = rowOf(toIndex);
  const endCol = colOf(toIndex);
  const minRow = Math.min(startRow, endRow);
  const maxRow = Math.max(startRow, endRow);
  const minCol = Math.min(startCol, endCol);
  const maxCol = Math.max(startCol, endCol);
  const indexes = [];

  for (let row = minRow; row <= maxRow; row += 1) {
    for (let col = minCol; col <= maxCol; col += 1) {
      indexes.push(row * 9 + col);
    }
  }

  return indexes;
}

function indexFromPointerEvent(event) {
  const element = document.elementFromPoint(event.clientX, event.clientY);
  const cell = element?.closest?.('[data-cell-index]');
  if (!cell) return null;
  const index = Number(cell.dataset.cellIndex);
  return Number.isInteger(index) ? index : null;
}

export default function SudokuBoard({
  cells,
  selected,
  activeCell,
  onSelectionChange,
  paused,
  finished,
}) {
  const boardRef = useRef(null);
  const selectedRef = useRef(selected);
  const activeRef = useRef(activeCell);
  const dragRef = useRef(null);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    activeRef.current = activeCell;
  }, [activeCell]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const commitSelection = (nextSelection, nextActiveCell) => {
    selectedRef.current = [...nextSelection];
    activeRef.current = nextActiveCell;
    onSelectionChange([...nextSelection], nextActiveCell);
  };

  const handlePointerDown = (event) => {
    if (paused || finished) return;
    const index = indexFromPointerEvent(event);
    if (index === null) return;

    event.preventDefault();
    boardRef.current?.focus({ preventScroll: true });
    boardRef.current?.setPointerCapture?.(event.pointerId);

    const isCtrl = event.ctrlKey || event.metaKey;
    const isShift = event.shiftKey;
    let nextSelection = new Set(selectedRef.current);
    let dragMode = 'add';

    if (isShift && activeRef.current !== null && activeRef.current !== undefined) {
      const rectangle = rectangleSelection(activeRef.current, index);
      nextSelection = isCtrl ? new Set([...nextSelection, ...rectangle]) : new Set(rectangle);
    } else if (isCtrl) {
      if (nextSelection.has(index)) {
        nextSelection.delete(index);
        dragMode = 'remove';
      } else {
        nextSelection.add(index);
      }
    } else {
      nextSelection = new Set([index]);
    }

    dragRef.current = {
      pointerId: event.pointerId,
      mode: dragMode,
    };

    commitSelection(nextSelection, index);
  };

  const handlePointerMove = (event) => {
    if (!dragRef.current || paused || finished) return;
    if (dragRef.current.pointerId !== event.pointerId) return;

    const index = indexFromPointerEvent(event);
    if (index === null) return;

    const nextSelection = new Set(selectedRef.current);
    if (dragRef.current.mode === 'remove') {
      nextSelection.delete(index);
    } else {
      nextSelection.add(index);
    }

    commitSelection(nextSelection, index);
  };

  const stopDrag = (event) => {
    if (dragRef.current?.pointerId === event.pointerId) {
      dragRef.current = null;
      boardRef.current?.releasePointerCapture?.(event.pointerId);
    }
  };

  return (
    <section className="board-shell" aria-label="Grille de Sudoku Search Nine">
      <div
        ref={boardRef}
        className={`sudoku-board ${paused ? 'is-paused' : ''}`}
        role="grid"
        aria-rowcount={9}
        aria-colcount={9}
        tabIndex={0}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDrag}
        onPointerCancel={stopDrag}
        onLostPointerCapture={() => {
          dragRef.current = null;
        }}
      >
        {cells.map((cell, index) => {
          const row = rowOf(index);
          const col = colOf(index);
          const selectedCell = selectedSet.has(index);

          return (
            <SudokuCell
              key={index}
              cell={cell}
              index={index}
              row={row}
              col={col}
              selected={selectedCell}
              active={activeCell === index}
            />
          );
        })}
      </div>

      {paused && <div className="pause-overlay">Pause</div>}
    </section>
  );
}
