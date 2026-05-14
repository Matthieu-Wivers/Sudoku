const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

const COLORS = [
  { id: 'sun', label: 'Jaune' },
  { id: 'mint', label: 'Vert' },
  { id: 'sky', label: 'Bleu' },
  { id: 'rose', label: 'Rose' },
  { id: 'violet', label: 'Violet' },
];

function modeLabel(mode) {
  if (mode === 'pencil') return 'Crayon';
  if (mode === 'color') return 'Couleur';
  return 'Normal';
}

export default function NumberPad({
  onNumber,
  onErase,
  disabled,
  mode,
  setMode,
  selectedColor,
  onColor,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
}) {
  return (
    <section className="number-pad-card" aria-label="Pavé numérique">
      <div className="number-pad-title">
        <span>Mode</span>
        <strong>{modeLabel(mode)}</strong>
      </div>

      <div className="mobile-pad-tools" aria-label="Outils rapides mobile">
        <button
          type="button"
          className="icon-tool"
          onClick={onUndo}
          disabled={disabled || !canUndo}
          aria-label="Annuler"
          title="Annuler"
        >
          ↶
        </button>
        <button
          type="button"
          className="icon-tool"
          onClick={onRedo}
          disabled={disabled || !canRedo}
          aria-label="Rétablir"
          title="Rétablir"
        >
          ↷
        </button>

        <div className="mobile-mode-group" role="group" aria-label="Mode de saisie">
          <button
            type="button"
            className={`icon-tool ${mode === 'pencil' ? 'is-on' : ''}`}
            onClick={() => setMode('pencil')}
            disabled={disabled}
            aria-label="Mode crayon"
            title="Crayon"
          >
            ✎
          </button>
          <button
            type="button"
            className={`icon-tool ${mode === 'color' ? 'is-on' : ''}`}
            onClick={() => setMode('color')}
            disabled={disabled}
            aria-label="Mode couleur"
            title="Couleur"
          >
            ◐
          </button>
        </div>

        <div className="mobile-color-strip" aria-label="Couleurs">
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
            title="Retirer la couleur"
          >
            <span className="no-color-bar" />
          </button>
        </div>
      </div>

      <div className="number-pad">
        {NUMBERS.map((number) => (
          <button
            key={number}
            type="button"
            className="number-button"
            onClick={() => onNumber(number)}
            disabled={disabled}
            aria-label={`Saisir ${number}`}
          >
            {number}
          </button>
        ))}
        <button
          type="button"
          className="wide-button danger-soft"
          onClick={onErase}
          disabled={disabled}
          aria-label="Effacer les cases sélectionnées"
          title="Effacer"
        >
          ⌫
        </button>
      </div>
    </section>
  );
}
