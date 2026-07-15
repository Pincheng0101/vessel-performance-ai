# Evaluation Metrics — How the Fuel-Consumption Score Is Computed

*Context: `ym_datalake/ml_york/evaluation/` grades a fuel-consumption predictor. The real task is
to predict `ME_FULLSPEED_CONSUMP_*` (MT/day) for the 102 `PREDICT` cells on ships S21–S23, which
carry no local truth. To score a predictor before it ever sees those cells, the harness runs a
synthetic 10-fold masked holdout: each fold blanks the target on a disjoint slice of *labelled*
rows (mimicking a real `PREDICT` row), the predictor answers, and `scoring` grades the answers
against truth still held in the global feature frame.*

> This document explains the **six metrics** the `evaluate` CLI prints and **how to read the
> score**. It is not a walkthrough of fold generation. The metric math lives in
> `evaluation/scoring.py::fold_metrics`; the CLI table in `evaluation/__main__.py::_cmd_evaluate`.

---

## What Is Being Scored

Every cell is keyed on **`(ship, day, fuel_short)`** — e.g. `('S21', '450', 'HSHFO')`. For each
key three things come together:

- **Truth** — `target_me_fs_consump` (MT/day), read from the labelled (non-masked) rows of the
  *global* `etl/vt_fd_features.csv`. It is **never** read from a fold's masked `eval.csv`, so a
  predictor cannot see the answer it is being graded on — there is no leakage.
- **Expected cells** — the `(ship, day, fuel_short)` key of every `is_predict` row in that fold's
  `eval.csv`. These are the cells the predictor is asked to fill.
- **Answer** — one `predicted_value` (MT/day) per cell, from a README-format answer file
  (`ship_id,day,fuel_type,predicted_value`). `fuel_type` may be the full
  `ME_FULLSPEED_CONSUMP_HSHFO` or the short `HSHFO`; both normalize to the same key. A blank
  `predicted_value` counts as **no answer** for that cell.

PREDICT days are clean steady-state points (≥22 h at full speed, wind ≤ 4 Bft, a single fuel that
day), so each cell has exactly one non-zero truth.

---

## The Headline: `precision`

`precision` is the **within-tolerance hit rate**: of the truth-bearing predict cells, the fraction
whose prediction lands within a relative-error band of the truth.

```
precision = correct / scored
```

A cell is **correct** iff

```
|pred − true| / true ≤ tol          (default tol = 0.05, i.e. ±5 %)
```

The tolerance is set by `--tolerance` (default `0.05`). The relative error uses **`true` in the
denominator**, which is safe here because a single-fuel PREDICT day always has `true > 0`.

> **This is accuracy within a tolerance, not classification precision.** Despite the name, there
> are no true/false positives. `precision` here answers "what share of my predictions were within
> ±5 % of the real value?" — nothing to do with the TP/(TP+FP) of a classifier.

---

## Error Metrics Over Answered Cells

Alongside the hit rate, five error metrics summarise *how far off* the answered predictions were.
Let the answered cells be those predict cells that have both a truth and a (non-blank) answer, and
let `n_a` be their count:

| metric | formula | units | reads as |
|---|---|---|---|
| `mae` | `(1/n_a) · Σ abs(pred − true)` | MT/day | mean absolute miss |
| `rmse` | `sqrt( (1/n_a) · Σ (pred − true)² )` | MT/day | like MAE but **punishes big misses more** |
| `mape` | `(1/n_a) · Σ abs(pred − true) / true` | fraction | mean **relative** miss (0.04 = 4 %) |
| `one_minus_mape` | `1 − mape` | fraction | higher-is-better score form of `mape` |
| `r2` | `1 − Σ(pred − true)² / Σ(true − mean)²` | fraction | share of truth variance explained (≤1) |

`mae`/`rmse` are in the target's own units (MT/day); `mape` is dimensionless. `rmse ≥ mae` always,
and the gap between them grows with the variance of the errors — a large `rmse` next to a small
`mae` means a few cells missed badly. `one_minus_mape` exists only so a dashboard can treat every
column as "bigger is better"; it **can go negative** when `mape > 1` (a prediction more than 100 %
off on average). `r2` is **bounded above by 1** (a perfect fit) and goes **negative** when the
predictions explain the truth's variance *less* well than simply guessing the mean would; it is
`nan` for a single answered cell (the variance of one point is zero, so there is nothing to explain).

---

## The Denominator Asymmetry (the key subtlety)

`precision` and the error metrics **do not divide by the same thing**, and this is deliberate.

- **`precision` denominator = `scored`** — *every* truth-bearing predict cell, **including cells you
  left unanswered**. An unanswered cell is counted as a miss (`n_missing`) and drags `precision`
  down: it is not correct, but it still sits in the denominator.
- **`mae` / `rmse` / `mape` / `r2` denominator = answered cells only** (`n_a = scored − n_missing`).
  A cell with no answer contributes **no term** to these sums (nor to `r2`'s variance).

The consequence: **blank answers sink `precision` but never touch the error metrics.** You cannot
flatter your MAE/RMSE/MAPE by only answering the easy cells and leaving the hard ones blank — that
strategy simply tanks `precision` instead. Answer everything, or pay for it in the headline number.

Cells whose truth is missing from the global frame are **skipped from both** (with a warning) and
counted nowhere; on a well-formed fold this should not happen.

---

## Reading the CLI Output

`python -m ym_datalake.ml_york.evaluation evaluate …` prints one row per fold, then a footer:

```
fold      n  miss       precision  one_minus_mape             mae            rmse              r2            mape
-----------------------------------------------------------------------------------------------------------------
   1     11     0        0.727273        0.958000        3.500000        5.200000        0.912000        0.042000
   ...
-----------------------------------------------------------------------------------------------------------------
precision  avg=0.731000  min=0.636364  max=0.900000  (tol=0.05)
   mae avg=3.480000   rmse avg=5.150000   r2 avg=0.905000   mape avg=0.043000
```

Reading the sample row:

- **`fold 1`** — fold index (1…N).
- **`n = 11`** — `scored`: truth-bearing predict cells in this fold.
- **`miss = 0`** — `n_missing`: how many of those `n` were left unanswered. Any non-zero value here
  is a direct drag on `precision` for that fold.
- **`precision = 0.727273`** — 8 of 11 answers within ±5 %.
- **`one_minus_mape … r2 … mape`** — the error block from the previous section, over the answered
  cells (`r2` sits between `rmse` and `mape`).

The **footer is the verdict**: `avg` is the mean `precision` **across folds** — the harness's
single-number score for the predictor. `min`/`max` show the spread (a low `min` flags a fold the
model handled poorly), and `tol` echoes the band those hit rates were computed at. A **second footer
line** reports the across-fold means of the error block — `mae`, `rmse`, `r2`, `mape` — so the
average error travels next to the headline hit rate (means taken with `nan` folds ignored).

---

## One Worked Example

From `tests/unit/…/evaluation/test_scoring.py::test_jittered_answers_match_hand_calc` — three cells,
`tol = 0.05`, all answered:

| cell | true | pred | rel. error | within ±5 %? |
|---|---|---|---|---|
| HSHFO | 100 | 110 | 0.10 | no |
| VLSFO | 200 | 200 | 0.00 | yes |
| LSMGO | 50 | 51 | 0.02 | yes |

- `precision = 2 / 3 ≈ 0.6667` — VLSFO and LSMGO land inside the band, HSHFO does not.
- `mae = (10 + 0 + 1) / 3 = 11/3 ≈ 3.6667` MT/day.
- `rmse = sqrt((100 + 0 + 1) / 3) ≈ 5.8023` MT/day — above `mae`, pulled up by the 10 MT HSHFO miss.
- `mape = (0.10 + 0.00 + 0.02) / 3 = 0.04` (4 %).
- `one_minus_mape = 1 − 0.04 = 0.96`.
- `r2 = 1 − 101 / 11666.67 ≈ 0.9913` — `ss_res = 10² + 0² + 1² = 101` against the spread of the
  truths `[100, 200, 50]` (`ss_tot ≈ 11666.67`), so the predictions explain the variance almost
  entirely.

Because all three cells were answered, `n_missing = 0` and the error metrics span the same three
cells as `precision`. Blank the LSMGO answer instead and `precision` would fall to `1/3` (the blank
counts as a miss), while `mae`/`rmse`/`mape` would recompute over the two remaining answered cells
only.
