export const SIZE = 9;
export const CELLS = 81;
export const DIGITS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export function rowOf(index) {
  return Math.floor(index / SIZE);
}

export function colOf(index) {
  return index % SIZE;
}

export function boxOf(index) {
  return Math.floor(rowOf(index) / 3) * 3 + Math.floor(colOf(index) / 3);
}

export function shuffle(array) {
  const copy = [...array];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function canPlace(grid, index, value) {
  if (!value) return true;
  const row = rowOf(index);
  const col = colOf(index);
  const boxRow = Math.floor(row / 3) * 3;
  const boxCol = Math.floor(col / 3) * 3;

  for (let c = 0; c < SIZE; c += 1) {
    const peer = row * SIZE + c;
    if (peer !== index && grid[peer] === value) return false;
  }

  for (let r = 0; r < SIZE; r += 1) {
    const peer = r * SIZE + col;
    if (peer !== index && grid[peer] === value) return false;
  }

  for (let r = boxRow; r < boxRow + 3; r += 1) {
    for (let c = boxCol; c < boxCol + 3; c += 1) {
      const peer = r * SIZE + c;
      if (peer !== index && grid[peer] === value) return false;
    }
  }

  return true;
}

export function getCandidates(grid, index, randomize = false) {
  const values = randomize ? shuffle(DIGITS) : DIGITS;
  return values.filter((value) => canPlace(grid, index, value));
}

function findBestEmptyCell(grid, randomize = false) {
  let bestIndex = -1;
  let bestCandidates = null;

  for (let index = 0; index < CELLS; index += 1) {
    if (grid[index] !== 0) continue;

    const candidates = getCandidates(grid, index, randomize);
    if (candidates.length === 0) {
      return { index, candidates };
    }

    if (!bestCandidates || candidates.length < bestCandidates.length) {
      bestIndex = index;
      bestCandidates = candidates;
      if (candidates.length === 1) break;
    }
  }

  return { index: bestIndex, candidates: bestCandidates || [] };
}

// Solveur par backtracking avec heuristique MRV : on choisit toujours la case vide
// qui a le moins de candidats possibles. Cela rend le comptage d'unicité beaucoup
// plus rapide que de parcourir la grille de gauche à droite.
export function solveSudoku(inputGrid, options = {}) {
  const { randomize = false } = options;
  const grid = [...inputGrid];

  function backtrack() {
    const { index, candidates } = findBestEmptyCell(grid, randomize);
    if (index === -1) return true;
    if (candidates.length === 0) return false;

    for (const value of candidates) {
      grid[index] = value;
      if (backtrack()) return true;
      grid[index] = 0;
    }

    return false;
  }

  return backtrack() ? grid : null;
}

export function countSolutions(inputGrid, limit = 2) {
  const grid = [...inputGrid];
  let count = 0;

  function backtrack() {
    if (count >= limit) return;

    const { index, candidates } = findBestEmptyCell(grid, false);
    if (index === -1) {
      count += 1;
      return;
    }
    if (candidates.length === 0) return;

    for (const value of candidates) {
      grid[index] = value;
      backtrack();
      grid[index] = 0;
      if (count >= limit) return;
    }
  }

  backtrack();
  return count;
}

export function isSolvedGrid(grid) {
  return grid.every((value, index) => value >= 1 && value <= 9 && canPlace(grid, index, value));
}
