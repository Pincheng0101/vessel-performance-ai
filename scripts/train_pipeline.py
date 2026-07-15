#!/usr/bin/env python3
"""Training pipeline for the hackathon prediction task.

Workflow:
1. Load model-ready train/test/prediction CSV files and the label normalization stats.
2. Train models on the z-score-normalized target (`target_value_normalized`) with 3-fold CV.
3. Evaluate on the held-out test set, denormalizing predictions back to the target_value
   (unified-energy) scale so all reported metrics are in the original units.
4. Persist the trained models and generate the submission CSV in the required format.
5. Write a human-readable Markdown report (doc/model_summary.md).
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
except Exception:  # noqa: BLE001 -- the native lib (libomp) may fail to load, not just ImportError
    XGBOOST_AVAILABLE = False

from model_pipeline_utils import build_feature_columns, prepare_feature_frame, split_feature_types


def load_csv(path: Path) -> pd.DataFrame:
    return pd.read_csv(path)


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


def train_and_evaluate(
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    prediction_df: pd.DataFrame,
    mean: float,
    std: float,
) -> dict[str, Any]:
    feature_cols = build_feature_columns(train_df)

    numeric_features, categorical_features = split_feature_types(
        train_df,
        test_df,
        prediction_df,
        feature_cols=feature_cols,
    )
    train_X = prepare_feature_frame(train_df, feature_cols, numeric_features, categorical_features)
    test_X = prepare_feature_frame(test_df, feature_cols, numeric_features, categorical_features)

    # Train on the normalized label; keep the real target for denormalized scoring.
    train_y = pd.to_numeric(train_df['target_value_normalized'], errors='coerce')
    test_y_real = pd.to_numeric(test_df['target_value'], errors='coerce')

    train_mask = train_y.notna()
    test_mask = test_y_real.notna()
    train_X = train_X.loc[train_mask]
    train_y = train_y.loc[train_mask]
    test_X = test_X.loc[test_mask]
    test_y_real = test_y_real.loc[test_mask]

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
    trained_models: dict[str, Pipeline] = {}
    best_model_name: str | None = None
    best_mae = float('inf')

    for model_name, model in models.items():
        # CV runs in normalized space; MAE scales linearly under the affine denormalization.
        cv_scores = cross_val_score(model, train_X, train_y, cv=kfold, scoring='neg_mean_absolute_error', n_jobs=1)
        model.fit(train_X, train_y)
        trained_models[model_name] = model

        test_pred_real = model.predict(test_X) * std + mean

        metrics = {
            'mae': float(mean_absolute_error(test_y_real, test_pred_real)),
            'rmse': float(np.sqrt(mean_squared_error(test_y_real, test_pred_real))),
            'r2': float(r2_score(test_y_real, test_pred_real)),
            'cv_mae_mean': float(-cv_scores.mean() * std),
            'cv_mae_std': float(cv_scores.std() * std),
        }
        metrics_summary[model_name] = metrics

        if metrics['mae'] < best_mae:
            best_mae = metrics['mae']
            best_model_name = model_name

    return {
        'metrics_summary': metrics_summary,
        'best_model_name': best_model_name,
        'feature_cols': feature_cols,
        'numeric_features': numeric_features,
        'categorical_features': categorical_features,
        'n_train': int(train_mask.sum()),
        'n_test': int(test_mask.sum()),
        'trained_models': trained_models,
    }


def render_report(result: dict[str, Any], mean: float, std: float) -> str:
    metrics_summary = result['metrics_summary']
    best = result['best_model_name']
    header = (
        '# Model Summary\n\n'
        '以現行 `FEATURE_COLUMNS`（共 '
        f'{len(result["feature_cols"])} 個特徵）為輸入、`target_value_normalized`（z-score 標準化 label）'
        '為訓練標的，由 `scripts/train_pipeline.py` 訓練。\n\n'
        '> **分數量測方式**：模型在標準化空間預測後，用 '
        '`dataset/target_value_normalization.json` 的 mean/std 反正規化\n'
        '> （`pred = pred_norm × std + mean`）回到 `target_value`（統一熱能）尺度，'
        '再與 test 的真實 `target_value` 比較。\n'
        '> 因此下列 MAE / RMSE / R² 皆為**反正規化後的原始尺度**。\n\n'
        f'- 訓練列數：{result["n_train"]}\n'
        f'- 測試列數：{result["n_test"]}\n'
        f'- 標準化參數：mean = {mean:.4f}，std = {std:.4f}\n\n'
    )

    table = (
        '## Test 分數（denormalized，target_value 尺度）\n\n'
        '| Model | MAE | RMSE | R² | CV MAE mean | CV MAE std |\n'
        '|---|---|---|---|---|---|\n'
    )
    for name, m in metrics_summary.items():
        table += (
            f'| {name} | {m["mae"]:.4f} | {m["rmse"]:.4f} | {m["r2"]:.5f} '
            f'| {m["cv_mae_mean"]:.4f} | {m["cv_mae_std"]:.4f} |\n'
        )

    footer = (
        f'\n## Best Model\n\n- 以 test MAE 最低者為最佳：**{best}**（MAE = {metrics_summary[best]["mae"]:.4f}）。\n'
        '- 已保存的模型檔（`models/*.pkl`）皆以標準化 label 訓練，載入預測後需反正規化才是 `target_value`。\n\n'
        '## 重新產生\n\n```bash\nuv run python scripts/train_pipeline.py\n```\n'
    )
    if not XGBOOST_AVAILABLE:
        footer += '\n> 註：本次未含 XGBoost —— 該套件在本機因缺 `libomp` 無法載入，已自動略過。\n'
    return header + table + footer


def main() -> None:
    parser = argparse.ArgumentParser(description='Train models and generate submission predictions')
    parser.add_argument('--train', default='dataset/train_model_ready.csv', help='Training CSV path')
    parser.add_argument('--test', default='dataset/test_model_ready.csv', help='Testing CSV path')
    parser.add_argument('--prediction', default='dataset/prediction_model_ready.csv', help='Prediction CSV path')
    parser.add_argument('--output-dir', default='dataset', help='Directory for training_metrics.json')
    parser.add_argument('--models-dir', default='models', help='Directory for the saved model artifacts')
    parser.add_argument('--submission-dir', default='submission', help='Directory for per-model submission CSVs')
    parser.add_argument(
        '--normalization', default='dataset/target_value_normalization.json', help='Label normalization stats JSON'
    )
    parser.add_argument('--report', default='doc/model_summary.md', help='Markdown report output path')
    args = parser.parse_args()

    train_df = load_csv(Path(args.train))
    test_df = load_csv(Path(args.test))
    prediction_df = load_csv(Path(args.prediction))
    stats = json.loads(Path(args.normalization).read_text(encoding='utf-8'))
    mean, std = float(stats['mean']), float(stats['std'])

    result = train_and_evaluate(train_df, test_df, prediction_df, mean, std)

    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    models_dir = Path(args.models_dir)
    models_dir.mkdir(parents=True, exist_ok=True)

    metrics_path = output_dir / 'training_metrics.json'
    metrics_path.write_text(json.dumps(result['metrics_summary'], indent=2, ensure_ascii=False), encoding='utf-8')

    for model_name, model in result['trained_models'].items():
        joblib.dump(model, models_dir / f'{model_name}.pkl')

    best_name = result['best_model_name']
    if best_name is None:
        raise RuntimeError('No model was trained successfully.')

    # One submission per model, named by the model: predict in normalized space,
    # denormalize, then convert to fuel (build_submission_frame handles the fuel conversion).
    submission_dir = Path(args.submission_dir)
    submission_dir.mkdir(parents=True, exist_ok=True)
    prediction_X = prepare_feature_frame(
        prediction_df,
        result['feature_cols'],
        result['numeric_features'],
        result['categorical_features'],
    )
    for model_name, model in result['trained_models'].items():
        pred_energy = model.predict(prediction_X) * std + mean
        submission = build_submission_frame(prediction_df, pred_energy)
        submission.to_csv(submission_dir / f'{model_name}.csv', index=False)

    report_path = Path(args.report)
    report_path.parent.mkdir(parents=True, exist_ok=True)
    report_path.write_text(render_report(result, mean, std), encoding='utf-8')

    print('Training metrics (denormalized):')
    print(json.dumps(result['metrics_summary'], indent=2, ensure_ascii=False))
    print(f'Best model: {best_name}')
    print(f'Models written to {models_dir}')
    print(f'Submissions written to {submission_dir} (one per model)')
    print(f'Report written to {report_path}')


if __name__ == '__main__':
    main()
