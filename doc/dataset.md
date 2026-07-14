# The dataset

What the three files in `dataset/` actually contain — measured, not assumed.

[`dataset/README.md`](../dataset/README.md) is the **organizers' specification** (in
Chinese): the task, the submission format, the scoring. It is the authority on what the
competition asks for. This document is the complement: what the data *is* once you open
it — the grain, the counts, and the quirks. Where the two touch, the organizers' file
wins; nothing here contradicts it.

The quirks are the point. Almost everything in
[`ym_datalake/etl/curated/clean.py`](../ym_datalake/etl/curated/clean.py) exists because
of something on this page.

| File | Grain | Rows × cols |
|---|---|---|
| `vt_fd.csv` | ship × noon report | 21,282 × 40 |
| `maintenance.csv` | maintenance event | 77 × 9 |
| `vessel.jsonl` | ship | 15 × 32 |

The fleet is 15 ships on a **relative** day axis: `NOON_UTC` runs 0–1825, and day 0 is
*each ship's own* earliest record — not a shared calendar date. There is no calendar
anywhere in the source data.

| Group | Ships | Role |
|---|---|---|
| W1 | S1–S8, S21 | 8 training + 1 prediction |
| W2 | S9–S12, S22, S23 | 4 training + 2 prediction |

S1–S12 are fully public; **S21–S23 have windows of masked data** — that is the thing the
hackathon asks you to predict.

---

## 1. `vt_fd.csv` — 21,282 noon reports

### Read these five traps first

Each one will silently corrupt a result if you miss it.

**1. `WIND_DIRECTION`, `SWELL_DIRECTION` and `SEA_DIRECTION` are 16-point compass
indices (0–15), not degrees.** A value of `7` means 7 × 22.5° = 157.5°. Feed the raw
number into a trigonometric correction and every angle is wrong by a factor of 22.5.
See `physics.compass_to_deg`.

**2. There is no heading column.** So it is genuinely ambiguous whether `WIND_DIRECTION`
is a *true compass* bearing (which needs a heading to make it bow-relative) or is
*already* bow-relative. The organizers' README describes the units as "相對/羅經"
(relative/compass) — which is to say, both. We resolved this empirically rather than
guessing; the answer is in [`curated-dataset.md`](curated-dataset.md#corrections), and it
is not the one you would expect.

**3. `DISPLACEMENT` is only 68.5 % filled**, and every ISO 19030 number needs it.
`MID_DRAFT` shares exactly the same 68.5 % fill (they are missing on the same rows);
`ME_CONSUMPTION` is thinner still at 66.9 %.

**4. 344 rows are duplicates.** 340 `(ship_id, NOON_UTC)` keys carry more than one row,
for 344 surplus rows in total. They are near-identical, not contradictory: the first pair
(S1, day 0) differs in exactly one column — `ME_SLIP` is `13.23` on one row and `13.2` on
the other. Any `GROUP BY ship, day` that assumes uniqueness is quietly wrong.

**5. Gross outliers survive into the file.** These are not edge cases, they are
impossible:

| Column | Worst value | Against |
|---|---|---|
| `HORSE_POWER` | 671,576 kW | 47,700 kW MCR |
| `SFOC` | 95,056 g/kWh | ~170 g/kWh typical |
| `DISPLACEMENT` | 1,622,300 t | 185,900 t scantling |
| `LOAD_PCT` | 516 % | 100 % MCR |
| `ME_SLIP` | −1,048 % | — |
| `HOURS_TOTAL` | 42.5 h | 24 h in a day |

### Columns and fill rates

Category **A** is visible everywhere; **H** (engine) and **T** (fuel) are what get masked
on S21–S23. Fill rate counts a `HIDDEN`/`PREDICT` cell as *not* filled.

| Column | Cat | Unit | Fill |
|---|:--:|---|---:|
| `De-identification Name` | A | S1–S23 | 100 % |
| `VOYAGE` | A | — | 100 % |
| `NOON_UTC` | A | relative day | 100 % |
| `AVG_SPEED` | A | kn (SOG) | 100 % |
| `SPEED_THROUGH_WATER` | A | kn (STW) | 100 % |
| `ME_AVG_RPM` | A | RPM | 100 % |
| `PROPELLER_SPEED` | A | RPM | 100 % |
| `CARGO_ON_BOARD` | A | MT | 100 % |
| `HOURS_FULL_SPEED` | F | hr | 100 % |
| `HOURS_TOTAL` | A | hr | 100 % |
| `FORE_DRAFT` / `AFTER_DRAFT` | A | m | 99.95 % |
| `WIND_SCALE` | F | Beaufort | 99.95 % |
| `WIND_DIRECTION` | A | **16-point compass** | 99.95 % |
| `WATER_DEPTH` | A | m | 99.95 % |
| `TOTAL_DISTANCE` | A | nm (over ground) | 99.95 % |
| `SEA_SPEED_DISTANCE` | A | nm (through water) | 99.95 % |
| `SEA_HEIGHT` | A | m | 81.61 % |
| `WIND_SPEED` | A | kn | 81.61 % |
| `SWELL_HEIGHT` | A | m | 81.61 % |
| `SWELL_DIRECTION` | A | **16-point compass** | 81.61 % |
| `SEA_DIRECTION` | A | **16-point compass** | 81.61 % |
| `DIFF_STW_SOG_SLIP` | A | kn (current proxy) | 81.66 % |
| `FULL_SPD_STW_SLIP` | A | % | 80.87 % |
| `DISPLACEMENT` | A | MT | **68.51 %** |
| `MID_DRAFT` | A | m | **68.51 %** |
| `SEA_WATER_TEMP` | A | °C | 68.55 % |
| `HORSE_POWER` | H | kW | 98.25 % |
| `ME_SLIP` | H | % | 96.27 % |
| `THRUST` | H | kN | 91.71 % |
| `LOAD_PCT` | H | %MCR | 80.01 % |
| `SFOC` | H | g/kWh | 80.02 % |
| `THRUST_QUOTIENT` | H | — | 78.83 % |
| `TOTAL_CONSUMP` | T | MT/day | 98.25 % |
| `ME_FULLSPEED_CONSUMP_HSHFO` | T | MT/day | 98.25 % |
| `ME_FULLSPEED_CONSUMP_VLSFO` | T | MT/day | 98.25 % |
| `ME_FULLSPEED_CONSUMP_LSMGO` | T | MT/day | 98.25 % |
| `ME_FULLSPEED_CONSUMP_ULSFO` | T | MT/day | 98.24 % |
| `ME_FULLSPEED_CONSUMP_BIO_HSFO` | T | MT/day | **27.46 %** |
| `ME_CONSUMPTION` | T | MT/day | **66.92 %** |

### The masked windows

Placeholder cells, counted over the whole file:

| Marker | Cells | Meaning |
|---|---:|---|
| `HIDDEN` | **4,429** | the value exists but is withheld |
| `PREDICT` | **102** | the value you must predict |

372 rows carry at least one marker, all on S21–S23. The 102 `PREDICT` cells sit in just
two columns: **91 in `ME_FULLSPEED_CONSUMP_HSHFO`** and **11 in
`ME_FULLSPEED_CONSUMP_VLSFO`** — the day's single fuel.

The masking is anchored on maintenance. **S21–S23 have exactly 14 maintenance events
between them, and each one is followed by a masked window** — 20 to 54 days long. Inside
a window, `PREDICT` lands on **5 to 10 days** (mean 7.3, total 102), and everything else
masked is `HIDDEN`:

| Ship | Events | PREDICT days each |
|---|---:|---|
| S21 | 6 (day 134, 950, 1003, 1383, 1617, 1760) | 6, 10, 8, 7, 5, 7 |
| S22 | 3 (day 910, 1206, 1679) | 10, 7, 7 |
| S23 | 5 (day 770, 1304, 1483, 1535, 1657) | 8, 7, 7, 7, 6 |

**The `PREDICT` days are pre-filtered clean steady-state points.** The organizers state
the filter (≥ 22 h at full speed, Beaufort ≤ 4, a single fuel that day) and we verified it
holds: **0 of the 102 violate it.** The 269 masked-but-not-`PREDICT` rows are the ones
that failed it — only 188 make 22 hours at full speed, and only 124 are Beaufort ≤ 4.

That filter is the strongest hint the dataset gives you: whatever you fit, the days you
will be scored on are calm, fast, and single-fuel.

---

## 2. `maintenance.csv` — 77 events

Nine columns. Sparse, and inconsistently formatted.

**Composite events.** `event_type` runs on a `+` grammar. Split it and the 77 source rows
become **115 atomic events**:

| Source `event_type` | Rows | | Atom | Count |
|---|---:|---|---|---:|
| `UWI+PP` | 31 | | `PP` — propeller polishing | 49 |
| `UWI` | 12 | | `UWI` — underwater inspection | 43 |
| `PP` | 11 | | `UWC` — underwater hull cleaning | 13 |
| `DD` | 10 | | `DD` — dry dock | 10 |
| `UWC+PP` | 7 | | | **115** |
| `UWC` | 6 | | | |

Atomic types matter downstream because each maps to exactly one reset: `UWC` resets the
hull, `PP` the propeller, `DD` both, and `UWI` **nothing at all** — an inspection only
looks.

**The condition columns are sparse, and one grade never appears.**

| Column | Filled | Values |
|---|---:|---|
| `propeller_condition` | 45/77 | Good 36, Fair 5, Poor 4 |
| `hull_coating_condition` | **26/77** | Good 23, Fair 3 — **no `Poor` at all** |
| `cavitation_found` | 36/77 | No 25, Yes 11 |
| `hull_fouling_type` | 48/77 | free-form comma lists |

`hull_fouling_type` is a comma-separated list drawn from `barnacle` / `slime` / `algae` /
`tubeworm` / `calcium`, with **inconsistent order and spacing** — `barnacle,slime,algae`,
`slime,algae,barnacle` and `barnacle, slime, algae` (with spaces) are all present and all
mean the same thing. Parse it as a set, never as a string.

**10 of the 15 ships dry-dock** (S1–S8, S21, S22). **S9–S12 and S23 never do** — which is
why they can have no dry-dock performance indicator later on.

---

## 3. `vessel.jsonl` — 15 ships

**This file is not shipped by the organizers.** It is ours: hull particulars
reverse-engineered from `vt_fd.csv` itself. [`doc/vessel.md`](vessel.md) documents the
derivation of every column; this is the summary.

The load-bearing fact: **W1 and W2 are the same design.** All the hull geometry is
identical across all 15 ships —

| | |
|---|---|
| LOA / LPP / breadth | 368.0 m / 352.0 m / 51.0 m |
| Design / scantling draft | 14.5 m / 15.8 m |
| Design / scantling displacement | 166,500 t / 185,900 t |
| MCR / MCR rpm / design speed | 47,700 kW / 76 rpm / 21.5 kn |
| DWT / GT / nominal capacity | 150,000 t / 148,000 / 14,000 TEU |

— and only **seven** columns vary at all: `imo_number`, `ship_id`, `role`, `hull_class`,
`propeller_variant`, `pitch_m`, and `pitch_diameter_ratio`. W1 and W2 differ in the *data*
(they sail different routes) rather than in the steel.

So the real fleet structure is the **propeller**, not the hull:

| Pool | Ships | Pitch |
|---|---|---|
| W1-P1 | S1–S8, S21 (9) | 9.886 m |
| W2-P2 | S9–S12, S23 (5) | 9.556 m |
| **W2-P1** | **S22 only (1)** | 9.886 m |

**S22 is the only W2-P1 ship in the fleet — and it is also a masked prediction ship.** Its
pool is a single vessel with masked windows in it, which is far too thin to fit a speed
exponent on. That one fact is why the reference-curve fit has to widen S22's pool to its
hull class; see [`curated-dataset.md`](curated-dataset.md#reference_curve).

> ⚠️ `imo_number` (9800001–9800015) is **synthetic**. These are not real IMO numbers and
> must never be presented as such. `lightship_t`, `transverse_area_m2`, `dwt` and
> `build_year` are estimates too — they are not derivable from the data.
> See [`synthetic-dataset.md`](synthetic-dataset.md).

---

## 4. Fuels

The `ME_FULLSPEED_CONSUMP_*` columns name exactly five fuels. Lower calorific values are
**given by the organizers' README** (measured, not assumed). Carbon factors are IMO's
published C_F values (MEPC.308(73)) — a published standard, not our assumption. Both live
in [`ym_datalake/etl/fuel.py`](../ym_datalake/etl/fuel.py).

| Fuel | LCV (MJ/kg) | C_F (tCO₂/t) | Share of ship-days |
|---|---:|---:|---:|
| `HSHFO` — high-sulphur heavy fuel oil | 40.2 | 3.114 | 10,574 |
| `VLSFO` — very-low-sulphur fuel oil | 40.2 | 3.151 | 8,146 |
| `LSMGO` — low-sulphur marine gas oil | 42.7 | 3.206 | 1,256 |
| `BIO_HSFO` — bio-blended HSHFO | 39.4 * | 3.114 † | 467 |
| `ULSFO` — ultra-low-sulphur fuel oil | 41.2 | 3.151 | 182 |

\* The organizers flag 39.4 as approximate — bio blend ratios vary, so cross-fuel
conversion for `BIO_HSFO` carries extra uncertainty.

† **`BIO_HSFO` deliberately carries the fossil HSHFO carbon factor.** A tank-to-wake bio
credit depends on the blend ratio and the certification scheme, and the dataset states
neither. Taking the credit would flatter the CO₂ numbers on an assumption we cannot
support, so we don't. It costs nothing: `BIO_HSFO` is used on 27 % of days and **never in
the prediction window**, so no `PREDICT` value depends on this choice.

---

## Where to go next

- [`synthetic-dataset.md`](synthetic-dataset.md) — everything we made up, and how
- [`curated-dataset.md`](curated-dataset.md) — what the ETL does about the quirks above
- [`schema.md`](schema.md) — the 20-table column dictionary
- [`vessel.md`](vessel.md) — how `vessel.jsonl` was derived
- [`iso-19030.md`](iso-19030.md) — the speed-loss standard
