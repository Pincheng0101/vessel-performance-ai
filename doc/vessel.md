# `vessel` — ship particulars (dimension table)

One row per ship, 15 rows, joinable on `ship_id`. It carries the hull, engine and
propeller particulars of the 15 ships in `vt_fd` so queries can normalise by ship
(consumption per kW of MCR, speed loss by propeller variant) instead of treating
every ship as anonymous.

The hackathon dataset ships **no vessel master**. Every value here was either
reverse-engineered from `vt_fd`/`maintenance`, taken from the W-class sister-ship
design, or — for three columns — **assumed**. The `Provenance` column below says
which, per column. Read it before you quote a number.

```
dataset/vessel.jsonl ──load-real──▶ tmp/raw/vessel/vessel.jsonl ──upload──▶ s3://<bucket>/raw/vessel/
                                                                                       │
                                                                         Glue table `vessel` (unpartitioned)
```

`dataset/vessel.jsonl` is **committed source data**, like the CSVs — hand-derived,
not computed. The loader re-validates it against `VESSEL_COLUMNS` on every load
rather than trusting it.

---

## ⚠️ Two things you must know first

**1. The IMO numbers are fabricated.** `imo_number` (9800001–9800015) is a synthetic
surrogate key we minted so the table has a conventional vessel identifier. These are
**not the real IMO numbers** of any Yang Ming ship, they carry no check digit, and they
must never be used to look a vessel up in an external register. The range is deliberately
disjoint from the legacy synthetic lake's 9700001–9700009 so the two can never collide.
**`ship_id` is the real join key.**

**2. Three columns are assumptions, not measurements.** `transverse_area_m2`,
`lightship_t` and `build_year` **cannot be derived from this dataset at all** — no column
in `vt_fd` constrains them. They are typical values for a 14,000 TEU container ship,
carried so that downstream code has *something* to reference. Anyone computing windage
(`transverse_area_m2`) or deadweight is quoting an assumption, not a finding. `dwt`
inherits this: it is scantling displacement minus the *assumed* lightship.

---

## The finding this table encodes: S22 has a W1 propeller

The dataset README groups the fleet as W1 = S1–S8, S21 and W2 = S9–S12, S22, S23, and
calls them "sister ships on different routes". The data disagrees on one point. Recovering
propeller pitch per ship (below) gives two tight, well-separated clusters:

| Variant | Pitch (m) | Ships |
| --- | --- | --- |
| **P1** | ≈ 9.886 | S1–S8, S21, **S22** |
| **P2** | ≈ 9.556 | S9–S12, S23 |

**S22 is grouped `W2` by the README but turns the pitch of a W1 boat** (9.8863 m, against
9.556 m for its W2 sisters). This is not noise. The per-ship medians *within* a cluster agree
to 0.0013 m, while the two clusters sit 0.329 m (3.45 %) apart — a separation 250× the
within-cluster spread. So `hull_class` and `propeller_variant` are
**separate columns** and they disagree for exactly one ship. Group by `propeller_variant`,
not `hull_class`, whenever the propeller matters (slip, thrust, RPM-to-speed). This is the
main reason the table exists; `tests/unit/ym_datalake/etl/test_real_data.py` pins it.

---

## Schema

Provenance: **measured** = derived from the data, reproducible · **class** = W-class design
value, identical across the fleet · **estimated** = assumption, *not* derivable from the data.

| Column | Type | Unit | Provenance | Notes |
| --- | --- | --- | --- | --- |
| `imo_number` | string | — | **estimated** | **SYNTHETIC** (9800001–9800015). Not a real IMO. |
| `ship_id` | string | — | measured | Join key → `vt_fd.ship_id`, `maintenance.ship_id`. |
| `hull_class` | string | — | class | `W1` / `W2`, per the README grouping. |
| `role` | string | — | measured | `train` (S1–S12) / `predict` (S21–S23). |
| `vessel_type` | string | — | class | `container`. |
| `teu_nominal` | int | TEU | class | 14000. |
| `loa_m` | double | m | class | Length overall. |
| `lpp_m` | double | m | class | Length between perpendiculars. |
| `breadth_m` | double | m | class | Moulded breadth. |
| `design_draft_m` | double | m | class | 14.5. |
| `scantling_draft_m` | double | m | class | 15.8. |
| `displacement_design_t` | double | MT | measured | Displacement–draft fit, at design draft. |
| `displacement_scantling_t` | double | MT | measured | Same fit, at scantling draft. |
| `cb_design` | double | — | measured | Block coefficient from the fitted displacement. |
| `cb_scantling` | double | — | measured | Same, at scantling draft. |
| `cw` | double | — | measured | Waterplane coefficient, from the fit's slope. |
| `tpc_t_per_cm` | double | MT/cm | measured | Tonnes per cm immersion, from the same slope. |
| `dwt` | double | MT | **estimated** | Scantling displacement − *assumed* lightship. |
| `gross_tonnage` | double | — | class | |
| `lightship_t` | double | MT | **estimated** | **Not derivable from the data.** |
| `mcr_kw` | double | kW | measured | Calm-water power curve at design speed. |
| `ncr_kw` | double | kW | measured | ≈ 85 % MCR, consistent with observed `load_pct`. |
| `mcr_rpm` | double | RPM | measured | Upper envelope of `me_avg_rpm`. |
| `design_speed_kn` | double | kn | measured | STW at the knee of the calm-water curve. |
| `propeller_type` | string | — | class | `FPP` — fixed pitch (pitch is constant per ship). |
| `propeller_variant` | string | — | measured | `P1` (9.886 m) / `P2` (9.556 m). **See above.** |
| `n_blades` | int | — | class | 5. |
| `diameter_m` | double | m | class | 10.0. |
| `pitch_m` | double | m | measured | Per-ship median (derivation below). |
| `pitch_diameter_ratio` | double | — | measured | `pitch_m / diameter_m`. |
| `transverse_area_m2` | double | m² | **estimated** | **Not derivable from the data.** Windage area. |
| `build_year` | int | — | **estimated** | **Not derivable from the data.** |

Schema lives in `table/real_data.py::VESSEL_COLUMNS` — the single source of truth for both
the loader and the Glue table.

---

## Derivations

**Propeller pitch** — the only exact one. For a fixed-pitch propeller the theoretical
(no-slip) advance per revolution is the pitch, so:

```
pitch_m = PROPELLER_SPEED × 1852 / (60 × ME_AVG_RPM)
```

taken as the per-ship median over rows with `ME_AVG_RPM > 30` and `PROPELLER_SPEED > 5`
(~1,400 voyage-days per ship). Two independent checks confirm the reading. First, each ship's
rows cluster tightly around its own median — median absolute deviation 0.0015–0.0041 m — as
they must for a fixed-pitch propeller. (The plain standard deviation is much larger, 0.05–0.41 m,
but that is a handful of manoeuvring/low-load outliers, which is why the median is taken rather
than the mean.) Second, it closes the slip identity: `(PROPELLER_SPEED − AVG_SPEED) /
PROPELLER_SPEED` reproduces the dataset's own `ME_SLIP` column (13.31 % vs a reported 13.23 %
on a spot-checked row).

> Note the dataset README labels `PROPELLER_SPEED` as 螺旋槳轉速 (propeller revolutions),
> unit RPM. It is not: the values are a **theoretical speed in knots** (pitch × shaft RPM).
> That is the only reading under which the slip identity closes.

**Hull form** — regress `DISPLACEMENT` on `MID_DRAFT` across all ships (they are one class,
so the rows pool). The slope gives immersion tonnage → `tpc_t_per_cm` and `cw`; evaluating
the fit at design and scantling draft gives `displacement_design_t` / `displacement_scantling_t`,
and dividing by the moulded box (`lpp_m × breadth_m × draft`) gives `cb_design` / `cb_scantling`.

**Engine** — fit the calm-water power curve `P = a·V^n` on low-wind, steady, full-speed rows
(`HORSE_POWER` vs `SPEED_THROUGH_WATER`). `design_speed_kn` is the knee of that curve;
`mcr_kw` is the power there; `ncr_kw` follows at ≈85 % MCR, cross-checked against the observed
`LOAD_PCT` distribution. `mcr_rpm` is the upper envelope of `ME_AVG_RPM`.

Everything else is either a class design value or, for the three flagged columns, an assumption.

---

## Joining

```sql
-- Normalise consumption by installed power.
SELECT f.ship_id,
       AVG(f.me_consumption) / AVG(v.mcr_kw) * 1000 AS mt_per_day_per_mw
FROM vt_fd f JOIN vessel v ON f.ship_id = v.ship_id
WHERE f.hours_full_speed >= 20
GROUP BY f.ship_id;

-- Group by what the propeller actually is, not what the README says the hull is.
SELECT v.propeller_variant, COUNT(*) AS n, AVG(f.me_slip) AS avg_slip
FROM vt_fd f JOIN vessel v ON f.ship_id = v.ship_id
WHERE f.masked_flag = false
GROUP BY v.propeller_variant;

-- The one ship where hull class and propeller disagree.
SELECT ship_id, hull_class, propeller_variant, pitch_m
FROM vessel
WHERE hull_class = 'W2' AND propeller_variant = 'P1';   -- → S22
```

The table is unpartitioned (15 rows); a full scan is free, so join freely.

---

## Load & upload

`vessel` rides the existing real-data path — no separate command:

```bash
uv run python -m ym_datalake.etl load-real --data ./dataset --out ./tmp
uv run python -m ym_datalake.etl load-real --data ./dataset --out ./tmp --upload --env dev
```

The upload allowlist in `ym_datalake/etl/uploader.py::upload_real_data` names each raw
prefix explicitly (`vt_fd`, `maintenance`, `vessel`) — a table absent from that list is
written locally but silently never uploaded.
