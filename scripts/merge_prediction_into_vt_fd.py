#!/usr/bin/env python3
"""Fill the 102 ``PREDICT`` cells in ``dataset/vt_fd.csv`` from ``submission.csv``.

Writes ``dataset/vt_fd_predict.csv`` (source stays untouched). Every cell is copied
verbatim except the cells literally equal to ``PREDICT``, which are overwritten with the
predicted fuel value keyed on ``(ship_id, noon_utc, fuel_column)`` — NOT on ``(ship, day)``,
because 344 duplicate ``(ship_id, noon_utc)`` rows exist and at least one predict day
(``S21,1018``) is a dup pair where only one row holds ``PREDICT`` (the other is ``HIDDEN``).
``HIDDEN`` and real values pass through unchanged.

Stdlib ``csv`` only — no pandas. ``FUEL_COLS``/``ORIGINAL_COLUMNS`` are re-declared here
rather than imported from ``ym_datalake.ml_york.feature_engineering.io`` to keep this
dependency-free.
"""

from __future__ import annotations

import csv
from pathlib import Path

_ROOT = Path(__file__).resolve().parent.parent
_SUBMISSION = _ROOT / 'submission.csv'
_SOURCE = _ROOT / 'dataset' / 'vt_fd.csv'
_OUTPUT = _ROOT / 'dataset' / 'vt_fd_predict.csv'

_SHIP_COL = 'De-identification Name'
_NOON_COL = 'NOON_UTC'
_FUEL_COLS = (
    'ME_FULLSPEED_CONSUMP_HSHFO',
    'ME_FULLSPEED_CONSUMP_ULSFO',
    'ME_FULLSPEED_CONSUMP_VLSFO',
    'ME_FULLSPEED_CONSUMP_LSMGO',
    'ME_FULLSPEED_CONSUMP_BIO_HSFO',
)


def _load_predictions(path: Path) -> dict[tuple[str, str, str], str]:
    """``submission.csv`` -> ``{(ship_id, day, fuel_type): predicted_value_string}``."""
    pred: dict[tuple[str, str, str], str] = {}
    with path.open(encoding='utf-8', newline='') as fh:
        reader = csv.DictReader(fh)
        for row in reader:
            key = (row['ship_id'], row['day'], row['fuel_type'])
            assert key not in pred, f'duplicate submission key {key}'
            pred[key] = row['predicted_value']
    return pred


def merge() -> None:
    pred = _load_predictions(_SUBMISSION)
    consumed: set[tuple[str, str, str]] = set()

    with _SOURCE.open(encoding='utf-8-sig', newline='') as fh:
        rows = list(csv.reader(fh))

    header, data = rows[0], rows[1:]
    ship_idx = header.index(_SHIP_COL)
    noon_idx = header.index(_NOON_COL)
    fuel_idx = {col: header.index(col) for col in _FUEL_COLS}

    replacements = 0
    hidden_before = sum(cell == 'HIDDEN' for row in data for cell in row)

    for row in data:
        ship_id, noon_utc = row[ship_idx], row[noon_idx]
        for col, idx in fuel_idx.items():
            if row[idx] != 'PREDICT':
                continue  # HIDDEN and real values pass through untouched
            key = (ship_id, noon_utc, col)
            assert key in pred, f'no prediction for PREDICT cell {key}'
            assert key not in consumed, f'prediction key consumed twice {key}'
            row[idx] = pred[key]
            consumed.add(key)
            replacements += 1

    # Fail loudly if any invariant is off — a silent partial fill would corrupt the datalake.
    assert replacements == 102, f'expected 102 replacements, made {replacements}'
    assert consumed == set(pred), f'unused submission keys: {set(pred) - consumed}'
    remaining = sum(row[idx] == 'PREDICT' for row in data for idx in fuel_idx.values())
    assert remaining == 0, f'{remaining} PREDICT cells remain'
    hidden_after = sum(cell == 'HIDDEN' for row in data for cell in row)
    assert hidden_after == hidden_before, f'HIDDEN count changed {hidden_before} -> {hidden_after}'
    assert all(len(row) == len(header) for row in data), 'column count changed on some row'

    with _OUTPUT.open('w', encoding='utf-8', newline='') as fh:
        writer = csv.writer(fh, lineterminator='\n')
        writer.writerow(header)
        writer.writerows(data)

    print(
        f'{_OUTPUT.relative_to(_ROOT)}: {replacements} PREDICT cells filled, {len(data)} rows, {hidden_after} HIDDEN cells'
    )


if __name__ == '__main__':
    merge()
