# Algorithm & Model Catalog

A single reference for **every** machine-learning, statistical, rule-based, operations-research,
physics, and generative method in this repository — *where* each lives (file · function · line) and
*why* it was chosen. Companion file: [`algorithm-zh.md`](./algorithm-zh.md) (Chinese).

Methodology was previously scattered across `insights.md`, `poc-spec.md §5`, `glossary.md §13`, and
inline docstrings; this document consolidates it.

---

## 1. Overview

**The stack is numpy-only and hand-rolled.** Every statistic — Theil-Sen slope, MAD z-scores, EWMA
control chart, Pearson/Spearman correlation, bootstrap CI — is implemented directly on top of
`numpy`. There is exactly **one** off-the-shelf estimator:

- `IsolationForest` from **scikit-learn** — a single unsupervised model, used only as a
  multivariate tail-outlier catch-all behind a z-score gate.

Client-side charts compute their own trends/histograms in **D3.js** (Theil-Sen, OLS slope, `d3.bin`).

```
# pyproject.toml — dev-group only; the Lambda runtime ships NO numeric libraries
numpy
scikit-learn
```

There is **no SageMaker, no deep learning, no gradient boosting, no K-means/DBSCAN, no
ARIMA/statsmodels, no scipy, no pandas**. The design is deliberately *rules + robust statistics*: a
POC that must explain every flag it raises, run inside a lean Lambda, and stay auditable.

Where the code lives:

| Area | Location |
| --- | --- |
| M2 physics / ISO corrections & indicators | `ym_datalake/etl/corrections.py`, `indicators.py`, `filters.py` |
| M3 statistics (trends, anomaly, CII, periods, alerts, recommendation) | `ym_datalake/etl/` |
| Forward / generative models (synthetic data) | `ym_datalake/synthetic_data/` |
| Validation (correlation & detection gates) | `ym_datalake/etl/validate.py`, `synthetic_data/validate.py` |
| Client-side computation (D3) | `web/charts/`, `web/components/` |

---

## 2. Summary table

47 techniques, one row each. Type ∈ {ML, Statistical, Rule-based, OR-optimization, Physics,
Generative}. Rows are grouped by the detailed section that documents them (§3–§12).

| # | Technique | Type | Location | Why |
| --- | --- | --- | --- | --- |
| 1 | Isolation Forest | ML | `etl/anomaly.py:167` `_iforest_tail` | Unsupervised multivariate tail-outlier catch-all behind a z≥3.5 gate |
| 2 | Theil-Sen slope | Statistical | `etl/trends.py:38` `_theil_sen` | Median pairwise slope → fouling rate, robust to cleaning step-changes |
| 3 | Robust line (slope+intercept) | Statistical | `etl/trends.py:61` `robust_line` | Theil-Sen slope + median intercept, the shared trend primitive |
| 4 | Bootstrap 95% CI | Statistical | `etl/trends.py:48` `_bootstrap_ci` | 100 seeded resamples → slope uncertainty band |
| 5 | Piecewise segmented regression | Statistical | `etl/trends.py:83` `fit_segments` | Split trend at cleaning/dry-dock resets so each cycle fits independently |
| 6 | Threshold-crossing extrapolation | Statistical | `etl/trends.py:154` `extrapolate` | Project open-cycle line to a target % → due-date / RUL |
| 7 | `np.polyfit` deg-1 | Statistical | `synthetic_data/validate.py:242` | Slope sign/monotonicity check (validation only) |
| 8 | Client-side Theil-Sen | Statistical | `web/charts/speedLossTrend.js:10` `theilSen` | Same robust slope in-browser for the trend chart |
| 9 | EWMA control chart | Statistical | `etl/anomaly.py:97,106` `_ewma`/`_sustained_oob` | Fixed-target EWMA (λ=0.3, L=3) → sustained engine/propeller step |
| 10 | Rolling modified z (Iglewicz-Hoaglin) | Statistical | `etl/anomaly.py:83` `_rolling_z` | Windowed MAD z (W=30, z≥4.5) for local single-point spikes |
| 11 | Global MAD z | Statistical | `etl/anomaly.py:59,67` `_mad_scale`/`_global_z` | 1.4826·MAD robust σ → standardized residual scale |
| 12 | Wind-vs-Beaufort residual z | Statistical | `etl/anomaly.py:71` `_wind_residual_z` | Median-ratio B^1.5 fit → wind-sensor glitch |
| 13 | IQR / Tukey gross gate | Statistical | `etl/anomaly.py:161` `_iqr_gross` | 3×IQR fence → robust single-point gross outlier |
| 14 | Top-decile wave percentile gate | Statistical | `etl/anomaly.py:235` | 90th-pct wave qualifies weather-driven speed-loss spikes |
| 15 | OR-fusion of detectors | Rule-based | `etl/anomaly.py:270,273` | Boolean-OR of all detectors + Beaufort≥7 → one flag/(imo,date) |
| 16 | First-match cause chain + run-length | Rule-based | `etl/anomaly.py:301,174` `_classify`/`_run_lengths` | Priority cascade sensor→weather→engine→propeller→fallback |
| 17 | Severity banding | Rule-based | `etl/anomaly.py:326,191` `_severity`/`_severity_from` | Map residual magnitude → low/medium/high |
| 18 | CII A–E rating | Rule-based | `etl/cii.py:30` `_rating` | IMO regulatory dd-vector bands on attained/required ratio |
| 19 | Rubert / coating banding | Rule-based | `synthetic_data/fouling.py:67,78` | Roughness→Rubert grade, breakdown→coating condition |
| 20 | ISO 19030 valid-point filter | Rule-based | `etl/filters.py:29` `is_valid` | Beaufort≤6 + speed/displacement bands → steady points only |
| 21 | Closed-form optimal service t* | OR-optimization | `etl/recommendation.py:218,212` `_optimal_service`/`_net_saving` | t*=√(2K/β), J*, net-saving integral for hull cleaning |
| 22 | Cost-rate fit (α+βt) | Statistical | `etl/recommendation.py:132` `fit_cost_rate` | Robust fit of excess-cost rate → the β the optimizer needs |
| 23 | Per-action RUL forecasts | Statistical | `etl/recommendation.py:348,365,639` | Robust fit + threshold cross on each degradation signal |
| 24 | Coefficient economics | OR-optimization | `etl/recommendation.py:409` `_coefficient_economics` | Reuse the t* model per non-hull action |
| 25 | Greedy time-window batching | OR-optimization | `etl/recommendation.py:758,778` `_batch_by_due`/`plan_maintenance` | Cluster scattered due-dates into 60-day service windows |
| 26 | Priority / due-cap horizons | Rule-based | `etl/recommendation.py:335` `_due_or_horizon` | Fallback due-date so recommendations are never null |
| 27 | Payback period | OR-optimization | `etl/recommendation.py:121` `_payback_days` | Event cost ÷ daily saving → payback days |
| 28 | Gap-tolerance episode grouping | Rule-based | `etl/alerts.py:121` `_split_episodes` | Hysteresis: split same-cause anomalies at gaps > 7 days |
| 29 | Peak severity | Rule-based | `etl/alerts.py:68` `_peak_severity` | Episode severity = worst member |
| 30 | Biofouling trend alert | Rule-based | `etl/alerts.py:207,188` `_biofouling_alert`/`_trailing_speed_loss` | Trailing-14d mean + trigger-proximity → proactive alert |
| 31 | Median event-cost aggregation | Statistical | `etl/recommendation.py:76` `_median_event_cost` | Robust central cost K per event type |
| 32 | ISO 19030 period indicators | Statistical | `etl/periods.py:70,138` `build_indicators` | ISP/DDP/ME recovery + MT trailing-mean 8% crossing |
| 33 | Fleet group-by aggregation | Statistical | `etl/compute.py:246` `_agg_row` | ALL + 3 static fleets (config grouping, not clustering) |
| 34 | Client-side OLS trend-arrow slope | Statistical | `web/components/FleetOverview.js:13` `slopeOf` | Least-squares slope over last-30 for the trend arrow |
| 35 | `d3.bin` histogram | Statistical | `web/charts/histogram.js:14` | Equal-width binning for distribution charts |
| 36 | Pearson correlation | Statistical | `synthetic_data/validate.py:76` `_pearson` | Linear corroboration of injected relationships |
| 37 | Spearman rank correlation | Statistical | `synthetic_data/validate.py:86,94` `_ranks`/`_spearman` | Monotone corroboration (UWI↔fouling, degradation↔time) |
| 38 | Confusion-matrix precision/recall | Statistical | `etl/validate.py:128,139` `_check_detection`/`_check_causes` | Detection & per-cause recall/precision acceptance gates |
| 39 | ISO 15016 wind+wave power correction | Physics | `etl/corrections.py:22` `wind_wave_correction` | Blendermann C_AA=0.9 + STAWAVE-1 head-sea → environmental power removed |
| 40 | Power-law speed-power curve + inversion | Physics | `synthetic_data/curves.py:33,37` | P=a·V^n·(Δ/Δ_ref)^(2/3) shared forward/inverse relation |
| 41 | ISO 19030 performance indicators | Physics | `etl/indicators.py:14–65` | speed loss / slip / SFOC / Admiralty / EEOI / excess-FOC |
| 42 | Linear fouling trajectory w/ resets | Generative | `synthetic_data/fouling.py:288` `fouling_state` | Piecewise-linear UWI growth reset at cleanings |
| 43 | Independent degradation processes | Generative | `synthetic_data/fouling.py:87` `degradation_rates` | Prop roughness, coating, SFOC drift as separate clocks |
| 44 | Load-dependent SFOC U-shape | Generative | `synthetic_data/generate.py:168` `_sfoc` | Convex SFOC(load) the ETL later divides out |
| 45 | Gaussian random-walk fuel prices | Generative | `synthetic_data/datasets.py:58` `build_fuel_price` | Daily per-fuel random walk with a floor |
| 46 | Seasonal harmonic + noise met-ocean | Generative | `synthetic_data/environment.py:28` `generate_environment` | Beaufort v=0.836·B^1.5 wind, seasonal wave/current |
| 47 | Labeled anomaly injection + sensor noise | Generative | `synthetic_data/noise.py:38` `build_anomaly_plan` | Ground-truth anomalies + bounded noise for detector scoring |

---

## 3. Machine learning

### Isolation Forest — tail-outlier catch-all
- **Type:** ML (unsupervised) · the *only* sklearn estimator in the codebase.
- **Location:** `etl/anomaly.py:167` `_iforest_tail` (invoked at `:250`).
- **What:** `IsolationForest(n_estimators=200, contamination='auto', random_state=0, n_jobs=1)` over
  a 5-feature standardized-residual matrix — the global-MAD z-scores of `speed_loss`, `slip`,
  `sfoc`, `excess_foc` plus the Beaufort z (`etl/anomaly.py:250`). Returns the `-1` (outlier)
  rows. Skips when fewer than 20 valid points.
- **Why:** the targeted detectors (engine/propeller/glitch/weather) are high-precision but blind to
  odd *joint* configurations of the residual channels. IForest is a cheap, seed-stable catch-all for
  those multivariate tails. It is deliberately **gated**: an IForest hit only becomes a flag when a
  standardized residual also clears `_IFOREST_Z = 3.5` (`etl/anomaly.py:270`), so the model never
  fires on its own — it corroborates, it does not decide.

---

## 4. Robust regression & trend (`etl/trends.py`)

The whole trend layer is **Theil-Sen**, chosen because fouling series contain abrupt cleaning
step-changes that would drag an OLS line; the median-of-slopes estimator ignores them.

### Theil-Sen slope
- **Type:** Statistical. **Location:** `etl/trends.py:38` `_theil_sen`.
- **What:** median of all pairwise slopes `(yⱼ−yᵢ)/(tⱼ−tᵢ)` over distinct abscissae (O(n²), n≤~600).
- **Why:** the fouling-rate estimator (%/day) reused across trends, forecasts, and the deep-dive.
  Robust to the reset discontinuities OLS/Huber would smear.

### Robust line (slope + intercept)
- **Type:** Statistical. **Location:** `etl/trends.py:61` `robust_line`.
- **What:** Theil-Sen slope + `median(y − slope·t)` intercept; optionally a bootstrap CI.
- **Why:** the shared `(slope, intercept, ci_lo, ci_hi)` primitive every trend consumer calls.

### Bootstrap 95% CI
- **Type:** Statistical. **Location:** `etl/trends.py:48` `_bootstrap_ci`.
- **What:** `_BOOTSTRAP = 100` seeded resamples with replacement, re-running Theil-Sen; CI = the
  2.5/97.5 percentiles of the slope distribution. Degrades to a point estimate below 5 points.
- **Why:** gives the fouling rate an uncertainty band; computed only for the open cycle (the
  resample is the expensive part) so downstream can reject a non-positive-slope trend.

### Piecewise segmented regression
- **Type:** Statistical. **Location:** `etl/trends.py:83` `fit_segments`.
- **What:** split the speed-loss-vs-days series at each cleaning/dry-dock reset and robust-fit each
  segment independently; only the last (open) segment gets a bootstrap CI.
- **Why:** each maintenance cycle is a fresh fouling clock — fitting one global line across resets
  would be meaningless. The split points are *known* events, so no automatic change-point detection
  is needed.

### Threshold-crossing extrapolation
- **Type:** Statistical. **Location:** `etl/trends.py:154` `extrapolate`.
- **What:** on the open-cycle line, solve `days = (target% − intercept) / slope` and add to the last
  cleaning date; returns `None` when slope ≤ 0.
- **Why:** turns the fitted fouling rate into a due-date / remaining-useful-life the recommendation
  and alert layers consume.

### `np.polyfit` degree-1 (validation only)
- **Type:** Statistical. **Location:** `synthetic_data/validate.py:242`.
- **What:** ordinary least-squares degree-1 slope.
- **Why:** the *only* OLS in the repo, used purely to assert a synthetic series trends the right
  direction. Not on the production path (Theil-Sen is).

### Client-side Theil-Sen
- **Type:** Statistical. **Location:** `web/charts/speedLossTrend.js:10` `theilSen`.
- **What:** a JavaScript re-implementation of the median-pairwise-slope estimator (D3-sorted).
- **Why:** the speed-loss trend chart draws its own robust trend + dashed extrapolation in-browser,
  matching the server's method so the line agrees with `fouling_rate`.

---

## 5. Control charts & anomaly detection (`etl/anomaly.py`)

Four *targeted*, high-precision detectors plus three generic catch-alls, fused into one flag per
`(imo, date)`. All scales are robust (MAD-based) because the residuals are heavy-tailed.

### Fixed-target EWMA control chart
- **Type:** Statistical. **Location:** `etl/anomaly.py:97` `_ewma`, `:106` `_sustained_oob`.
- **What:** EWMA of the centred residual with λ=0.3, control limit L·σ where σ = MAD·√(λ/(2−λ)),
  L=3; a point is out-of-bounds when the EWMA exceeds the limit *and* clears a floor
  (engine 0.045, propeller 0.025).
- **Why:** detects a *sustained* level-shift — an engine SFOC step or a propeller-slip plateau —
  that single-point detectors and the adaptive rolling window would re-centre away. Fixed target
  (not adaptive) is exactly what makes a persistent step visible for its whole window.

### Rolling modified z (Iglewicz-Hoaglin)
- **Type:** Statistical. **Location:** `etl/anomaly.py:83` `_rolling_z`.
- **What:** the modified z-score `0.6745·(r − median)/MAD` over a trailing window W=30; alert at
  `z ≥ 4.5`.
- **Why:** catches *local* single-point spikes relative to recent behaviour, where a global scale
  would be too loose. MAD (not σ) keeps the window's own outliers from inflating the threshold.

### Global MAD z-score
- **Type:** Statistical. **Location:** `etl/anomaly.py:59` `_mad_scale`, `:67` `_global_z`.
- **What:** robust σ = `1.4826·MAD` (falling back to std if degenerate); `_global_z` = `(r −
  median)/σ`.
- **Why:** the standardized-residual scale every other detector and the classifier read from —
  the common currency for "how many robust sigmas is this residual".

### Wind-vs-Beaufort residual z
- **Type:** Statistical. **Location:** `etl/anomaly.py:71` `_wind_residual_z`.
- **What:** fit wind ≈ a·Beaufort^1.5 by the median ratio, then take the global-MAD z of the
  residual.
- **Why:** isolates a *wind-sensor glitch* — a wind reading inconsistent with the sea state — which
  is invisible to the ISO metrics because the wind correction absorbs it. Only counts when Beaufort
  < 7 (so genuine heavy weather isn't mislabelled).

### IQR / Tukey gross gate
- **Type:** Statistical. **Location:** `etl/anomaly.py:161` `_iqr_gross`.
- **What:** Tukey 3×IQR fence on the residual.
- **Why:** a robust single-point gross-outlier gate applied to speed-loss/slip/SFOC only (the
  excess-FOC residual is fouling-skewed and over-flags).

### Top-decile wave percentile gate
- **Type:** Statistical. **Location:** `etl/anomaly.py:235`.
- **What:** `wave ≥ 90th percentile` of the vessel's wave series.
- **Why:** qualifies a speed-loss spike as *weather-driven* only when the sea state is genuinely in
  the top decile — a data-driven threshold rather than a hard-coded wave height.

### OR-fusion of detectors
- **Type:** Rule-based. **Location:** `etl/anomaly.py:270,273`.
- **What:** `flag = engine | propeller | glitch | (rolling-z≥4.5) | (IForest & global-z≥3.5) |
  gross`, then `flag |= Beaufort ≥ 7`.
- **Why:** a union so no detector's positives are lost; the generic catch-alls (rolling-z, IForest,
  IQR) run at tightened gates, the targeted ones at their own thresholds. Heavy weather (Beaufort ≥
  7 — the generator's anomaly boost) is flagged directly.

---

## 6. Rule-based classification & rating

### First-match cause chain + run-length
- **Type:** Rule-based. **Location:** `etl/anomaly.py:301` `_classify`, `:174` `_run_lengths`.
- **What:** a priority cascade evaluated first-match: **sensor** (isolated gross spike, run ≤ 1) →
  **weather** (Beaufort ≥ 7 or speed-loss spike with top-decile wave) → **engine_degradation**
  (SFOC step, flat speed loss) → **propeller** (real-slip dominant) → fallback by dominant residual
  channel. `_run_lengths` gives each flag its consecutive-day count (an isolated spike is sensor;
  a sustained one is a real degradation).
- **Why:** an explainable decision list that assigns a single physical cause per flag — the property
  the confusion-matrix validation (§10) scores against.

### Severity banding
- **Type:** Rule-based. **Location:** `etl/anomaly.py:326` `_severity`, `:191` `_severity_from`.
- **What:** map the residual magnitude to low/medium/high against per-cause thresholds (weather →
  medium, sensor → high, engine/propeller banded by their residual size).
- **Why:** severity tracks the injected magnitude the generator used, so a downstream alert can rank
  episodes without re-deriving physics.

### CII A–E rating
- **Type:** Rule-based (regulatory). **Location:** `etl/cii.py:30` `_rating`.
- **What:** the IMO Carbon Intensity Indicator letter grade — `_DD_VECTOR=(0.83,0.94,1.07,1.19)`
  boundaries on the attained/required ratio, a reference line `a·Capacity^−c`, and a year-dependent
  reduction factor `_Z_BY_YEAR` (`etl/cii.py:20,22`).
- **Why:** encodes the IMO regulatory bands verbatim; it is a *lookup against fixed regulatory
  constants*, not a learned model.

### Rubert / coating banding
- **Type:** Rule-based. **Location:** `synthetic_data/fouling.py:67` `_rubert_from_roughness`, `:78`
  `_coating_from_breakdown`.
- **What:** map propeller roughness (µm) to a Rubert A–F grade and coating breakdown (%) to
  good/fair/poor via fixed edges.
- **Why:** domain-standard condition bands for the synthetic ground truth and the UWI display.

### ISO 19030 valid-point filter
- **Type:** Rule-based. **Location:** `etl/filters.py:29` `is_valid`.
- **What:** keep only steady at-sea points the speed-power curve applies to — finite fields, speed
  above a floor, Beaufort ≤ 6, displacement within band.
- **Why:** ISO 19030 speed-loss is only meaningful on filtered points; this predicate gates every
  downstream statistic.

---

## 7. Operations-research optimization & recommendation (`etl/recommendation.py`)

### Closed-form optimal service interval
- **Type:** OR-optimization. **Location:** `etl/recommendation.py:218` `_optimal_service`, `:212`
  `_net_saving`.
- **What:** with per-day excess cost `c(t)=α+βt` and event cost `K`, the average-cost-minimizing
  interval is `t* = √(2K/β)`, optimal cost-rate `J* = K/t* + α + βt*/2`, and the net saving of
  servicing at `t*` vs waiting to the trigger is the integral `∫(c(t)−J*)dt`.
- **Why:** a textbook age-replacement optimum in closed form — no solver, fully explainable, and it
  directly yields the recommended hull-cleaning date and its dollar saving.

### Cost-rate fit (α + βt)
- **Type:** Statistical. **Location:** `etl/recommendation.py:132` `fit_cost_rate`.
- **What:** robust fit of the excess-cost-per-day series to a line, returning `(α, β)` with a CI.
- **Why:** supplies the `β` (cost acceleration) the optimal-interval formula requires; robust so a
  few noisy days don't distort the economics.

### Per-action RUL forecasts
- **Type:** Statistical. **Location:** `etl/recommendation.py:348` `_robust_fit`, `:365`
  `_forecast_cross`, `:639` `_engine_action`.
- **What:** for each non-hull action, robust-fit its dedicated degradation signal on its own reset
  clock and extrapolate to the action's threshold — propeller roughness (300/430 µm), coating
  breakdown (45%), engine SFOC drift (+5%).
- **Why:** every maintenance action gets a data-driven due-date from its *own* physical signal,
  rather than a single generic hull model.

### Coefficient economics
- **Type:** OR-optimization. **Location:** `etl/recommendation.py:409` `_coefficient_economics`.
- **What:** reuse the `t*`/net-saving model per action using that action's reset-to-forecast horizon.
- **Why:** the same closed-form optimum, applied uniformly beyond hull cleaning.

### Greedy time-window batching
- **Type:** OR-optimization (clustering-like). **Location:** `etl/recommendation.py:758`
  `_batch_by_due`, `:778` `plan_maintenance`.
- **What:** greedily group due-sorted actions into `_PLAN_BATCH_DAYS = 60` windows (open a window at
  the earliest unassigned action, absorb all within tolerance); a dry-dock-aware two-pass batches
  dock actions first, then folds in-water actions into the nearest dock window.
- **Why:** clusters scattered per-action due-dates into a single "next maintenance date" so port
  calls aren't fragmented — a scheduling heuristic, not a learned cluster model.

### Priority / due-cap horizons
- **Type:** Rule-based. **Location:** `etl/recommendation.py:335` `_due_or_horizon`.
- **What:** when a signal can't be extrapolated, fall back to a priority horizon (high +30 d,
  medium +90 d) so `due_date` is never null.
- **Why:** guarantees every recommendation row carries a date, per spec §5.5.

### Payback period
- **Type:** OR-optimization. **Location:** `etl/recommendation.py:121` `_payback_days`.
- **What:** event cost ÷ estimated daily saving → payback days.
- **Why:** the simple economic yardstick shown next to each recommendation.

---

## 8. Alert episodes (`etl/alerts.py`)

### Gap-tolerance episode grouping (hysteresis)
- **Type:** Rule-based. **Location:** `etl/alerts.py:121` `_split_episodes`.
- **What:** sort same-cause anomalies by date and split into episodes wherever the gap exceeds
  `_GAP_DAYS = 7`.
- **Why:** collapses a run of daily flags into one alert episode with first/last-seen dates —
  hysteresis so brief dropouts don't shatter an episode into noise.

### Peak severity
- **Type:** Rule-based. **Location:** `etl/alerts.py:68` `_peak_severity`.
- **What:** an episode's severity is the worst of its members.
- **Why:** an episode is as urgent as its worst day.

### Biofouling trend alert
- **Type:** Rule-based. **Location:** `etl/alerts.py:207` `_biofouling_alert`, `:188`
  `_trailing_speed_loss`.
- **What:** combine the trailing-14-day mean speed loss with proximity to the maintenance trigger to
  raise a proactive biofouling alert.
- **Why:** warns *before* the hard trigger fires, using a smoothed signal so a single spike doesn't
  trip it.

---

## 9. Aggregation & robust statistics

### Median event-cost aggregation
- **Type:** Statistical. **Location:** `etl/recommendation.py:76` `_median_event_cost`.
- **What:** median cost over historical events of a type → the `K` the optimizer uses.
- **Why:** median (not mean) so an outlier invoice doesn't distort the service economics.

### ISO 19030 period indicators
- **Type:** Statistical. **Location:** `etl/periods.py:70,138` `build_indicators`.
- **What:** ISP (in-service performance, per-cycle mean speed loss vs the first cycle), DDP
  (dry-dock performance, before/after windows), ME (maintenance-event recovery), and MT (first date
  a 14-day trailing-mean speed loss crosses the maintenance trigger, `MT_TRIGGER_PCT = 8.0`).
- **Why:** the ISO 19030 performance-period summary statistics; MT uses a trailing mean so a noisy
  single day can't trigger.

### Fleet group-by aggregation
- **Type:** Statistical. **Location:** `etl/compute.py:246` `_agg_row`; fleet config
  `synthetic_data/fleet.py:117` `FLEETS`.
- **What:** aggregate daily vessel rows to `ALL` plus 3 named fleets (Intra-Asia, Trans-Pacific,
  Asia-Europe).
- **Why:** the fleet grouping is a *static configuration*, not a clustering algorithm — the group
  key comes from `FLEETS`, not from the data.

### Client-side OLS trend-arrow slope
- **Type:** Statistical. **Location:** `web/components/FleetOverview.js:13` `slopeOf`.
- **What:** closed-form least-squares slope over the last-30 rows of a metric.
- **Why:** drives the up/down/flat trend arrow in the fleet table; OLS is adequate here because it's
  a coarse direction indicator, not a rate estimate.

### `d3.bin` histogram
- **Type:** Statistical. **Location:** `web/charts/histogram.js:14`.
- **What:** equal-width binning (`d3.bin`, default 12 bins).
- **Why:** distribution charts in the dashboard.

---

## 10. Correlation & validation

### Pearson correlation
- **Type:** Statistical. **Location:** `synthetic_data/validate.py:76` `_pearson`.
- **What:** hand-rolled linear correlation coefficient.
- **Why:** corroborates injected *linear* relationships (Beaufort↔wave/wind, temp↔density) against
  tolerances.

### Spearman rank correlation
- **Type:** Statistical. **Location:** `synthetic_data/validate.py:86` `_ranks`, `:94` `_spearman`.
- **What:** Pearson on ranks.
- **Why:** corroborates *monotone* relationships (UWI rating↔fouling, degradation↔time) that need
  not be linear.

### Confusion-matrix precision/recall
- **Type:** Statistical. **Location:** `etl/validate.py:128` `_check_detection`, `:139`
  `_check_causes`.
- **What:** build the detection confusion matrix (TP/FP/FN) and a per-cause confusion matrix, then
  gate on recall/precision and per-cause recall thresholds.
- **Why:** the acceptance criteria that prove the anomaly pipeline recovers the injected ground
  truth (spec §9 M3).

---

## 11. ISO physics — deterministic (not ML, labelled as such)

These are closed-form physics from ISO standards. They are **deterministic** — no fitting, no
learning — but are catalogued because they are the analytic core the statistics sit on.

### ISO 15016 wind + wave power correction
- **Type:** Physics. **Location:** `etl/corrections.py:22` `wind_wave_correction`; kernels in
  `synthetic_data/physics.py`.
- **What:** added-resistance from wind (Blendermann drag `C_AA = 0.9`) and waves (STAWAVE-1 head-sea
  factor `0.5·(1−cos Δθ)`), converted to an environmental power term subtracted from measured shaft
  power.
- **Why:** removes weather from the power signal so the residual reflects the hull, not the sea —
  and it uses the *same* coefficients the generator injected, which is what makes the loss
  recoverable.

### Power-law speed-power curve + analytic inversion
- **Type:** Physics. **Location:** `synthetic_data/curves.py:33` `clean_power_kw`, `:37`
  `clean_speed_kn`.
- **What:** the clean-hull relation `P = a·Vⁿ·(Δ/Δ_ref)^(2/3)` and its closed-form inverse
  `V = (P / (a·(Δ/Δ_ref)^(2/3)))^(1/n)`.
- **Why:** the single shared source of truth — the forward generator computes power from speed, the
  M2 ETL inverts corrected power back to an expected clean speed for ISO 19030 speed-loss. Sharing
  the curve is what makes injected speed loss recoverable.

### ISO 19030 performance indicators
- **Type:** Physics. **Location:** `etl/indicators.py:14–65`.
- **What:** speed loss (`:19`), apparent/real slip (`:30`), SFOC (`:39`), Admiralty coefficient
  (`:44`), EEOI (`:49`), excess FOC (`:57`), excess cost (`:65`), CO₂ (`:14`).
- **Why:** the deterministic ISO 19030 / operational KPIs that every statistic downstream analyses.

---

## 12. Synthetic generative / forward models (`synthetic_data/`)

The generative side produces labelled data with *known* ground truth so the ETL's detectors and
correlations can be scored.

### Linear fouling trajectory with reset steps
- **Type:** Generative. **Location:** `synthetic_data/fouling.py:288` `fouling_state`.
- **What:** piecewise-linear UWI/fouling growth that steps back to baseline at each cleaning.
- **Why:** the reset structure is exactly what the segmented regression (§4) is designed to recover.

### Independent degradation processes
- **Type:** Generative. **Location:** `synthetic_data/fouling.py:87` `degradation_rates`.
- **What:** separate per-vessel rates for propeller roughness (µm/day), coating breakdown (%/day),
  and engine SFOC drift (/day), each on its own reset clock (C15–C17).
- **Why:** decoupled signals so the per-action RUL forecasts (§7) can be validated one signal at a
  time.

### Load-dependent SFOC U-shape
- **Type:** Generative. **Location:** `synthetic_data/generate.py:168` `_sfoc`.
- **What:** `sfoc = sfoc_base·(1 + 0.18·(load − 0.80)²)` — a convex penalty away from the efficient
  load point.
- **Why:** the realistic load dependence the ETL's *load-aware* SFOC detector divides out to isolate
  a genuine engine step from a load effect.

### Gaussian random-walk fuel prices
- **Type:** Generative. **Location:** `synthetic_data/datasets.py:58` `build_fuel_price`.
- **What:** per-fuel daily random walk `price += N(0, vol)`, floored at 150 USD/mt.
- **Why:** plausible price volatility for the cost model without a real market feed.

### Seasonal harmonic + noise met-ocean
- **Type:** Generative. **Location:** `synthetic_data/environment.py:28` `generate_environment`.
- **What:** Beaufort-driven wind `v = 0.836·B^1.5` (WMO), seasonal-harmonic wave height, and a gamma
  current, all with bounded noise.
- **Why:** correlated weather whose Beaufort↔wave/wind relationships the Pearson checks (§10)
  confirm, and which the ISO 15016 correction later removes.

### Labeled anomaly injection + bounded sensor noise
- **Type:** Generative. **Location:** `synthetic_data/noise.py:38` `build_anomaly_plan`.
- **What:** stamp ground-truth anomalies (engine step, propeller lift, sensor glitch, weather) with
  known cause/severity and injection parameters, plus bounded multiplicative sensor noise
  (first-cause-wins labelling).
- **Why:** provides the labelled truth the confusion-matrix validation (§10) scores the detectors
  against.

---

## 13. Notably absent

Deliberately **not** used — the design is rules + robust statistics, not learned models:

- **No deep learning** (no TensorFlow / PyTorch / Keras).
- **No gradient boosting** (no XGBoost / LightGBM / CatBoost).
- **No K-means / DBSCAN / hierarchical clustering** — the "fleet groups" are static config
  (`FLEETS`), the "batching" is a greedy time-window heuristic.
- **No ARIMA / statsmodels / exponential-smoothing forecasting** — trends are Theil-Sen +
  linear extrapolation.
- **No Kalman filter / state-space smoothing.**
- **No LOWESS / Savitzky-Golay smoothing** — smoothing is EWMA and trailing means only.
- **No automatic change-point detection (CUSUM / PELT / BOCPD)** — segment boundaries come from
  *known* cleaning/dry-dock events, not detected.
- **No pandas / scipy** — everything is numpy plus the one sklearn estimator.
- **No SageMaker or any managed-ML service.**

---

## 14. Spec-vs-impl deviations

Two places where the implementation departs from the written spec (already noted in `insights.md`):

1. **Trend estimator.** `poc-spec.md §5.1` says "robust regression (Huber / Theil-Sen)"; the
   implementation is **Theil-Sen only** (`etl/trends.py:38`) — no Huber estimator exists in the code.
2. **Maintenance trigger threshold.** The code triggers at **8%** (`etl/periods.py:27`
   `MT_TRIGGER_PCT = 8.0`), while the `§5.5` narrative and the client chart default use **10%**
   (`web/charts/speedLossTrend.js:32` `threshold ?? 10`). The server-side statistic and the
   client-side reference line therefore use different thresholds.
