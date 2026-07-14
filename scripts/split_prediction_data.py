#!/usr/bin/env python3
"""Split the hackathon dataset into prediction / train / test files.

Workflow:
1. Extract rows that need prediction (cells marked as PREDICT) into predcition.csv.
2. Split the remaining rows by ship type (W1 vs W2) into test set.
3. Put the rest into train set.

The script is intentionally dependency-light and uses only the Python standard library.
"""

from __future__ import annotations

import argparse
import csv
import re
from collections.abc import Iterable
from pathlib import Path


def ship_type(ship_id: str) -> str:
    """Classify a ship into the two known sister-ship families."""
    match = re.match(r'^S(\d+)$', ship_id.strip())
    if not match:
        raise ValueError(f'Unsupported ship id format: {ship_id}')

    num = int(match.group(1))
    if 1 <= num <= 8 or num == 21:
        return 'W1'
    if 9 <= num <= 12 or num in {22, 23}:
        return 'W2'
    raise ValueError(f'Unsupported ship id: {ship_id}')


def load_rows(path: Path) -> list[dict[str, str]]:
    with path.open('r', encoding='utf-8-sig', newline='') as handle:
        return list(csv.DictReader(handle))


def save_rows(path: Path, rows: Iterable[dict[str, str]], fieldnames: list[str]) -> None:
    with path.open('w', encoding='utf-8', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def split_rows(rows: list[dict[str, str]], test_size: float = 0.2) -> tuple[list[dict[str, str]], list[dict[str, str]]]:
    """Split remaining rows by ship type, keeping both W1 and W2 in the test set."""
    if not 0.0 < test_size < 1.0:
        raise ValueError('test_size must be between 0 and 1')

    by_class: dict[str, list[dict[str, str]]] = {'W1': [], 'W2': []}
    for row in rows:
        cls = ship_type(row.get('De-identification Name', ''))
        by_class[cls].append(row)

    test_rows: list[dict[str, str]] = []
    train_rows: list[dict[str, str]] = []

    for cls in ('W1', 'W2'):
        class_rows = by_class[cls]
        if not class_rows:
            continue

        # Deterministic ordering keeps the split reproducible.
        class_rows = sorted(
            class_rows,
            key=lambda row: (
                row.get('NOON_UTC', ''),
                row.get('VOYAGE', ''),
                row.get('De-identification Name', ''),
            ),
        )

        n_test = max(1, int(round(len(class_rows) * test_size))) if len(class_rows) > 1 else 0
        test_rows.extend(class_rows[:n_test])
        train_rows.extend(class_rows[n_test:])

    return test_rows, train_rows


def main() -> None:
    parser = argparse.ArgumentParser(description='Create prediction/train/test CSV splits for the hackathon dataset')
    parser.add_argument('--input', default='tmp/yangming-aws-summit-hackathon/vt_fd.csv', help='Path to vt_fd.csv')
    parser.add_argument(
        '--output-dir', default='tmp/yangming-aws-summit-hackathon', help='Directory for the split CSV files'
    )
    parser.add_argument(
        '--test-size', type=float, default=0.2, help='Fraction of rows per ship class to put into the test set'
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    rows = load_rows(input_path)
    fieldnames = list(rows[0].keys()) if rows else []

    fuel_columns = [name for name in fieldnames if name.startswith('ME_FULLSPEED_CONSUMP_')]
    if not fuel_columns:
        raise ValueError('No fuel consumption columns found; expected ME_FULLSPEED_CONSUMP_* columns')

    prediction_rows = [row for row in rows if any(row.get(col, '') == 'PREDICT' for col in fuel_columns)]
    remaining_rows = [row for row in rows if row not in prediction_rows]

    test_rows, train_rows = split_rows(remaining_rows, test_size=args.test_size)

    save_rows(output_dir / 'predcition.csv', prediction_rows, fieldnames)
    save_rows(output_dir / 'test.csv', test_rows, fieldnames)
    save_rows(output_dir / 'train.csv', train_rows, fieldnames)

    print(f'Loaded {len(rows)} rows from {input_path}')
    print(f'Prediction rows: {len(prediction_rows)}')
    print(f'Test rows: {len(test_rows)}')
    print(f'Train rows: {len(train_rows)}')
    print(f'Output files written to {output_dir}')


if __name__ == '__main__':
    main()
