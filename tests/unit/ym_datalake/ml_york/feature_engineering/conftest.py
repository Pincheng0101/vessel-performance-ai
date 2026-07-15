"""Shared fixtures. The real-data frame is built once per session — the pipeline is deterministic."""

from __future__ import annotations

from pathlib import Path

import pytest

from ym_datalake.ml_york.feature_engineering import build

DATASET_DIR = str(Path(__file__).resolve().parents[5] / 'dataset')


@pytest.fixture(scope='session')
def features():
    return build.assemble_features(DATASET_DIR)


@pytest.fixture(scope='session')
def manifest(features):
    return build.build_manifest(features)


@pytest.fixture(scope='session')
def safe_features(features):
    return build.predict_safe_features(features)
