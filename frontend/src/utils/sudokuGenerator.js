import { CELLS, DIGITS, canPlace, colOf, rowOf, shuffle, solveSudoku } from './sudokuSolver.js';

// Search Nine : uniquement orthogonal. Pas de diagonales.
export const DIRECTIONS = {
  up: { dr: -1, dc: 0, glyph: '↑' },
  down: { dr: 1, dc: 0, glyph: '↓' },
  left: { dr: 0, dc: -1, glyph: '←' },
  right: { dr: 0, dc: 1, glyph: '→' },
};

export const DIFFICULTIES = {
  easy: {
    label: 'Facile',
    givens: 36,
    arrows: 22,
    strictUnique: true,
  },
  medium: {
    label: 'Moyen',
    givens: 24,
    arrows: 18,
    strictUnique: true,
  },
  hard: {
    label: 'Hard',
    givens: 8,
    arrows: 15,
    strictUnique: false,
    uniqueAttempts: 18,
    maxSolverNodes: 18000,
  },
  god: {
    label: 'God',
    givens: 8,
    arrows: 10,
    strictUnique: false,
    uniqueAttempts: 10,
    maxSolverNodes: 8000,
  },
};

export function getTargetIndex(index, direction, distance) {
  const vector = DIRECTIONS[direction];

  if (!vector || !distance) return null;

  const targetRow = rowOf(index) + vector.dr * distance;
  const targetCol = colOf(index) + vector.dc * distance;

  if (targetRow < 0 || targetRow > 8 || targetCol < 0 || targetCol > 8) {
    return null;
  }

  return targetRow * 9 + targetCol;
}

function countGivens(grid) {
  return grid.reduce((total, value) => total + (value ? 1 : 0), 0);
}

function hasGivenNine(grid) {
  return grid.some((value) => value === 9);
}

function hasGivenOnArrow(grid, arrows) {
  return Object.keys(arrows).some((index) => grid[Number(index)] !== 0);
}

function generateCompleteSolution() {
  const emptyGrid = Array(CELLS).fill(0);
  const solution = solveSudoku(emptyGrid, { randomize: true });

  if (!solution) {
    throw new Error('Impossible de générer une solution Sudoku.');
  }

  return solution;
}

function canCellBecomeValue(grid, index, value) {
  if (grid[index]) return grid[index] === value;

  return canPlace(grid, index, value);
}

function sourceHasSearchNinePotential(grid, source, arrow) {
  const fixedValue = grid[source];

  const possibleDistances = fixedValue
    ? [fixedValue]
    : DIGITS.filter((digit) => digit !== 9 && canPlace(grid, source, digit));

  for (const distance of possibleDistances) {
    if (distance === 9) continue;

    const target = getTargetIndex(source, arrow.direction, distance);

    if (target === null) continue;

    if (canCellBecomeValue(grid, target, 9)) {
      return true;
    }
  }

  return false;
}

function isSearchNineConsistent(grid, arrows) {
  for (const [sourceKey, arrow] of Object.entries(arrows)) {
    const source = Number(sourceKey);

    if (!sourceHasSearchNinePotential(grid, source, arrow)) {
      return false;
    }
  }

  return true;
}

function getSearchNineCandidates(grid, index, arrows) {
  const candidates = DIGITS.filter((digit) => canPlace(grid, index, digit));
  const valid = [];

  for (const candidate of candidates) {
    grid[index] = candidate;

    if (isSearchNineConsistent(grid, arrows)) {
      valid.push(candidate);
    }

    grid[index] = 0;
  }

  return valid;
}

function countSearchNineSolutions(inputGrid, arrows, limit = 2, maxNodes = Infinity) {
  const grid = [...inputGrid];

  let count = 0;
  let nodes = 0;
  let exhaustedBudget = false;

  if (!isSearchNineConsistent(grid, arrows)) return 0;

  function findBestEmptyCell() {
    let bestIndex = -1;
    let bestCandidates = null;

    for (let index = 0; index < CELLS; index += 1) {
      if (grid[index] !== 0) continue;

      const candidates = getSearchNineCandidates(grid, index, arrows);

      if (candidates.length === 0) return { index, candidates };

      if (!bestCandidates || candidates.length < bestCandidates.length) {
        bestIndex = index;
        bestCandidates = candidates;

        if (candidates.length === 1) break;
      }
    }

    return { index: bestIndex, candidates: bestCandidates || [] };
  }

  function backtrack() {
    if (count >= limit || exhaustedBudget) return;

    nodes += 1;

    if (nodes > maxNodes) {
      exhaustedBudget = true;
      return;
    }

    const { index, candidates } = findBestEmptyCell();

    if (index === -1) {
      count += 1;
      return;
    }

    if (candidates.length === 0) return;

    for (const value of candidates) {
      grid[index] = value;
      backtrack();
      grid[index] = 0;

      if (count >= limit || exhaustedBudget) return;
    }
  }

  backtrack();

  // Si le budget de calcul est dépassé, on traite la grille comme non prouvée
  // unique. Cela évite de bloquer l'UI sur les modes extrêmes Hard/God.
  return exhaustedBudget ? limit : count;
}

function allSearchNineCandidates(solution) {
  const candidates = [];
  const directionNames = Object.keys(DIRECTIONS);

  for (let index = 0; index < CELLS; index += 1) {
    const distance = solution[index];

    // Une case fléchée n'est jamais un 9 : son chiffre est une distance vers un 9.
    if (!DIGITS.includes(distance) || distance === 9) continue;

    for (const direction of directionNames) {
      const target = getTargetIndex(index, direction, distance);

      if (target !== null && solution[target] === 9) {
        candidates.push({ index, direction, target, distance });
      }
    }
  }

  return shuffle(candidates);
}

function generateSearchNineArrows(solution, requestedCount) {
  const arrows = {};
  const usedCells = new Set();
  const targetCounts = new Map();
  const candidates = allSearchNineCandidates(solution);

  const add = (candidate) => {
    if (Object.keys(arrows).length >= requestedCount) return false;
    if (usedCells.has(candidate.index)) return false;

    arrows[candidate.index] = {
      direction: candidate.direction,
      target: candidate.target,
    };

    usedCells.add(candidate.index);
    targetCounts.set(candidate.target, (targetCounts.get(candidate.target) || 0) + 1);

    return true;
  };

  // Première passe : on couvre autant de 9 différents que possible. Avec peu de
  // flèches, c'est beaucoup plus informatif qu'un tirage purement aléatoire.
  const byTarget = new Map();

  for (const candidate of candidates) {
    if (!byTarget.has(candidate.target)) byTarget.set(candidate.target, []);

    byTarget.get(candidate.target).push(candidate);
  }

  for (const target of shuffle([...byTarget.keys()])) {
    const options = byTarget.get(target).filter((candidate) => !usedCells.has(candidate.index));

    if (options.length) add(shuffle(options)[0]);
  }

  // Deuxième passe : on complète en privilégiant les 9 encore peu référencés.
  const ranked = [...candidates].sort((a, b) => {
    const targetDelta = (targetCounts.get(a.target) || 0) - (targetCounts.get(b.target) || 0);

    if (targetDelta !== 0) return targetDelta;

    return Math.random() - 0.5;
  });

  for (const candidate of ranked) {
    if (Object.keys(arrows).length >= requestedCount) break;

    add(candidate);
  }

  return arrows;
}

function buildFullNoNinePuzzle(solution, arrows) {
  const arrowSources = new Set(Object.keys(arrows).map(Number));

  return solution.map((value, index) => {
    // Règle visuelle essentielle : aucun 9 donné, et aucun chiffre imprimé sur
    // une case fléchée au départ. Le joueur remplit lui-même la distance.
    if (value === 9 || arrowSources.has(index)) return 0;

    return value;
  });
}

function allowedGivenIndexes(solution, arrows) {
  return [...Array(CELLS).keys()].filter((index) => solution[index] !== 9 && !arrows[index]);
}

function carveSearchNineUniqueNoNinePuzzle(solution, arrows, targetGivens) {
  const puzzle = buildFullNoNinePuzzle(solution, arrows);

  let givens = countGivens(puzzle);

  const removable = shuffle(allowedGivenIndexes(solution, arrows));

  for (const index of removable) {
    if (givens <= targetGivens) break;

    const previous = puzzle[index];

    puzzle[index] = 0;

    const solutions = countSearchNineSolutions(puzzle, arrows, 2);

    if (solutions === 1) {
      givens -= 1;
    } else {
      puzzle[index] = previous;
    }
  }

  return puzzle;
}

function buildSparseNoNinePuzzle(solution, arrows, targetGivens) {
  const puzzle = Array(CELLS).fill(0);
  const allowed = shuffle(allowedGivenIndexes(solution, arrows));
  const chosen = new Set();

  // On force d'abord une bonne variété de chiffres 1-8 pour éviter des départs
  // trop monotones, tout en gardant 0 chiffre sur les cases fléchées.
  const digits = shuffle(DIGITS.filter((digit) => digit !== 9));

  for (const digit of digits) {
    if (chosen.size >= targetGivens) break;

    const options = allowed.filter((index) => solution[index] === digit && !chosen.has(index));

    if (options.length) chosen.add(shuffle(options)[0]);
  }

  for (const index of allowed) {
    if (chosen.size >= targetGivens) break;

    chosen.add(index);
  }

  chosen.forEach((index) => {
    puzzle[index] = solution[index];
  });

  return puzzle;
}

function generateOnce(difficultyKey, difficulty) {
  const solution = generateCompleteSolution();
  const arrows = generateSearchNineArrows(solution, difficulty.arrows);

  const puzzle = difficulty.strictUnique
    ? carveSearchNineUniqueNoNinePuzzle(solution, arrows, difficulty.givens)
    : buildSparseNoNinePuzzle(solution, arrows, difficulty.givens);

  const solverBudget = difficulty.strictUnique ? Infinity : difficulty.maxSolverNodes;

  return {
    puzzle,
    solution,
    arrows,
    difficultyKey,
    difficulty,
    givenCount: countGivens(puzzle),
    arrowCount: Object.keys(arrows).length,
    hasGivenNine: hasGivenNine(puzzle),
    hasGivenOnArrow: hasGivenOnArrow(puzzle, arrows),
    solutionCount: countSearchNineSolutions(puzzle, arrows, 2, solverBudget),
  };
}

function stripGenerationStats(candidate) {
  const game = { ...candidate };

  delete game.givenCount;
  delete game.arrowCount;
  delete game.hasGivenNine;
  delete game.hasGivenOnArrow;
  delete game.solutionCount;

  return game;
}

export function generateSearchNinePuzzle(difficultyKey = 'medium') {
  const difficulty = DIFFICULTIES[difficultyKey] || DIFFICULTIES.medium;
  const attempts = difficulty.strictUnique ? 80 : difficulty.uniqueAttempts;

  let best = null;

  // Les puzzles sont générés de manière aléatoire. Les modes Facile/Moyen
  // cherchent strictement l'unicité. Hard/God respectent strictement les comptes
  // demandés et utilisent un budget de vérification borné pour ne pas bloquer.
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const candidate = generateOnce(difficultyKey, difficulty);

    const validVisualRules =
      !candidate.hasGivenNine &&
      !candidate.hasGivenOnArrow &&
      candidate.arrowCount === difficulty.arrows &&
      candidate.givenCount <= difficulty.givens;

    const valid = difficulty.strictUnique
      ? validVisualRules && candidate.solutionCount === 1
      : validVisualRules && candidate.givenCount === difficulty.givens;

    if (valid && (!difficulty.strictUnique || candidate.solutionCount === 1)) {
      return stripGenerationStats(candidate);
    }

    if (
      !best ||
      (
        candidate.arrowCount === difficulty.arrows &&
        candidate.givenCount === difficulty.givens &&
        !candidate.hasGivenNine &&
        !candidate.hasGivenOnArrow
      ) ||
      candidate.arrowCount > best.arrowCount
    ) {
      best = candidate;
    }
  }

  return stripGenerationStats(best);
}