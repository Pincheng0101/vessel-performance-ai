# ML Pipeline Playbook — Running `ml_york` End to End

*Context: `ym_datalake/ml_york/` is the self-contained solution for the ME full-speed fuel-consumption
task in `dataset/README.md`: predict `ME_FULLSPEED_CONSUMP_*` (MT/day) for the **102 `PREDICT` cells**
on ships S21–S23. This runbook takes a clean checkout through the three stages — feature engineering →
evaluate → predict — and lists the outputs and gotchas at each step. The pipeline turns the two raw
CSVs into one feature table, a self-scored precision estimate, and a 102-row submission file.*

> This is a **runbook plus brief methodology**. For the *why* behind each column see
> [`data-dictionary.md`](data-dictionary.md); for how the score is computed see
> [`evaluation-metrics.md`](evaluation-metrics.md). This doc is the only place that describes the
> full run.

---

## Prerequisites

- **Python 3.13** (`pyproject.toml` pins `>=3.13, <3.14`).
- **Dependencies** — the modelling deps live in `pyproject.toml`'s `[dependency-groups] dev`
  (numpy, pandas, scikit-learn, xgboost). Install with:

  ```bash
  uv sync --group dev
  ```

- **`libomp`** — xgboost needs the OpenMP runtime **at import time**. On macOS:

  ```bash
  brew install libomp
  ```

  (Only the RandomForest baseline in Stage 1b runs without it.)
- **Run everything from the repo root.** `pyproject.toml` sets `pythonpath = ["."]`, so the
  `ym_datalake.ml_york.*` modules resolve only when the working directory is the repo root. The
  default `--data dataset` / `--out etl` paths are relative to it.
- **Inputs (hard rule).** The only data the package reads are `dataset/vt_fd.csv` and
  `dataset/maintenance.csv` (`ml_york/__init__.py`). No curated-lake table, fitted curve, or vessel
  particular is used.

---

## Pipeline at a Glance

| Stage | Command (module) | Reads | Writes |
|---|---|---|---|
| **1 — Feature engineering** | `feature_engineering` | `dataset/vt_fd.csv`, `dataset/maintenance.csv` | `etl/vt_fd_features.csv`, `etl/feature_manifest.json` |
| **1b — Baseline** *(optional)* | `feature_engineering.baseline` | `etl/vt_fd_features.csv`, `etl/feature_manifest.json` | — (prints R² + importances) |
| **2 — Evaluate** *(self-score)* | `model.xgboost evaluate` | `etl/vt_fd_features.csv`, `etl/feature_manifest.json` | `etl/eval/{1..10}/{train,eval,answer}.csv` |
| **3 — Predict** *(submission)* | `model.xgboost predict` | `etl/vt_fd_features.csv`, `etl/feature_manifest.json` | `etl/submission.csv` (102 rows) |

```
dataset/vt_fd.csv ─┐
                   ├─▶ [1] feature_engineering ─▶ etl/vt_fd_features.csv ─┬─▶ [2] evaluate ─▶ etl/eval/  (precision)
dataset/maintenance.csv ─┘                        etl/feature_manifest.json ┘
                                                                         └─▶ [3] predict  ─▶ etl/submission.csv  (102 cells)
```

**Minimal path is Stage 1 → Stage 3.** Add Stage 2 when you want a measured precision estimate before
submitting.

---

## Stage 1 — Feature Engineering

```bash
python -m ym_datalake.ml_york.feature_engineering --data dataset --out etl
```

`--data` / `--out` default to `dataset` / `etl`, so the flags above are optional from the repo root.

- **Reads** `dataset/vt_fd.csv` (40 raw columns) + `dataset/maintenance.csv`.
- **Writes** `etl/vt_fd_features.csv` (214 columns × 21,219 rows) and `etl/feature_manifest.json`.
- **What it does** — runs the fixed pipeline `io → maintenance → physics_features → statistics`
  (order matters: statistics read the physics speed/draft columns). The manifest is the contract the
  trainer reads: it names the **163 `predict_safe_features`** (the legal model inputs) and the 13
  `leakage_columns` that must never enter the model.

**Methodology in brief:**

- **Features use A/F columns + `maintenance.csv` + time only.** A leakage firewall keeps the 6 H
  (engine) and 7 T (fuel) columns out of every model input — they are `HIDDEN` in a real `PREDICT`
  window. `build.predict_safe_features` computes the input set as *the frame minus the raw/key/flag/
  target columns*, so a leaked column cannot silently become a feature.
- **Steady-state gate** — a row is `is_steady_state` when `HOURS_FULL_SPEED ≥ 22` **and**
  `WIND_SCALE ≤ 4`, matching the README's PREDICT-day filter.

**Expected stdout:**

```
wrote etl/vt_fd_features.csv  rows=21219  cols=214 (+174 added)
wrote etl/feature_manifest.json  predict_rows=102
```

---

## Stage 1b — Baseline (optional)

```bash
python -m ym_datalake.ml_york.feature_engineering.baseline --etl etl --top 20
```

A **verification-only RandomForest** — not a submission model. It trains on the S1–S12 training ships
(steady-state rows only) to (a) prove the 163 predict-safe features carry signal without any H/T
leakage, and (b) rank feature importance so the FE choices are auditable. It uses RandomForest
specifically because it runs **without `libomp`** and exposes `.feature_importances_`.

> Note: the baseline regresses `target_energy_mj`, whereas the real XGBoost model (Stage 2/3)
> regresses `log(target_energy_mj_per_hour)` — see below.

**Expected stdout (shape; values vary):**

```
trained on <N> steady-state rows (S1-S12), 163 predict-safe features
in-sample R^2 = 0.xxxx

top 20 feature importances (target_energy_mj):
   1. admiralty_fuel_proxy               0.xxxx
   2. ...
```

---

## Stage 2 — Evaluate (self-score)

There is no truth for the S21–S23 PREDICT cells, so the harness runs a **10-fold masked holdout** on
labelled rows: each fold blanks the target on a disjoint slice of labelled rows (mimicking a PREDICT
row), the model answers, and the answers are graded against truth still held in the global frame.

```bash
python -m ym_datalake.ml_york.model.xgboost evaluate \
    --features etl/vt_fd_features.csv --manifest etl/feature_manifest.json --out-dir etl/eval
```

Knobs: `--folds 10` · `--seed 42` · `--tolerance 0.05` (all defaults shown).

- **Writes** `etl/eval/{1..10}/{train,eval,answer}.csv` — one subfolder per fold; `answer.csv` is the
  model's filled predictions, persisted so `evaluation evaluate` can cross-check.
- **Prints** a per-fold table then an aggregate footer.

**Sample output (shape; metric values are illustrative):**

```
eligible rows: <N>  ->  10 folds (seed 42); training on steady single-fuel rows
fold      n  miss        precision  one_minus_mape             mae            rmse            mape
--------------------------------------------------------------------------------------------------
   1     11     0         0.727273        0.958000        3.500000        5.200000        0.042000
   ...
--------------------------------------------------------------------------------------------------
precision  avg=0.731000  min=0.636364  max=0.900000  (tol=0.05)
   mae avg=3.480000   rmse avg=5.010000   mape avg=0.041000
```

**How to read it:** `precision` is the within-tolerance hit rate — the fraction of predict cells whose
prediction lands within ±5 % of truth; `n` is the scored cells; `miss` is how many were left
unanswered (each drags `precision` down but not the error metrics). The footer `avg` is the
single-number score. Full metric math and the denominator asymmetry are in
[`evaluation-metrics.md`](evaluation-metrics.md).

**Decoupled variant** — split fold generation from scoring when a *different* predictor fills the
answers:

```bash
python -m ym_datalake.ml_york.evaluation generate \
    --features etl/vt_fd_features.csv --manifest etl/feature_manifest.json --out-dir etl/eval
# ... your predictor writes answer.csv into each etl/eval/{k}/ ...
python -m ym_datalake.ml_york.evaluation evaluate \
    --features etl/vt_fd_features.csv --eval-dir etl/eval --answer-name answer.csv
```

`generate` writes only `{train,eval}.csv` per fold — **it does not train**, so the predictor must fill
each `answer.csv` before `evaluate` runs. The `model.xgboost evaluate` command above is the coupled
convenience that does both with the XGBoost model.

---

## Stage 3 — Predict (submission)

```bash
python -m ym_datalake.ml_york.model.xgboost predict \
    --features etl/vt_fd_features.csv --manifest etl/feature_manifest.json --out etl/submission.csv
```

Trains one global XGBoost on **every** labelled steady single-fuel row, then writes the 102-row
submission.

**Methodology in brief:**

- **Target** — `log(target_energy_mj_per_hour)`. LCV energy-normalization makes all fuels one
  comparable target; the per-full-speed-hour form applies the README's exact `HOURS_FULL_SPEED`
  correction; `log` aligns squared loss with the relative-error precision metric. A **single global
  XGBoost** covers all fuels and both W-types.
- **Reconstruction** — the per-row MT/day mass is rebuilt as:

  ```
  predicted_value = exp(pred) * hours_full_speed / fuel_lcv        # MT/day, single fuel
  ```

  `hours_full_speed` and `fuel_lcv` are predict-safe and populated on all 102 cells; `fuel_lcv`
  cancels the LCV baked into the training target exactly.

**Submission schema** — `etl/submission.csv`, 102 rows, columns `ship_id,day,fuel_type,predicted_value`
(`day` is the relative `noon_utc`; `fuel_type` is the full `ME_FULLSPEED_CONSUMP_<fuel>` name):

```
ship_id,day,fuel_type,predicted_value
S22,927,ME_FULLSPEED_CONSUMP_HSHFO,27.04309264225746
S23,780,ME_FULLSPEED_CONSUMP_HSHFO,65.25202964668843
...
```

**Expected stdout:**

```
wrote 102 predictions -> etl/submission.csv  ships=['S21', 'S22', 'S23']  value range [<min>, <max>]
```

(The 102 cells split S21 = 43, S22 = 24, S23 = 35.)

---

## Quick Start

Copy-paste from a clean checkout at the repo root:

```bash
# 0. one-time setup
uv sync --group dev
brew install libomp                       # macOS only; xgboost needs OpenMP

# 1. feature engineering  ->  etl/vt_fd_features.csv + etl/feature_manifest.json
python -m ym_datalake.ml_york.feature_engineering --data dataset --out etl

# 2. self-score (optional but recommended)  ->  etl/eval/
python -m ym_datalake.ml_york.model.xgboost evaluate \
    --features etl/vt_fd_features.csv --manifest etl/feature_manifest.json --out-dir etl/eval

# 3. submission  ->  etl/submission.csv (102 rows)
python -m ym_datalake.ml_york.model.xgboost predict \
    --features etl/vt_fd_features.csv --manifest etl/feature_manifest.json --out etl/submission.csv
```

---

## Gotchas / Troubleshooting

- **Run from the repo root.** Anywhere else, `pythonpath = ["."]` no longer points at the package and
  the relative `dataset/` / `etl/` paths break. `ModuleNotFoundError: ym_datalake` almost always means
  the wrong working directory.
- **`libomp` is required for xgboost.** Without it, importing xgboost fails (`Library not loaded:
  libomp.dylib` on macOS). `brew install libomp`. Stage 1b's RandomForest baseline is the only path
  that runs without it.
- **The model is not persisted.** Both `evaluate` and `predict` retrain the XGBoost in memory on every
  run — there is no `.pkl` / checkpoint. `predict` does not reuse the folds from `evaluate`; it trains
  its own final model on all labelled steady single-fuel rows.
- **Manifest `target_for_training` is stale.** `feature_manifest.json` records
  `target_for_training = "target_energy_mj"`, but the actual XGBoost model regresses
  `log(target_energy_mj_per_hour)` (`model.xgboost.model.build_xy`). Trust the code path in this doc,
  not that manifest field. (The RandomForest baseline *does* use `target_energy_mj`.)
- **Regenerating features needs the two source CSVs.** Stage 1 reads `dataset/vt_fd.csv` +
  `dataset/maintenance.csv`. If you already have `etl/*` from a prior run, Stages 2–3 work without
  re-running Stage 1.

---

## Reference

**File map** (`ym_datalake/ml_york/`):

| Path | Role |
|---|---|
| `__init__.py` | The hard data-source rule (only the two CSVs). |
| `feature_engineering/__main__.py` | Stage 1 CLI (`--data`, `--out`). |
| `feature_engineering/build.py` | Pipeline orchestration + manifest (`predict_safe_features`). |
| `feature_engineering/{io,maintenance,physics_features,statistics}.py` | Column groups. |
| `feature_engineering/baseline.py` | Stage 1b RandomForest sanity check. |
| `model/xgboost/__main__.py` | Stage 2/3 CLI (`evaluate`, `predict`). |
| `model/xgboost/model.py` | XGBoost target, training, reconstruction. |
| `evaluation/__main__.py` | Decoupled `generate` / `evaluate` CLI. |
| `evaluation/{folds,scoring}.py` | Fold construction + metric math. |

**Related docs:**

- [`data-dictionary.md`](data-dictionary.md) — every column in `etl/vt_fd_features.csv`, its source
  and formula (also `data-dictionary-zh.md`).
- [`evaluation-metrics.md`](evaluation-metrics.md) — the five metrics and how to read the score (also
  `evaluation-metric-zh.md`).
- `dataset/README.md` — the task definition and the A/H/T/F column classes.
</content>
</invoke>
