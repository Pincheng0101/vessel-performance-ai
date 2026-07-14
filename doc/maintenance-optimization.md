# Maintenance Optimization — when does a ship get serviced, and why that date?

*Context: the maintenance planner. Everything here is `ym_datalake/etl/curated/recommendation.py`,
which builds `fact_recommendation` (one row per ship — the optimal hull-cleaning interval) and
`fact_maintenance_recommendation` (one row per ship × due action, batched into service windows).*

> **Not to be confused with `optimize.py`.** This repo has two things called "optimization" and
> they are unrelated. `optimize.py` answers *how fast should this ship sail* — it sweeps the
> reference curve for the `usd_per_nm` minimum and writes `fact_speed_profile`
> ([`curated-dataset.md`](curated-dataset.md#optimizepy--the-economical-speed)). This doc answers
> *when should this ship be serviced*. Different question, different table, different tab.

---

## The one-line answer

Only **hull cleaning** is genuinely optimized, and it is a closed-form convex minimum — no solver,
no search, one square root. The other four actions are **threshold-crossing forecasts**: fit a
robust trend to a degradation series, extrapolate to a fixed threshold, and call that the due date.
Nothing is being minimized there. The final batching step is **greedy proximity**, not a
cost-minimizing schedule.

So of the five actions, one is an optimum and four are predictions. Worth knowing before you read
the derivation.

---

## The hull-cleaning optimum

Fouling makes the daily excess fuel cost climb roughly linearly through a cycle:

```
c(t) = α + β·t          α = USD/day at a clean hull, β = USD/day of extra cost per day of fouling
```

A cleaning costs a fixed `K` and resets `t` to 0. Over a cycle of length `T` you pay `K` once and
integrate the fuel penalty, so the **average cost rate** over the cycle is:

```
J(T) = K/T + α + β·T/2
```

Clean sooner and the `K/T` term dominates — you pay for the cleanings. Clean later and the `β·T/2`
term dominates — you pay for the fuel. `J` is convex in `T`, so the balance point is where the
derivative vanishes:

```
dJ/dT = −K/T² + β/2 = 0    →    T* = √(2K / β)
```

This is the classic **EOQ / age-replacement** shape: a fixed cost amortized against a linearly
growing running cost. The recommended date is then simply

```
recommended_clean_day = last_cleaning_day + round(T*)
```

`recommendation.py:117` (`t_star`) and `:134` (the date). `last_cleaning_day` is the most recent
`UWC`/`DD` reset on or before the ship's last day of data, defaulting to the first day of the
series if the ship has never been cleaned (`:79`).

---

## Where `K` and `β` come from

The formula is only as good as its two inputs, and neither is a physical constant.

### `K` — the full cost of a cleaning

`K = _full_cost('UWC')` = **cash + downtime valued at a day rate** (`recommendation.py:59-60`):

| Event | Cash (USD) | Downtime (h) | Downtime @ $1,000/h | Full cost |
|---|---:|---:|---:|---:|
| `UWC` underwater cleaning | 90,000 | 18 | 18,000 | **108,000** |
| `PP` propeller polishing | 30,000 | 8 | 8,000 | 38,000 |
| `DD` dry dock | 1,400,000 | 380 | 380,000 | 1,780,000 |
| `UWI` underwater inspection | 8,000 | 4 | 4,000 | 12,000 |

`recommendation.py:33-35`. **All eight numbers are ESTIMATED** — the code says so on line 32. They
are not sourced from YM's actual invoices.

Only `UWC` feeds `T*` (`:116`), so **`K` = $108,000** everywhere in this doc. The other three rows
are not dead code — `dims.py:96-97,131` uses them to price the maintenance-event dimension — but
they play no part in the optimum.

### `β` — how fast fouling is costing money

`β` is the **Theil–Sen slope of `excess_cost_usd` against days-since-reset**, in USD/day/day
(`recommendation.py:108`). It is fitted **only on the open cycle** — every valid day since the last
`UWC`/`DD` reset (`:83-90`).

Open-cycle-only is the subtlest call in the module, and it is the right one. A ship's full history
contains several fouling cycles, each sawtoothed by a cleaning that dropped the cost back to `α`.
Fit across all of them and the slope is an average of fouling rates the ship *used to* have — rates
that were already paid for and reset. The open cycle is the only one whose fouling is **still being
paid for**, and therefore the only one whose slope tells you what waiting another day actually
costs. It is also the cycle whose hull the recommendation applies to.

### `excess_cost_usd`, traced back to physics

So that `β` is not a black box, the series it is fitted to:

1. **Speed loss.** The ISO-15016-corrected delivered power is inverted through the ship's clean-hull
   reference curve to get `V_expected`; speed loss is the shortfall of measured STW against it —
   `speed_loss = (V_expected − STW) / V_expected × 100` (`daily.py:127-131`). See
   [`iso-19030.md`](iso-19030.md).
2. **Excess fuel.** At the same power a fouled hull makes `(1−s)` of its clean speed, so covering the
   same distance costs `1/(1−s)^n` of the clean fuel. The excess, once the clean burn is taken out:

   ```
   excess_foc = ME_FOC × [1 − (1−s)^n]        s = speed_loss_pct / 100
   ```

   `physics.py:140-150`; `n` is the ship's own speed–power curve exponent.
3. **Excess cost.** `excess_cost_usd = excess_foc × the day's bunker price for the fuel actually
   burned` (`daily.py:139-142`).

So `β` is a **USD-denominated slope resting on real physics and real bunker prices** — which is why
hull cleaning is the one action with an economic optimum behind it, and the four below are not.

### The gate

A cycle needs **≥ 30 valid points** with both `excess_cost_usd` and `speed_loss_pct`
(`MIN_CYCLE_POINTS`, `recommendation.py:37`, `:103`), and the fitted `β` must be **positive** —
a hull that is getting *cheaper* has no optimum to find (`:110`). Fail either and the row comes
back `status='insufficient_history'` with every number null.

In the current demo fixtures that is **9 `ok` / 6 `insufficient_history`** across the 15 ships. A
ship cleaned recently simply has not accumulated 30 days of open cycle yet; this is a data
condition, not a failure.

---

## `net_saving_usd` — what "optimal" is scored against

`T*` alone does not tell you what it is worth. The counterfactual the code prices is: **clean at
`T*`, versus run the hull until it trips the 8 % speed-loss maintenance trigger** (`MT_TRIGGER_PCT`,
`indicators.py:41`). The trigger ETA is a Theil–Sen crossing of the speed-loss series (`:118`).

The saving is the area between the actual cost rate `c(t)` and the optimal average rate `J(T*)`,
over the days you would have spent past the optimum (`recommendation.py:121-128`):

```
J*        = K/T* + α + β·T*/2                      the optimal average rate
mean_cost = α + β·(T* + T_trigger)/2               mean rate over [T*, T_trigger]
net_saving = (mean_cost − J*) × (T_trigger − T*)
```

Note that **`α` cancels** — expand it and `net_saving = (β·T_trigger/2 − K/T*) × (T_trigger − T*)`.
The clean-hull baseline burn is a cost you pay either way, so it correctly drops out; only the
fouling slope and the cleaning cost survive.

**A null here is not a failure.** If the trigger lands *before* `T*` (`trigger_offset <= t_star`,
`:124`), there is no window of over-running to save anything in, and `net_saving_usd` is null by
design. Likewise if the speed-loss trend is flat or falling, `crossing_day` returns `None` and there
is no trigger ETA at all.

---

## The other four actions

These are forecasts, not optimizations. Each fits a Theil–Sen trend to one degradation series and
extrapolates to a fixed threshold; the crossing day is the due date (`trends.crossing_day`,
`trends.py:29-38`).

| Action | Threshold | Source series | Where the threshold comes from |
|---|---:|---|---|
| `propeller_polishing` | 300 µm | UWI propeller roughness | legacy's value, on **synthesized** roughness |
| `propeller_repair` | 430 µm | UWI propeller roughness | legacy's value, on **synthesized** roughness |
| `coating_renewal` | 45 % | UWI coating breakdown | legacy's value, on **synthesized** breakdown |
| `engine_inspection` | 5 % | SFOC drift vs. the ship's own early-history baseline | `_SFOC_DRIFT_TRIGGER_PCT` |

`recommendation.py:43-49`, `:56`. Three notes:

- **Engine inspection is the exception — there is no forecast.** The baseline is the median of the
  earliest third of the ship's SFOC history; if the trailing 14-day mean is ≥ 5 % above it, the
  action fires with a flat **90-day** due date (`:301-324`). Nothing is extrapolated; it is a
  "this is already drifting, go look at it" flag.
- **Overdue items are pushed forward, never backwards.** If a threshold has already been crossed,
  the due date would land in the past, which is useless to a planner. Hull cleaning falls back to
  the trigger ETA (`:208-210`); the propeller/coating actions fall back to a fixed horizon
  (`:251`, `:283`); and every action is finally clamped with `max(due, last_day)`. A forecast more
  than `FORECAST_HORIZON_DAYS` = 365 out is dropped entirely (`:252`, `:282`).
- **Priority is *only* horizon** — not cost, not severity, not how far past the threshold the ship
  already is (`_priority`, `:151-157`, `PRIORITY_HORIZON_DAYS`, `:55`):

  | Days until due (`due_day − last_day`) | Priority |
  |---|---|
  | ≤ 30 | `high` |
  | ≤ 90 | `medium` |
  | otherwise | `low` |

  A $3.7M hull cleaning due in 200 days is `low`; a $0 engine inspection due in 20 days is `high`.

---

## Why Theil–Sen and not OLS

Every trend in this layer — `β`, all four crossing forecasts — is a **Theil–Sen** slope: the median
of all pairwise slopes (`trends.py:13-26`). It tolerates ~29 % contaminated points before the
estimate breaks down, whereas a single sensor spike will visibly drag an OLS fit, and this data has
plenty of spikes. Full rationale in
[`curated-dataset.md`](curated-dataset.md#trendspy--why-theil-sen).

---

## Batching into service windows

A ship does not make five separate trips to have five things done. `_plan` (`recommendation.py:330-362`)
collapses the scattered due dates into shared windows:

1. Split the actions into **dry-dock** (`coating_renewal`, `propeller_repair` — `DRY_DOCK_ACTIONS`,
   `:50`) and **in-water** (everything else).
2. If any dry-dock action exists, it **anchors** a window at the *earliest* dry-dock due date. All
   dry-dock actions join it.
3. Each in-water action **folds into that window** if its due date is within **±60 days** of the
   anchor (`BATCH_WINDOW_DAYS`, `:53`) — it is worth pulling a hull cleaning forward a month rather
   than sending the ship out twice.
4. Whatever in-water actions are left **batch among themselves**, anchored at the earliest of them,
   as an `in_water` window.

Every row then carries `plan_day` / `plan_date` / `plan_service_type`, which is exactly what
`DashboardMaintenancePlanner.vue` groups the flat rows by to render "the next time this ship goes
in".

**This is proximity-greedy, not cost-minimizing.** Step 3 asks only "is this within 60 days of the
anchor" — never "does the fuel I burn by cleaning 60 days early cost more than a second trip". The
60 is a stipulated reach, not a derived break-even.

---

## Worked example — S9

Read straight out of the demo fixtures (`web/public/demo/fact_recommendation.json`,
`fact_maintenance_recommendation__S9.json`). S9's last day of data is **day 1464 (2025-07-04)**.

**1. Fit the open cycle.** S9 was last cleaned on **day 1152 (2024-08-26)**. Over the 312 days
since, Theil–Sen on `excess_cost_usd` gives **β ≈ 15.65 USD/day/day** — every extra day of fouling
adds about $15.65 to the daily fuel bill. (The speed-loss slope, reported as
`fouling_rate_pct_per_day`, is **0.0306 %/day**.)

**2. Solve for the optimum.** With `K` = $108,000:

```
T* = √(2 × 108,000 / 15.65) = 117.5 days                    → t_star_days = 117.4752
recommended_clean_day = 1152 + round(117.5) = 1269          → 2024-12-21
```

**3. Notice it is already in the past.** Day 1269 is **195 days before** the last day of data — the
optimum for this cycle was missed. The 8 % trigger ETA is day **1443 (2025-06-13)**, also past. So
the overdue fallback fires (`:208-210`): the due date becomes the trigger, then `max(due, last_day)`
clamps it to **day 1464 — today**. Horizon 0 days ⇒ priority **`high`**. S9 wants cleaning now.

**4. Price the delay.** The trigger sits `T_trigger` = 1443 − 1152 = **291 days** into the cycle, so
cleaning at `T*` rather than running to it is worth (using the `α`-free form from above):

```
net_saving = (β·T_trigger/2 − K/T*) × (T_trigger − T*)
           = (15.65 × 291/2 − 108,000 / 117.5) × (291 − 117.5)
           ≈ $235,643                                       → net_saving_usd = 235,642.79
```

**5. The second action.** S9's latest UWI puts coating breakdown at **33.05 %** against the 45 %
threshold — not there yet, but the Theil–Sen crossing lands on day **1501 (2025-08-10)**. Horizon
37 days ⇒ priority **`medium`**.

**6. Batch.** `coating_renewal` is a dry-dock action, so it anchors a window at day **1501**. The
hull cleaning is in-water and due day 1464 — `|1464 − 1501| = 37 ≤ 60`, so it **folds into the
dry-dock window** rather than making its own trip.

**Both rows therefore land on `plan_day = 1501`, `plan_service_type = 'dry_dock'`** — one visit on
2025-08-10, hull and coating done together. That is the bar in the planner Gantt, and the $235,643
is what ranks S9 in the backlog.

---

## Limits — read these before quoting any number

**1. The batching is greedy.** `_plan` never evaluates the trade it is implicitly making. Pulling
S9's hull cleaning 37 days early burns real fouling cost that is never compared against the cost of
a separate in-water trip. A true optimizer would price both and pick; this one checks a 60-day
window and stops.

**2. There is no fleet-level constraint whatsoever.** Every ship is planned in complete isolation.
No yard capacity, no "not two ships in dry dock at once", no interaction with the voyage schedule,
no budget ceiling per quarter. If all 15 ships want a dry dock in the same week, all 15 rows will
say so. The planner tab is a **backlog**, not a schedule you can execute against.

**3. Only hull cleaning rests on modeled physics.** Its `β` comes from ISO-corrected speed loss,
real fuel burn and real bunker prices. The propeller (300/430 µm) and coating (45 %) thresholds are,
in the code's own words, *legacy's* values keyed off **synthesized** roughness and breakdown
(`recommendation.py:41-42`) — the underlying UWI readings do not exist in the source data and were
generated. And `T*` / `net_saving_usd`, though physics-derived, are **USD-derived** and therefore
inherit every estimated cost constant in the table above.

None of these are bugs; all are documented positions. But do not put `net_saving_usd` in front of a
customer as a fact — it is an estimate resting on an estimate, exactly as
[`curated-dataset.md`](curated-dataset.md#recommendationpy--when-to-clean) already warns.

---

## Where it surfaces

**Tables.** `fact_recommendation` — one row per ship, the `T*` result and its status.
`fact_maintenance_recommendation` — one row per ship × action (19 rows in the current fixtures: 9
`hull_cleaning`, 5 `coating_renewal`, 3 `engine_inspection`, 2 `propeller_polishing`; no ship
currently trips the 430 µm `propeller_repair` threshold), rangeable on `due_day`. Both are served
by the async query API — params in [`api.md`](api.md), full column dictionary in
[`schema.md`](schema.md).

**Dashboard.** The 維修規劃 planner tab (`web/app/components/DashboardMaintenancePlanner.vue`)
groups the flat action rows by `plan_day` / `plan_service_type` into a per-ship Gantt of service
windows, charts net saving by quarter stacked by service type, and ranks the open actions into a
saving-sorted backlog. Note that the rows carry an action's *saving* but not its *cost*, so the tab
answers "what will this earn back", not "what will this cost" — there is no ROI ratio to compute,
and non-economic actions such as `engine_inspection` carry no saving at all.

---

## See also

- [`curated-dataset.md`](curated-dataset.md#recommendationpy--when-to-clean) — the in-DAG summary of
  this module, and its neighbours.
- [`iso-19030.md`](iso-19030.md) — where `speed_loss_pct`, and therefore `β`, comes from.
- [`synthetic-dataset.md`](synthetic-dataset.md) — what "synthesized roughness" actually means.
- [`schema.md`](schema.md) — every column of both tables.
