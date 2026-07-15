# ML Pipeline Playbook — Running `ml_york` End to End

*Context: `ym_datalake/ml_york/` is the self-contained solution for the ME full-speed fuel-consumption
task in `dataset/README.md`: predict `ME_FULLSPEED_CONSUMP_*` (MT/day) for the **102 `PREDICT` cells**
on ships S21–S23. This runbook takes a clean checkout through the three stages — feature engineering →
evaluate → predict — and lists the outputs and gotchas at each step. The pipeline turns the two raw
CSVs into one feature table, a self-scored precision estimate, and a 102-row submission file
(+ optional multi-model comparison in Stages 4–5).*

> This is a **runbook plus brief methodology**. For the *why* behind each column see
> [`data-dictionary.md`](data-dictionary.md); for how the score is computed see
> [`evaluation-metrics.md`](evaluation-metrics.md). This doc is the only place that describes the
> full run.

---

## Prerequisites

- **Python 3.13** (`pyproject.toml` pins `>=3.13, <3.14`).
- **Dependencies** — the modelling deps live in `pyproject.toml`'s `[dependency-groups] dev`
  (numpy, pandas, scikit-learn, xgboost, lightgbm). Install with:

  ```bash
  uv sync --group dev
  ```

- **`libomp`** — **xgboost, lightgbm, and the `model.compare` driver** need the OpenMP runtime **at
  import time**. On macOS:

  ```bash
  brew install libomp
  ```

  (The Stage 1b RandomForest baseline and the four sklearn comparison models — `random_forest`,
  `extra_trees`, `hist_gbdt`, `elasticnet` — import without it; `compare` needs it because it also
  runs xgboost + lightgbm.)
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
| **4 — Evaluate comparison models** *(optional)* | `model.<name> evaluate` / `importance` | `etl/vt_fd_features.csv`, `etl/feature_manifest.json` | `etl/eval/<name>/…` (+ optional importance CSV) |
| **5 — Compare all models** *(optional)* | `model.compare` | `etl/vt_fd_features.csv`, `etl/feature_manifest.json` | `etl/compare/{scoreboard,importance}.csv` |

```
dataset/vt_fd.csv ─┐
                   ├─▶ [1] feature_engineering ─▶ etl/vt_fd_features.csv     ─┬─▶ [2] xgboost evaluate ─▶ etl/eval/          (precision)
dataset/maintenance.csv ─┘                        etl/feature_manifest.json   ├─▶ [3] xgboost predict  ─▶ etl/submission.csv  (102 cells)
                                                                              ├─▶ [4] <model> evaluate ─▶ etl/eval/<model>/   (per-model score)
                                                                              └─▶ [5] compare          ─▶ etl/compare/        (scoreboard)
```

**Minimal path is Stage 1 → Stage 3.** Add Stage 2 when you want a measured precision estimate before
submitting. **Stages 4–5 are optional only in that they do not feed the submission** — they are the
multi-model comparison itself: evaluate each alternative family, then score all six on one harness.

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

## Stage 2 — Evaluate the submission model (xgboost)

There is no truth for the S21–S23 PREDICT cells, so the harness runs a **10-fold masked holdout** on
labelled rows: each fold blanks the target on a disjoint slice of labelled rows (mimicking a PREDICT
row), the model answers, and the answers are graded against truth still held in the global frame.

```bash
python -m ym_datalake.ml_york.model.xgboost evaluate \
    --features etl/vt_fd_features.csv --manifest etl/feature_manifest.json --out-dir etl/eval
```

Knobs: `--folds 10` · `--seed 42` · `--tolerance 0.05` · `--n-models 5` (log-space seed-bagging
ensemble size) · `--group-by-ship` (swap the random folds for honest leave-one-ship-out folds — one
whole unseen ship per fold; **off by default**). All others shown at their defaults.

- **Writes** `etl/eval/{1..10}/{train,eval,answer}.csv` — one subfolder per fold; `answer.csv` is the
  model's filled predictions, persisted so `evaluation evaluate` can cross-check.
- **Prints** a per-fold table then an aggregate footer.

**Sample output (shape; metric values are illustrative):**

```
eligible rows: 7209  ->  10 random folds (seed 42); ensemble n_models=5
fold      n  miss       precision  one_minus_mape             mae            rmse              r2            mape
-----------------------------------------------------------------------------------------------------------------
   1    721     0        0.796117        0.948521        2.406000        3.742000        0.982000        0.051000
   2    720     0        0.762500        0.945017        2.514000        3.960000        0.979000        0.055000
   ...
-----------------------------------------------------------------------------------------------------------------
precision  avg=0.731000  min=0.636364  max=0.900000  (tol=0.05)
   mae avg=2.480000   rmse avg=3.910000   r2 avg=0.980000   mape avg=0.053000
```

(With `--group-by-ship` the header line instead reads `-> N leave-one-ship-out folds (seed 42); …`
and the `fold` column shows the held-out ship id.)

**How to read it:** `precision` is the within-tolerance hit rate — the fraction of predict cells whose
prediction lands within ±5 % of truth; `n` is the scored cells; `miss` is how many were left
unanswered (each drags `precision` down but not the error metrics). The footer `avg` is the
single-number score. `r2` (on the log target) is printed **only by `xgboost evaluate`** — the Stage 4
comparison models route through `model/common.py` and omit that column. Full metric math and the
denominator asymmetry are in [`evaluation-metrics.md`](evaluation-metrics.md).

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

Knob: `--n-models 5` — the same log-space seed-bagging ensemble size as `evaluate` (default 5).

Trains one global XGBoost (5-member ensemble by default) on **every** labelled steady single-fuel row,
then writes the 102-row submission.

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

## Stage 4 — Evaluate each comparison model (optional)

Five more model families share the exact target, folds, and holdout as the xgboost submission model —
routed through `model/common.py` so their scores are apples-to-apples with Stage 2. Each exposes an
`evaluate` subcommand (the same 10-fold masked holdout) and an `importance` subcommand (native +
shared permutation importance on a fixed-seed 20 % holdout).

| Model | Module | `evaluate` | `importance` | Needs `libomp` | Native importance |
|---|---|---|---|---|---|
| LightGBM | `model.lightgbm` | ✓ | ✓ | **yes** | gain |
| RandomForest | `model.random_forest` | ✓ | ✓ | no | impurity |
| ExtraTrees | `model.extra_trees` | ✓ | ✓ | no | impurity |
| HistGradientBoosting | `model.hist_gbdt` | ✓ | ✓ | no | **none** (permutation only) |
| ElasticNet | `model.elasticnet` | ✓ | ✓ | no | `abs(coef_)` |

```bash
# One of: lightgbm  random_forest  extra_trees  hist_gbdt  elasticnet
MODEL=random_forest
python -m ym_datalake.ml_york.model.$MODEL evaluate \
    --features etl/vt_fd_features.csv --manifest etl/feature_manifest.json
python -m ym_datalake.ml_york.model.$MODEL importance \
    --features etl/vt_fd_features.csv --manifest etl/feature_manifest.json --top 20
```

Sweep all five in one shot:

```bash
for MODEL in lightgbm random_forest extra_trees hist_gbdt elasticnet; do
    python -m ym_datalake.ml_york.model.$MODEL evaluate \
        --features etl/vt_fd_features.csv --manifest etl/feature_manifest.json
done
```

Knobs (`evaluate`): `--folds 10` · `--seed 42` · `--tolerance 0.05` · `--out-dir etl/eval/<model>`.
Knobs (`importance`): `--top 20` · `--seed 42` · `--out <csv>` (default: print-only, no file).

- **`evaluate` writes** `etl/eval/<model>/{1..10}/{train,eval,answer}.csv` — same layout as Stage 2.
- Unlike `xgboost evaluate`, these route through `model/common.py` and print **no `r2` column**; the
  table is otherwise identical.

**Sample output — `evaluate` (shape; values illustrative):**

```
eligible rows: 7209  ->  10 folds (seed 42); training on steady single-fuel rows
fold      n  miss       precision  one_minus_mape             mae            rmse            mape
-------------------------------------------------------------------------------------------------
   1    721     0        0.700139        0.946105        2.655734        4.477078        0.053895
   ...
-------------------------------------------------------------------------------------------------
precision  avg=0.693160  min=0.686182  max=0.700139  (tol=0.05)
   mae avg=2.721400   rmse avg=4.618938   mape avg=0.057358
```

**Sample output — `importance` (shape; values illustrative):**

```
permutation importance on 1474 holdout rows, 163 predict-safe features

top 20 features by permutation importance (native importance shown):
   1. rpm                                perm=0.404305  native=14482.2382
   2. rpm2                               perm=0.043173  native=2941.4923
   ...
```

`hist_gbdt` has no native importance, so `hist_gbdt importance` prints permutation only and the header
reads `(native importance not available)`.

---

## Stage 5 — Compare all models (optional)

`model.compare` runs **all six** models (xgboost + the five above) through one identical 10-fold
harness and one shared 20 %-holdout permutation-importance pass, then writes a ranked scoreboard. It
takes **flat flags — no subcommand**:

```bash
python -m ym_datalake.ml_york.model.compare \
    --features etl/vt_fd_features.csv --manifest etl/feature_manifest.json --out-dir etl/compare
```

Knobs: `--folds 10` · `--seed 42` · `--tolerance 0.05` · `--top 20` (all defaults shown).

- **Writes** `etl/compare/scoreboard.csv` (one row per model: `precision_avg/min/max`, `mae`, `rmse`,
  `mape`; ranked by `precision_avg`) and `etl/compare/importance.csv` (long format:
  `model,feature,perm_rank,permutation,native` — `native` blank for `hist_gbdt`).
- **Prints** a `SCOREBOARD` block then a `PERMUTATION IMPORTANCE` block (top `--top` per model).

**Sample output (shape; values illustrative):**

```
========================================================================================================
SCOREBOARD  (10-fold masked holdout; precision = share within tolerance, higher better)
========================================================================================================
model           precision_avg  precision_min  precision_max            mae           rmse           mape
--------------------------------------------------------------------------------------------------------
hist_gbdt            0.741986       0.675451       0.786408       2.384980       3.868346       0.050523
lightgbm             0.734639       0.658807       0.797503       2.410296       3.908375       0.051415
random_forest        0.723397       0.690278       0.753121       2.506659       4.220227       0.052688
xgboost              0.721598       0.581137       0.796117       2.435274       3.796844       0.051607
extra_trees          0.671794       0.637500       0.699029       2.825369       4.738871       0.060844
elasticnet           0.561241       0.524272       0.590846       3.563194       9.569495       0.074197

============================================================
PERMUTATION IMPORTANCE  (top 20 per model; shared holdout, neg-RMSE scoring)
============================================================

xgboost:
   1. rpm                                perm=0.357087
   2. sog                                perm=0.068204
   ...
```

> **Caveat — `compare` scores xgboost as a single model, not the submission ensemble.** Here xgboost
> runs as one `XGBRegressor` (`n_models=1`) so the shared permutation pass can introspect it; the
> 5-member seed-bagged ensemble exposes only `predict`. Its `precision_avg` on this scoreboard is
> therefore **lower** than the submission-grade number from **Stage 2** (`xgboost evaluate`, default
> `--n-models 5`) — take the submission number from Stage 2. This scoreboard is for cross-model
> ranking, by design.

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

# 4. optional  ->  benchmark the other five families, then rank all six  ->  etl/compare/
for MODEL in lightgbm random_forest extra_trees hist_gbdt elasticnet; do
    python -m ym_datalake.ml_york.model.$MODEL evaluate \
        --features etl/vt_fd_features.csv --manifest etl/feature_manifest.json
done
python -m ym_datalake.ml_york.model.compare \
    --features etl/vt_fd_features.csv --manifest etl/feature_manifest.json --out-dir etl/compare
```

---

## Gotchas / Troubleshooting

- **Run from the repo root.** Anywhere else, `pythonpath = ["."]` no longer points at the package and
  the relative `dataset/` / `etl/` paths break. `ModuleNotFoundError: ym_datalake` almost always means
  the wrong working directory.
- **`libomp` is required for xgboost, lightgbm, and `compare`.** Without it, importing xgboost or
  lightgbm fails (`Library not loaded: libomp.dylib` on macOS); `compare` runs both, so it needs it
  too. `brew install libomp`. The Stage 1b baseline and the four sklearn comparison models
  (`random_forest`, `extra_trees`, `hist_gbdt`, `elasticnet`) run without it.
- **No model is persisted.** Every `evaluate`, `predict`, `importance`, and `compare` run retrains its
  model(s) in memory on every invocation — there is no `.pkl` / checkpoint anywhere, for any of the six
  families. `predict` does not reuse the folds from `evaluate`; it trains its own final model on all
  labelled steady single-fuel rows.
- **`compare` scores xgboost as a single model.** The scoreboard runs xgboost as one `XGBRegressor`
  (`n_models=1`), not the 5-member submission ensemble, so its `precision_avg` there is lower than
  `xgboost evaluate`'s. Take the submission-grade xgboost number from Stage 2, not the scoreboard.
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
| `model/common.py` | Shared harness for the 5 comparison models (target, folds, `evaluate`/`importance`). |
| `model/compare.py` | Stage 5 driver — scores all 6, writes the scoreboard + importance CSVs. |
| `model/{lightgbm,random_forest,extra_trees,hist_gbdt,elasticnet}/` | Stage 4 comparison models (`evaluate` + `importance`). |
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
