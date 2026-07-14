# Statistical Insights (POC M3)

The M3 ETL adds a **statistical layer** over the M2 curated zone (spec §5 / §9):
a piecewise fouling-rate trend, point-anomaly detection with rule-based cause and
severity, a per-vessel maintenance-effect + optimal-cleaning recommendation, a
per-action maintenance forecast consolidated into a service-window planner, and
an early-warning alert layer. It fills the columns M2 left null and emits the new
`fact_anomaly` / `fact_recommendation` / `fact_maintenance_recommendation` /
`fact_alert` tables. This is the M3 deliverable: the injected anomalies are
**caught**, their **causes are right**, and the recommendations are
**reasonable** — scored by the closed-loop **C14** check.

- Runs **locally**, numpy-only, plus one scikit-learn `IsolationForest` — no
  SageMaker (spec §5 decision #5).
- Reads the **M2 output** (`fact_performance_daily` and the indicator/event rows)
  plus a handful of **raw noon features** (Beaufort, wave, wind, shaft power, ME
  FOC); it **never** reads `truth/` — ground truth is used only by C14.
- **Rules + statistics only.** The GenAI narrative layer (spec §5.7) is deferred;
  every insight here is a deterministic detector, a robust fit, or a closed-form
  optimum.

---

## 1. Pipeline (S8–S10, `_apply_m3`)

`compute.py::_apply_m3` runs per vessel, in this order (baseline first, because
detection flags residuals **against** it):

| Stage | Module | Output |
|---|---|---|
| S8 Trend & fouling | `trends.py` | per-cycle `Segment` (fouling rate, CI) + residual `baseline_series` |
| S9 Anomaly detect + cause | `anomaly.py` | `anomaly_flag`/`cause`/`severity` on daily rows + `fact_anomaly` |
| S10 ME + recommend | `recommendation.py` | `me_recovery_pct`/`payback_days` on events + `fact_recommendation` |
| Maintenance planner | `recommendation.py` (`recommend_actions`, `plan_maintenance`) | per-action due dates batched into service windows → `fact_maintenance_recommendation` |
| Early-warning alerts | `alerts.py` | anomaly + fouling-trend episodes → `fact_alert` |

Two cross-cutting facts govern the whole layer:

- **Detection runs on residuals vs the trend baseline over every metric-bearing
  at-sea row**, not just `valid_flag` points. The generator pushes weather
  anomalies past the ISO 19030 Beaufort-≤6 valid gate, so detecting only on valid
  points would make them structurally invisible. Trend/baseline fits still use
  `valid_flag` points; detection then scores the broader set against them.
- **`_apply_m3` fills the M2 null stubs**: `anomaly_flag`/`anomaly_cause`/
  `anomaly_severity` on `fact_performance_daily`, `me_recovery_pct`/`payback_days`
  on `fact_maintenance_event`, and `n_alerts` on `agg_fleet_daily`. The per-vessel
  RNG is seeded `SeedSequence([int(imo)])`, so the result is order-independent and
  deterministic.

**Biofouling is the §5.1 trend slope, never a point-anomaly cause.** The
point-anomaly cause set is `{engine_degradation, propeller, weather, sensor}`;
gradual hull fouling shows up as the segment slope, not a flag.

---

## 2. Performance trend & fouling rate (`trends.py`, §5.1)

A robust **Theil-Sen** piecewise regression of `speed_loss_pct` vs
`days_since_cleaning`, split at each hull-fouling reset (`hull_cleaning ∪
dry_dock`):

```
slope    = median pairwise slope over distinct abscissae   (Theil-Sen)
intercept= median(y − slope·t)
CI       = 2.5/97.5 pct of 100 seeded bootstrap resamples  (open cycle only)
```

Each cycle becomes a `Segment(start, end, slope, intercept, ci_lo, ci_hi, n,
open_cycle)` where **`slope` is the fouling rate (%/day)**. Only the open (last)
cycle carries a bootstrap CI — the others' CIs are unused and the resample is the
expensive part.

`baseline_series` turns the segments into the per-day expected values the anomaly
detector (§3) flags residuals against:

| Channel | Baseline |
|---|---|
| `speed_loss` | the segment line `slope·days_since_cleaning + intercept` |
| `sfoc`, `slip` | flat per-cycle robust medians (`_segment_median`) |
| `excess_foc` | `me_foc·[1 − (1 − s_exp)^n]`, `s_exp = max(0, base_sl/100)`, `n` = curve exponent |

`extrapolate(segment, target_pct, last_cleaning)` projects the open cycle forward
to a target speed loss → the trigger-ETA date (`None` if slope ≤ 0). It drives
both the maintenance trigger and the recommendation horizon (§4).

**Deviation from spec:** §5.1 calls for "Huber / Theil-Sen"; the implementation
is **Theil-Sen only**.

---

## 3. Anomaly detection & cause classification (`anomaly.py`, §5.2 / §5.3)

Four **targeted, high-precision** detectors — one per cause — carry most of the
signal, because a persistent shift re-centres any adaptive (rolling) statistic
mid-plateau. Generic catch-alls run behind them at tightened gates.

### Targeted detectors

| Cause | Detector |
|---|---|
| engine | fixed-target **EWMA** control chart (λ=0.3, L=3) on the load-aware fractional SFOC residual, floor **0.045** — a degradation step stays out-of-control for its whole duration |
| propeller | the same fixed-target EWMA on the real-slip residual, floor **0.025** (a slip plateau) |
| sensor | single-day glitch: `|frac SFOC| ≥ 0.06`, **or** MAD-z ≥ 5 in a coupled channel (speed/slip), **or** a wind reading off its Beaufort curve (z ≥ 3.25, Beaufort < 7) |
| weather | the direct **Beaufort ≥ 7** met signal (the generator's +3 anomaly boost), whose added resistance the ISO 15016 correction otherwise removes |

The load-aware fractional SFOC residual divides out the generator's U-shape
`A·(1 + 0.18·(load − 0.8)²)` (A = robust median), isolating a degradation step as
a clean multiplicative residual the flat baseline can't model.

### Catch-alls (tightened gates)

| Detector | Gate |
|---|---|
| rolling-z | modified-z ≥ **4.5** over `{speed_loss, slip, sfoc}`, window W = **30** |
| IsolationForest | **200** trees (`contamination='auto'`, needs ≥ 20 pts), flagged only when the global residual z ≥ **3.5** corroborates |
| IQR gross | outside `Q1 − 3·IQR … Q3 + 3·IQR` on `{speed_loss, slip, sfoc}` |

Fusion produces **one flag per (imo, date)**:
`flag = engine | propeller | glitch | rolling-z | (IForest & z≥3.5) | IQR | (Beaufort≥7)`.

### Cause rules (first-match, `_classify`)

Mirrors the generator's `stamp` priority:

| Order | Cause | Condition |
|---|---|---|
| 1 | sensor | isolated gross spike (`gross`, or z ≥ 6, or `|frac SFOC| ≥ 0.06`, or wind glitch) **and** run ≤ 1 **and** Beaufort < 7 |
| 2 | weather | Beaufort ≥ 7, **or** `z[speed_loss] ≥ 3` with a top-decile wave |
| 3 | engine_degradation | `engine` detector on **and** `z[speed_loss] < 2` (SFOC step without speed loss) |
| 4 | propeller | `z[slip] ≥ 3` |
| — | fallback | dominant residual channel: slip → propeller; sfoc/excess_foc → engine; else weather |

### Severity (`_severity`, mirrors the generator's injection bands)

| Cause | Severity |
|---|---|
| weather | `medium` |
| sensor | `high` |
| engine_degradation | `frac SFOC` band: ≥ 0.13 → high, ≥ 0.10 → medium, else low |
| propeller | slip-residual band: ≥ 0.10 → high, ≥ 0.07 → medium, else low |

### Key constants

| Const | Value | Meaning |
|---|---|---|
| `_EWMA_LAMBDA` / `_EWMA_L` | 0.3 / 3.0 | EWMA smoothing / control limit |
| `_ENGINE_FLOOR` | 0.045 | min sustained SFOC step (below = load/noise) |
| `_PROP_FLOOR` | 0.025 | min sustained slip lift (below = noise) |
| `_SFOC_GLITCH` | 0.06 | single-day FOC/power sensor-glitch threshold |
| `_GLITCH_Z` / `_SENSOR_Z` | 5.0 / 6.0 | coupled-channel MAD-z spike / gross single-channel spike |
| `_WIND_GLITCH_Z` | 3.25 | wind reading off its Beaufort-expected value |
| `_ROLL_Z` / `_W` | 4.5 / 30 | rolling modified-z alert / window (days) |
| `_IFOREST_Z` | 3.5 | residual z corroborating the IForest tail |
| `_SFOC_LOAD_COEF` | 0.18 | generator's load-dependent SFOC U-shape coefficient |

---

## 4. Maintenance effect & cleaning recommendation (`recommendation.py`, §5.4 / §5.5)

### Maintenance effect (`enrich_maintenance`)

Reuses the ISO 19030 **ME** period-indicator rows (keyed by `(event_date,
event_type)`):

```
me_recovery_pct = me.value / me.reference_value × 100      # (before − after)/before × 100
payback_days    = event full cost / daily excess-cost saving
```

`payback_days` compares the mean `excess_cost_usd` over the **±30 day** windows
around the event (`before − after`); `None` if either window is empty or the
saving is ≤ 0. Event full cost = `cost_usd + downtime_hours·$1000/h`.

### Optimal-cleaning recommendation (`recommend`)

Fits the **open cycle**'s daily excess-cost rate and minimises the cycle cost rate
in closed form:

```
c(t) = α + β·t             # Theil-Sen fit of excess_cost_usd vs days_since_cleaning
J(T) = K/T + α + β·T/2     # average cost rate of a length-T cycle
T*   = √(2K/β)             # cost-rate-minimising cycle length
recommended_clean_date = last_cleaning + round(T*)
trigger_eta            = extrapolate to MT_TRIGGER_PCT = 8 %
net_saving_usd         = ∫_{T*}^{trigger} (c(t) − J*) dt   # saved cost of cleaning at T* vs the trigger
```

`K` = median hull-cleaning full cost (cash + downtime·$1000/h) for the vessel,
falling back to the **fleet-median** cost when the vessel has no cleaning history.

**Degeneracy guards** → `status = insufficient_history` (a placeholder that still
reconstructs `last_cleaning_date` and `fouling_rate_pct_per_day`):

- fewer than **30** priced open-cycle points, or
- non-positive cost slope `β ≤ 0`, or
- the slope CI straddles zero (`ci_lo ≤ 0 ≤ ci_hi`), or
- no `K` available (no cleanings fleet-wide).

`net_saving_usd` is only computed when a trigger ETA exists **and** lands beyond
`T*` (`t_trigger > T*`); otherwise `None`.

**Note:** the maintenance trigger here is **8 %** (`periods.MT_TRIGGER_PCT`),
vs the §5.5 narrative's 10 %.

### Per-action maintenance forecast (`recommend_actions`)

Broadens the single hull-cleaning recommendation into **one row per due
maintenance action**, up to 5 action types: `hull_cleaning`,
`propeller_polishing`, `propeller_repair`, `coating_renewal`,
`engine_inspection`. Each action other than hull cleaning fits its own
**Theil-Sen** forecast of an independent degradation signal against its own
reset clock (`propeller_polishing ∪ dry_dock` for the propeller,
`coating_renewal ∪ dry_dock` for coating, `engine_overhaul ∪ dry_dock` for
engine) and extrapolates when it crosses the action's threshold — a genuine
predictive `due_date`:

| Action | Degradation signal → threshold | Priority |
|---|---|---|
| `hull_cleaning` | fouling cost model's trigger ETA (preferred), or UWI hull-fouling rating ≥ 60 | high if the cost-model ETA is within 60 d (or past), else medium |
| `propeller_polishing` | roughness (µm) → 300 µm | medium (Rubert grade C/D, forecast due soon, or a propeller anomaly) |
| `propeller_repair` | roughness (µm) → 430 µm | high (Rubert grade E/F, or a high-severity propeller anomaly) |
| `coating_renewal` | breakdown (%) → 45 % (poor) | medium (condition = poor, or forecast within horizon) |
| `engine_inspection` | SFOC drift (%) → +5 % efficiency loss | high if a trailing anomaly or already past threshold, else medium |

When a signal is flat, declining or too thin to fit, `due_date` falls back to a
priority-based horizon from the latest report (high +30 d / medium +90 d,
capped so a slow signal's distant crossing never leaks into an urgent due
date) — a due date is **never null**. Each row self-carries the same 4-metric
analytics strip as hull cleaning: `degradation_rate`/`degradation_unit`,
`current_value`/`threshold_value`, `trigger_eta`, and — for the economic
actions (hull cleaning's own cost fit; propeller/coating via a POC per-unit
excess-power-fraction coefficient; engine via the fitted SFOC drift directly)
— `t_star_days`/`net_saving_usd`. `source` records which evidence triggered the
action (`uwi` / `anomaly` / `uwi+anomaly` / `fouling_model` / `sfoc_trend`);
`rationale` is a short narrative built from that evidence. An empty per-vessel
list means nothing is due.

### Consolidated planner (`plan_maintenance`)

Batches the scattered per-action due dates into a handful of **service
windows** so a vessel gets one planning answer, not five. `plan_service_type`
is `dry_dock` for `coating_renewal`/`propeller_repair` — the haul-out is the
constraining event, so a window's `plan_date` anchors on (and is never pulled
earlier than) its earliest dry-dock due — and `in_water` for
`hull_cleaning`/`propeller_polishing`/`engine_inspection`, which fold into a
nearby dry-dock window within tolerance, else batch among themselves (planned
for the earliest in-water due). Greedy two-pass batching: dry-dock actions
first, then in-water; batch tolerance `_PLAN_BATCH_DAYS = 60` days. Every
action in a window carries that window's `plan_date`/`plan_service_type`.

---

## 5. M3 tables & filled columns

### `fact_anomaly` — one row per flagged (imo, date)

Partitioned by `imo_number` (enum partition projection). Emitted at the driver
metric — the channel with the largest global residual z.

| Column | Source |
|---|---|
| `report_date` | flagged day |
| `metric` | driver channel (`speed_loss` / `slip` / `sfoc` / `excess_foc`) |
| `value` | that channel's observed value |
| `z_score` | global (MAD) residual z of the driver channel |
| `severity` | `low` / `medium` / `high` (§3) |
| `cause` | `engine_degradation` / `propeller` / `weather` / `sensor` |

### `fact_recommendation` — one row per vessel (flat)

| Column | Source |
|---|---|
| `imo_number`, `last_cleaning_date` | vessel + reconstructed last reset |
| `recommended_clean_date` | `last_cleaning + round(T*)` |
| `trigger_eta` | date the open cycle reaches 8 % speed loss |
| `t_star_days` | `T* = √(2K/β)` |
| `fouling_rate_pct_per_day` | open-cycle segment slope |
| `net_saving_usd` | `∫_{T*}^{trigger}(c − J*)` (nullable) |
| `status` | `ok` / `insufficient_history` |

### `fact_maintenance_recommendation` — one row per vessel × recommended action

| Column | Source |
|---|---|
| `imo_number` | vessel |
| `action_type` | `hull_cleaning` / `propeller_polishing` / `propeller_repair` / `coating_renewal` / `engine_inspection` |
| `priority` | `high` / `medium` (§4 rule) |
| `due_date` | forecast threshold-crossing date, else a priority-based horizon fallback (never null) |
| `rationale` | evidence narrative (condition, roughness/breakdown, anomaly counts, forecast date) |
| `source` | `uwi` / `anomaly` / `uwi+anomaly` / `fouling_model` / `sfoc_trend` |
| `degradation_rate`, `degradation_unit` | Theil-Sen slope of the action's signal vs its own reset clock — `%/day` (fouling rate, breakdown, SFOC drift) or `µm/day` (roughness) |
| `current_value`, `threshold_value` | latest observed signal vs the action's threshold (hull: current speed-loss % vs the 8 % MT trigger; propeller: roughness µm vs 300/430; coating: breakdown % vs 45 %; engine: SFOC drift % above cycle baseline vs +5 %) |
| `trigger_eta` | date the forecast crosses the threshold (nullable — flat/declining/unfittable signal) |
| `t_star_days`, `net_saving_usd` | optimal service interval + net saving for the economic actions (nullable — null for `propeller_repair`, a corrective floor) |
| `plan_date`, `plan_service_type` | the batched service window this action is folded into (`plan_maintenance`, §4) |

### `fact_alert` — one row per vessel × alert episode

Consecutive same-`cause` `fact_anomaly` days are collapsed into one episode
(gap tolerance `_GAP_DAYS = 7` — a gap of more than 7 days starts a new
episode); `hull_biofouling` is sourced separately from the fouling cost model
(a positive fouling rate, plus a trigger ETA or an already-over-trigger
trailing 14-day speed loss) since it is a trend, never a point anomaly.

| Column | Source |
|---|---|
| `alert_id` | `AL-{imo}-{opened_date}-{cause}` |
| `fleet_id` | the vessel's operational fleet |
| `opened_date`, `last_seen_date` | episode start / most-recently-flagged date (point); current fouling cycle's start / latest trailing-window date (biofouling) |
| `cause` | `engine_degradation` / `propeller` / `weather` / `sensor` / `hull_biofouling` |
| `severity` | peak severity across the episode (point); trigger-proximity based, high/medium (biofouling) |
| `driver_metric`, `peak_value`, `peak_z` | the anomaly's driver channel/value/\|z\| at the episode's peak (point); `speed_loss` / trailing 14-day mean / `None` (biofouling — a trend has no z-score) |
| `excess_cost_usd` | Σ `excess_cost_usd` over the episode window (point); latest `cum_excess_cost_usd` this fouling cycle (biofouling) |
| `recommended_action` | bilingual `"<zh> (<en>)"` string from a fixed per-cause lookup |
| `status` | always `open` (no resolution workflow yet) |
| `source` | `anomaly` (point episodes) / `fouling_model` (biofouling) |
| `message_zh`, `message_en` | bilingual narrative built from the same evidence |

### Filled M2 stubs

- `fact_performance_daily.anomaly_flag` / `anomaly_cause` / `anomaly_severity`
- `fact_maintenance_event.me_recovery_pct` / `payback_days`
- `agg_fleet_daily.n_alerts` — count of flagged rows per fleet-day

Glue DDL: `deployment/athena_tool_stack.py` (`_FACT_ANOMALY_COLUMNS`,
`_FACT_RECOMMENDATION_COLUMNS`, `_FACT_MAINTENANCE_RECOMMENDATION_COLUMNS`,
`_FACT_ALERT_COLUMNS`; tables wired in `_curated_by_imo_table` / the
curated-zone table list).

---

## 6. C14 validation (`validate.py`)

`check_c14` joins `fact_performance_daily` × ground truth over the **detection
domain** — every metric-bearing at-sea row (`speed_loss_pct` not null) — and runs
five checks:

| Check | Threshold |
|---|---|
| detection | recall ≥ **0.70**, precision ≥ **0.60** |
| cause classification | accuracy ≥ **0.75** (right cause among TPs) + per-cause recall: engine **0.75**, propeller **0.70**, sensor **0.70**, weather **0.40** |
| severity | exact ≥ **0.50**, within-1 ≥ **0.85** |
| recommendation | every `ok` rec cleans after `last_cleaning`, with `t_star_days > 0` and `fouling_rate_pct_per_day > 0` |
| maintenance effect | hull-cleaning ME recovery **> 0** for ≥ **50 %** of events |

C14 runs only inside `compute --validate` (it needs the in-memory M3 tables); the
standalone `validate --dir` subcommand re-runs **C13 only**.

---

## 7. Phase 1 — Fleet Map & Voyage Intelligence

Phase 1 adds a **spatial + voyage-economics** dimension on top of the M2/M3
layers. It is not statistical (no new detectors); the voyage roll-up is an M2
curated table (`fact_voyage`, curated-dataset §6) and the map reads decorative
positions carried on `fact_performance_daily` (table-schema §3.1.2). Included
here because it is the Phase 1 *insight* surface of the Dashboard.

### Voyage economics (`fact_voyage`)

One row per rotation leg `(imo_number, voyage_no)` — incl. its in-port day —
rolling the daily Noon Report up to per-voyage **distance, sea days, average
speed, total FOC, fuel cost (each day priced at its own `(date, fuel_type)`),
CO₂, average speed loss, $/nm**, plus a `planned_eta` / `on_time_flag`. The
planned duration derates design speed to 85 % (service margin), so roughly half
the voyages land on-time — a simple schedule-reliability read. Fuel / distance /
CO₂ **sum the raw daily values**, so the per-vessel roll-up conserves fuel exactly
(**C18**, curated-dataset §7) and CO₂ reconciles with the daily fact. The
Deep-dive renders these as a **sortable voyage-economics table** (query
`vessel_voyages`).

### Fleet Map & per-vessel track (M6)

- **Fleet Map tab** — a self-contained **D3 world map** (Natural Earth 1:110m land
  committed as `web/assets/world.geojson`; **zero external map-tile requests**).
  It plots each vessel's latest position (query `fleet_positions`), planned-route
  arcs bent through the shared Suez / Malacca waypoints, and the ports (EU ports
  drawn distinctly). Vessels are colored by **speed-loss or CII** (toggle);
  clicking a vessel opens its Deep-dive.
- **Per-vessel track map** — the same map in *track mode*: a polyline of the
  vessel's daily positions (query `vessel_track`), shown in the Deep-dive.
- `web/ports.js` mirrors `ports.py` (PORTS + ROUTE_WAYPOINTS) so the dashboard map
  arcs match the generated tracks; the coordinates come from that static mirror,
  **not** from the `dim_port` Glue table (which is Athena-side only).

The three backing query types (`fleet_positions`, `vessel_track`,
`vessel_voyages`) are documented in `api.md` §4.14–§4.16.

---

## 8. Phase 2 — Bunker & Slow-Steaming Optimizer

Phase 2 adds a **bunker-economics** dimension on top of the M2/M3 layers. Like
Phase 1 it is not statistical (no detectors, no RNG, no ground truth): the speed
sweep is an M2 curated table (`fact_speed_profile`, skill
`skill/fact_speed_profile.md`), built deterministically from the reference
speed-power curve plus the **latest** fouling and bunker-price state. Fuel is the
fleet's **#1 opex**, yet nothing before this located the *economical speed* — the
cost-minimising cruise. Included here because it is the Phase 2 *insight* surface
of the Dashboard.

### Economical speed (`fact_speed_profile`)

One row per speed-grid point `(imo_number, speed_kn)` — **24 points spanning
0.5 → 1.0 of design speed** — pricing each speed into a unit-distance **total**
cost `usd_per_nm = (fuel_usd_per_day + charter_usd_per_day) / (speed·24)`. The
fuel term inflates the reference speed-power curve by the latest fouling state
(`P_fouled = P_clean/(1 − s)^n`) and prices the fouled burn at the latest bunker
price; the charter term is the per-day hire (time) cost. Fuel-only
`usd/nm ∝ V^(n−1)` is strictly increasing, so a fuel-only optimum is **degenerate**
(the slowest grid point); adding the per-day time cost makes `usd_per_nm`
**convex** with an interior minimum — the **economical speed**
(`recommended_speed_kn`, the `usd_per_nm` argmin), typically **~60–70 % of design
speed** (realistic slow-steaming) and enforced strictly interior by check **C19**.
Each row also carries the fuel-only `fuel_usd_per_nm` decomposition and the
vessel-level `current_speed_kn` / `annual_distance_nm` (identical on all 24 rows).

### Optimizer page (`Optimizer.js`)

- **usd/nm-vs-speed curve** — the convex total-cost curve for the selected vessel
  (query `vessel_speed_profile`) with **current / economical / schedule-optimal**
  markers, the fuel-only curve dashed underneath.
- **Schedule what-if** — a distance/days pair of sliders that compute the required
  schedule speed `D / (days·24)` and recompute **live voyage savings** from
  slow-steaming current → economical over the entered distance; it flags when a
  tight schedule forces speed above the economical minimum.
- **Fleet slow-steaming KPI** — a fleet-wide annualised saving
  `Σ over vessels of (usd_per_nm@current − usd_per_nm@economical) ×
  annual_distance_nm`, alongside the per-vessel annualised twin.

The backing query type `vessel_speed_profile` (single-table over
`fact_speed_profile`) is described in skill `skill/fact_speed_profile.md`.

---

## 9. Phase 4 — Weather attribution

`_daily_row` decomposes each at-sea day's fuel penalty into three **additive**
channels (`indicators.excess_cost_attribution`), all priced at the day's fuel price:

- **fouling** `excess_cost_fouling_usd = excess_cost_usd` — the ISO 19030 speed-loss
  penalty (hull/propeller degradation), the C13-validated headline.
- **weather** `excess_cost_weather_usd` — fuel cost of the wind+wave added-resistance
  power the ISO 15016 correction removed: `dp_env_kw =
  resistance_to_power_kw((resistance_wind_kn + resistance_wave_kn)·1000, STW)`, burned
  at the day's SFOC. **Non-trivial precisely because** `excess_cost_usd` is computed on
  *post-correction* speed loss, so weather is genuinely additive, not a slice of fouling.
- **operational** `excess_cost_operational_usd` — off-design engine-load SFOC penalty
  `me_foc · p/(1+p)`, `p = 0.18·(load−0.80)²`, `load = me_power/mcr`; mirrors the
  generator's `_sfoc` load U-shape (min at ~80 % MCR). No design-SFOC field is needed.

The three sum to a **total fuel penalty that exceeds** the legacy `excess_cost_usd`
(which equals the fouling channel alone). Check **C20** pins `fouling == excess_cost_usd`,
enforces non-negativity + null-discipline, and asserts a materially positive fleet-wide
`Σ weather`. The deep-dive **excess-cost attribution** chart (`charts/attribution.js`)
stacks the three (7-day rolling mean per band, so the stack still traces the total) to
settle "unfair fouling blame" disputes. Surfaced by extending `vessel_metrics`.

---

## 10. Phase 6 — Maintenance budget & dry-dock planner

Phase 6 adds a **fleet-level capex / cashflow + maintenance-calendar** dimension on
top of the M3 planner. Like Phases 1/2 it is not statistical (no detectors, no RNG,
no ground truth) and — unlike them — it adds **no new table, no ETL, no data
regen**: the per-vessel `fact_maintenance_recommendation` planner already exists
(§4, `plan_date` / `plan_service_type` windows); Phase 6 is the *fleet* roll-up of
it, plus an indicative budget derived at query time. Included here because it is the
Phase 6 *insight* surface of the Dashboard.

### Fleet backlog & indicative capex (`fleet_maintenance_recommendation`)

The Planner reads one new `query_type`, `fleet_maintenance_recommendation`
(api.md §4.18): the per-action rows of `vessel_maintenance_recommendation` across
**all** vessels (same window/priority ordering), each **LEFT JOIN**ed to an
indicative capex:

```
est_cost_usd = approx_percentile(cost_usd, 0.5)   # median historical event cost
               over fact_maintenance_event GROUP BY event_type
```

`event_type` matches `action_type` 1:1 **except** `engine_inspection`, which maps to
the `engine_overhaul` event cost (there is no pure-inspection event). Each action
maps to its *specific* event cost — never the umbrella `dry_dock` event — so a
bundled window's total is `Σ` of its actions' costs and never double-counts.
`est_cost_usd` is **query-time derived, not stored**: no Glue column, no ETL. Capex
is therefore **indicative** — the `engine_inspection→engine_overhaul` estimate
overstates a bare inspection — and the UI + docs label it so.

### Planner page (`Planner.js`)

- **Maintenance schedule (Gantt)** — a swim-lane 甘特圖 (Gantt chart), one lane per
  vessel, one nominal-duration `<rect>` bar per service window at its `plan_date`,
  colored by `plan_service_type` (乾塢 / 水下) and priority-encoded via
  stroke/opacity. Bar durations (`dry_dock` 12 d / `in_water` 2 d) are **illustrative
  constants**, not from data. Windows are the (imo, `plan_date`, `plan_service_type`)
  groups of the backlog, carrying their bundled actions and `Σ est_cost_usd`.
- **Capex by quarter** — stacked bars of `Σ est_cost_usd` bucketed by quarter of
  `plan_date`, split by `plan_service_type` — the fleet's maintenance cashflow.
- **ROI-ranked backlog** — the flat action rows with
  `roi = net_saving_usd / est_cost_usd`, sortable (default `net_saving_usd` desc,
  nulls last); non-economic actions (null `net_saving_usd`) show a blank ROI and
  sort to the bottom. Row-click opens that vessel's Deep-dive.
- **KPIs** — total capex (Σ est_cost), total net saving, dry-dock window count, next
  window date, fleet ROI (Σ net saving ÷ Σ capex).

Vessel names resolve client-side from the `fleet_vessels` roster (loaded at app
start), so the query returns only `imo_number`. No new C-check: no ETL or data
changed, so C1–C20 are untouched.

---

## 11. Commands

```bash
# Regenerate raw (M1), compute curated (M2 + M3), and run C13 + C14:
uv run python -m ym_datalake.synthetic_data generate --out ./tmp --seed 42 --validate
uv run python -m ym_datalake.etl compute --in ./tmp --out ./tmp --validate

# Standalone validate re-runs C13 only (C14 needs the in-memory M3 tables):
uv run python -m ym_datalake.etl validate --dir ./tmp

# Compute-and-upload curated/ (M2 + M3) to S3:
uv run python -m ym_datalake.etl compute --in ./tmp --out ./tmp --upload --bucket <bucket>
```

Query the M3 tables through the deployed Athena Lambda (only the `sql` changes):

```bash
# fact_anomaly — anomaly count by cause for one vessel (projection prunes to imo_number)
... "sql":"SELECT cause, count(*) AS n FROM fact_anomaly WHERE imo_number='9700006' GROUP BY cause ORDER BY n DESC"

# fact_recommendation — recommended cleaning date + net saving per vessel
... "sql":"SELECT imo_number, recommended_clean_date, trigger_eta, net_saving_usd FROM fact_recommendation WHERE imo_number='9700006'"

# fact_maintenance_recommendation — next due actions across the fleet planner
... "sql":"SELECT imo_number, action_type, priority, due_date, plan_date, plan_service_type FROM fact_maintenance_recommendation ORDER BY due_date LIMIT 5"

# fact_alert — open alert episodes for one vessel
... "sql":"SELECT cause, severity, opened_date, last_seen_date, message_en FROM fact_alert WHERE imo_number='9700006' ORDER BY last_seen_date DESC"
```
