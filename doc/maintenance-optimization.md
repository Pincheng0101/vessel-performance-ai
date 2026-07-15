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
no search, one square root. Three of the other four actions are **threshold-crossing forecasts**:
fit a robust trend to a degradation series, extrapolate to a fixed threshold, and call that the due
date. Nothing is being minimized there. `propeller_repair` is not even that — damage is *observed*,
not forecast.

The **batching**, though, is a second closed form off the same cost model: an in-water job folds
into a dry dock exactly when `β·u·(v−u) < K` — when the fuel burned waiting for the dock is cheaper
than the trip you would avoid. No solver there either, and no stipulated window.

So of the five actions, one is an optimum, three are predictions and one is an observation; and the
schedule that batches them is priced. Worth knowing before you read the derivation.

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

`recommendation.py:182` (`t_star`) and `:214` (the date). `last_cleaning_day` is the most recent
`UWC`/`DD` reset on or before the ship's last day of data, defaulting to the first day of the
series if the ship has never been cleaned (`:146`).

**`recommended_clean_day` may land in the past**, and for 6 of the 9 modelled ships it does. That is
not an error to be papered over — it is the finding. See `days_overdue` below.

---

## Where `K` and `β` come from

The formula is only as good as its two inputs, and neither is a physical constant.

### `K` — the full cost of a cleaning

`K = full_cost('UWC')` = **cash + downtime valued at a day rate** (`recommendation.py:119-121`):

| Event | Cash (USD) | Downtime (h) | Downtime @ $1,000/h | Full cost |
|---|---:|---:|---:|---:|
| `UWC` underwater cleaning | 90,000 | 18 | 18,000 | **108,000** |
| `PP` propeller polishing | 30,000 | 8 | 8,000 | 38,000 |
| `DD` dry dock | 1,400,000 | 380 | 380,000 | 1,780,000 |
| `UWI` underwater inspection | 8,000 | 4 | 4,000 | 12,000 |

`recommendation.py:71-73`. **All eight numbers are ESTIMATED** — the code says so on line 70. They
are not sourced from YM's actual invoices.

Only `UWC` feeds `T*` (`:181`), so **`K` = $108,000** in the optimum. But all four rows now do real
work: they are what the batching break-even and `action_cost_usd` are priced in, and `dims.py` uses
them for the maintenance-event dimension.

### `β` — how fast fouling is costing money

`β` is the **Theil–Sen slope of `excess_cost_usd` against days-since-reset**, in USD/day/day
(`recommendation.py:173`), and it is published as `cost_slope_usd_per_day2`. It is fitted **only on
the open cycle** — every valid day since the last `UWC`/`DD` reset (`:148-155`).

It is the module's central quantity: `T*`, the priority, the batching break-even and both saving
columns are all functions of it.

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
(`MIN_CYCLE_POINTS`, `recommendation.py:75`, `:169`), and the fitted `β` must be **positive** —
a hull that is getting *cheaper* has no optimum to find (`:175`). Fail either and the row comes back
`status='insufficient_history'` with the economics null — but `fouling_rate_pct_per_day` still
reported, because that is a *measurement* and a flat cost slope does not un-measure the hull.

In the current demo fixtures that is **9 `ok` / 6 `insufficient_history`** across the 15 ships. A
ship cleaned recently simply has not accumulated 30 days of open cycle yet; this is a data
condition, not a failure.

---

## `net_saving_usd` — what "optimal" is scored against

`T*` alone does not tell you what it is worth. The counterfactual the code prices is: **clean at
`T*`, versus run the hull until it trips the 8 % speed-loss maintenance trigger** (`MT_TRIGGER_PCT`,
`indicators.py:41`). The trigger ETA is a Theil–Sen crossing of the speed-loss series (`:118`).

The saving is the area between the actual cost rate `c(t)` and the optimal average rate `J(T*)`,
over the days you would have spent past the optimum (`recommendation.py:196-211`):

```
J*        = K/T* + α + β·T*/2                      the optimal average rate
mean_cost = α + β·(T* + T_end)/2                   mean rate over [T*, T_end]
net_saving = (mean_cost − J*) × (T_end − T*)       T_end − T* = saving_horizon_days
```

Note that **`α` cancels** — expand it and `net_saving = (β·T_end/2 − K/T*) × (T_end − T*)`. The
clean-hull baseline burn is a cost you pay either way, so it correctly drops out; only the fouling
slope and the cleaning cost survive.

### The span is capped — and why that matters

`T_end` is **not** simply the trigger. It is

```
T_end = min(T_trigger, days_fouled_today + FORECAST_HORIZON_DAYS)      (:205)
```

Uncapped, this column priced counterfactuals years past the last day of any data. S1's 8 % trigger
sits **1,968 days** into its cycle — 3.1 years beyond its last observed day — and that extrapolation
*was* its $3.75M headline. The incentive it created was perverse: the flatter the hull, the later
the trigger, the **bigger** the "saving".

The cap is the same `FORECAST_HORIZON_DAYS` = 365 bound the propeller and coating forecasts already
respected, so this removes an inconsistency rather than adding a constant. `saving_horizon_days`
publishes the span, so the number says what it is priced over. Fleet-wide the effect is real and
intended: **~$13.7M → ~$10.5M**. S1 alone drops **$3,750,295 → $1,129,854**, of which 759 days were
pure extrapolation.

**`trigger_eta_day` itself is NOT capped.** It forecasts a physical event and `alerts.py:161` consumes
it as one; truncating a forecast so a valuation looks better would make the column lie.

### `saving_if_cleaned_now_usd` — the prospective number

`net_saving_usd` is *retrospective*: it prices a counterfactual against a trigger that, for an
overdue ship, is a date nobody intends to reach. The question a planner actually asks is "is it worth
cleaning this ship **now**?", and that is a different number (`:222`):

```
saving_if_cleaned_now = β·u·H − K                  H = FORECAST_HORIZON_DAYS = 365
```

`β·u` is today's excess burn rate, so this is "stop burning that for a year, having paid `K` to do
it". It **may be negative** — for a ship well inside its cycle, cleaning today does not pay — and
that is the honest answer. It is the right column to rank an overdue backlog by.

**A null `net_saving_usd` is not a failure.** If the trigger lands *before* `T*`, there is no window
of over-running to save anything in, and it is null by design. Likewise if the speed-loss trend is
flat or falling, there is no trigger ETA at all.

---

## The other four actions

| Action | Threshold | Source series | Where the threshold comes from |
|---|---:|---|---|
| `propeller_polishing` | 300 µm | UWI propeller roughness | legacy's value, on **synthesized** roughness |
| `propeller_repair` | 430 µm | *not forecast* — see below | legacy's value, on **synthesized** roughness |
| `coating_renewal` | 45 % | UWI coating breakdown | legacy's value, on **synthesized** breakdown |
| `engine_inspection` | 5 % | SFOC drift vs. the ship's own early-history baseline | `_SFOC_DRIFT_TRIGGER_PCT` |

`recommendation.py:81-87`, `:110`. Four notes:

### The forecasts are fitted in *clock* space, never against absolute day

A propeller does not roughen from the day the ship was built; it roughens from the **last polish**.
Fitting roughness against the absolute day therefore draws one straight line through every polish in
the record — a trend across a series of resets, which is not a trend at all. It fitted noise: 9 of
the 15 ships came out with a **negative** roughness slope.

So the x-axis is `days_since_polish` (roughness) / `days_since_dry_dock` (coating), read off the same
`uwi` row as the value it explains, and the fit is **anchored** on the value a reset leaves behind —
a freshly polished propeller *is* ~150 µm (`_degradation_fit`, `:236-263`). The origin is physics, not
a parameter to spend a data point on, which matters because two ships have exactly one inspection
since their last polish and a free-intercept fit simply returns nothing for them.

A free Theil–Sen fit is used **only** where the record holds no reset at all for that signal — the
five ships that have never dry-docked have no coating origin, so it has to be estimated.

Anchoring also makes the outputs consistent *by construction*: `current = R₀ + g·t` and
`eta = cycle_start + (threshold − R₀)/g` are the same line, so `current ≥ threshold` and `eta ≤ today`
are the **same statement**. The alternative — two independent fits — could and did disagree, emitting
a `high`-priority action for a propeller whose own reading sat 26 % *below* its threshold.

### `current_value` is the fit at today's clock, not the last reading

**31 of the 43 UWI atoms come from the source's composite `UWI+PP` rows**, so most roughness readings
in this dataset are the **pre-polish state that justified the polish**. Quoting the latest inspection
as "current" therefore reports the roughness of a propeller that has since been cleaned — which is
what produced S12's phantom: last inspected on day 1572 reading 310.9 µm, *polished on day 1644*, and
still emitting a `high` `propeller_polishing` on day 1825. The latest inspection now survives only as
the grade quoted in `rationale`.

### `propeller_repair` is not forecast at all

A polish resets the clock, so extrapolating a roughness line **through** a polish until it reaches
430 µm draws a trend across a reset. It is not physics. Repair is emitted on evidence that is true
*today*: the level (`current ≥ 430`), the real damage grade (`Poor`), or observed `cavitation_found`
(`:404-434`). Its `trigger_eta_day` is null, and that is deliberate.

### Engine inspection has no forecast either

The baseline is the median of the earliest third of the ship's SFOC history; if the trailing 14-day
mean is ≥ 5 % above it, the action fires with a flat **90-day** due date (`:465-490`). Nothing is
extrapolated; it is a "this is already drifting, go look at it" flag. Its `degradation_rate` is fitted
on the **trailing year**, not the whole ~1,800-day record — every other action fits the window it is
*about*, and it pairs with the 14-day trailing `current_value` the drift is measured from.

### Priority is horizon, plus one rule

`_priority` (`:265-280`, `PRIORITY_HORIZON_DAYS`, `:109`):

| Condition | Priority |
|---|---|
| `days_overdue > 0` | `high` |
| `due_day − last_day` ≤ 30 | `high` |
| ≤ 90 | `medium` |
| otherwise | `low` |

The overdue rule is **redundant by construction** — an overdue action's `due_day` is clamped to today,
so its horizon is 0 and it lands in `high` anyway. It is spelled out so the invariant is directly
assertable and cannot silently regress, which is exactly what it did before (see `days_overdue`).

Note what priority still is *not*: it is not cost and not severity. A $1.1M hull cleaning due in 200
days is `low`; a $0 engine inspection due in 20 days is `high`.

### `days_overdue` — the bug that inverted the backlog

If a threshold or optimum has already been crossed, the due date would land in the past, which is
useless to a planner. Every action is therefore clamped with `max(due, last_day)`: **an overdue action
is due today**.

That clamp used to be preceded by a fallback that pushed an overdue hull cleaning out to its *trigger
ETA* instead. The result inverted the backlog. S1's optimum was day 1267 and today is 1825 — **558 days
overdue** — so its due date was reset to the trigger on day 2949, a horizon of 1,124 days, which lands
in the `low` band. **The fleet's most overdue ship, carrying its largest saving, sorted to the bottom
of the planner.** Past `T*` every further day costs `β·u` and there is nothing left to defer to; the
first day you can actually clean is the only defensible answer. The fix was a deletion.

A forecast more than `FORECAST_HORIZON_DAYS` = 365 out is still dropped entirely.

---

## Why Theil–Sen and not OLS

Every trend in this layer — `β`, all four crossing forecasts — is a **Theil–Sen** slope: the median
of all pairwise slopes (`trends.py:13-26`). It tolerates ~29 % contaminated points before the
estimate breaks down, whereas a single sensor spike will visibly drag an OLS fit, and this data has
plenty of spikes. Full rationale in
[`curated-dataset.md`](curated-dataset.md#trendspy--why-theil-sen).

---

## Batching into service windows — the second closed form

A ship does not make five separate trips to have five things done. `_plan` (`recommendation.py:577-613`)
collapses the scattered due dates into shared windows:

1. Split the actions into **dry-dock** (`coating_renewal`, `propeller_repair` — `DRY_DOCK_ACTIONS`,
   `:88`) and **in-water** (everything else).
2. If any dry-dock action exists, it **anchors** a window at the *earliest* dry-dock due date. All
   dry-dock actions join it.
3. Each in-water action folds into that window **iff the cost model says folding is cheaper than its
   own trip** (`_folds_into_dock`, `:519-535`).
4. Whatever in-water actions are left **batch among themselves**, anchored at the earliest of them,
   as an `in_water` window.

### The break-even

A dry dock resets the hull anyway (`DD ∈ HULL_RESETS`), so folding into one is marginally free — but
*waiting* for the dock burns fuel. Price both sides. With `u` the day we would otherwise act and `v`
the dock, both in cycle-time from the last cleaning:

```
A (own trip at u, free reset at v)  =  K + α·(v−u) + β·(v−u)²/2
B (defer to v)                      =      α·(v−u) + β·(v²−u²)/2
B − A                               =  β·u·(v−u) − K
```

`α` and the quadratic **cancel exactly**, leaving:

> **Fold iff `β·u·(v−u) < K`.**

`β·u` is literally today's excess burn rate, so the rule reads: *the extra fuel burned while waiting
is cheaper than the trip you would avoid.*

**`u = due_day − last_cleaning_day`**, which — after the overdue fix above — is `max(T*, days fouled
today)`. It is emphatically **not** `T*`. At `u = T*` the rule reduces to the tidy `v − T* < T*/2`,
but *you cannot clean in the past* and 6 of the 9 modelled ships are already past their `T*`: their
entire `T*/2` fold window lies in history, so a `T*`-anchored rule could never fold anything. The
overdue fix and the batching rule share one number, and that is not a coincidence.

The asymmetry is principled on both sides:

- **`v ≤ due_day` → always fold, no distance limit.** The trip is happening anyway and no threshold is
  crossed, so doing the job early is never worse. (The old rule's backward `±60`-day reach was never
  needed.)
- **`v > due_day` → the break-even above.**

### `K` is the trip avoided, not "the action's cost"

This is what makes the rule fall out rather than needing special cases. An `engine_inspection` needs
**no trip** — no yard, no divers — so folding it saves **$0**, and no non-negative deferral can ever
be worth that. It therefore never defers, without a constant anywhere.

The one real gap is `propeller_polishing`: there is **no USD-per-micron coefficient** in this dataset,
and inventing one would be inventing physics. So its deferral cannot be priced, and the module's
position is **never defer what you cannot price** — expressed as a visible `UNPRICED_SLIP_DAYS = 0`
knob (`:107`). It may still be pulled *forward* onto a dock for free. (Explicitly rejected: scaling
the hull's window by a cost ratio, which would assert that a fouling propeller costs the same $/day
as a fouling hull.)

The leftover in-water batch (step 4) anchors at `min(due_day)`, so `plan_day ≤ due_day` for every
member — it is already free-ride-only and needs no break-even of its own. **The break-even is needed
in exactly one place**: does an in-water action fold into the dry-dock window?

Every row then carries `plan_day` / `plan_date` / `plan_service_type` / `window_id`, which is what
`DashboardMaintenancePlanner.vue` groups the flat rows by to render "the next time this ship goes in".

---

## What a window costs — and the double-count guard

`propeller_repair` and `coating_renewal` **both** require a dry dock. Summing their costs naively
would bill **$3.56M for one $1.78M trip**. So the costing is marginal (`_charge`, `:550-574`):

- **`action_cost_usd`** — each distinct event a window requires is charged to **exactly one** action
  (the earliest due); every other action in that window gets `0.0`. A dry-dock window charges
  `full_cost('DD')` **once**, and a hull cleaning folded into it is **genuinely free** — which is
  precisely why it folded. This column is therefore **safe to sum at every level**: row, window, ship,
  fleet.
- **`window_cost_usd` / `window_id`** — the whole trip, repeated on every row of the window. Dedupe on
  `window_id` before summing *this* one.

ROI is then two naive sums: `Σ net_saving_usd / Σ action_cost_usd`.

*Stated limit*: an in-water window sums its distinct event costs, which is an **upper bound** —
`EVENT_COST_USD` has no notion of a diver mobilisation shared between a cleaning and a polish.

---

## Worked example — S9

Read straight out of the fixtures. S9's last day of data is **day 1464 (2025-07-04)**, and it is one
of the five ships that has **never dry-docked**.

**1. Fit the open cycle.** S9 was last cleaned on **day 1152 (2024-08-26)**. Over the 312 days since,
Theil–Sen on `excess_cost_usd` gives **β = 15.65 USD/day/day** (`cost_slope_usd_per_day2`) — every
extra day of fouling adds about $15.65 to the daily fuel bill. (The speed-loss slope, reported as
`fouling_rate_pct_per_day`, is **0.0306 %/day**.)

**2. Solve for the optimum.** With `K` = $108,000:

```
T* = √(2 × 108,000 / 15.65) = 117.5 days                    → t_star_days = 117.4752
recommended_clean_day = 1152 + round(117.5) = 1269          → 2024-12-21
```

**3. It is already in the past.** Day 1269 is **195 days before** the last day of data:
`days_overdue = 195`. The due date is therefore clamped to **day 1464 — today** — and *not* pushed out
to the trigger ETA, which is what used to happen. Horizon 0 ⇒ priority **`high`**. S9 wants cleaning
now, and `saving_if_cleaned_now_usd` = **$1,674,414** says what that is worth over the next year.

**4. Price the missed optimum.** The trigger sits `T_trigger` = 1443 − 1152 = **291 days** into the
cycle — inside the 365-day horizon, so **no cap binds here** and the retrospective number is unchanged:

```
net_saving = (β·T_end/2 − K/T*) × (T_end − T*)
           = (15.65 × 291/2 − 108,000 / 117.5) × (291 − 117.5)
           ≈ $235,643                                       → net_saving_usd = 235,642.79
                                                              saving_horizon_days = 173.52
```

**5. The propeller.** S9 has been polished, so its roughness is fitted **anchored on the 150 µm a
polish leaves behind**, in clock space. Rate **0.606 µm/day**; today it is **315 days** past that
polish, so `current_value` = 150 + 0.606 × 315 = **340.9 µm** — past the 300 µm threshold, hence
`propeller_polishing`, priority **`high`**, due day 1494.

**6. The coating.** S9 has *no dry dock in the record at all*, so there is no coating origin to anchor
on and the fit falls back to free Theil–Sen on the censored clock — the one case where that is the
right thing to do. At 1,464 days since the (unobserved) coating, `current_value` = **52.7 %**, already
past the 45 % threshold. `coating_renewal` fires, due day **1554 (2025-10-02)**, priority `medium`.

**7. Batch — and this is where it flips.** `coating_renewal` is a dry-dock action, so it anchors a
window at day **1554**. Should the hull cleaning fold into it?

```
u    = due_day − last_cleaning_day = 1464 − 1152 = 312 days
v−u  = 1554 − 1464                              =  90 days
β·u·(v−u) = 15.65 × 312 × 90 = $439,500    vs    K = $108,000
```

**$439,500 > $108,000 → do not fold.** S9 is burning **β·u = $4,883/day** in excess fuel; an in-water
cleaning pays for itself in **22 days**, so waiting 90 days for the dock to save one $108,000 trip
would burn four times that trip's cost in fuel. **S9 makes its own in-water trip, today.**

The old `|1464 − 1554| ≤ 60`-style proximity rule had no way to see any of that.

The `propeller_polishing` (due 1494) does not fold either — its deferral cannot be priced, and
`UNPRICED_SLIP_DAYS = 0` — but it *does* join the hull's in-water window, since both are in-water and
that window anchors at the earliest due date among them.

**So S9 gets two windows:**

| Window | Day | Actions | `action_cost_usd` | `window_cost_usd` |
|---|---|---|---:|---:|
| `W-S9-1464-in_water` | 1464 (2025-07-04) | `hull_cleaning` | 108,000 (UWC) | 146,000 |
| | | `propeller_polishing` | 38,000 (PP) | 146,000 |
| `W-S9-1554-dry_dock` | 1554 (2025-10-02) | `coating_renewal` | 1,780,000 (DD) | 1,780,000 |

Diver out now for the hull and propeller; dock in October for the coating. That is two bars in the
planner Gantt, not one.

---

## Limits — read these before quoting any number

**1. We still cannot price a propeller deferral.** The batching break-even is derived, not stipulated
— but it can only be *applied* to an action whose delay has a USD/day. The hull has one (`β·u`). A
propeller does not: there is no USD-per-micron coefficient anywhere in this dataset, and inventing one
would be inventing physics. So `propeller_polishing` is governed by a **policy** (`UNPRICED_SLIP_DAYS
= 0` — never defer what you cannot price), not by an optimum. That is the honest residual, and it is
one knob rather than a hidden assumption.

**2. There is no fleet-level constraint whatsoever.** Every ship is planned in complete isolation.
No yard capacity, no "not two ships in dry dock at once", no interaction with the voyage schedule,
no budget ceiling per quarter. If all 15 ships want a dry dock in the same week, all 15 rows will
say so. The planner tab is a **backlog**, not a schedule you can execute against.

**3. Only hull cleaning rests on modeled physics.** Its `β` comes from ISO-corrected speed loss,
real fuel burn and real bunker prices. The propeller (300/430 µm) and coating (45 %) thresholds are,
in the code's own words, *legacy's* values keyed off **synthesized** roughness and breakdown
(`recommendation.py:79-80`) — the underlying UWI readings do not exist in the source data and were
generated. And `T*` / `net_saving_usd` / the batching break-even, though physics-derived, are
**USD-derived** and therefore inherit every estimated cost constant in the table above.

**4. An in-water window's cost is an upper bound.** It sums the distinct event costs of its members,
and `EVENT_COST_USD` has no notion of a diver mobilisation shared between a cleaning and a polish.

None of these are bugs; all are documented positions. But do not put `net_saving_usd` in front of a
customer as a fact — it is an estimate resting on an estimate, exactly as
[`curated-dataset.md`](curated-dataset.md#recommendationpy--when-to-clean) already warns.

---

## Where it surfaces

**Tables.** `fact_recommendation` — one row per ship, the `T*` result and its status (**9 `ok`,
6 `insufficient_history`**). `fact_maintenance_recommendation` — one row per ship × action (**37 rows**
in the current fixtures: 15 `propeller_polishing`, 9 `hull_cleaning`, 8 `coating_renewal`,
3 `engine_inspection`, 2 `propeller_repair`), rangeable on `due_day`. Both are served by the async
query API — params in [`api.md`](api.md), full column dictionary in [`schema.md`](schema.md).

**Dashboard.** The 維修規劃 planner tab (`web/app/components/DashboardMaintenancePlanner.vue`)
groups the flat action rows by `plan_day` / `plan_service_type` into a per-ship Gantt of service
windows, charts net saving by quarter stacked by service type, and ranks the open actions into a
saving-sorted backlog. The rows now carry an action's **cost** as well as its saving, so an ROI ratio
*is* computable — `Σ net_saving_usd / Σ action_cost_usd`, two naive sums, because `action_cost_usd` is
marginal and never double-counts a shared dock. Non-economic actions such as `engine_inspection` still
carry no saving at all.

---

## See also

- [`curated-dataset.md`](curated-dataset.md#recommendationpy--when-to-clean) — the in-DAG summary of
  this module, and its neighbours.
- [`iso-19030.md`](iso-19030.md) — where `speed_loss_pct`, and therefore `β`, comes from.
- [`synthetic-dataset.md`](synthetic-dataset.md) — what "synthesized roughness" actually means.
- [`schema.md`](schema.md) — every column of both tables.
