import { DIFFICULTIES } from '../utils/sudokuGenerator.js';

const COLORS = [
  { id: 'sun', label: 'Jaune' },
  { id: 'mint', label: 'Vert' },
  { id: 'sky', label: 'Bleu' },
  { id: 'rose', label: 'Rose' },
  { id: 'violet', label: 'Violet' },
];

function formatTime(seconds) {
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(rest).padStart(2, '0')}`;
}

export default function Toolbar({
  mode,
  setMode,
  selectedColor,
  onColor,
  onCheck,
  onFinish,
  onRestart,
  onNewGame,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  difficulty,
  onDifficultyChange,
  elapsed,
  paused,
  onPauseToggle,
  message,
  disabled,
  victory,
}) {
  return (
    <aside className="toolbar" aria-label="Contrôles de jeu">
      <section className="panel hero-panel">
        <div>
          <p className="eyebrow">Search Nine</p>
          <h1>Sudoku</h1>
        </div>
        <div className="timer" aria-label={`Temps écoulé ${formatTime(elapsed)}`}>
          {formatTime(elapsed)}
        </div>
        {victory && <div className="victory-badge">Victoire ✨</div>}
      </section>

      <section className="panel">
        <label className="field-label" htmlFor="difficulty">
          Difficulté
        </label>
        <div className="difficulty-row">
          <select
            id="difficulty"
            value={difficulty}
            onChange={(event) => onDifficultyChange(event.target.value)}
            disabled={disabled}
            aria-label="Choisir la difficulté"
          >
            {Object.entries(DIFFICULTIES).map(([key, data]) => (
              <option key={key} value={key}>
                {data.label}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => onNewGame(difficulty)} disabled={disabled}>
            Nouvelle partie
          </button>
        </div>
      </section>

      <section className="panel mobile-panel">
        <div className="segmented" role="group" aria-label="Mode de saisie">
          <button
            type="button"
            className={mode === 'normal' ? 'is-on' : ''}
            onClick={() => setMode('normal')}
            disabled={disabled}
            aria-label="Mode normal"
          >
            Normal
          </button>
          <button
            type="button"
            className={mode === 'pencil' ? 'is-on' : ''}
            onClick={() => setMode('pencil')}
            disabled={disabled}
            aria-label="Mode crayon"
          >
            Crayon
          </button>
          <button
            type="button"
            className={mode === 'color' ? 'is-on' : ''}
            onClick={() => setMode('color')}
            disabled={disabled}
            aria-label="Mode couleur"
          >
            Couleur
          </button>
        </div>

        <div className="color-palette" aria-label="Couleurs de surlignage">
          {COLORS.map((color) => (
            <button
              key={color.id}
              type="button"
              className={`color-dot color-${color.id} ${selectedColor === color.id ? 'is-selected' : ''}`}
              onClick={() => onColor(color.id)}
              disabled={disabled}
              aria-label={`Colorier en ${color.label}`}
              title={color.label}
            />
          ))}
          <button
            type="button"
            className={`no-color ${selectedColor === null ? 'is-selected' : ''}`}
            onClick={() => onColor(null)}
            disabled={disabled}
            aria-label="Retirer la couleur"
          >
            Aucune
          </button>
        </div>
      </section>

      <section className="panel button-grid">
        <button type="button" onClick={onUndo} disabled={disabled || !canUndo} aria-label="Annuler">
          Undo
        </button>
        <button type="button" onClick={onRedo} disabled={disabled || !canRedo} aria-label="Rétablir">
          Redo
        </button>
        <button type="button" onClick={onCheck} disabled={disabled} aria-label="Vérifier la grille">
          Check
        </button>
        <button type="button" onClick={onFinish} disabled={disabled} aria-label="Finir la partie">
          Finir
        </button>
        <button type="button" onClick={onRestart} disabled={disabled} aria-label="Recommencer la partie">
          Recommencer
        </button>
        <button type="button" onClick={onPauseToggle} aria-label={paused ? 'Reprendre' : 'Mettre en pause'}>
          {paused ? 'Reprendre' : 'Pause'}
        </button>
      </section>

      <section className={`panel message-panel ${message.type ? `message-${message.type}` : ''}`} aria-live="polite">
        {message.text || 'Sélectionne une case puis saisis un chiffre.'}
      </section>

      <details className="panel help-panel">
        <summary>Raccourcis clavier</summary>
        <div className="shortcut-list">
          <span>1–9 : saisir</span>
          <span>0 / Suppr / Retour : effacer</span>
          <span>P ou N : crayon</span>
          <span>C : couleur</span>
          <span>Ctrl+Z : undo</span>
          <span>Ctrl+Y / Ctrl+Shift+Z : redo</span>
          <span>Entrée : check</span>
          <span>F : finir</span>
          <span>Échap : désélectionner</span>
          <span>Shift+clic : rectangle</span>
        </div>
      </details>
    </aside>
  );
}
