#!/usr/bin/env python3
"""Generate submission CSVs from saved model artifacts."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from build_model_ready_data import convert_total_energy_to_fuel_amount
from model_pipeline_utils import build_feature_columns, prepare_feature_frame


def build_submission_frame(prediction_df: pd.DataFrame, predictions: list[float]) -> pd.DataFrame:
    fuel_types = prediction_df['target_fuel_column'].astype(str)
    return pd.DataFrame({
        'ship_id': prediction_df['De-identification Name'].astype(str),
        'day': prediction_df['NOON_UTC'].astype(int),
        'fuel_type': fuel_types,
        'predicted_value': [
            convert_total_energy_to_fuel_amount(float(pred), fuel)
            for pred, fuel in zip(predictions, fuel_types)
        ],
    })


def generate_submission(
    model_path: Path,
    prediction_df: pd.DataFrame,
    feature_cols: list[str] | None = None,
) -> pd.DataFrame:
    model = joblib.load(model_path)
    feature_cols = feature_cols or build_feature_columns(prediction_df)
    prediction_X = prepare_feature_frame(prediction_df, feature_cols)
    predictions = model.predict(prediction_X)
    return build_submission_frame(prediction_df, predictions)


def main() -> None:
    parser = argparse.ArgumentParser(description='Generate submission CSV from a saved model artifact')
    parser.add_argument('--model', required=True, help='Path to the pickled model artifact')
    parser.add_argument('--prediction', required=True, help='Prediction CSV path')
    parser.add_argument('--output', required=True, help='Output submission CSV path')
    parser.add_argument('--feature-cols-json', default=None, help='Optional JSON file with feature column names')
    args = parser.parse_args()

    prediction_df = pd.read_csv(args.prediction)
    feature_cols: list[str] | None = None
    if args.feature_cols_json:
        feature_cols = json.loads(Path(args.feature_cols_json).read_text(encoding='utf-8'))

    submission = generate_submission(Path(args.model), prediction_df, feature_cols)
    Path(args.output).parent.mkdir(parents=True, exist_ok=True)
    submission.to_csv(args.output, index=False)
    print(f'Wrote submission to {args.output}')


if __name__ == '__main__':
    main()
