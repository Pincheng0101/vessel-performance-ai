# Curated Dataset (POC M2)

The M2 ETL turns the M1 raw zone into the **curated zone**: ISO 15016 (sea-trial
correction) + ISO 19030 (hull & propeller performance) + derived indicators,
written as JSONL partitioned for Athena and uploaded to S3. This is the M2
deliverable: the ETL **recovers the injected speed loss** (closed-loop C13) and
its indicators are physically reasonable.

- ETL package: `ym_datalake/etl/` (numpy-only, pure Python, runs **locally**).
- Reuses the M1 shared modules `physics.py`, `curves.py`, `fleet.py` — the ETL
  inverts the exact forward path the generator uses, which is what makes the
  injected speed loss recoverable.
- Reads **only** the raw datasets (never `truth/` ground truth, which is not
  uploaded and does not exist in production); ground truth is used solely by the
  C13 validator.

---

## 1. Pipeline (`etl/`)

| Stage | Module | Output |
|---|---|---|
| S1/S2 Ingest + enrich | `compute.py` | join vessel_master + reference_curve + fuel_price; group by vessel |
| S3 ISO 15016 correction | `corrections.py` | remove wind + wave added resistance → `power_corrected_kw` |
| S4 ISO 19030 filter | `filters.py` | `valid_flag` (steady, deep-water, Beaufort ≤ 6 points) |
| S5 Speed loss | `indicators.py` | `v_expected_kn`, `speed_loss_pct` |
| S6 Derived indicators | `indicators.py`, `cii.py` | slip, SFOC, Admiralty, EEOI, CO2, CII, excess FOC + cost |
| S7 Period indicators | `periods.py` | ISP / DDP / MT / ME → `fact_performance_indicator` |
| S7b Voyage roll-up | `voyages.py` | group Noon Report by `(imo, voyage_no)` → `fact_voyage`; `dim_port` from `ports.PORTS` |
| S7c Speed profile (optimizer) | `optimize.py` | sweep a 24-point speed grid → convex usd/nm curve → `fact_speed_profile` (Phase 2) |
| S11 Publish | `writer.py`, `uploader.py` | partitioned curated JSONL → S3 |

Anomaly detection, cause classification and maintenance recommendations (S8–S10)
are **M3**; `fact_performance_daily.anomaly_*` and `fact_maintenance_event`'s
`me_recovery_pct` / `payback_days` are emitted null here.

### The closed loop (why speed loss is recoverable)

The generator builds each at-sea day as
`P_shaft = clean_power(STW / (1 − s), Δ) + ΔP_env`. The ETL inverts it with the
same `physics`/`curves` helpers and the reported heading:

```
ΔP_env       = wind (Blendermann) + wave (STAWAVE-1 head-sea) added power
P_corrected  = me_shaft_power_kw − ΔP_env                 # corrections.py
v_expected   = curve.clean_speed_kn(P_corrected, Δ)       # = f_refcurve, curves.py
speed_loss%  = (v_expected − STW) / v_expected × 100      # + = degradation (§4.5)
```

so `speed_loss ≈ s` up to sensor noise. Heading is read from the `heading_deg`
field added to the Noon Report (real noon reports carry course); without it the
wind/wave correction (≈10–20 % of power) cannot be reconstructed.

---

## 2. `fact_performance_daily` — vessel × day (the main table)

Partitioned `imo_number/year/month`. ISO/derived columns are null on in-port days
and on gross power outliers (corrected power ≤ 0). `days_since_cleaning` is
re-derived from `maintenance_event` reset dates (hull_cleaning ∪ dry_dock); the
first cycle is anchored at the vessel's window start (its pre-window reset is not
in the raw data).

| Column | Formula / source |
|---|---|
| `resistance_wind_kn`, `resistance_wave_kn` | Blendermann `R_AA`, STAWAVE-1 `R_AW` (kN) |
| `power_corrected_kw` | `me_shaft_power_kw − ΔP_env` |
| `speed_corrected_kn` | `speed_tw_kn` (STW — current already removed) |
| `v_expected_kn` | `curve.clean_speed_kn(power_corrected, Δ)` |
| `speed_loss_pct` | `(v_expected − STW) / v_expected × 100` (+ = degradation) |
| `slip_apparent`, `slip_real` | `(V_th − V)/V_th`, apparent uses SOG, real uses STW |
| `sfoc_g_kwh` | `me_foc · 1e6 / (me_power · hours)` |
| `admiralty_coef` | `Δ^(2/3) · STW³ / me_power` |
| `eeoi` | `co2 · 1e6 / (cargo · distance_og)` (gCO2/t·nm) |
| `co2_mt` | `total_foc · C_F[fuel]` |
| `excess_foc_mt` | `me_foc · [1 − (1−s)^n]`, `s = speed_loss/100`, `n = curve exponent` |
| `excess_cost_usd` | `excess_foc × fuel_price(date, fuel_type)` |
| `cum_excess_cost_usd` | running Σ excess cost within the current fouling cycle |
| `excess_cost_fouling_usd` | `= excess_cost_usd` (fouling channel of the fuel penalty) |
| `excess_cost_weather_usd` | `foc_mt(dp_env_kw, sfoc, hours) × price`, `dp_env_kw = resistance_to_power_kw((r_wind+r_wave)·1000, STW)` |
| `excess_cost_operational_usd` | `me_foc · p/(1+p) × price`, `p = 0.18·(load−0.80)²`, `load = me_power/mcr` |
| `cii_aer`, `cii_imo`, `cii_rating_aer`, `cii_rating_imo` | see §4 |
| `days_since_cleaning` | days since latest hull_cleaning/dry_dock (union clock, `= min(days_since_dry_dock, days_since_in_water)`) |
| `days_since_dry_dock` | days since latest dry_dock |
| `days_since_in_water` | days since latest hull_cleaning (in-water hull cleaning) |
| `valid_flag` | ISO 19030 filter (§3) |
| `anomaly_flag`, `anomaly_cause`, `anomaly_severity` | null (M3) |

### ISO 19030 `valid_flag` (`filters.py`)

`voyage_phase = at_sea` & steaming & `STW ≥ 0.5·V_design` & `Beaufort ≤ 6` &
`Δ ∈ [0.5, 1.2]·Δ_ref` & propulsion fields finite/positive. Deep-water and
rudder-angle filters are N/A (raw reports carry no depth/rudder); statistical
outlier rejection is M3, so a minority of injected sensor outliers survive
`valid_flag`.

---

## 3. Other curated tables

| Table | Grain | Partition | Notes |
|---|---|---|---|
| `fact_performance_indicator` | vessel × indicator | imo_number | ISO 19030 ISP / DDP / MT / ME (long format) |
| `fact_uwi` | inspection | imo_number | passthrough of raw UWI |
| `fact_maintenance_event` | event | imo_number | passthrough + null `me_recovery_pct`, `payback_days` (M3) |
| `dim_vessel` | vessel | flat | vessel_master (+ `fleet_id`/`fleet_name`) + `last_dry_dock_date` from latest dry dock |
| `dim_reference_curve` | vessel × point | flat | passthrough of raw reference curve |
| `agg_fleet_daily` | fleet × day | flat | `fleet_id` = `ALL` rollup + 3 sub-fleets (FL-IA/FL-TP/FL-AE); avg valid speed loss, total excess cost, CII A–E counts; `n_alerts` null (M3) |
| `fact_voyage` | vessel × voyage | imo_number | one rotation leg incl. its in-port day; per-voyage distance / FOC / fuel cost / CO₂ / on-time (§6) |
| `dim_port` | port | flat | 10 ports from `ports.PORTS` (locode, name, lat, lon, is_eu); server-side join dimension (§6) |
| `fact_speed_profile` | vessel × speed-grid point | imo_number | 24-point 0.5→1.0·V_design cost curve; convex usd/nm, economical speed = argmin (§8) |

**Period indicators** (`fact_performance_indicator`, over valid daily speed loss):
- **ISP** — per-cycle mean speed loss vs the first cycle.
- **DDP** — mean speed loss in the window after each dry dock vs before.
- **ME** — per maintenance event, mean speed loss before − after (recovery).
- **MT** — first date a trailing-mean speed loss crosses the trigger (8 %, POC).

---

## 4. CII (`cii.py`) — annual, broadcast onto each day

CII is an annual metric, computed per vessel × calendar year and stamped onto
every daily row of that year. Container ships use Capacity = DWT, so the AER and
full-IMO **attained** values coincide; they differ only in the rating reference
line (AER = base reference; IMO = the year's reduced `required` line).

```
attained  = Σ_year(total_foc · C_F) · 1e6 / (DWT · Σ_year distance_og)   # gCO2/dwt·nm
CII_ref   = a · DWT^(−c)                 # container a = 1984, c = 0.489 (MEPC.353)
required  = (1 − Z%_year) · CII_ref      # Z%: 2023 5, 2024 7, 2025 9, 2026 11
rating    = A–E via dd vector (0.83, 0.94, 1.07, 1.19)  (MEPC.354, container)
```

POC uses IMO's published container values; calibrate the reference line, Z% and
dd vectors when formalising (spec §10).

---

## 5. C13 closed-loop validation (`validate.py`)

Joins `fact_performance_daily` × ground truth on (imo, date); over valid,
non-anomaly, at-sea points asserts:
- **speed-loss recovery** — `|recovered − true|`: bias ≤ 0.2 pp, mean ≤ 0.8 pp
  (STW sensor-noise floor), ≥ 98 % of points within 2 pp.
- **corrected-power recovery** — `|P_corrected − truth| / truth ≤ 3 %` for ≥ 95 %.

Full-fleet run (9 vessels × 5 years): speed-loss recovery — `|recovered − true|`
— stays at the sensor-noise floor with no systematic bias, and corrected-power
recovery holds within tolerance — **C13 checks PASS**.

---

## 6. Voyage roll-up (`fact_voyage`) + `dim_port` (`voyages.py`)

`fact_voyage` rolls the daily Noon Report up to **one row per rotation leg** —
grain `(imo_number, voyage_no)`, one leg **incl. its in-port day**. `build_voyages`
groups the raw Noon Report by `(imo, voyage_no)`, pulls each day's ISO
`speed_loss_pct` and reconciled `co2_mt` from `fact_performance_daily`, and prices
each day with the `(date, fuel_type)` fuel-price index (`compute._price_index`).
Partitioned by `imo_number` (projection); `imo_number` is the partition key so it
is omitted from the body column list per convention.

| Column | Derivation |
|---|---|
| `voyage_no`, `vessel_name`, `from_port`, `to_port` | raw `voyage_no` / `vessel_name` / `port_from` / `port_to` of the group |
| `depart_date` / `arrive_date` | min / max `report_date` of the group |
| `distance_nm` | Σ raw `distance_og_nm` (all rows) |
| `sea_days` | count of at-sea rows |
| `avg_speed_kn` | `distance_nm / Σ steaming_hours` (at-sea) |
| `total_foc_mt` | **Σ raw `total_foc_mt` over ALL rows** (at-sea + in-port) → makes C18 exact |
| `fuel_cost_usd` | Σ (`total_foc_mt` × fuel price at that day's `(date, fuel_type)`) — each day priced by its own fuel type |
| `co2_mt` | Σ daily `co2_mt` keyed by `(imo, date)` — reconciles with `fact_performance_daily` |
| `avg_speed_loss_pct` | mean of at-sea daily non-null `speed_loss_pct` |
| `usd_per_nm` | `fuel_cost_usd / distance_nm` (null on zero distance) |
| `planned_eta` | `depart + round(path_nm / (0.85 · design_speed · 24))` days — service speed = 85 % of design (Vdes derate), so ~half the voyages land on-time |
| `on_time_flag` | `(arrive − depart).days ≤ planned days` |

`planned_eta` is the **only** voyage field that touches geography: the planned
duration comes from the bent great-circle `route_path` length (`ports.py` §9 of
`synthetic-dataset.md`), not the actual noon positions. Everything else keys off
the reported daily values.

`dim_port` is the flat 10-row port dimension straight from `ports.PORTS`
(`locode`, `name`, `lat`, `lon`, `is_eu`). It ships as a Glue table for
**server-side joins** (e.g. `fact_voyage.from_port → dim_port.locode`), unlocking
the Phase 3 EU-scope-from-ports work via `is_eu`. The Dashboard map instead reads
coordinates from the static `web/ports.js` mirror; `dim_port` is Athena-side only.
Full schemas: table-schema §3.8 / §3.9.

---

## 7. C18 voyage energy balance (`etl/validate.py`, `check_c18`)

Because **every Noon Report row belongs to exactly one voyage**, the voyage
roll-up must conserve fuel exactly. Per vessel:

```
Σ fact_voyage.total_foc_mt  ==  Σ noon_report.total_foc_mt      # relative tol 1e-6
```

A dropped or double-counted leg would break the balance. `check_c18` is wired into
`python -m ym_datalake.etl compute --validate` **after C14** and exits non-zero on
failure. **Verified green** (max relative error ~2.5e-15). Note the numbering: the
pre-existing consistency checks are **C1–C12 + C15–C17** (`synthetic_data/validate.py`)
and **C13 / C14** (`etl/validate.py`); **C18** / **C19** (§9) are the newest —
there is no C15/C16 for voyages (those are the propeller / coating / engine checks).

---

## 8. Bunker & slow-steaming optimizer (`fact_speed_profile`) (`optimize.py`)

`fact_speed_profile` sweeps each vessel across a **speed grid** into a convex
cost-vs-speed curve — grain `(imo_number, speed_kn)`, **24 grid points spanning
0.5 → 1.0 of design speed**. `build_speed_profiles` (Phase 2, called right after
`fact_voyage`) reads each vessel's latest state from `fact_performance_daily`
(fouling / SFOC / corrected speed), the latest Noon Report fuel type + annual
distance, and the raw fuel-price series. At every grid speed `v` it takes the
clean-hull power off the reference curve (`curves.build_curve`) at the reference
displacement, inflates it by the latest fouling (`P_fouled = P_clean / (1 − s)^n`,
`s = latest valid speed_loss_pct / 100`), prices the fouled burn at the latest
bunker price, and adds the vessel's per-day **charter (hire)** cost. Partitioned by
`imo_number` (projection); `imo_number` is the partition key so it is omitted from
the body column list per convention. Deterministic — no RNG, additive to the
M2/M3 tables, so **C1–C18 are untouched**.

| Column | Derivation |
|---|---|
| `speed_kn` | grid speed (kn); 24 points, `0.5·V_design … 1.0·V_design` |
| `shaft_power_kw` | clean-hull shaft power at this speed and the reference displacement (`curve.clean_power_kw`) |
| `foc_mt_per_day` | fouling-inflated daily burn `physics.foc_mt(P_fouled, sfoc, 24)` (mt/day) |
| `co2_mt_per_day` | `foc_mt_per_day × carbon_factor(fuel_type)` (mt/day) |
| `fuel_usd_per_day` | `foc_mt_per_day × latest bunker price` (USD/day) |
| `charter_usd_per_day` | per-vessel charter/hire rate — static `VesselSpec` particular (the time cost) |
| `usd_per_day` | `fuel_usd_per_day + charter_usd_per_day` (total) |
| `usd_per_nm` | **total** unit-distance cost `usd_per_day / (speed_kn·24)` — convex, min = economical speed |
| `fuel_usd_per_nm` | fuel-only unit-distance cost `fuel_usd_per_day / (speed_kn·24)` — strictly increasing (decomposition) |
| `vessel_name` | vessel name *(repeated on every grid row)* |
| `recommended_speed_kn` | economical speed = `usd_per_nm` argmin (interior, C19) *(repeated)* |
| `current_speed_kn` | latest valid `speed_corrected_kn` (kn) *(repeated; null if no valid at-sea point)* |
| `annual_distance_nm` | Σ daily `distance_og_nm` annualised over the noon date span (nm/yr) *(repeated)* |

`usd_per_nm` is **convex** by construction: the fuel-only leg `usd/nm ∝ V^(n−1)`
rises monotonically with speed (its minimum would be the slowest grid point, a
degenerate answer), so the per-day charter **time cost** is what puts an
**interior** economical speed on the curve. `recommended_speed_kn` is that argmin.
The four vessel-level fields (`vessel_name`, `recommended_speed_kn`,
`current_speed_kn`, `annual_distance_nm`) are **identical on all 24 rows** of a
vessel (same trick as `fact_voyage.vessel_name`); filter
`speed_kn = recommended_speed_kn` to pull one economical-speed row per vessel. Backs
the Dashboard `vessel_speed_profile` Optimizer page (usd/nm curve, current /
economical markers, live savings, fleet slow-steaming KPI). Full schema + example
queries: `doc/skill/fact_speed_profile.md`.

---

## 9. C19 economical-speed check (`etl/validate.py`, `check_c19`)

Because `recommended_speed_kn` is the actionable output, it must be a genuine
interior minimum — not a degenerate endpoint. Per vessel, over the 24-point grid:

```
recommended_speed_kn  ==  argmin_v fact_speed_profile.usd_per_nm    # tol 1e-9
0.5·V_design  <  recommended_speed_kn  <  1.0·V_design              # strictly interior
```

A boundary minimum (slowest or fastest grid point) would mean the per-day charter
time cost was mis-sized — a monotone, fuel-only curve — and **fails** the check.
`check_c19` is wired into `python -m ym_datalake.etl compute --validate` **after
C18** and exits non-zero on failure. It is additive to the M2/M3 layer (C1–C18
untouched) and is the newest check.

---

## 10. Commands

```bash
# Regenerate raw (M1) then compute curated (M2), validating C13:
uv run python -m ym_datalake.synthetic_data generate --out ./tmp --seed 42 --validate
uv run python -m ym_datalake.etl compute --in ./tmp --out ./tmp --validate

# Validate a previously written curated tree:
uv run python -m ym_datalake.etl validate --dir ./tmp

# Upload curated/ to S3 (mirrors the layout onto the Glue partition prefixes):
uv run python -m ym_datalake.etl compute --in ./tmp --out ./tmp --upload --bucket <bucket>
```
