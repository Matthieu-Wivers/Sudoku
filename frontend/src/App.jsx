import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import SudokuBoard from './components/SudokuBoard.jsx';
import NumberPad from './components/NumberPad.jsx';
import Toolbar from './components/Toolbar.jsx';

import {
  DIFFICULTIES,
  GAME_MODES,
  generateClassicSudokuPuzzle,
  generateSearchNinePuzzle,
  getTargetIndex,
} from './utils/sudokuGenerator.js';
import { applyHistoryEntries, createHistoryAction, emptyHistory, pushHistory } from './utils/history.js';

import './styles.css';

const DEFAULT_SETUP = {
  modeKey: 'searchNine',
  difficultyKey: 'medium',
};

function makeCells(puzzle, arrows = {}) {
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

function createGame(modeKey = DEFAULT_SETUP.modeKey, difficultyKey = DEFAULT_SETUP.difficultyKey) {
  const safeModeKey = GAME_MODES[modeKey] ? modeKey : DEFAULT_SETUP.modeKey;
  const safeDifficultyKey = DIFFICULTIES[difficultyKey] ? difficultyKey : DEFAULT_SETUP.difficultyKey;
  const generated =
    safeModeKey === 'classic'
      ? generateClassicSudokuPuzzle(safeDifficultyKey)
      : generateSearchNinePuzzle(safeDifficultyKey);

  return {
    ...generated,
    modeKey: safeModeKey,
    mode: GAME_MODES[safeModeKey],
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

function SetupScreen({ setup, onSetupChange, onStart }) {
  return (
    <main className="app setup-app">
      <div className="app-background" />
      <section className="setup-card" aria-label="Préparer une partie">
        <p className="eyebrow">Sudoku</p>
        <h1>Nouvelle partie</h1>
        <p className="setup-copy">
          Choisis ton mode, ta difficulté, puis démarre quand tu es prêt.
        </p>

        <div className="setup-grid">
          <label className="setup-field" htmlFor="game-mode">
            <span className="field-label">Mode</span>
            <select
              id="game-mode"
              value={setup.modeKey}
              onChange={(event) => onSetupChange({ modeKey: event.target.value })}
            >
              {Object.entries(GAME_MODES).map(([key, mode]) => (
                <option key={key} value={key}>
                  {mode.label}
                </option>
              ))}
            </select>
          </label>

          <label className="setup-field" htmlFor="setup-difficulty">
            <span className="field-label">Difficulté</span>
            <select
              id="setup-difficulty"
              value={setup.difficultyKey}
              onChange={(event) => onSetupChange({ difficultyKey: event.target.value })}
            >
              {Object.entries(DIFFICULTIES).map(([key, data]) => (
                <option key={key} value={key}>
                  {data.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <button type="button" className="start-button" onClick={onStart}>
          Démarrer
        </button>
      </section>
    </main>
  );
}

function ConfirmModal({ confirmation, onCancel, onConfirm }) {
  if (!confirmation) return null;

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onCancel}>
      <section
        className="confirm-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-title">{confirmation.title}</h2>
        <p>{confirmation.message}</p>
        <div className="confirm-actions">
          <button type="button" className="wide-button" onClick={onCancel}>
            Annuler
          </button>
          <button type="button" className="wide-button danger-soft" onClick={onConfirm}>
            {confirmation.confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}

export default function App() {
  const [setup, setSetup] = useState(DEFAULT_SETUP);
  const [game, setGame] = useState(null);
  const [cells, setCells] = useState([]);
  const [selected, setSelected] = useState([]);
  const [activeCell, setActiveCell] = useState(null);
  const [mode, setMode] = useState('normal');
  const [selectedColor, setSelectedColor] = useState('sun');
  const [history, setHistory] = useState(() => emptyHistory());
  const [elapsed, setElapsed] = useState(0);
  const [paused, setPaused] = useState(false);
  const [finished, setFinished] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [confirmation, setConfirmation] = useState(null);

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
    if (!game || paused || finished) return undefined;

    const interval = window.setInterval(() => {
      setElapsed((value) => value + 1);
    }, 1000);

    return () => window.clearInterval(interval);
  }, [paused, finished, game]);

  const disabled = !game || paused || finished;
  const canUndo = history.past.length > 0;
  const canRedo = history.future.length > 0;

  const resetRuntimeState = useCallback(() => {
    setSelected([]);
    setActiveCell(null);
    setHistory(emptyHistory());
    setElapsed(0);
    setPaused(false);
    setFinished(false);
    setMode('normal');
    setMessage({ text: '', type: '' });
  }, []);

  const startGame = useCallback(() => {
    const created = createGame(setup.modeKey, setup.difficultyKey);
    setGame(created);
    setCells(created.cells);
    resetRuntimeState();
    setMessage({ text: `${created.mode.label} — ${created.difficulty.label}.`, type: 'info' });
  }, [resetRuntimeState, setup.difficultyKey, setup.modeKey]);

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
          if (!cell) return;
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
      if (!game) return 0;

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
    [cells, game],
  );

  const finishGame = useCallback(() => {
    if (!game || pausedRef.current || finishedRef.current) return;

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
  }, [cells, elapsed, game, runCheck]);

  const restartGame = useCallback(() => {
    if (!game) return;

    setCells(makeCells(game.puzzle, game.arrows));
    resetRuntimeState();
    setMessage({ text: 'Partie recommencée.', type: 'info' });
  }, [game, resetRuntimeState]);

  const returnToSetup = useCallback(() => {
    if (game) {
      setSetup({ modeKey: game.modeKey, difficultyKey: game.difficultyKey });
    }
    setGame(null);
    setCells([]);
    resetRuntimeState();
    setMessage({ text: '', type: '' });
  }, [game, resetRuntimeState]);

  const requestRestart = useCallback(() => {
    setConfirmation({
      action: 'restart',
      title: 'Recommencer cette partie ?',
      message: 'La grille repartira de zéro et l’historique sera vidé.',
      confirmLabel: 'Recommencer',
    });
  }, []);

  const requestNewGame = useCallback(() => {
    setConfirmation({
      action: 'new-game',
      title: 'Nouvelle partie ?',
      message: 'Tu vas revenir au choix du mode et de la difficulté.',
      confirmLabel: 'Nouvelle partie',
    });
  }, []);

  const confirmAction = useCallback(() => {
    if (confirmation?.action === 'restart') restartGame();
    if (confirmation?.action === 'new-game') returnToSetup();
    setConfirmation(null);
  }, [confirmation, restartGame, returnToSetup]);

  const clearSelection = useCallback(() => {
    setSelected([]);
    setActiveCell(null);
  }, []);

  useEffect(() => {
    if (!game) return undefined;

    const handleKeyDown = (event) => {
      const target = event.target;
      const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;
      if (isTyping) return;

      const key = event.key.toLowerCase();
      const ctrl = event.ctrlKey || event.metaKey;

      if (key === 'escape' && confirmation) {
        event.preventDefault();
        setConfirmation(null);
        return;
      }

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
  }, [
    applyColor,
    applyNumber,
    clearSelection,
    confirmation,
    eraseSelected,
    finishGame,
    game,
    redo,
    runCheck,
    selectedColor,
    undo,
  ]);

  const selectionLabel = useMemo(() => {
    if (!selected.length) return 'Aucune case sélectionnée';
    if (selected.length === 1) return '1 case sélectionnée';
    return `${selected.length} cases sélectionnées`;
  }, [selected.length]);

  if (!game) {
    return (
      <SetupScreen
        setup={setup}
        onSetupChange={(changes) => setSetup((current) => ({ ...current, ...changes }))}
        onStart={startGame}
      />
    );
  }

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
          onRestart={requestRestart}
          onNewGame={requestNewGame}
          onUndo={undo}
          onRedo={redo}
          canUndo={canUndo}
          canRedo={canRedo}
          game={game}
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
            <span>{game.mode.label}</span>
            <span>{game.difficulty.label}</span>
            <span>
              {game.modeKey === 'searchNine'
                ? `${Object.keys(game.arrows).length} flèches Search Nine`
                : 'Sudoku classique'}
            </span>
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
            setMode={setMode}
            selectedColor={selectedColor}
            onColor={applyColor}
            onUndo={undo}
            onRedo={redo}
            canUndo={canUndo}
            canRedo={canRedo}
          />
        </section>
      </div>

      <ConfirmModal
        confirmation={confirmation}
        onCancel={() => setConfirmation(null)}
        onConfirm={confirmAction}
      />
    </main>
  );
}
