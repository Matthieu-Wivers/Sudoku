const PENCIL_POSITIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9];

export default function SudokuCell({
  cell,
  index,
  row,
  col,
  selected,
  active,
}) {
  const classes = [
    'sudoku-cell',
    selected ? 'is-selected' : '',
    active ? 'is-active' : '',
    cell.arrow ? 'has-arrow' : '',
    cell.given ? 'is-given' : 'is-player',
    cell.error ? 'is-error' : '',
    cell.color ? `cell-color-${cell.color}` : '',
    row % 3 === 0 ? 'border-top-heavy' : '',
    col % 3 === 0 ? 'border-left-heavy' : '',
    row === 8 || row % 3 === 2 ? 'border-bottom-heavy' : '',
    col === 8 || col % 3 === 2 ? 'border-right-heavy' : '',
  ]
    .filter(Boolean)
    .join(' ');

  const labelParts = [`ligne ${row + 1}`, `colonne ${col + 1}`];
  if (cell.value) labelParts.push(`valeur ${cell.value}`);
  if (cell.given) labelParts.push('case donnée');
  if (cell.arrow) labelParts.push(`flèche ${cell.arrow.direction}`);

  return (
    <div
      className={classes}
      data-cell-index={index}
      role="gridcell"
      aria-selected={selected}
      aria-label={labelParts.join(', ')}
    >
      {cell.arrow && (
        <svg
          className={`cell-arrow-bg arrow-${cell.arrow.direction}`}
          viewBox="0 0 100 100"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M38 8H62V52H84L50 92L16 52H38Z" />
        </svg>
      )}

      {cell.value ? (
        <span className="cell-value">{cell.value}</span>
      ) : (
        <div className="pencil-grid" aria-hidden="true">
          {PENCIL_POSITIONS.map((number) => (
            <span key={number}>{cell.pencilMarks.includes(number) ? number : ''}</span>
          ))}
        </div>
      )}
    </div>
  );
}
