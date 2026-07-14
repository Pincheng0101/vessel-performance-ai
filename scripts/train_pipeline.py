#!/usr/bin/env python3
"""Training pipeline for the hackathon prediction task.

Workflow:
1. Load enriched train/test/prediction CSV files.
2. Train a baseline model on the train split with 3-fold cross validation.
3. Evaluate on the held-out test set.
4. Generate the submission CSV in the required format.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from generate_submission import build_submission_frame
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestRegressor
from sklearn.impute import SimpleImputer
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import KFold, cross_val_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder

try:
    from xgboost import XGBRegressor

    XGBOOST_AVAILABLE = True
except ImportError:
    XGBOOST_AVAILABLE = False

from build_model_ready_data import convert_total_energy_to_fuel_amount
from model_pipeline_utils import build_feature_columns, prepare_feature_frame, split_feature_types


def load_csv(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path)
    return df


def build_models(preprocessor: ColumnTransformer) -> dict[str, Pipeline]:
    models: dict[str, Pipeline] = {
        'LinearRegression': Pipeline(
            steps=[
                ('preprocess', preprocessor),
                ('regressor', LinearRegression()),
            ]
        ),
        'RandomForest': Pipeline(
            steps=[
                ('preprocess', preprocessor),
                ('regressor', RandomForestRegressor(n_estimators=200, random_state=42, n_jobs=-1)),
            ]
        ),
    }

    if XGBOOST_AVAILABLE:
        models['XGBoost'] = Pipeline(
            steps=[
                ('preprocess', preprocessor),
                (
                    'regressor',
                    XGBRegressor(
                        objective='reg:squarederror',
                        n_estimators=200,
                        random_state=42,
                        n_jobs=-1,
                        verbosity=0,
                    ),
                ),
            ]
        )

    return models


def train_and_evaluate(train_df: pd.DataFrame, test_df: pd.DataFrame, prediction_df: pd.DataFrame) -> dict[str, Any]:
    feature_cols = build_feature_columns(train_df)

    numeric_features, categorical_features = split_feature_types(
        train_df,
        test_df,
        prediction_df,
        feature_cols=feature_cols,
    )
    train_X = prepare_feature_frame(train_df, feature_cols, numeric_features, categorical_features)
    test_X = prepare_feature_frame(test_df, feature_cols, numeric_features, categorical_features)
    prediction_X = prepare_feature_frame(prediction_df, feature_cols, numeric_features, categorical_features)

    train_y = pd.to_numeric(train_df['target_value'], errors='coerce')
    test_y = pd.to_numeric(test_df['target_value'], errors='coerce')

    train_mask = train_y.notna()
    test_mask = test_y.notna()
    train_X = train_X.loc[train_mask]
    train_y = train_y.loc[train_mask]
    test_X = test_X.loc[test_mask]
    test_y = test_y.loc[test_mask]

    preprocessor = ColumnTransformer(
        transformers=[
            ('num', SimpleImputer(strategy='median'), numeric_features),
            (
                'cat',
                Pipeline(
                    steps=[
                        ('imputer', SimpleImputer(strategy='most_frequent')),
                        ('onehot', OneHotEncoder(handle_unknown='ignore')),
                    ]
                ),
                categorical_features,
            ),
        ],
        remainder='drop',
    )

    models = build_models(preprocessor)
    kfold = KFold(n_splits=3, shuffle=True, random_state=42)

    metrics_summary: dict[str, Any] = {}
    submissions: dict[str, pd.DataFrame] = {}
    trained_models: dict[str, Pipeline] = {}
    best_model_name: str | None = None
    best_mae = float('inf')

    fuel_types = prediction_df['target_fuel_column'].astype(str)

    for model_name, model in models.items():
        cv_scores = cross_val_score(model, train_X, train_y, cv=kfold, scoring='neg_mean_absolute_error', n_jobs=1)
        model.fit(train_X, train_y)
        trained_models[model_name] = model

        test_pred = model.predict(test_X)
        pred_pred = model.predict(prediction_X)

        metrics = {
            'mae': float(mean_absolute_error(test_y, test_pred)),
            'rmse': float(np.sqrt(mean_squared_error(test_y, test_pred))),
            'r2': float(r2_score(test_y, test_pred)),
            'cv_mae_mean': float(-cv_scores.mean()),
            'cv_mae_std': float(cv_scores.std()),
        }
        metrics_summary[model_name] = metrics

        converted_predictions = [
            convert_total_energy_to_fuel_amount(float(pred), fuel) for pred, fuel in zip(pred_pred, fuel_types)
        ]

        submissions[model_name] = pd.DataFrame(
            {
                'ship_id': prediction_df['De-identification Name'].astype(str),
                'day': prediction_df['NOON_UTC'].astype(int),
                'fuel_type': fuel_types,
                'predicted_value': converted_predictions,
            }
        )

        if metrics['mae'] < best_mae:
            best_mae = metrics['mae']
            best_model_name = model_name

    return {
        'metrics_summary': metrics_summary,
        'best_model_name': best_model_name,
        'feature_cols': feature_cols,
        'submissions': submissions,
        'trained_models': trained_models,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description='Train a baseline model and generate submission predictions')
    parser.add_argument(
        '--train', default='tmp/yangming-aws-summit-hackathon/train_model_ready.csv', help='Training CSV path'
    )
    parser.add_argument(
        '--test', default='tmp/yangming-aws-summit-hackathon/test_model_ready.csv', help='Testing CSV path'
    )
    parser.add_argument(
        '--prediction',
        default='tmp/yangming-aws-summit-hackathon/prediction_model_ready.csv',
        help='Prediction CSV path',
    )
    parser.add_argument('--output-dir', default='tmp/yangming-aws-summit-hackathon', help='Directory for output files')
    args = parser.parse_args()

    train_df = load_csv(Path(args.train))
    test_df = load_csv(Path(args.test))
    prediction_df = load_csv(Path(args.prediction))

    result = train_and_evaluate(train_df, test_df, prediction_df)

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    metrics_path = output_dir / 'training_metrics.json'
    metrics_path.write_text(json.dumps(result['metrics_summary'], indent=2, ensure_ascii=False), encoding='utf-8')

    models_dir = output_dir / 'models'
    models_dir.mkdir(parents=True, exist_ok=True)
    for model_name, model in result['trained_models'].items():
        model_path = models_dir / f'{model_name}.pkl'
        joblib.dump(model, model_path)

    best_name = result['best_model_name']
    if best_name is None:
        raise RuntimeError('No model was trained successfully.')

    best_model_path = models_dir / f'{best_name}.pkl'
    best_model = joblib.load(best_model_path)
    prediction_X = prepare_feature_frame(prediction_df, result['feature_cols'])
    pred_pred = best_model.predict(prediction_X)
    submission = build_submission_frame(prediction_df, pred_pred)

    submission_path = output_dir / 'submission.csv'
    submission.to_csv(submission_path, index=False)
    alt_submission_path = output_dir / f'submission_{best_name}.csv'
    submission.to_csv(alt_submission_path, index=False)

    print('Training metrics:')
    print(json.dumps(result['metrics_summary'], indent=2, ensure_ascii=False))
    print(f'Best model: {best_name}')
    print(f'Models written to {models_dir}')
    print(f'Submission written to {submission_path}')


if __name__ == '__main__':
    main()
