# The synthetic data

Everything in the lake that we made up, where it comes from, and how to reproduce it.

> **This is not the old M1 fleet generator.** A document with this filename used to
> describe `ym_datalake/synthetic_data/` — a module that generated a fictional 9-vessel
> fleet from scratch. **That module and that document have both been deleted.** The
> current pipeline is built on the real hackathon dataset and generates no vessels, no
> voyages and no physics; this document is about which columns of the *real* lake are
> estimated. If you remember the old one, forget it — the filename is all they share.

---

## The thesis

**Synthesized values are conditioned on real measurements, and never feed physics back.**

That is the rule the whole design serves, and it runs in one direction only:

- Geography is derived **from** real distances. A day the ship really made 400 nm moves
  400 nm along the invented route. The route never tells you how far the ship went.
- The UWI numbers are anchored **on** the real ISO 19030 speed loss. A hull the data says
  is slow gets a fouling rating that says it is dirty. The rating never tells you the
  speed loss.

Neither is ever an input to a physical number. Speed loss, power, fuel and CO₂ are
computed from the real columns alone. If you deleted every synthesized column tomorrow,
every ISO 19030 figure in the lake would be unchanged.

The one exception is stated plainly and is not physics: **every USD figure** in the lake
descends from a synthesized bunker price. There is no money in the source data.

---

## Everything that is estimated

There are exactly **two RNG call sites** in the entire ETL. Everything else on this list
is deterministic — a fixed assumption, or a function of real data.

| What | Where | Seeded by | Method |
|---|---|---|---|
| `fuel_price` (9,130 rows) | `etl/fuel.py::build_price_series` | `Random(42)` — **one stream**, fuel-major | mean-reverting GBM in log space |
| `uwi` roughness / coating / rating / coverage | `etl/raw/uwi.py` | `Random(f'{seed}:{ship}:{day}:{type}')` — a **string** key | draw inside the real grade's band, shifted toward the real speed loss |
| lat / lon / heading / ports | `etl/ports.py` + `curated/geography.py` | seed sets a rotation **phase offset only** — no RNG | walk a bent great-circle polyline by the **real** cumulative distance |
| calendar (`report_date`, `year`, `month`, all `*_date`) | `etl/epoch.py` | deterministic | day 0 = **2021-07-01** |
| event `cost_usd` / `downtime_hours` / `location` | `curated/dims.py`, `curated/recommendation.py` | deterministic | fixed per-type cost model |
| `charter_usd_per_day` | `curated/optimize.py` | deterministic | flat $45,000/day |
| `imo_number`, `lightship_t`, `transverse_area_m2`, `build_year`, `dwt` | `dataset/vessel.jsonl` | — | fixed assumptions; not derivable from the data |

Every one of these columns is tagged `estimated` in
[`ym_datalake/schema.py`](../ym_datalake/schema.py). **Never quote them as fact.**

---

## 1. Fuel prices — the only money in the lake

`fuel_price` is 9,130 rows: 5 fuels × 1,826 days (the full relative-day span, 0–1825).

A mean-reverting geometric random walk in log space. Each day:

```
price *= exp( 0.02 · ln(base / price)  +  N(0, 0.012) )
price  = clamp(price, 0.5 × base, 2.0 × base)
```

The mean-reversion term is what stops five years of random walk from wandering somewhere
absurd; the clamp is the backstop. Starting levels are roughly in line with 2021–2026
bunker spreads — HSHFO cheapest, LSMGO dearest, bio at a premium:

| Fuel | Base (USD/t) |
|---|---:|
| HSHFO | 450 |
| VLSFO | 600 |
| ULSFO | 640 |
| BIO_HSFO | 720 |
| LSMGO | 800 |

Two properties worth knowing before you rely on this table:

**The five series share one RNG stream.** The fuel loop is the *outer* loop, so HSHFO
draws its 1,826 shocks, then ULSFO draws the next 1,826, and so on. The consequence: the
series are **not independently reproducible per fuel**. Change the number of days, or the
fuel list, and every series after the first moves. They are also not correlated the way
real bunker grades are — real HSHFO and VLSFO move together, these don't.

**Every day in the span is priced, including days no ship reported.** A price series with
holes in it makes joins lie: a `LEFT JOIN` on a sparse price table silently drops the
excess-cost figure for exactly the days a ship was idle. So all 1,826 days get all 5
fuels, whether anyone burned them or not.

---

## 2. UWI — real grades, synthesized numbers

The `uwi` table is 53 inspection rows: the **43 `UWI` atoms** plus the **10 `DD` rows** (a
dry-dock inspects the hull it hauls out).

| Real (measured) | Synthesized (estimated) |
|---|---|
| `propeller_condition` (Good/Fair/Poor) | `propeller_roughness_um` |
| `hull_coating_condition` (Good/Fair/Poor) | `coating_breakdown_pct` |
| `hull_fouling_type` (the comma list) | `hull_fouling_rating` (0–100) |
| `cavitation_found` (Yes/No) | `hull_fouling_coverage_pct` |
| the inspection day | |

The dataset simply does not measure roughness in µm or coverage in %. But the estimates
are **not noise**: each is drawn inside the band its **real grade** implies, then pulled
toward the position that the **real ISO 19030 speed loss on the inspection day** points
at. So the rating ↔ speed-loss relationship every dashboard chart leans on holds against
real measurements rather than against a random number generator.

**The bands.** Chosen so each grade straddles the threshold it ought to:

| Grade | `propeller_roughness_um` | `coating_breakdown_pct` |
|---|---|---|
| Good | 150–260 | 2–18 |
| Fair | 260–380 | 20–44 |
| Poor | 380–520 | 46–85 |
| *(ungraded)* | 200–420 | 5–60 |

**The draw**, for a band `(lo, hi)`:

```
centre   = U(0.3, 0.7)                        # the grade's own spread
position = 0.55 · centre + 0.45 · band_position(speed_loss / 10)
value    = lo + (hi − lo) · clamp(position, 0, 1)
```

`band_position` maps the day's real trailing-mean speed loss onto 0 (clean) → 1 (fouled),
saturating at 10 %. So the real measurement carries **45 %** of the weight and the grade
carries 55 %.

**The ungraded fallback exists because the source is sparse.** `hull_coating_condition` is
filled on only 26 of 77 events, so for most inspections there is no grade to condition on
and the real speed loss is the *only* thing positioning the draw. (A curiosity that falls
out of this: the source contains **no `Poor` coating grade at all**, so the 46–85 % Poor
band is never actually drawn from.)

**Rating and coverage** are anchored directly on the measurement, with jitter:

```
rating   = 7.0 · speed_loss_pct + U(−6, +6),  clamped to 0–100, integer
coverage = min(1.15 · rating, 100)
```

**`recommended_action` is a pure rule — no RNG at all:**

```
clean   if speed_loss ≥ 8 %  or  coating_breakdown ≥ 45 %
polish  if roughness ≥ 300 µm
none    otherwise
```

Across the 53 inspections that yields: `none` 29, `polish` 17, `clean` 7.

**The seed key is a string**, `f'{seed}:{ship}:{day}:{type}'` — not a shared counter. So
each inspection's draw is independent of the order the events are iterated in, and adding
an inspection does not perturb any other. Unlike the price series, this one *is*
reproducible row by row.

---

## 3. Geography — draped, never generated

The real dataset has no position, no port and no heading. It has a `VOYAGE` number and a
real daily `TOTAL_DISTANCE`. Geography invents just enough to give the lake a spatial
dimension, in the one direction that cannot corrupt anything.

**There is no RNG here.** The seed contributes a **phase offset only** — it staggers the
ships around their shared rotation loop so the whole fleet isn't sitting in the same port
on day 0. Everything else is a deterministic function of the real distances.

**The 10 ports are real; the calls are not.** Real LOCODEs, real coordinates — but *this
fleet never called at them*. `dim_port` is entirely estimated as far as this fleet is
concerned. Each hull class walks a fixed liner rotation:

- **W1** — Asia–Europe: Shanghai → Hong Kong → Singapore → Colombo → Dubai → Rotterdam →
  Hamburg, and back.
- **W2** — Trans-Pacific: Shanghai → Busan → Tokyo → Los Angeles, and back.

**The routes bend around land, and that is not decoration on decoration.** A raw great
circle between two real ports goes through real continents. Colombo → Dubai crosses the
Rub' al Khali. Shanghai → Hong Kong runs through inland Fujian. Rotterdam → Hamburg is
250 nm of dry land. So `ports.ROUTE_WAYPOINTS` bends each leg through actual water —
Malacca, Hormuz, Bab-el-Mandeb, Suez, Gibraltar, around Kyushu, out of Tokyo Bay.

The reason is stated in the source and worth repeating:

> A fleet map with ships in the desert discredits every honest number standing next to it.

`gc_point` interpolates in 3-D unit vectors (spherical slerp), so it is
**antimeridian-safe** — it never linearly interpolates longitude, and a Tokyo → Los
Angeles track does not fly backwards across the Pacific.

**Placing a day:** walk the rotation's polyline by the ship's **real** cumulative distance
since the voyage began. `heading_deg` is the bearing of the polyline at that point — which
is why the heading is available at all, and why the ISO 15016 wind correction had a
convention question to answer in the first place. (It answered it: see
[`curated-dataset.md`](curated-dataset.md#corrections).)

---

## 4. The calendar

The real time axis is `NOON_UTC` — a relative day, 0–1825, where day 0 is each ship's own
first record. Every raw table keys off that, and it is real.

A calendar exists in the curated zone only, and only because **CII needs one**: the IMO
required line steps down per calendar year (Z% = 5/7/9/11 % for 2023–2026), so without a
year there is no rating at all.

**Epoch: day 0 = 2021-07-01**, shared by all 15 ships — so the span 0–1825 becomes
2021-07-01 … 2026-06-30, exactly five years. The ships did **not** in fact all start on
the same date. This is an assumption, and every `report_date` / `*_date` column in the
lake inherits it.

---

## 5. Money

Nothing in the source data is denominated in anything. All of this is assumed:

| Event | `cost_usd` | `downtime_hours` |
|---|---:|---:|
| `DD` — dry dock | 1,400,000 | 380 |
| `UWC` — hull cleaning | 90,000 | 18 |
| `PP` — propeller polish | 30,000 | 8 |
| `UWI` — inspection | 8,000 | 4 |

Downtime is charged at **$1,000/hour**, so an event's *full* cost is
`cost_usd + downtime_hours × 1000`. `location` is the port nearest the ship's synthesized
track that day — which makes it a synthesized position rounded to a synthesized port list.

**`charter_usd_per_day` = $45,000** is the load-bearing one. It is the only thing that
makes `usd_per_nm` convex with an interior minimum: on fuel alone, the cheapest speed is
always the slowest speed. Drop the charter rate and the speed optimizer degenerates to
"stop the ship". It is a market rate, not a hull property, which is why it lives in
`optimize.py` and deliberately not on `dim_vessel`.

---

## 6. Vessel particulars

Most of `vessel.jsonl` is honestly derived from `vt_fd.csv` — see
[`vessel.md`](vessel.md). Five columns are not:

| Column | Value | Why it is a guess |
|---|---|---|
| `imo_number` | 9800001–9800015 | **Synthetic. Not real IMO numbers.** The dataset is de-identified; there is nothing to recover. |
| `lightship_t` | 36,000 | Not derivable from noon reports. |
| `transverse_area_m2` | 1,300 | Windage area. Not derivable — and it is an input to the wind correction, which is one reason that correction turned out to be worthless. |
| `dwt` | 150,000 | Scantling displacement minus the estimated lightship — so it inherits that guess. **CII is computed against `dwt`**, so every CII rating rests on it. |
| `build_year` | 2016 | Not derivable. |

---

## Reproducing it

```bash
uv run python -m ym_datalake.etl build --out ./tmp --seed 42   # 42 is the default
```

The build is deterministic given a seed. Changing `--seed` moves exactly three things: the
bunker prices, the UWI draws, and the rotation phase offset.

**Every physical figure in the lake is seed-invariant.** Speed loss, corrected power,
expected speed, slip, admiralty coefficient, SFOC, FOC, CO₂ and CII are all computed from
the real columns and fixed constants; none of them is downstream of a random number. Change
the seed and not one of them moves.

What *does* move with the seed is everything denominated in dollars, plus the columns that
are functions of dollars — `excess_cost_usd`, `fact_voyage.fuel_cost_usd`,
`fact_speed_profile`, and the `t_star_days` / `recommended_clean_day` in
`fact_recommendation` (whose β is fitted on the synthesized cost series). The synthesized
propeller-roughness and coating thresholds in `fact_maintenance_recommendation` move too.
That is the expected blast radius of an estimate, and it is exactly the set of columns
`schema.py` tags `estimated`.

> One nuance, for completeness. The ISO 15016 convention is chosen *empirically* at build
> time, and the `true_compass` arm reads the synthesized heading — so in principle the seed
> could flip the verdict and thereby move the physics. It cannot in practice: the winner is
> `none`, which uses no heading at all, and it wins by a margin (4.534 pp vs 5.009 / 5.068)
> far larger than anything a phase offset perturbs. The verdict is reported in the build
> output on every run, so a flip could not happen silently.
