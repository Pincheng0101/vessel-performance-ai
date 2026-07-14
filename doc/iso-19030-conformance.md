# ISO 19030 — Method & Conformance Statement

*Companion to [`iso-19030.md`](./iso-19030.md), which explains the standard. This document
states what **this** implementation actually does, where it deviates, and what it cannot do at
all. It is the document to read before quoting a number from this dashboard to anyone.*

---

## Summary

The Speed Loss Dashboard implements an **ISO 19030-3 alternative method**, not the Part 2
default method.

This is not a shortcut — it is forced by the data. The source is **daily noon reports**
(21,282 rows, one per ship per day). ISO 19030-2's default method requires **continuous
sampling at ≥ 0.1 Hz** with **10-minute block averaging**. Neither is physically possible from
a once-a-day report. Part 3 explicitly permits alternative methods provided the Part 1
principles are respected, so the method below is *conformant* — but only because it is
**declared**, which is the whole purpose of this file.

What the implementation does keep from the default method, and these are the parts that
matter most:

- Speed loss is computed from **speed through water (STW)**, never SOG.
- `V_expected` comes from a **real fitted reference speed–power curve**, inverted at the
  measured power and the day's displacement.
- A genuine **filter gate** rejects data that cannot support the metric — and it rejects
  **77.8 %** of it (4,657 valid of 20,938 vessel-days), which is squarely inside ISO's own
  "80–95 % is commonly discarded" expectation.

---

## The core quantity, and its sign

```
speed_loss_pct = (v_expected − STW) / v_expected × 100
```

> **POSITIVE = speed lost = degradation.**
>
> This is the **negation** of ISO 19030-2's signed convention, in which performance
> degradation yields a *negative* value. It is a **declared deviation** under ISO 19030-3.

The whole stack reads it this way — the 8 % maintenance trigger, `excess_foc_mt`, the alert
thresholds, the UI colour ramps. The sign was kept rather than flipped because flipping it
would silently invert every threshold comparison in the system; declaring it costs nothing and
misleads no one. Anyone comparing this dashboard's output against another ISO 19030
implementation must negate one of the two first.

---

## Declared deviations (permitted under Part 3)

### 1. Noon-report grain — no high-rate sampling, no block averaging

| ISO 19030-2 default | Here |
|---|---|
| ≥ 0.1 Hz continuous sampling | 1 report / ship / day |
| 10-minute block averaging | the "block" **is** the 24-hour mean the report carries |
| blocks with excessive within-block standard deviation are discarded | **not possible** — a noon report carries no within-block variance to test |

The consequence is that every "block" here is 1,440× longer than ISO's, and its internal
steadiness cannot be verified, only *approximated* (see the steady-state gate below).

### 2. No wind/wave power correction is applied

`power_corrected_kw` **is `horse_power`, passed through unchanged.** The column name is a
misnomer retained only because renaming it ripples through the fixtures, the UI and the query
API; `correction_applied` (boolean) and `correction_convention` (string) are landed on every
row of `fact_performance_daily` so this cannot be misread.

The ISO 15016 wind/wave correction **is** computed, **is** scored, and **is rejected** — the
no-correction control wins on detrended speed-loss scatter (the correction's own error):

| convention | detrended speed-loss sd |
|---|---|
| **none (control)** | **4.432 pp** |
| bow_relative | 4.878 pp |
| true_compass | 4.940 pp |

Two things follow, and the second is the sharper one:

1. **The correction makes the answer worse**, by ~0.45 pp. It multiplies a direction column of
   unknown convention by an *estimated* windage area (`transverse_area_m2` is flagged
   not-derivable in `vessel_master`), at a Beaufort ≤ 4 gate where the true wind effect is
   already small against the ~15 % scatter in the power channel. It adds noise and removes
   nothing.
2. **`WIND_DIRECTION`'s convention is not recoverable from this data.** `true_compass` routes
   the angle through a *fabricated* heading (the dataset ships no heading column), yet scores
   within 1.3 % of `bow_relative`. If the column really were bow-relative, mangling it that way
   should have visibly degraded the result. It barely does — so the column carries essentially
   no information for this correction under *either* reading.

The resistances are still computed and exposed (`resistance_wind_kn` / `resistance_wave_kn`) —
they are honest physical estimates and the weather cost-attribution channel needs them. They
are simply not allowed near the speed loss.

**The weather work is done by the gate, not by a correction term.** See the next deviation.

### 3. Beaufort gate at 4, not ISO's ~8

ISO's default wind filter sits around Beaufort 8 *because the default method corrects for wind
first*. This implementation does not correct (deviation 2), so the gate has to do that job
alone, and it is set correspondingly tighter. This is a coherent pair, not two independent
choices: **loosening the Beaufort gate without adding a working correction would let weather
straight into the speed loss.**

### 4. Filter gates that are not in ISO

Two extra gates, both empirically motivated:

- **Admiralty coefficient band (300–1,300).** `Δ^(2/3)·V³/P` is a speed↔power consistency
  invariant that needs no reference curve (so there is no circularity). It catches rows that are
  impossible only *in combination* — S4 day 131 reports 17.7 kn on 2,103 kW, and both numbers
  are individually in range while the pair is nonsense (that hull needs ~24,000 kW for 17.7 kn).
  That single row dragged S4's pre-cleaning speed loss to −6.9 pp and made a real hull cleaning
  look like damage.
- **Measured displacement only.** A displacement backfilled from the drafts doubles the noise in
  the very metric the gate exists to protect (9.76 pp of clean-day scatter vs 4.95 pp on
  measured). Backfilled rows still receive a `speed_loss_pct` — the trend chart needs a
  continuous line — they are just never *fitted on*.

---

## Known gaps — things this implementation cannot do on this dataset

These are **not** deviations to be waved through. They are limits, and a number quoted from
this dashboard inherits every one of them.

### No rudder filter — steady state is only approximated

ISO Part 2 requires rejecting data taken while steering or turning, via **rudder angle**. **The
dataset has no rudder column.** Steady state is approximated by `hours_full_speed ≥ 22` on a
24-hour mean, which is a much weaker claim: it says the ship spent most of the day at full
speed, not that it was going straight.

### No trim filter, and no trim in the reference curve

ISO Part 2 filtering requires rejecting draught/**trim** outside the range the reference curve
covers. `fore_draft` / `after_draft` are 99.95 % filled, so trim *could* be computed — but:

- **the reference curve has no trim term** (it is displacement-only), so there is no reference
  range to gate against; and
- inventing a trim band from observed quantiles would be a threshold with no physical basis —
  a filter that looks rigorous and means nothing.

**Trim is therefore unfiltered and unmodelled.** This is a real, unquantified error term in
every speed-loss number here.

### The reference curve is fitted from in-service data, not sea trials

ISO 19030's uncertainty is bounded by reference-curve quality, and the standard expects sea
trials (corrected per ISO 15016), model tests, or CFD. This curve is **fitted from the fleet's
own in-service noon reports**, with the hull *assumed clean* in the 60 days after each hull
cleaning (and at first record). Consequences:

- **The exponent is pooled** per (hull_class, propeller_variant); the scale is per-ship.
- **Four ships fall below the fit floor and borrow a pooled scale** — `n_fit_points < 8`:
  **S21 (1 point), S22 (1), S8 (5), S6 (6)**. Their speed loss therefore carries a **constant
  offset** of unknown sign. Their *trends* remain meaningful; their *absolute levels* do not.
- The fit takes a **median intercept**, so by construction roughly **half of all clean-hull days
  sit at a negative speed loss**. A negative reading is not an anomaly — it is the fit.

### Speed-log recalibration is unguarded — the dominant uncertainty

The metric is STW-based, and STW is ISO 19030's acknowledged dominant error source (the sensor
itself fouls, and it drifts). Worse:

> **Calibrating or replacing the speed log produces a step change that is very easily misread as
> "the hull cleaning worked." This is the single most common false signal in practice**
> (`iso-19030.md:93`).

**There is no sensor-event entity in this data model.** Nothing in the pipeline can distinguish
a step recovery caused by a hull clean from one caused by a re-calibrated speed log. Every step
recovery near a maintenance event in this dashboard should be read with that possibility open.

### Hull vs propeller attribution is an inference layer, not an ISO output

ISO 19030 measures the **combined** hull-and-propeller effect and **offers no method to
decompose it**. `speed_loss_pct` is that combined figure — it is *not* a hull number.

The dashboard's Cause Diagnostics panel therefore:

- is labelled **推論層 (inference layer)** in the UI and rendered visually distinct from the ISO
  speed-loss chart;
- carries a **confidence level per tile**, driven by sample count, days since the relevant
  maintenance reset, and whether a *physically independent* signal corroborates it;
- never names `speed_loss_pct` "hull" — the tile reads **船體＋螺槳** (hull + propeller), and so
  does the fouling channel of the excess-cost split.

**Circularity to watch.** `excess_foc_mt` / `excess_cost_fouling_usd` are *derived from*
`speed_loss_pct`, so they can never corroborate it (the confidence model encodes this: they are
nobody's corroborator, and they can never reach high confidence). The same trap exists in the
synthesized `uwi.hull_fouling_rating`, which is generated *from* speed loss plus jitter —
correlating it against speed loss is correlating speed loss with itself.

### Estimated inputs that propagate

- `dwt` (the CII denominator) and `transverse_area_m2` (windage) are **estimated**, not measured.
- The entire USD layer (fuel prices, costs, savings) is **synthesized** — there is no calendar or
  price feed in the source.
- Positions, headings and port calls are **draped** onto the voyages, not measured. They are
  decorative and never feed a number.

---

## Auditability

ISO 19030's core value is being able to drill from any KPI down to *which* data was excluded and
**why** (`iso-19030.md:110-116`). The pipeline supports this:

- **`fact_performance_daily.reject_reason`** names the gate that dropped each excluded day (null
  when the day passed). One reason per gate, in evaluation order.
- **`fact_performance_daily.valid_flag`** is the gate itself.
- **Data coverage is displayed**, per ship, in the vessel deep-dive header — not left in a log.
- **`fact_performance_indicator.n_points` / `n_reference_points`** carry the sample count behind
  every indicator, so a DDP fitted on 3 points cannot masquerade as one fitted on 90.

The gate's own breakdown across the fleet's 20,938 vessel-days (`python -m ym_datalake.etl build`
prints this on every run):

| reject_reason | days | what it means |
|---|---:|---|
| `displacement_backfilled` | 6,348 | displacement estimated from drafts, not measured |
| `beaufort` | 3,948 | wind over Beaufort 4, or unrecorded |
| `not_full_speed` | 3,675 | under 22 h at full speed |
| `shallow_water` | 671 | depth below the deep-water floor |
| `missing_propulsion` | 581 | no power / STW / displacement after cleaning |
| `admiralty` | 517 | speed–power pair physically impossible |
| `masked` | 370 | S21–S23 hackathon-masked window |
| `low_speed` | 171 | below half design speed — the curve would extrapolate |
| **total rejected** | **16,281** | |
| **valid** | **4,657** | **22.2 % coverage** |

---

## The four indicators, as implemented

| code | evaluation period | reference period | note |
|---|---|---|---|
| **ISP** | each hull-cleaning cycle | the **first** cycle | 34 rows |
| **DDP** | 45 days after a dry-dock | 45 days before | **2 rows only** — 5 of 15 ships never dry-dock |
| **ME** | 30 days after an event | 30 days before | 38 rows |
| **MT** | 14-day trailing mean crosses **8 %** | — | 26 rows, **per hull cycle** |

**MT is evaluated per hull-fouling cycle**, so a ship that crosses 8 % again after a cleaning
triggers again. (It previously fired only on the first crossing in the whole record, which meant
a ship could never re-trigger for the hull it is *currently* sailing on.)

ISO's own warning applies with full force here: **the shorter the evaluation period, the larger
the uncertainty, and MT is intrinsically the noisiest of the four.** The UI renders the 8 % ISO
trigger and the dashboard's own 10 % cleaning-action line as **two separately labelled lines** —
they are different things, and only the first is ISO's.
