import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import SudokuBoard from './components/SudokuBoard.jsx';
import NumberPad from './components/NumberPad.jsx';
import Toolbar from './components/Toolbar.jsx';
import { generateSearchNinePuzzle, getTargetIndex } from './utils/sudokuGenerator.js';
import { applyHistoryEntries, createHistoryAction, emptyHistory, pushHistory } from './utils/history.js';
import './styles.css';

function makeCells(puzzle, arrows) {
  return puzzle.map((value, index) => ({
    value: value || null,
    given: Boolean(value),
    pencilMarks: [],
    color: null,
    selected: false,
    error: false,
    arrow: arrows[index] || null,
  }));
}

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

function createGame(difficultyKey = 'medium') {
  const generated = generateSearchNinePuzzle(difficultyKey);
  return {
    ...generated,
    cells: makeCells(generated.puzzle, generated.arrows),
  };
}

function cloneCell(cell) {
  return {
    ...cell,
    pencilMarks: [...cell.pencilMarks],
  };
}

function sortedToggle(list, number) {
  const set = new Set(list);
  if (set.has(number)) set.delete(number);
  else set.add(number);
  return [...set].sort((a, b) => a - b);
}

function selectionOrActive(selected, activeCell) {
  if (selected.length) return selected;
  if (activeCell !== null && activeCell !== undefined) return [activeCell];
  return [];
}

function findCheckErrors(sourceCells, solution) {
  const errorIndexes = new Set();

  sourceCells.forEach((cell, index) => {
    if (!cell.value) return;

    if (cell.value !== solution[index]) {
      errorIndexes.add(index);
    }

    if (cell.arrow) {
      const target = getTargetIndex(index, cell.arrow.direction, cell.value);
      if (target === null) {
        errorIndexes.add(index);
      } else if (sourceCells[target].value && sourceCells[target].value !== 9) {
        errorIndexes.add(index);
        errorIndexes.add(target);
      }
    }
  });

  return errorIndexes;
}

export default function App() {
  const [game, setGame] = useState(() => createGame('medium'));
  const [cells, setCells] = useState(game.cells);
  const [selected, setSelected] = useState([]);
  const [activeCell, setActiveCell] = useState(null);
  const [mode, setMode] = useState('normal');
  const [selectedColor, setSelectedColor] = useState('sun');
  const [history, setHistory] = useState(() => emptyHistory());
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  const selectedRef = useRef(selected);
  const activeRef = useRef(activeCell);
  const modeRef = useRef(mode);
  const pausedRef = useRef(paused);
  const finishedRef = useRef(finished);

  useEffect(() => {
    selectedRef.current = selected;
  }, [selected]);

  useEffect(() => {
    activeRef.current = activeCell;
  }, [activeCell]);

  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);

  useEffect(() => {
    finishedRef.current = finished;
  }, [finished]);

  useEffect(() => {
    if (paused || finished) return undefined;
    const interval = window.setInterval(() => {
      setElapsed((value) => value + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [paused, finished, game.solution]);

  const disabled = paused || finished;
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const commitCellChange = useCallback((producer, label) => {
    if (pausedRef.current || finishedRef.current) return;

    setCells((currentCells) => {
      const nextCells = producer(currentCells.map(cloneCell));
      const action = createHistoryAction(currentCells, nextCells, label);

      if (action) {
        setHistory((currentHistory) => pushHistory(currentHistory, action));
        setMessage({ text: '', type: '' });
      }

      return nextCells;
    });
  }, []);

  const applyNumber = useCallback(
    (number) => {
      const targets = selectionOrActive(selectedRef.current, activeRef.current);
      if (!targets.length) return;

      commitCellChange((draft) => {
        targets.forEach((index) => {
          const cell = draft[index];
          if (!cell || cell.given) return;

          if (modeRef.current === 'pencil') {
            cell.pencilMarks = sortedToggle(cell.pencilMarks, number);
            cell.error = false;
          } else {
            cell.value = number;
            cell.pencilMarks = [];
            cell.error = false;
          }
        });
        return draft;
      }, modeRef.current === 'pencil' ? `Crayon ${number}` : `Saisie ${number}`);
    },
    [commitCellChange],
  );

  const eraseSelected = useCallback(() => {
    const targets = selectionOrActive(selectedRef.current, activeRef.current);
    if (!targets.length) return;

    commitCellChange((draft) => {
      targets.forEach((index) => {
        const cell = draft[index];
        if (!cell || cell.given) return;

        if (cell.value) {
          cell.value = null;
        } else {
          cell.pencilMarks = [];
        }
        cell.error = false;
      });
      return draft;
    }, 'Effacer');
  }, [commitCellChange]);

  const applyColor = useCallback(
    (color) => {
      setSelectedColor(color);
      setMode('color');

      const targets = selectionOrActive(selectedRef.current, activeRef.current);
      if (!targets.length || pausedRef.current || finishedRef.current) return;

      commitCellChange((draft) => {
        targets.forEach((index) => {
          const cell = draft[index];
          if (!cell || cell.given) return;
          cell.color = color;
        });
        return draft;
      }, color ? `Couleur ${color}` : 'Retirer couleur');
    },
    [commitCellChange],
  );

  const undo = useCallback(() => {
    if (pausedRef.current || finishedRef.current) return;

    setHistory((currentHistory) => {
      if (!currentHistory.past.length) return currentHistory;
      const action = currentHistory.past[currentHistory.past.length - 1];

      setCells((currentCells) => applyHistoryEntries(currentCells, action.before));
      setMessage({ text: `Annulé : ${action.label}`, type: 'info' });

      return {
        past: currentHistory.past.slice(0, -1),
        future: [action, ...currentHistory.future],
      };
    });
  }, []);

  const redo = useCallback(() => {
    if (pausedRef.current || finishedRef.current) return;

    setHistory((currentHistory) => {
      if (!currentHistory.future.length) return currentHistory;
      const [action, ...future] = currentHistory.future;

      setCells((currentCells) => applyHistoryEntries(currentCells, action.after));
      setMessage({ text: `Rétabli : ${action.label}`, type: 'info' });

      return {
        past: [...currentHistory.past, action],
        future,
      };
    });
  }, []);

  const runCheck = useCallback(
    (options = {}) => {
      const { silent = false } = options;
      const immediateErrors = findCheckErrors(cells, game.solution);

      setCells((currentCells) => {
        const currentErrors = findCheckErrors(currentCells, game.solution);
        return currentCells.map((cell, index) => ({
          ...cell,
          pencilMarks: [...cell.pencilMarks],
          error: currentErrors.has(index),
        }));
      });

      if (!silent) {
        setMessage(
          immediateErrors.size === 0
            ? { text: 'Aucune erreur détectée pour l’instant', type: 'success' }
            : { text: `${immediateErrors.size} erreur(s) détectée(s)`, type: 'error' },
        );
      }

      return immediateErrors.size;
    },
    [cells, game.solution],
  );

  const finishGame = useCallback(() => {
    if (pausedRef.current || finishedRef.current) return;

    const incomplete = cells.some((cell) => !cell.value);
    if (incomplete) {
      setMessage({ text: 'La grille n’est pas encore complète', type: 'info' });
      runCheck({ silent: true });
      return;
    }

    const hasWrongValue = cells.some((cell, index) => cell.value !== game.solution[index]);
    const constraintErrors = runCheck({ silent: true });

    if (!hasWrongValue && constraintErrors === 0) {
      setFinished(true);
      setMessage({ text: `Bravo ! Grille terminée en ${formatTime(elapsed)}.`, type: 'success' });
    } else {
      window.setTimeout(() => {
        setMessage({ text: 'La grille est complète, mais contient encore des erreurs.', type: 'error' });
      }, 0);
    }
  }, [cells, elapsed, game.solution, runCheck]);

  const restartGame = useCallback(() => {
    setCells(makeCells(game.puzzle, game.arrows));
    setSelected([]);
    setActiveCell(null);
    setHistory(emptyHistory());
    setElapsed(0);
    setPaused(false);
    setFinished(false);
    setMessage({ text: 'Partie recommencée.', type: 'info' });
  }, [game.arrows, game.puzzle]);

  const newGame = useCallback((difficultyKey = game.difficultyKey) => {
    const created = createGame(difficultyKey);
    setGame(created);
    setCells(created.cells);
    setSelected([]);
    setActiveCell(null);
    setHistory(emptyHistory());
    setElapsed(0);
    setPaused(false);
    setFinished(false);
    setMode('normal');
    setMessage({ text: `Nouvelle partie ${created.difficulty.label}.`, type: 'info' });
  }, [game.difficultyKey]);

  const handleDifficultyChange = useCallback(
    (difficultyKey) => {
      newGame(difficultyKey);
    },
    [newGame],
  );

  const clearSelection = useCallback(() => {
    setSelected([]);
    setActiveCell(null);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event) => {
      const target = event.target;
      const isTyping = target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement;
      if (isTyping) return;

      const key = event.key.toLowerCase();
      const ctrl = event.ctrlKey || event.metaKey;

      if (ctrl && key === 'z' && event.shiftKey) {
        event.preventDefault();
        redo();
        return;
      }

      if (ctrl && key === 'z') {
        event.preventDefault();
        undo();
        return;
      }

      if (ctrl && key === 'y') {
        event.preventDefault();
        redo();
        return;
      }

      if (pausedRef.current || finishedRef.current) {
        if (key === 'escape') clearSelection();
        return;
      }

      if (/^[1-9]$/.test(event.key)) {
        event.preventDefault();
        applyNumber(Number(event.key));
        return;
      }

      if (key === '0' || key === 'backspace' || key === 'delete') {
        event.preventDefault();
        eraseSelected();
        return;
      }

      if (key === 'p' || key === 'n') {
        event.preventDefault();
        setMode((current) => (current === 'pencil' ? 'normal' : 'pencil'));
        return;
      }

      if (key === 'c') {
        event.preventDefault();
        setMode('color');
        if (selectedColor !== null) applyColor(selectedColor);
        return;
      }

      if (key === 'escape') {
        event.preventDefault();
        clearSelection();
        return;
      }

      if (key === 'enter') {
        event.preventDefault();
        runCheck();
        return;
      }

      if (key === 'f') {
        event.preventDefault();
        finishGame();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [applyColor, applyNumber, clearSelection, eraseSelected, finishGame, redo, runCheck, selectedColor, undo]);

  const selectionLabel = useMemo(() => {
    if (!selected.length) return 'Aucune case sélectionnée';
    if (selected.length === 1) return '1 case sélectionnée';
    return `${selected.length} cases sélectionnées`;
  }, [selected.length]);

  return (
    <main className={`app ${finished ? 'is-victory' : ''}`}>
      <div className="app-background" />

      <div className="layout">
        <Toolbar
          mode={mode}
          setMode={setMode}
          selectedColor={selectedColor}
          onColor={applyColor}
          onCheck={runCheck}
          onFinish={finishGame}
          onRestart={restartGame}
          onNewGame={newGame}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          difficulty={game.difficultyKey}
          onDifficultyChange={handleDifficultyChange}
          elapsed={elapsed}
          paused={paused}
          onPauseToggle={() => setPaused((value) => !value)}
          message={message}
          disabled={disabled}
          victory={finished}
        />

        <section className="game-area" aria-label="Zone de jeu">
          <div className="game-topbar">
            <span>{selectionLabel}</span>
            <span>{game.difficulty.label}</span>
            <span>{Object.keys(game.arrows).length} flèches Search Nine</span>
          </div>

          <SudokuBoard
            cells={cells}
            selected={selected}
            activeCell={activeCell}
            onSelectionChange={(nextSelected, nextActive) => {
              setSelected(nextSelected);
              setActiveCell(nextActive);
            }}
            paused={paused}
            finished={finished}
          />

          <NumberPad
            onNumber={applyNumber}
            onErase={eraseSelected}
            disabled={disabled}
            mode={mode}
          />
        </section>
      </div>
    </main>
  );
}
