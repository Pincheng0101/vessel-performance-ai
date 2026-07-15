#!/usr/bin/env python3
"""Create model-ready train/test/prediction CSV files from the maintenance-featured voyage data.

The output files include:
- target_value: the known fuel-consumption target for training/test rows
- target_fuel_column: the fuel column that the target comes from
- is_prediction_row: whether the row is part of the hidden prediction set
"""

from __future__ import annotations

import argparse
import csv
import json
import re
import statistics
from pathlib import Path
from typing import Any

import feature_engineering as fe

FUEL_HEAT_VALUES = {
    'ME_FULLSPEED_CONSUMP_HSHFO': 40.2,
    'ME_FULLSPEED_CONSUMP_ULSFO': 41.2,
    'ME_FULLSPEED_CONSUMP_VLSFO': 40.2,
    'ME_FULLSPEED_CONSUMP_LSMGO': 42.7,
    'ME_FULLSPEED_CONSUMP_BIO_HSFO': 39.4,
}


def ship_type(ship_id: str) -> str:
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


def save_rows(path: Path, rows: list[dict[str, Any]], fieldnames: list[str]) -> None:
    with path.open('w', encoding='utf-8', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)


def compute_unified_target_value(row: dict[str, str]) -> float | None:
    """Convert fuel consumption into a unified total-energy target.

    For each fuel column, the fuel amount is multiplied by the corresponding heat value
    and summed across all fuel columns present in the row. The resulting target is the
    total thermal energy for the row.
    """

    fuel_columns = [name for name in row if name.startswith('ME_FULLSPEED_CONSUMP_')]

    total_energy = 0.0
    for col in fuel_columns:
        value = _to_float(row.get(col))
        if value is None:
            continue
        heat_value = FUEL_HEAT_VALUES.get(col)
        if heat_value is None:
            continue
        total_energy += value * heat_value

    return total_energy if total_energy else None


def convert_total_energy_to_fuel_amount(total_energy: float, fuel_type: str) -> float:
    """Convert a predicted total-energy value back to a fuel amount for submission."""

    heat_value = FUEL_HEAT_VALUES.get(fuel_type)
    if heat_value is None or heat_value == 0:
        raise ValueError(f'Unknown fuel type: {fuel_type}')
    return total_energy / heat_value


def compute_zscore_stats(values: list[float]) -> tuple[float, float]:
    """Compute population mean/std (ddof=0) for z-score normalization."""

    mean = statistics.mean(values)
    std = statistics.pstdev(values)
    return mean, std


def zscore_normalize(value: float, mean: float, std: float) -> float:
    """Apply z-score normalization; guard against zero std by returning 0."""

    if std == 0:
        return 0.0
    return (value - mean) / std


def _to_float(value: Any) -> float | None:
    if value is None:
        return None
    text = str(value).strip()
    if text in {'', 'nan', 'NaN', 'None', 'NULL'}:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def infer_target(row: dict[str, str], fuel_columns: list[str]) -> tuple[str, str, bool]:
    for col in fuel_columns:
        value = (row.get(col) or '').strip()
        if value == '':
            continue
        if value == 'PREDICT':
            return col, '', True
        try:
            float(value)
            return col, value, False
        except ValueError:
            continue
    return '', '', False


def split_rows(rows: list[dict[str, Any]], test_size: float = 0.2) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    if not 0.0 < test_size < 1.0:
        raise ValueError('test_size must be between 0 and 1')

    by_class: dict[str, list[dict[str, Any]]] = {'W1': [], 'W2': []}
    for row in rows:
        ship_id = (row.get('De-identification Name') or '').strip()
        by_class[ship_type(ship_id)].append(row)

    test_rows: list[dict[str, Any]] = []
    train_rows: list[dict[str, Any]] = []

    for cls in ('W1', 'W2'):
        class_rows = sorted(
            by_class[cls],
            key=lambda item: (
                item.get('NOON_UTC', ''),
                item.get('VOYAGE', ''),
                item.get('De-identification Name', ''),
            ),
        )
        if not class_rows:
            continue
        n_test = max(1, int(round(len(class_rows) * test_size))) if len(class_rows) > 1 else 0
        test_rows.extend(class_rows[:n_test])
        train_rows.extend(class_rows[n_test:])

    return test_rows, train_rows


def main() -> None:
    parser = argparse.ArgumentParser(description='Create model-ready train/test/prediction CSV files')
    parser.add_argument(
        '--input',
        default='dataset/vt_fd_with_maintenance_features.csv',
        help='Path to the enriched voyage CSV',
    )
    parser.add_argument('--output-dir', default='dataset', help='Directory for the output files')
    parser.add_argument(
        '--test-size', type=float, default=0.2, help='Fraction of rows per ship class to place into the test set'
    )
    args = parser.parse_args()

    input_path = Path(args.input)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    rows = load_rows(input_path)
    if not rows:
        raise ValueError('Input file is empty')

    fieldnames = list(rows[0].keys())
    fuel_columns = [name for name in fieldnames if name.startswith('ME_FULLSPEED_CONSUMP_')]
    if not fuel_columns:
        raise ValueError('No fuel columns found in input file')

    prepared_rows: list[dict[str, Any]] = []
    for row in rows:
        target_fuel, target_value, is_prediction = infer_target(row, fuel_columns)
        prepared_row = dict(row)
        prepared_row['target_fuel_column'] = target_fuel
        prepared_row['target_value'] = ''
        prepared_row['is_prediction_row'] = int(is_prediction)

        if not is_prediction:
            unified_target = compute_unified_target_value(row)
            if unified_target is not None:
                prepared_row['target_value'] = str(unified_target)

        # Clip physically-impossible raw values in place and add all derived features.
        prepared_row.update(fe.engineer_row(row))

        prepared_rows.append(prepared_row)

    prediction_rows = [row for row in prepared_rows if row['is_prediction_row'] == 1]
    training_rows = [row for row in prepared_rows if row['is_prediction_row'] == 0 and row['target_value'] != '']

    test_rows, train_rows = split_rows(training_rows, test_size=args.test_size)
    test_rows = [
        row
        for row in test_rows
        if _to_float(row.get('HOURS_FULL_SPEED')) is not None and _to_float(row.get('HOURS_FULL_SPEED')) >= 22
    ]

    # Fit z-score stats on the labels that land in train + test, then add a normalized
    # column while keeping the original target_value. Stats are persisted so prediction
    # can invert the transform consistently.
    label_values = [
        value for row in (*train_rows, *test_rows) if (value := _to_float(row.get('target_value'))) is not None
    ]
    target_mean, target_std = compute_zscore_stats(label_values)

    for row in (*train_rows, *test_rows):
        value = _to_float(row.get('target_value'))
        row['target_value_normalized'] = '' if value is None else str(zscore_normalize(value, target_mean, target_std))
    for row in prediction_rows:
        row['target_value_normalized'] = ''

    normalization = {
        'method': 'zscore',
        'column': 'target_value',
        'normalized_column': 'target_value_normalized',
        'mean': target_mean,
        'std': target_std,
        'std_ddof': 0,
        'source': 'train+test',
        'n': len(label_values),
    }
    normalization_path = output_dir / 'target_value_normalization.json'
    normalization_path.write_text(json.dumps(normalization, indent=2, ensure_ascii=False), encoding='utf-8')

    # Keep fieldnames ordered, adding model-target and derived feature columns at the end.
    output_fieldnames = (
        fieldnames
        + [
            'target_fuel_column',
            'target_value',
            'is_prediction_row',
            'target_value_normalized',
        ]
        + fe.ENGINEERED_COLUMNS
    )
    save_rows(output_dir / 'prediction_model_ready.csv', prediction_rows, output_fieldnames)
    save_rows(output_dir / 'test_model_ready.csv', test_rows, output_fieldnames)
    save_rows(output_dir / 'train_model_ready.csv', train_rows, output_fieldnames)

    print(f'Loaded {len(rows)} rows from {input_path}')
    print(f'Prediction rows: {len(prediction_rows)}')
    print(f'Test rows: {len(test_rows)}')
    print(f'Train rows: {len(train_rows)}')
    print(f'Label normalization (z-score): mean={target_mean:.4f} std={target_std:.4f} n={len(label_values)}')
    print(f'Wrote normalization stats to {normalization_path}')
    print(f'Wrote files to {output_dir}')


if __name__ == '__main__':
    main()
