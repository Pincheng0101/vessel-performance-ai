# The curated dataset

How the three source files become 20 tables — and *why* each step is the way it is. The
non-obvious calls are the value here; the mechanical ones are in the code.

Source of truth: [`ym_datalake/etl/curated/compute.py`](../ym_datalake/etl/curated/compute.py).

---

## The DAG

```
source (3 files, landed VERBATIM)
  ↓
clean            dedupe 344 · clip the impossible · backfill displacement
  ↓
geography        drape a port rotation over each voyage → lat/lon/heading
  ↓
corrections      ISO 15016 — choose the WIND_DIRECTION convention EMPIRICALLY
  ↓
reference_curve  fit the clean-hull curve P = a·V^n·(Δ/Δ_ref)^⅔
  ↓
fuel_price       the synthesized bunker series
  ↓
daily  ─────────────────────────────────────────────  fact_performance_daily  (the spine)
  ├── cii · anomaly · uwi · indicators · recommendation
  └── dims · aggregate · voyages · alerts · optimize
```

Everything below `daily` is a function of `daily`.

### Why there is only one command

`reference_curve` is a **raw** table that sits **downstream of `clean` and `corrections`**.
That looks like a layering mistake. It is the physics.

A clean-hull curve fitted on uncleaned, uncorrected power is a curve that has absorbed the
671,576 kW outliers and the weather — and every speed-loss number derived from it would be
noise. So the curve cannot be fitted until the spine is cleaned, and the spine cannot be
finished until the curve exists to invert. Splitting `load` from `compute` would only mean
computing the same thing twice, which is why the CLI has exactly one subcommand:

```bash
uv run python -m ym_datalake.etl build
```

---

## `clean.py` — the only place real data is mutated

The raw zone is a verbatim passthrough, so all three of the dataset's structural problems
land here, and **nowhere else**.

**Outliers are clipped cell-wise to null, not dropped row-wise.** A row with one impossible
power reading usually has perfectly good weather, distance and fuel columns; throwing the
row away throws those away too. So each cell is tested against the vessel's own particulars
and nulled on its own:

| Cell | Bound |
|---|---|
| `horse_power` | ≤ 1.15 × MCR (47,700 kW) |
| `sfoc` | 120–400 g/kWh |
| `load_pct` | ≤ 115 % |
| `displacement` | 0.5 × design … 1.15 × scantling |
| `me_slip` | −25 … 75 % |
| `me_avg_rpm` | ≤ 1.15 × MCR rpm |
| drafts | ≤ 1.15 × scantling draft |
| `hours_total`, `hours_full_speed` | **clamped** to 24, not nulled |

Hours are clamped rather than nulled because a 42.5-hour "day" is a bookkeeping artefact of
the noon-to-noon window — the day still happened, and nulling it would lose a real report.

**Dedupe** collapses the 344 surplus rows to one row per vessel-day: keep the row with the
most non-null H/T columns (the engine and fuel channels — the ones anything downstream
actually reads), tie-break on the longer `hours_total`.

**Displacement backfill.** `DISPLACEMENT` is 68.5 % filled and every ISO 19030 number needs
it, so it is reconstructed hydrostatically from the drafts:

```
Δ = Δ_design + (mean_draft − design_draft) · 100 · TPC
```

But the design TPC line reads **+3.1 % high** against the rows that carry both a
displacement and a draft, so the offset is **refitted per hull class from the data itself**
(median residual) rather than trusted. Backfilled rows are tagged
`displacement_source = 'backfilled'` and **never pass as measured**.

> Order matters, and the code depends on it: clip first (so an outlier cannot win a dedupe
> tie-break or poison the offset fit), then dedupe, then fit the offset on clipped data,
> then backfill onto the surviving one-row-per-day grain.

Result: 14,193 measured displacements, **6,665 backfilled**, 80 rows with neither (no draft
either).

---

## `filters.py` — the ISO 19030 gate (`valid_flag`)

A speed-loss number is only meaningful on a steady, deep-water, moderate-weather,
full-speed point where the reference curve actually applies. Everything else is noise
wearing a percentage sign. Of 20,938 vessel-days, **4,657 pass**.

The gate: ≥ 22 h at full speed · Beaufort ≤ 4 · deep water · STW ≥ 0.5 × design speed ·
displacement within [0.5, 1.2] × design · not masked · finite positive power and STW.

Two clauses deserve their reasons:

**The deep-water test is live.** `h > 3·√(B·T)` and `h > 2.75·V²/g`. Shallow-water
resistance inflates power and would masquerade as hull fouling. The real dataset carries
`water_depth` on 99.95 % of rows, so unlike the old synthetic lake — which had no depth
column and skipped this filter entirely — this one actually runs.

**Displacement must be *measured*, not backfilled.** `clean` can reconstruct a missing
displacement, and does, 6,665 times. But a speed loss computed on an *estimated*
displacement is not a measurement, and it shows: on clean-hull days the scatter of
`speed_loss_pct` is **4.95 pp on measured displacement and 9.76 pp on backfilled** — the
estimate doubles the noise in the very metric the gate exists to protect. Backfilled rows
still *get* a `speed_loss_pct` (the trend chart needs a continuous line); they just don't
get to be **fitted on**.

**Why range clipping is not enough.** `clean` nulls cells that are impossible on their own.
It cannot catch a cell that is impossible only *in combination*: S4 day 131 reports 17.7 kn
on 2,103 kW, and both numbers are individually in range while the pair is nonsense (that
hull needs ~24,000 kW for 17.7 kn). One such row dragged S4's speed loss to −6.9 pp and
made its real hull cleaning look like *damage*. The Admiralty coefficient `Δ^⅔·V³/P` is the
invariant that catches it — it needs no reference curve, so there is no circularity — and
it is gated to 300–1300 (99 % of the fleet's valid days sit in 425–1100).

---

## `corrections.py` — and the finding {#corrections}

ISO 15016: remove the wind and wave added resistance from measured shaft power, so what is
left is the power the hull would need in flat calm. Blendermann for wind, STAWAVE-1 for
waves.

**The open question.** `WIND_DIRECTION` is a 16-point compass index and the dataset ships
**no heading column**. So is it bow-relative (usable as-is) or a true compass bearing
(needs a heading — and our only heading is the one `geography` invented)? The organizers'
README says "相對/羅經" — relative *or* compass. Genuinely ambiguous.

Guessing would silently decide whether every speed-loss number in the lake is real. So the
module does not guess. `choose_convention()` fits the reference curve under each convention
— plus a **no-correction control** — and scores each on detrended speed-loss scatter: the
spread that remains once the fouling trend the metric is *supposed* to measure has been
removed. Whatever is left is the correction's own error.

**The answer, over 4,657 ISO-valid points:**

| Convention | Detrended speed-loss σ |
|---|---:|
| **`none` (control)** | **4.534 pp** |
| `bow_relative` | 5.009 pp |
| `true_compass` | 5.068 pp |

Read that carefully, because it says something sharper than "bow-relative" or "true
compass":

1. **The two conventions are barely distinguishable, and both are worse than the control.**
   `true_compass` routes the angle through a *fabricated* heading. If `WIND_DIRECTION` were
   really bow-relative, mangling it that way should visibly wreck the result. It barely
   moves it. The direction column carries **almost no information** for this correction
   under either reading.
2. **Correcting is worse than not correcting.** The correction multiplies an uninformative
   direction by an `estimated` windage area, at a Beaufort ≤ 4 gate where the true wind
   effect is already small against the ~15 % scatter in the power channel. It adds ~0.5 pp
   of noise and removes nothing.

**So the ISO 15016 wind/wave correction is decorative on this dataset, and
`power_corrected_kw == horse_power`.** Say that plainly, because a reader will otherwise
assume the opposite from the column's name. It is the **Beaufort ≤ 4 gate**, not a
correction term, that excludes weather here.

The resistances are still computed and stored — they are honest physical estimates, and the
weather cost-attribution channel needs them — but they are **not allowed near the speed
loss**.

> An earlier run of this same test picked `bow_relative`, and it was wrong. Before `filters`
> rejected physically impossible speed/power pairs, the correction was scoring well by
> partially masking rows that should never have been in the sample at all. Fix the filter
> and the apparent benefit evaporates. **A correction that only looks good on dirty data is
> not a correction.**
>
> The verdict is re-derived and printed on **every** build, so it cannot silently rot.

---

## `raw/reference_curve.py` — the clean-hull curve {#reference_curve}

Every ISO 19030 number in the lake hangs off this fit. If it is wrong, `speed_loss_pct` is
noise and so is everything downstream.

```
P = a · V^n · (Δ / Δ_ref)^(2/3)
```

Linear in logs, so `a` and `n` fall out of one least-squares line. Fitted only on points
that are **ISO-valid**, **unmasked**, and inside a **clean window** — the 60 days after the
ship's first record or after a real hull cleaning (`UWC` / `DD`). Note that **`PP` does not
open a window**: polishing the propeller does not clean the hull.

**The fit is partially pooled, and that is the whole design.**

- **`curve_n` (the speed exponent) is pooled** across `(hull_class, propeller_variant)`. It
  is a property of the hull form, and one ship's handful of clean points cannot determine a
  slope.
- **`curve_a` (the scale) is fitted per ship.** Sister ships are not identical, and a fully
  pooled scale bakes each ship's own baseline efficiency into its speed loss as a constant
  offset.

That offset is not cosmetic. Measured against the real cleaning events, a fully-pooled `a`
makes a hull cleaning appear to make the hull **worse** — S4 swings 13 pp the wrong way at
its day-147 `UWC`. A per-ship intercept is cheap (it needs far fewer points than a slope),
and it removes the artefact.

The fitted result:

| Pool | Ships | `curve_n` | Pool points |
|---|---|---:|---:|
| `W1-P1` | S1–S8, S21 | 2.709 | 86 |
| `W2-P2` | S9–S12, S23 | 2.500 | 156 |
| `W2` | S22 | 2.500 | 157 |

**Three honest caveats, all visible in the table's own columns:**

1. **S22's pool is widened.** It is the only W2-P1 ship *and* a masked prediction ship, so
   its own pool is far too thin to fit an exponent (the floor is 30 points). It widens to
   the **W2 hull class** — the hull sets the resistance; the propeller variant only shifts
   pitch. This is recorded in `fit_pool`, never hidden. The module **hard-fails** rather
   than fit a thin pool.
2. **`W2-P2`'s exponent is clamped.** 2.500 is exactly the lower bound of
   `CURVE_N_BOUNDS = (2.5, 4.5)`. The unclamped fit wanted to go lower; the clamp is what
   keeps it physical. Treat W2 speed loss as the softer of the two numbers.
3. **Four ships do not get their own scale.** `curve_a` needs 8 clean-window points;
   **S6 (6), S8 (5), S21 (1) and S22 (1)** fall short and borrow their pool's scale.
   Their speed loss therefore carries the pool's offset. This is visible as
   `n_fit_points` below the floor — check it before trusting a per-ship number on those
   four.

`fit_rmse_pct` (log-space RMSE, as a % of power) runs 6.5–16.7 % across the fleet.

---

## `daily.py` — the spine

`fact_performance_daily`: **20,938 rows, 60 columns**, grain ship × day, **unique** (the
344 duplicates collapsed in `clean`).

One row exists for **every day the ship reported**, including days that fail the ISO gate —
the speed-loss chart needs a continuous calendar, and `valid_flag` is what tells a consumer
which points may be fitted on. ISO-derived columns go **null** rather than guess whenever
the day cannot support them.

The core chain:

```
speed_loss_pct = (v_expected − STW) / v_expected × 100
                  where v_expected = curve⁻¹(power_corrected_kw, displacement)
```

Plus: slip (apparent on SOG, real on STW), Admiralty coefficient, EEOI (null on ballast
days — no cargo to carry), CO₂ from the day's fuel and its carbon factor, and the fouling
penalty:

```
excess_foc_mt = me_foc · [1 − (1 − s)^n]        s = speed_loss / 100
```

At the same power a fouled hull makes `(1−s)` of the clean speed, so covering the same
distance costs `1/(1−s)^n` of the clean fuel; the excess is what's left after the clean burn
is taken out.

**`cum_excess_cost_usd` resets at every hull cleaning.** It answers "what has this fouling
cycle cost me so far", not "what have I ever spent". Same for the three reset clocks —
`days_since_cleaning` (UWC/DD), `days_since_polish` (PP/DD), `days_since_dry_dock` (DD).

**The cost attribution is additive, not a partition.** `excess_cost_fouling_usd` +
`excess_cost_weather_usd` + `excess_cost_operational_usd` **does not equal**
`excess_cost_usd`, and is not meant to. Weather fuel and off-design-load fuel are burned *on
top of* the fouling penalty. Stack all three on a chart and the total exceeds the true
excess. It is an **attribution**, not a decomposition — treat each channel as an
independent estimate of one cause's contribution.

---

## The tables built on the spine

### `cii.py` — carbon intensity

Annual AER per (ship, year), broadcast back onto every daily row of that year. This is the
one place the synthesized calendar is load-bearing rather than cosmetic: the IMO `required`
line steps down per calendar year (Z% = 5/7/9/11 % for 2023–26), so without a year there is
no rating.

Container ships use Capacity = DWT, so AER and full-IMO *attained* coincide; they differ
only in the reference line they're rated against. Note that **`dwt` is an estimate** (see
[`synthetic-dataset.md`](synthetic-dataset.md#6-vessel-particulars)) — so every CII rating
rests on it.

### `anomaly.py` — point anomalies

369 rows. Four channels (`speed_loss`, `slip`, `sfoc`, `excess_foc`), each scored as a
**robust z** (median / MAD) against the ship's own distribution, so a ship that simply runs
hot doesn't flag every day. Flag at |z| ≥ 3.5; the channel with the largest |z| claims the
day and gets the one row.

**Biofouling is deliberately never a point cause.** The cause set is
`{engine_degradation, propeller, weather, sensor}`. A hull that fouls over six months does
not produce an outlier on any single day — it is a *slope*, not a spike. Flagging one would
be a false positive with a plausible story attached. Fouling surfaces in `fact_alert` and
`fact_recommendation`, where slopes are allowed to speak.

Observed causes: `engine_degradation` 292 · `sensor` 49 · `propeller` 28.

> ⚠️ **`weather` never fires, and cannot.** The rule assigns `weather` when
> `wind_scale ≥ 5`, but anomalies are only scored on `valid_flag` rows — and the ISO gate
> already requires Beaufort ≤ 4. The two conditions are mutually exclusive, so the `weather`
> cause is unreachable by construction. It is in the enum; it will never appear in the data.

### `indicators.py` — the four ISO 19030 period indicators

Long format, 87 rows. The meaning of `value` / `reference_value` **depends on the
indicator**:

| Code | Meaning | `value` / `reference_value` | Rows |
|---|---|---|---:|
| `ME` | Maintenance effect at one event (±30 d) | `before − after` / `before` | 38 |
| `ISP` | In-service performance: per-cycle mean speed loss | cycle mean / first cycle's | 34 |
| `MT` | Maintenance trigger: first 8 % trailing-mean crossing | `8.0` / null | 13 |
| `DDP` | Dry-dock performance (±45 d window) | mean after / mean before | **2** |

**Two real constraints of this fleet, both worth knowing before you query it:**

- **`DDP` exists for only 2 ships (S5 and S6)** — not 10. Five ships never dry-dock at all
  (S9–S12, S23), which rules them out immediately. But of the ten that *do*, only two have
  ≥ 3 ISO-valid points on **both** sides of the dry dock. A dry dock takes the ship out of
  service for weeks and the days either side are rarely calm full-speed points. The table
  has nothing to say about the other eight, and says nothing rather than guessing.
- **`ME` covers `PP` (32) and `UWC` (6) only — no `DD` rows at all**, for the same reason.
  `UWI` is excluded by design: an inspection changes nothing, so there is no effect to
  measure.

### `alerts.py` — narration, not detection

222 rows. Runs **no new detection**: it collapses consecutive same-cause `fact_anomaly` days
into episodes (7-day gap tolerance, so one bad week is one alert and not seven), and adds
one biofouling alert per fouling ship from the trend model. Messages are bilingual
(中文 / English) because the dashboard is.

Biofouling *is* a cause here (6 alerts) even though it is never a point-anomaly cause —
this is the layer where slopes get to speak. Its `peak_z` is **null**, because a trend has
no z-score and inventing one would be a lie.

### `recommendation.py` — when to clean

Fouling makes fuel cost rise roughly linearly through a cycle, `c(t) = α + β·t`. Cleaning
costs a fixed `K` and resets `t` to 0. The average cost rate over a cycle of length `T` is
`J(T) = K/T + α + β·T/2`, which is convex, so:

```
T* = √(2K / β)
```

Clean sooner and you pay for the cleanings; clean later and you pay for the fuel. `β` is
fitted with **Theil-Sen** over the *open* cycle (everything since the last hull reset) —
the only cycle whose fouling is still being paid for.

`fact_recommendation` is one row per ship: **10 `ok`, 5 `insufficient_history`** (fewer than
30 valid points in the open cycle). `fact_maintenance_recommendation` broadens this to five
action types — `hull_cleaning` (10), `coating_renewal` (5), `engine_inspection` (3),
`propeller_polishing` (2) — each with a Theil-Sen forecast crossing of its own threshold,
then **batched into shared service windows**: a ship does not make five separate trips to
have five things done.

> `T*`, `net_saving_usd` and the propeller/coating thresholds are all **estimated** —
> `T*` is USD-derived, and the roughness it keys off is synthesized.

### `trends.py` — why Theil-Sen

Ordinary least squares is the wrong tool here: one sensor spike drags the slope, and this
data has plenty. Every forecast in the lake uses a **Theil-Sen** slope (the median of all
pairwise slopes), which shrugs off up to ~29 % contaminated points. It is O(n²), which is
fine — the longest series is one ship's ~1,800 days, and it runs once.

### `voyages.py` — the energy balance is exact

300 rows, one per (ship, voyage). A `VOYAGE` here is a **rotation**, not a port-to-port leg:
median 68 sea-days over an 84-day span, median 18,389 nm, longest 82,881 nm.

**`distance_nm`, `total_foc_mt` and `co2_mt` are plain sums of the real daily values** —
never re-derived from speed or power. So `sum(fact_voyage.total_foc_mt)` equals
`sum(fact_performance_daily.total_foc_mt)` **to the last decimal** (verified: 1,376,979.890
t on both sides). Any drift is a bug, not a rounding choice. Only the USD columns and the
schedule are synthesized.

### `optimize.py` — the economical speed

24 speed-grid points per ship. Sweep the reference curve, inflate the clean power by the
hull's latest measured fouling, price the burn, add the day rate.

**`CHARTER_USD_PER_DAY = 45,000` is the only thing that makes `usd_per_nm` convex with an
interior minimum.** Fuel cost per mile rises monotonically with speed, so on fuel alone the
optimum is always "go as slow as possible". It is the per-day charter cost — you pay for the
ship whether it moves or not — that bends the curve. Drop it and the recommended speed
degenerates to the slowest grid point. Across the fleet the argmin lands at 10.75–16.36 kn.

### `aggregate.py` — ⚠️ the rollup trap

`agg_fleet_daily` is 5,478 rows: 1,826 days × **three** `fleet_id` values — `FL-W1`,
`FL-W2`, and a synthetic **`ALL`** rollup over the whole fleet.

> **Always filter `fleet_id`.** Any query that doesn't will double-count the `ALL` rollup
> against its own sub-fleets. `SELECT sum(total_excess_cost_usd) FROM agg_fleet_daily` is
> exactly twice the right answer.

### `dims.py` — the dimensions

`dim_vessel` is `vessel_master` verbatim plus the curated joins the raw table can't carry:
fleet, reference-curve FK, and the last dry-dock clock — which is **genuinely null for
S9–S12 and S23**, the five ships that never dry-docked.

`fact_maintenance_event` keeps all 115 atoms and their `source_event_type`, so the 77 source
rows remain reconstructible from the curated zone. Its `cost_usd` / `downtime_hours` /
`location` are estimated; the source records none of them.

---

## Row counts

Every number on this page is reproduced by `uv run python -m ym_datalake.etl build`.

| Zone | Table | Rows |
|---|---|---:|
| raw | `noon_report` | 21,282 |
| raw | `vessel_master` | 15 |
| raw | `maintenance_event` | 115 |
| raw | `reference_curve` | 180 |
| raw | `uwi` | 53 |
| raw | `fuel_price` | 9,130 |
| curated | `fact_performance_daily` | 20,938 |
| curated | `fact_performance_indicator` | 87 |
| curated | `fact_uwi` | 53 |
| curated | `fact_maintenance_event` | 115 |
| curated | `dim_vessel` | 15 |
| curated | `dim_reference_curve` | 180 |
| curated | `dim_port` | 10 |
| curated | `agg_fleet_daily` | 5,478 |
| curated | `fact_voyage` | 300 |
| curated | `fact_anomaly` | 369 |
| curated | `fact_alert` | 222 |
| curated | `fact_recommendation` | 15 |
| curated | `fact_maintenance_recommendation` | 20 |
| curated | `fact_speed_profile` | 360 |

The build also prints the two findings that decide whether any of it means anything: the
**duplicate count** (344), the **ISO-valid row count** (4,657), and the **wind-convention
verdict** with all three scores.

---

## See also

- [`dataset.md`](dataset.md) — what the source files contain
- [`synthetic-dataset.md`](synthetic-dataset.md) — what is estimated, and how
- [`schema.md`](schema.md) — the column dictionary
- [`iso-19030.md`](iso-19030.md) — the standard itself
