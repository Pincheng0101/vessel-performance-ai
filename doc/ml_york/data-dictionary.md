# Data Dictionary — `etl/vt_fd_features.csv`

Every column in `etl/vt_fd_features.csv`, defined once, traceable to its source and formula. The file
has **214 columns** and **21,219 rows** (`feature_manifest.json::n_rows`). It is the single feature
table a trainer reads; the companion `etl/feature_manifest.json` is the machine-readable contract that
declares which of those columns are legal model inputs.

- **Raw columns carried verbatim** from `dataset/vt_fd.csv` — defined by `dataset/README.md` and
  re-declared in `feature_engineering/io.py`.
- **Engineered columns** added by `feature_engineering/{maintenance,physics_features,statistics}.py`.

---

## 1. How the file is built

```bash
python -m ym_datalake.ml_york.feature_engineering --data dataset --out etl
```

`build.py::assemble_features` runs a fixed pipeline; **order matters** (statistics read the physics
columns; the thermal index reads both the maintenance clock and a trailing temperature mean):

```
io.load_vt_fd            → raw columns + keys + flags + targets + Group-F fuel features
maintenance.add_*        → Group B  (fouling / maintenance age)
physics_features.add_*   → Group C  (hydro / speed)  +  Group D  (weather / resistance)
statistics.add_*         → Group E  (trailing statistics, speed-loss, thermal index)
```

The only data sources are `dataset/vt_fd.csv` (40 columns) and `dataset/maintenance.csv`. No external
data, no hydrostatic tables, no dependency on the curated lake — every engineered value is a formula
over raw inputs. Load drops 63 exact-duplicate rows before anything else, leaving 21,219 rows.

### The A/H/T/F class model (from `dataset/README.md`)

Raw columns are graded by whether they are visible inside a **masked prediction window**:

| Class | Meaning | Inside a masked window |
|:-----:|---------|------------------------|
| **A** | environment / navigation | **visible** |
| **H** | main-engine performance (power, load, SFOC, slip, thrust) | **HIDDEN** |
| **T** | fuel consumption (total, ME, per-fuel) | **HIDDEN**, or **PREDICT** on the target cell |
| **F** | predict-day filter / modelling helper (`WIND_SCALE`, `HOURS_FULL_SPEED`) | **visible** |

### The predict-safe / leakage contract

- **Model inputs = the 163 `predict_safe_features` only.** Each is derived solely from A + F columns,
  `maintenance.csv`, and time, so all are legal inputs even on a masked prediction row.
- **`leakage_columns` (13) = the 6 H columns + the 7 T columns.** They are present in the CSV as
  *labels* but must never enter the model; in a real PREDICT window they are HIDDEN.
- Markers are parsed off the raw strings *before* numeric coercion: `PREDICT` → `is_predict`,
  `HIDDEN`/`PREDICT` → `is_masked`. After coercion every `HIDDEN`/`PREDICT`/non-numeric cell is `NaN`.
- There are **102 PREDICT cells** across the three prediction ships (14 events × 5–10 days each).

### Ships and W-type grouping

15 ships: **S1–S12** are fully-labelled training ships; **S21–S23** are prediction ships with masked
windows. Sister designs on different routes are grouped by hull type (`io.SHIP_TYPE`):

- **W1** = S1–S8, S21
- **W2** = S9–S12, S22, S23

### Physical-plausibility handling

`io._clip_physical` sets any reading outside its `_PHYSICAL_BOUNDS` range to `NaN` (never clamps — a
clamp would invent a boundary value); per-ship imputation and the steady-state gate then absorb the
gap. Fuel columns reject only negative mass. Bounds appear in the raw-column table below.

> **Column counts at a glance:** 40 raw + 3 new keys + 3 flags + 5 targets + 163 predict-safe = 214.
> Predict-safe splits: Group F **6**, Group B **40**, Group C **38**, Group D **25**, Group E **54**.

---

## 2. Raw columns (40)

Carried verbatim from `vt_fd.csv` in file order (`io.ORIGINAL_COLUMNS`). Definitions and units from
the `dataset/README.md` 欄位詳細 table; the physical bound is `io._PHYSICAL_BOUNDS` (a reading outside
it becomes `NaN`). **Leakage columns are called out — all H columns and all T columns are banned as
model inputs.**

| # | Column | Class | Definition | Unit | Bound → NaN | Notes |
|--:|--------|:-----:|------------|------|-------------|-------|
| 1 | `De-identification Name` | A | Ship code | S1–S23 | — | Source of `ship_id`; string passthrough |
| 2 | `VOYAGE` | A | Voyage number | — | — | Also a key column |
| 3 | `NOON_UTC` | A | **Relative day** (Day 0 = ship's earliest record) | days | — | Not a calendar date; source of `noon_utc` |
| 4 | `AVG_SPEED` | A | Speed over ground (SOG) | knots | [0, 30] | 100 % filled |
| 5 | `SPEED_THROUGH_WATER` | A | Speed through water (STW) | knots | [0, 30] | 100 % filled; independent source from SOG |
| 6 | `ME_AVG_RPM` | A | Main-engine average RPM | RPM | [0, 90] | |
| 7 | `PROPELLER_SPEED` | A | Propeller RPM | RPM | [0, 45] | |
| 8 | `FORE_DRAFT` | A | Forward draft | m | [0, 20] | |
| 9 | `AFTER_DRAFT` | A | Aft draft | m | [0, 20] | |
| 10 | `DISPLACEMENT` | A | Displacement | MT | [30 000, 200 000] | Imputed downstream when missing |
| 11 | `CARGO_ON_BOARD` | A | Cargo on board | MT | [0, 155 000] | |
| 12 | `WIND_SCALE` | A / F | Wind force | Beaufort | — | Steady-state gate input |
| 13 | `SEA_HEIGHT` | A | Wave height | m | [0, 20] | ~81 % filled |
| 14 | `SEA_WATER_TEMP` | A | Sea-water temperature | °C | — | Drives fouling / density terms |
| 15 | `WIND_SPEED` | A | Wind speed | knots | [0, 80] | ~81 % filled |
| 16 | `WIND_DIRECTION` | A | Wind direction (relative / compass) | deg / point | — | Compass point 0–15 |
| 17 | `SWELL_HEIGHT` | A | Swell height | m | [0, 20] | |
| 18 | `SWELL_DIRECTION` | A | Swell direction | deg / point | — | |
| 19 | `SEA_DIRECTION` | A | Wave direction | deg / point | — | |
| 20 | `WATER_DEPTH` | A | Water depth (shallow-water test) | m | [0, 12 000] | |
| 21 | `MID_DRAFT` | A | Midship draft | m | [0, 20] | |
| 22 | `TOTAL_DISTANCE` | A | Day's total distance over ground | nm | — | |
| 23 | `SEA_SPEED_DISTANCE` | A | Full-speed distance through water | nm | — | |
| 24 | `DIFF_STW_SOG_SLIP` | A | STW−SOG speed difference (current proxy) | knots / % | [-15, 15] | |
| 25 | `FULL_SPD_STW_SLIP` | A | Full-speed STW slip | % | [-30, 100] | |
| 26 | `HORSE_POWER` | **H** | Main-engine power | kW | — | **LEAKAGE** — HIDDEN in predict window |
| 27 | `LOAD_PCT` | **H** | Engine load | %MCR | — | **LEAKAGE** |
| 28 | `SFOC` | **H** | Specific fuel-oil consumption | g/kWh | — | **LEAKAGE** |
| 29 | `ME_SLIP` | **H** | Engine / propeller slip | % | — | **LEAKAGE** |
| 30 | `THRUST` | **H** | Thrust | kN | — | **LEAKAGE** |
| 31 | `THRUST_QUOTIENT` | **H** | Thrust coefficient | — | — | **LEAKAGE** |
| 32 | `TOTAL_CONSUMP` | **T** | Day total fuel (incl. aux / boiler) | MT/day | — | **LEAKAGE** |
| 33 | `ME_CONSUMPTION` | **T** | Main-engine fuel total | MT/day | — | **LEAKAGE** |
| 34 | `ME_FULLSPEED_CONSUMP_HSHFO` | **T** | ME full-speed fuel — HSHFO | MT/day | ≥ 0 | **LEAKAGE / PREDICT target** |
| 35 | `ME_FULLSPEED_CONSUMP_ULSFO` | **T** | ME full-speed fuel — ULSFO | MT/day | ≥ 0 | **LEAKAGE / PREDICT target** |
| 36 | `ME_FULLSPEED_CONSUMP_VLSFO` | **T** | ME full-speed fuel — VLSFO | MT/day | ≥ 0 | **LEAKAGE / PREDICT target** |
| 37 | `ME_FULLSPEED_CONSUMP_LSMGO` | **T** | ME full-speed fuel — LSMGO | MT/day | ≥ 0 | **LEAKAGE / PREDICT target** |
| 38 | `ME_FULLSPEED_CONSUMP_BIO_HSFO` | **T** | ME full-speed fuel — BIO_HSFO | MT/day | ≥ 0 | **LEAKAGE**; unused in predict window |
| 39 | `HOURS_FULL_SPEED` | F | Full-speed hours | hr | — | Steady-state gate + per-hour target |
| 40 | `HOURS_TOTAL` | F | Total sailing hours | hr | — | Operational passthrough |

> Fuel columns (34–38) reject only **negative** mass (`s >= 0`); their upper tail is a real signal.
> A negative reading kills that fuel's training target as well.

---

## 3. Meta columns — keys, flags, targets, fuel identity

Added by `io.load_vt_fd`. These are **not** model inputs (except the Group-F fuel features): keys
identify a row, flags gate training, targets are labels.

### 3.1 Keys (3 new + `VOYAGE`)

| Column | Definition | Source |
|--------|------------|--------|
| `ship_id` | Ship code as string | `De-identification Name` |
| `noon_utc` | Relative day as int (Day 0 = ship's earliest record) | `NOON_UTC` |
| `ship_type` | W-type (`W1`/`W2`) | `ship_id` → `io.SHIP_TYPE` |
| `VOYAGE` | Voyage number (also raw column #2) | raw |

### 3.2 Flags (3)

| Column | Definition | Rule |
|--------|------------|------|
| `is_masked` | Row has any hidden label | any of the 6 H + 7 T cells `== 'HIDDEN'`, **or** `is_predict` |
| `is_predict` | Row is a target-to-predict cell | any fuel cell `== 'PREDICT'` (102 cells total) |
| `is_steady_state` | Clean steady point (README PREDICT gate + training weight) | `HOURS_FULL_SPEED >= 22` **and** `WIND_SCALE <= 4` |

### 3.3 Targets (5) — labels, never inputs

Every target is `NaN` on masked rows, so the 102 predict cells stay unlabelled. Column order below is
CSV order (`_attach_targets`).

| Column | Definition | Formula | Unit |
|--------|------------|---------|------|
| `target_fuel_type` | Short fuel key for the day | PREDICT-marked column on predict rows, else the fuel with the largest positive mass; `NaN` if none positive | HSHFO / ULSFO / VLSFO / LSMGO / BIO_HSFO |
| `target_me_fs_consump` | Day ME full-speed fuel mass | `Σ_fuel mass` (NaN-skipping, `min_count=1`) over the 5 fuel columns | MT/day |
| `target_energy_mj` | LCV-unified energy (fuels made comparable) | `Σ_fuel (mass × LCV_fuel)` — see LCV table below | MT·MJ/kg (energy-proportional; a fixed 1000× from literal MJ, immaterial as a target) |
| `target_me_fs_consump_per_hour` | Full-speed-hours-corrected mass | `target_me_fs_consump / HOURS_FULL_SPEED` | MT/hr |
| `target_energy_mj_per_hour` | Full-speed-hours-corrected energy | `target_energy_mj / HOURS_FULL_SPEED` | per hr |

`target_for_training = target_energy_mj`. The per-hour columns apply the README correction that a
day's full-speed hours vary; the prediction target is the fuel *consumed during the full-speed
segment*.

**Lower calorific values** (`io.LCV`, MJ/kg, from the README 燃料熱值對照 table):

| Fuel key | LCV (MJ/kg) |
|----------|:-----------:|
| HSHFO | 40.2 |
| ULSFO | 41.2 |
| VLSFO | 40.2 |
| LSMGO | 42.7 |
| BIO_HSFO | 39.4 (approximate) |

### 3.4 Group F — fuel features (6, predict-safe)

`_attach_fuel_features`. **Predict-safe**: the fuel identity *is given* on a predict row (it is the
column marked `PREDICT`), so these one-hots re-encode that legal information as model inputs. On a
masked non-predict row `target_fuel_type` is `NaN`, so every one-hot is 0 and `fuel_lcv` is `NaN`.

| Column | Definition | Formula |
|--------|------------|---------|
| `fuel_is_hshfo` | HSHFO indicator | `(target_fuel_type == 'HSHFO')` → 0/1 |
| `fuel_is_ulsfo` | ULSFO indicator | `(target_fuel_type == 'ULSFO')` → 0/1 |
| `fuel_is_vlsfo` | VLSFO indicator | `(target_fuel_type == 'VLSFO')` → 0/1 |
| `fuel_is_lsmgo` | LSMGO indicator | `(target_fuel_type == 'LSMGO')` → 0/1 |
| `fuel_is_bio_hsfo` | BIO_HSFO indicator | `(target_fuel_type == 'BIO_HSFO')` → 0/1 |
| `fuel_lcv` | LCV of the day's fuel | `target_fuel_type` → `LCV` (MJ/kg) |

---

## 4. Group B — maintenance / fouling age (40)

Source: `maintenance.py`, from `maintenance.csv` + time only — fully predict-safe. Fouling age is
modelled as **reset clocks**: how many days since the last event that physically reset a given
surface. All arithmetic is pure integer-day; the first cycle of every clock is anchored at the ship's
data start (`anchor = min(noon_utc)`), and clocks are **inclusive** (a cleaning on day *d* leaves the
clock at 0 that day).

### Reset atoms (from README 養護類型)

A raw `event_type` splits on `+` into atoms; each clock resets on the atoms in its set:

| Clock resets on | Atoms | Raw codes that trigger it |
|-----------------|-------|---------------------------|
| Hull clean | `UWC`, `DD` | UWC, UWC+PP, DD |
| Prop polish | `PP`, `DD` | PP, UWI+PP, UWC+PP, DD |
| Dry dock | `DD` | DD |
| Inspection (counts only) | `UWI` | UWI, UWI+PP |

`UWI` (underwater inspection — photos only) resets **nothing**. Event codes and their physical
meaning: `PP` polishing, `UWC` hull cleaning, `DD` dry dock (full recoat + machinery), `UWI`
inspection.

### 4.1 Headline reset clocks + transforms

| Column | Definition | Formula |
|--------|------------|---------|
| `days_since_hull_clean` | Days since last hull-reset event | `max(0, day − last_reset)`; anchor on first cycle |
| `days_since_hull_clean_log1p` | Log transform | `ln(1 + days_since_hull_clean)` |
| `days_since_hull_clean_sqrt` | Root transform | `√days_since_hull_clean` |
| `days_since_prop_polish` | Days since last polish-reset event | same clock over polish resets |
| `days_since_prop_polish_log1p` | Log transform | `ln(1 + days_since_prop_polish)` |
| `days_since_prop_polish_sqrt` | Root transform | `√days_since_prop_polish` |
| `days_since_dry_dock` | Days since last dry dock | same clock over DD |
| `days_since_dry_dock_log1p` | Log transform | `ln(1 + days_since_dry_dock)` |
| `days_since_dry_dock_sqrt` | Root transform | `√days_since_dry_dock` |
| `coating_age_years` | Hull-coating age | `days_since_dry_dock / 365` |

The `log1p`/`sqrt` pairs give a tree the concave fouling-growth shape without fitting a constant.

### 4.2 Censor flags (2)

| Column | Definition | Formula |
|--------|------------|---------|
| `hull_clock_censored` | Hull clock is a lower bound (no reset yet observed) | `1` if no hull reset precedes the day, else `0` |
| `polish_clock_censored` | Polish clock is a lower bound | `1` if no polish reset precedes the day, else `0` |

### 4.3 Per-raw-type days-since (6) + roll-ups (2)

Each of these matches the **exact** `event_type` string (not atoms). Slug rule: `+` → `_`, lowercased.

| Column | Definition |
|--------|------------|
| `days_since_dd` | Days since last exact `DD` event |
| `days_since_uwc` | Days since last exact `UWC` event |
| `days_since_pp` | Days since last exact `PP` event |
| `days_since_uwi_pp` | Days since last exact `UWI+PP` event |
| `days_since_uwc_pp` | Days since last exact `UWC+PP` event |
| `days_since_uwi` | Days since last exact `UWI` event |
| `days_since_any_service` | Days since last **non-UWI** event (a pure inspection is not a service) |
| `days_since_any_event` | Days since last event of **any** type |

### 4.4 Event counts — cumulative (5) + windowed (3)

Cumulative counts are events at or before the day (`searchsorted`, right side); windowed counts are
events in the trailing `(day − w, day]`.

| Column | Definition |
|--------|------------|
| `n_hull_cleans` | Cumulative hull-reset events (UWC or DD) to date |
| `n_prop_polishes` | Cumulative polish-reset events (PP or DD) to date |
| `n_drydocks` | Cumulative DD events to date |
| `n_inspections` | Cumulative events including a UWI atom (UWI, UWI+PP) |
| `n_services_to_date` | Cumulative non-UWI events to date |
| `event_count_30d` | Any-type events in the last 30 days |
| `event_count_90d` | Any-type events in the last 90 days |
| `event_count_180d` | Any-type events in the last 180 days |

### 4.5 Carry-forward inspection findings (9)

Last-observation-carry-forward from the most recent event that actually recorded each finding
(a blank cell does not erase an earlier reading); `NaN` if never observed. Encodings:
condition `{Good:0, Fair:1, Poor:2}`, cavitation `{Yes:1, No:0}`, fouling severity weights
`{barnacle:3, tubeworm:3, calcium:2, algae:1, slime:1}`.

| Column | Definition | Formula |
|--------|------------|---------|
| `last_prop_condition` | Latest propeller condition | LOCF of `propeller_condition`, ordinal 0–2 |
| `last_hull_coating_condition` | Latest coating condition | LOCF of `hull_coating_condition`, ordinal 0–2 |
| `last_cavitation_found` | Latest cavitation flag | LOCF of `cavitation_found`, 0/1 |
| `last_fouling_severity` | Severity of latest fouling set | `Σ weight(t)` over the latest fouling set |
| `had_barnacle` | Latest set contains barnacle | `1` if `barnacle` ∈ latest set |
| `had_tubeworm` | Latest set contains tubeworm | `1` if `tubeworm` ∈ latest set |
| `had_calcium` | Latest set contains calcium | `1` if `calcium` ∈ latest set |
| `had_algae` | Latest set contains algae | `1` if `algae` ∈ latest set |
| `had_slime` | Latest set contains slime | `1` if `slime` ∈ latest set |

### 4.6 Saturating clock + interactions (3)

| Column | Definition | Formula |
|--------|------------|---------|
| `hull_clock_sat` | Saturating hull clock (growth flattens) | `1 − exp(−days_since_hull_clean / 180)` |
| `prop_cond_x_polishclock` | Worse-and-older propeller | `last_prop_condition × days_since_prop_polish` |
| `cavitation_x_polishclock` | Cavitation-and-older propeller | `last_cavitation_found × days_since_prop_polish` |

---

## 5. Group C — hydro / speed (38)

Source: `physics_features.py::_hydro` + `_speed`. Physics enters as *formulas* over A columns only —
no fitted exponent, no vessel particulars. The headline term is the clean-hull power law:
ME fuel ∝ SFOC·power and power ∝ displacement^(2/3)·STW³.

### 5.1 Hydro / loading (13)

| Column | Definition | Formula / source | Unit / range |
|--------|------------|------------------|--------------|
| `mean_draft` | Mean draft | `(FORE_DRAFT + AFTER_DRAFT) / 2` | m |
| `trim` | Trim (+ = by stern) | `AFTER_DRAFT − FORE_DRAFT` | m |
| `trim_abs` | Absolute trim | `abs(trim)` | m |
| `mid_draft` | Midship draft (gap-filled) | `MID_DRAFT`, else `mean_draft` | m |
| `displacement_filled` | Displacement, imputed | `DISPLACEMENT`, else per-ship draft regression, else ship median, else global median | MT |
| `displacement_missing` | Displacement was missing | `1` if `DISPLACEMENT` is `NaN` | 0/1 |
| `displacement_23` | Displacement^(2/3) (power-law term) | `displacement_filled^(2/3)` | — |
| `cargo` | Cargo on board | `CARGO_ON_BOARD` | MT |
| `depth_draft_ratio` | Under-keel proxy | `WATER_DEPTH / mean_draft` | — |
| `cargo_utilization` | Loading vs ship's own peak | `cargo / max_cargo(ship)` (safe div) | 0–1 |
| `is_laden` | Laden indicator | `1` if `cargo_utilization > 0.5` | 0/1 |
| `wetted_proxy` | Hull-form proxy (≈ Lpp·B) | `displacement_filled / mean_draft` (safe div) | — |
| `trim_ratio` | Normalised trim | `trim / mean_draft` (safe div) | — |

`displacement_filled` imputation (`_impute_displacement`): where `DISPLACEMENT` is missing, fit
`displacement ~ a + b·mean_draft` on that ship's own rows (needs ≥2 rows with ≥2 distinct drafts),
falling back to the ship's median, then the global median.

### 5.2 Speed / propeller (25)

| Column | Definition | Formula / source | Unit / range |
|--------|------------|------------------|--------------|
| `stw` | Speed through water | `SPEED_THROUGH_WATER` | knots |
| `sog` | Speed over ground | `AVG_SPEED` | knots |
| `rpm` | Engine RPM | `ME_AVG_RPM` | RPM |
| `prop_speed` | Propeller RPM | `PROPELLER_SPEED` | RPM |
| `stw2` | STW² | `stw²` | — |
| `stw3` | STW³ | `stw³` | — |
| `rpm2` | RPM² | `rpm²` | — |
| `rpm3` | RPM³ (∝ shaft power) | `rpm³` | — |
| `prop_speed3` | Prop RPM³ | `prop_speed³` | — |
| `admiralty_fuel_proxy` | Clean-hull fuel baseline | `displacement_23 × stw3` = `disp^(2/3)·STW³` | — |
| `speed_per_rpm` | Advance efficiency (drops when fouled) | `stw / rpm` (safe div) | — |
| `stw_minus_sog` | STW−SOG (current proxy) | `stw − sog` | knots |
| `apparent_advance` | Advance-coefficient proxy | `stw / prop_speed` (safe div) | — |
| `slip_ratio` | Propeller loading proxy | `rpm / prop_speed` (safe div) | — |
| `rpm2_stw` | Power-surrogate cross term | `rpm² × stw` | — |
| `full_spd_stw_slip` | Full-speed STW slip | `FULL_SPD_STW_SLIP` | % |
| `diff_stw_sog_slip` | STW−SOG slip (current proxy) | `DIFF_STW_SOG_SLIP` | knots / % |
| `slip_excess` | Slip above clean-hull baseline | `FULL_SPD_STW_SLIP − slip_baseline` | % |
| `sea_speed_fraction` | Full-speed share of the day | `SEA_SPEED_DISTANCE / TOTAL_DISTANCE` (safe div) | 0–1 |
| `total_distance` | Day distance over ground | `TOTAL_DISTANCE` | nm |
| `froude_depth` | Critical depth for this speed | `2.75 × (stw·0.514444)² / 9.80665` | m |
| `shallow_flag` | Shallow-water flag | `1` if `WATER_DEPTH < froude_depth` | 0/1 |
| `water_depth` | Water depth | `WATER_DEPTH` | m |
| `hours_full_speed` | Full-speed hours | `HOURS_FULL_SPEED` | hr |
| `wind_scale` | Wind force | `WIND_SCALE` | Beaufort |

`slip_baseline` (`_slip_baseline`) = the 5th percentile of `FULL_SPD_STW_SLIP` over that ship's
steady-state rows (fleet p5 fallback) — a robust clean-hull reference. `froude_depth` converts STW to
m/s (`0.514444`) and applies the shallow-water critical-depth relation `h_crit = 2.75·V²/g`.

---

## 6. Group D — weather / added resistance (25)

Source: `physics_features.py::_weather`. Weather columns are ~81 % filled; missing values are
per-ship-median imputed with explicit missing flags, then turned into resistance proxies. Direction is
treated as **relative-to-bow** (true heading unknown — an accepted ambiguity): head component = cos.

| Column | Definition | Formula / source | Unit / range |
|--------|------------|------------------|--------------|
| `weather_missing` | Wind or wave was missing | `1` if `SEA_HEIGHT` or `WIND_SPEED` is `NaN` | 0/1 |
| `sea_water_temp_missing` | Sea temp was missing | `1` if `SEA_WATER_TEMP` is `NaN` | 0/1 |
| `wind_speed` | Wind speed (imputed) | ship-median impute of `WIND_SPEED` | knots |
| `wind_speed2` | Wind speed² | `wind_speed²` | — |
| `sea_height` | Wave height (imputed) | ship-median impute of `SEA_HEIGHT` | m |
| `sea_height2` | Wave height² | `sea_height²` | — |
| `swell_height` | Swell height (imputed) | ship-median impute of `SWELL_HEIGHT` | m |
| `combined_wave` | Combined sea+swell | `hypot(sea_height, swell_height)` = `√(sea_height² + swell_height²)` | m |
| `sea_water_temp` | Sea temp (imputed) | ship-median impute of `SEA_WATER_TEMP` | °C |
| `temp_dev` | Temp vs biofouling-neutral 15 °C | `sea_water_temp − 15` | °C |
| `density` | Seawater density at 35 PSU | `1028.11 − 0.07717·T − 0.004517·T²` (T = `sea_water_temp`) | kg/m³ |
| `density_factor` | Density vs 15 °C reference | `density / density(15 °C)` | ≈1 |
| `kin_visc` | Kinematic viscosity at 35 PSU | `1.83e-6 − 5.267e-8·T + 6.67e-10·T²` | m²/s |
| `reynolds_proxy` | Viscous-drag regime | `stw·0.514444·mean_draft / kin_visc` | — |
| `wind_dir_sin` | Wind direction sine | `sin(θ)`, `θ = deg2rad(pt·22.5)`, pt = imputed compass point 0–15 | −1…1 |
| `wind_dir_cos` | Wind direction cosine | `cos(θ)` | −1…1 |
| `sea_dir_sin` | Wave direction sine | `sin(θ_sea)` | −1…1 |
| `sea_dir_cos` | Wave direction cosine | `cos(θ_sea)` | −1…1 |
| `swell_dir_sin` | Swell direction sine | `sin(θ_swell)` | −1…1 |
| `swell_dir_cos` | Swell direction cosine | `cos(θ_swell)` | −1…1 |
| `head_wind` | Head-on wind component | `wind_speed · cos(θ_wind)` | knots |
| `beam_wind` | Beam wind component | `wind_speed · sin(θ_wind)` | knots |
| `head_sea` | Head-on wave component | `sea_height · cos(θ_sea)` | m |
| `beam_sea` | Beam wave component | `sea_height · sin(θ_sea)` | m |
| `head_sea_sq` | Head-sea added-resistance proxy | `sea_height² · max(0, cos θ_sea)` | — |

Density/viscosity quadratics are fit to EOS-80 reference points at 35 PSU: warm water is lighter and
thinner, so slightly less resistance and a higher Reynolds number for the same speed and draft.
`density(15 °C) ≈ 1025.94 kg/m³`. Compass points convert at 22.5°/point.

---

## 7. Group E — trailing statistics & speed-loss (54)

Source: `statistics.py`. Every window is **trailing** (day *d* sees only days ≤ *d*), time-based on
the integer day, so no future information and no target leaks. These read the Group-C/D columns, which
must already exist.

### 7.1 Rolling mean / std (42) — 7 columns × 3 windows × {mean, std}

Rolled columns (`ROLL_COLUMNS`): `stw`, `rpm`, `full_spd_stw_slip`, `sea_height`, `wind_speed`,
`mean_draft`, `sea_water_temp`. Windows: 7, 14, 30 days (`pandas` time-based `rolling`,
`min_periods=1`). Naming: `{col}_roll{window}_{mean|std}`. `std` is `NaN` on a single-row window
(first day), left to downstream 0-fill.

| Column family | Definition |
|---------------|------------|
| `stw_roll{7,14,30}_{mean,std}` | Trailing STW mean / std |
| `rpm_roll{7,14,30}_{mean,std}` | Trailing RPM mean / std |
| `full_spd_stw_slip_roll{7,14,30}_{mean,std}` | Trailing full-speed-slip mean / std |
| `sea_height_roll{7,14,30}_{mean,std}` | Trailing wave-height mean / std |
| `wind_speed_roll{7,14,30}_{mean,std}` | Trailing wind-speed mean / std |
| `mean_draft_roll{7,14,30}_{mean,std}` | Trailing mean-draft mean / std |
| `sea_water_temp_roll{7,14,30}_{mean,std}` | Trailing sea-temp mean / std |

(42 columns: the 6 combinations per column, listed individually in the appendix checklist.)

### 7.2 Expanding, thermal exposure, cross-ship / voyage refs (7)

| Column | Definition | Formula |
|--------|------------|---------|
| `stw_minus_expanding_mean` | STW drift vs all-history mean | `stw − expanding_mean(stw)` |
| `sea_water_temp_expanding_mean` | All-history mean sea temp | `expanding_mean(sea_water_temp)` |
| `thermal_exposure_since_clean` | Warm-water dose since last hull clean | trailing `Σ max(0, temp − 15)`, reset each `days_since_hull_clean == 0` day |
| `stw_vs_type_ref` | STW vs W-type reference | `stw − mean(steady-state stw over ship_type)` (fleet-mean fallback) |
| `voyage_position` | 0-indexed day within the voyage | rank of `noon_utc` within `(ship, VOYAGE)`, first-tie, minus 1 |
| `voyage_mean_stw` | Voyage reference speed | mean of steady-state `stw` per `(ship, VOYAGE)` (voyage all-row mean, then fleet mean fallback) |
| `coating_x_thermal` | Coating-age × thermal-dose (compound driver) | `coating_age_years × thermal_exposure_since_clean` |

`thermal_exposure_since_clean` opens a fresh segment on every hull-clean day (clock = 0, including the
data-start anchor) and accumulates the daily warm-water excess `max(0, temp − 15)` within that segment.

### 7.3 Speed-loss excess lines (4)

`add_speed_loss_features`. On **clean rows** (steady-state **and** `days_since_hull_clean ≤ 60`) two
least-squares lines are fit; the residual `observed − clean-predicted` is the added-resistance signal.
It is emitted per ship (`*_ship`) when the ship has ≥30 clean rows, else per W-type (`*_type`); the
ship column also falls back to the type residual. Lines are fit over the whole series (mild
look-ahead, accepted — CV out of scope).

| Column | Definition | Clean-fit line | Residual |
|--------|------------|----------------|----------|
| `rpm_excess_ship` | Extra RPM for the speed (per ship, type fallback) | `rpm ~ a + b·stw` | `rpm − (a + b·stw)` |
| `rpm_excess_type` | Extra RPM for the speed (per W-type) | `rpm ~ a + b·stw` | `rpm − (a + b·stw)` |
| `admiralty_excess_ship` | Power above clean rpm→power curve (per ship, type fallback) | `admiralty_fuel_proxy ~ a + b·rpm3` | `admiralty_fuel_proxy − (a + b·rpm3)` |
| `admiralty_excess_type` | Power above clean rpm→power curve (per W-type) | `admiralty_fuel_proxy ~ a + b·rpm3` | `admiralty_fuel_proxy − (a + b·rpm3)` |

### 7.4 Thermal fouling index (1)

| Column | Definition | Formula |
|--------|------------|---------|
| `thermal_fouling_index` | Fouling age × cumulative warm-water dose | `days_since_hull_clean × sea_water_temp_expanding_mean` |

---

## 8. Appendix — full ordered column checklist (214)

CSV column order, mapped to group. Tick each off against the `etl/vt_fd_features.csv` header.

**Raw (1–40):** `De-identification Name` · `VOYAGE` · `NOON_UTC` · `AVG_SPEED` ·
`SPEED_THROUGH_WATER` · `ME_AVG_RPM` · `PROPELLER_SPEED` · `FORE_DRAFT` · `AFTER_DRAFT` ·
`DISPLACEMENT` · `CARGO_ON_BOARD` · `WIND_SCALE` · `SEA_HEIGHT` · `SEA_WATER_TEMP` · `WIND_SPEED` ·
`WIND_DIRECTION` · `SWELL_HEIGHT` · `SWELL_DIRECTION` · `SEA_DIRECTION` · `WATER_DEPTH` · `MID_DRAFT` ·
`TOTAL_DISTANCE` · `SEA_SPEED_DISTANCE` · `DIFF_STW_SOG_SLIP` · `FULL_SPD_STW_SLIP` ·
`HORSE_POWER`* · `LOAD_PCT`* · `SFOC`* · `ME_SLIP`* · `THRUST`* · `THRUST_QUOTIENT`* ·
`TOTAL_CONSUMP`* · `ME_CONSUMPTION`* · `ME_FULLSPEED_CONSUMP_HSHFO`* · `ME_FULLSPEED_CONSUMP_ULSFO`* ·
`ME_FULLSPEED_CONSUMP_VLSFO`* · `ME_FULLSPEED_CONSUMP_LSMGO`* · `ME_FULLSPEED_CONSUMP_BIO_HSFO`* ·
`HOURS_FULL_SPEED` · `HOURS_TOTAL`  — *(`*` = leakage: H + T, banned as input)*

**Keys (41–43):** `ship_id` · `noon_utc` · `ship_type`

**Flags (44–46):** `is_masked` · `is_predict` · `is_steady_state`

**Targets (47–51):** `target_fuel_type` · `target_me_fs_consump` · `target_energy_mj` ·
`target_me_fs_consump_per_hour` · `target_energy_mj_per_hour`

**Group F — fuel (52–57):** `fuel_is_hshfo` · `fuel_is_ulsfo` · `fuel_is_vlsfo` · `fuel_is_lsmgo` ·
`fuel_is_bio_hsfo` · `fuel_lcv`

**Group B — maintenance (58–97):** `days_since_hull_clean` · `days_since_hull_clean_log1p` ·
`days_since_hull_clean_sqrt` · `days_since_prop_polish` · `days_since_prop_polish_log1p` ·
`days_since_prop_polish_sqrt` · `days_since_dry_dock` · `days_since_dry_dock_log1p` ·
`days_since_dry_dock_sqrt` · `coating_age_years` · `hull_clock_censored` · `polish_clock_censored` ·
`days_since_dd` · `days_since_uwc` · `days_since_pp` · `days_since_uwi_pp` · `days_since_uwc_pp` ·
`days_since_uwi` · `days_since_any_service` · `days_since_any_event` · `n_hull_cleans` ·
`n_prop_polishes` · `n_drydocks` · `n_inspections` · `n_services_to_date` · `event_count_30d` ·
`event_count_90d` · `event_count_180d` · `last_prop_condition` · `last_hull_coating_condition` ·
`last_cavitation_found` · `last_fouling_severity` · `had_barnacle` · `had_tubeworm` · `had_calcium` ·
`had_algae` · `had_slime` · `hull_clock_sat` · `prop_cond_x_polishclock` · `cavitation_x_polishclock`

**Group C — hydro/speed (98–135):** `mean_draft` · `trim` · `trim_abs` · `mid_draft` ·
`displacement_filled` · `displacement_missing` · `displacement_23` · `cargo` · `depth_draft_ratio` ·
`cargo_utilization` · `is_laden` · `wetted_proxy` · `trim_ratio` · `stw` · `sog` · `rpm` ·
`prop_speed` · `stw2` · `stw3` · `rpm2` · `rpm3` · `prop_speed3` · `admiralty_fuel_proxy` ·
`speed_per_rpm` · `stw_minus_sog` · `apparent_advance` · `slip_ratio` · `rpm2_stw` ·
`full_spd_stw_slip` · `diff_stw_sog_slip` · `slip_excess` · `sea_speed_fraction` · `total_distance` ·
`froude_depth` · `shallow_flag` · `water_depth` · `hours_full_speed` · `wind_scale`

**Group D — weather (136–160):** `weather_missing` · `sea_water_temp_missing` · `wind_speed` ·
`wind_speed2` · `sea_height` · `sea_height2` · `swell_height` · `combined_wave` · `sea_water_temp` ·
`temp_dev` · `density` · `density_factor` · `kin_visc` · `reynolds_proxy` · `wind_dir_sin` ·
`wind_dir_cos` · `sea_dir_sin` · `sea_dir_cos` · `swell_dir_sin` · `swell_dir_cos` · `head_wind` ·
`beam_wind` · `head_sea` · `beam_sea` · `head_sea_sq`

**Group E — statistics (161–214):** `stw_roll7_mean` · `stw_roll7_std` · `stw_roll14_mean` ·
`stw_roll14_std` · `stw_roll30_mean` · `stw_roll30_std` · `rpm_roll7_mean` · `rpm_roll7_std` ·
`rpm_roll14_mean` · `rpm_roll14_std` · `rpm_roll30_mean` · `rpm_roll30_std` ·
`full_spd_stw_slip_roll7_mean` · `full_spd_stw_slip_roll7_std` · `full_spd_stw_slip_roll14_mean` ·
`full_spd_stw_slip_roll14_std` · `full_spd_stw_slip_roll30_mean` · `full_spd_stw_slip_roll30_std` ·
`sea_height_roll7_mean` · `sea_height_roll7_std` · `sea_height_roll14_mean` · `sea_height_roll14_std` ·
`sea_height_roll30_mean` · `sea_height_roll30_std` · `wind_speed_roll7_mean` · `wind_speed_roll7_std` ·
`wind_speed_roll14_mean` · `wind_speed_roll14_std` · `wind_speed_roll30_mean` · `wind_speed_roll30_std` ·
`mean_draft_roll7_mean` · `mean_draft_roll7_std` · `mean_draft_roll14_mean` · `mean_draft_roll14_std` ·
`mean_draft_roll30_mean` · `mean_draft_roll30_std` · `sea_water_temp_roll7_mean` ·
`sea_water_temp_roll7_std` · `sea_water_temp_roll14_mean` · `sea_water_temp_roll14_std` ·
`sea_water_temp_roll30_mean` · `sea_water_temp_roll30_std` · `stw_minus_expanding_mean` ·
`sea_water_temp_expanding_mean` · `thermal_exposure_since_clean` · `stw_vs_type_ref` ·
`voyage_position` · `voyage_mean_stw` · `coating_x_thermal` · `rpm_excess_ship` · `rpm_excess_type` ·
`admiralty_excess_ship` · `admiralty_excess_type` · `thermal_fouling_index`

### Signal sanity-check

`baseline.py` (`python -m ym_datalake.ml_york.feature_engineering.baseline`) trains a RandomForest on
the 163 `predict_safe_features` (S1–S12, steady-state rows, target `target_energy_mj`) purely to prove
the leakage-free features carry signal and to rank importance — it is **not** a submission model.
