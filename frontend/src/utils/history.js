function clonePencilMarks(marks) {
  return Array.isArray(marks) ? [...marks] : [];
}

function snapshotCell(cell) {
  return {
    value: cell.value,
    pencilMarks: clonePencilMarks(cell.pencilMarks),
    color: cell.color,
    error: cell.error,
  };
}

function sameMarks(a, b) {
  if (a.length !== b.length) return false;
  return a.every((value, index) => value === b[index]);
}

function cellsEquivalent(a, b) {
  return (
    a.value === b.value &&
    a.color === b.color &&
    a.error === b.error &&
    sameMarks(a.pencilMarks || [], b.pencilMarks || [])
  );
}

export function emptyHistory() {
  return { past: [], future: [] };
}

export function createHistoryAction(beforeCells, afterCells, label = 'Action') {
  const before = [];
  const after = [];

  beforeCells.forEach((cell, index) => {
    if (cell.given) return;
    if (cellsEquivalent(cell, afterCells[index])) return;

    before.push({ index, cell: snapshotCell(cell) });
    after.push({ index, cell: snapshotCell(afterCells[index]) });
  });

  if (!before.length) return null;
  return { label, before, after };
}

export function pushHistory(history, action) {
  if (!action) return history;
  return {
    past: [...history.past, action].slice(-250),
    future: [],
  };
}

export function applyHistoryEntries(cells, entries) {
  const next = cells.map((cell) => ({ ...cell, pencilMarks: [...cell.pencilMarks] }));

  entries.forEach(({ index, cell }) => {
    if (!next[index] || next[index].given) return;
    next[index] = {
      ...next[index],
      value: cell.value,
      pencilMarks: clonePencilMarks(cell.pencilMarks),
      color: cell.color,
      error: cell.error,
    };
  });

  return next;
}
