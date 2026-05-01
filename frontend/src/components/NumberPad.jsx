const NUMBERS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function NumberPad({ onNumber, onErase, disabled, mode }) {
  return (
    <section className="number-pad-card" aria-label="Pavé numérique">
      <div className="number-pad-title">
        <span>Saisie</span>
        <strong>{mode === 'pencil' ? 'Crayon' : mode === 'color' ? 'Couleur' : 'Normal'}</strong>
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
      </div>

      <button
        type="button"
        className="wide-button danger-soft"
        onClick={onErase}
        disabled={disabled}
        aria-label="Effacer les cases sélectionnées"
      >
        Effacer
      </button>
    </section>
  );
}
