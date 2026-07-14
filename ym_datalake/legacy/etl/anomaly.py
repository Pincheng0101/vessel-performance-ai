"""§5.2 anomaly detection + §5.3 rule-based cause classification (M3).

Detection runs on the **residuals** of every metric-bearing at-sea row (observed
− trend baseline from ``trends``), NOT just ``valid_flag`` points — the generator
pushes weather anomalies past the Beaufort-≤6 valid gate, so detecting only on
valid points would make them structurally invisible.

Fusion → one flag per (imo, date). Four *targeted*, high-precision detectors —
one per cause — carry most of the signal, because a persistent shift re-centres
any adaptive (rolling) statistic mid-plateau:

- engine — EWMA control chart (λ=0.3, fixed target) on the *load-aware* fractional
  SFOC residual, so a degradation step stays out-of-control for its whole duration;
- propeller — the same fixed-target EWMA on the real-slip residual (a slip plateau);
- sensor — single-day glitches: a load-aware SFOC deviation (FOC/power), a MAD-z
  spike in a coupled metric (speed/slip), or a wind reading off its Beaufort curve;
- weather — the direct Beaufort ≥ 7 met signal (the generator's +3 anomaly boost),
  whose added resistance the ISO 15016 correction otherwise removes.

Generic catch-alls run behind them at tightened gates: rolling z (transients),
IsolationForest (multivariate tail) and an IQR gross gate. Causes are the
ground-truth point set ``{engine_degradation, propeller, weather, sensor}``
(biofouling is the §5.1 trend, never a point cause); classification mirrors the
generator's first-match ``stamp`` priority.
"""

from __future__ import annotations

import datetime as dt

import numpy as np
from sklearn.ensemble import IsolationForest

from ym_datalake.etl import periods, trends
from ym_datalake.synthetic_data.fleet import VesselSpec

_SFOC_LOAD_COEF = 0.18  # generator's load-dependent SFOC U-shape (see generate._sfoc)
_W = 30  # rolling-window length (days)
_ROLL_Z = 4.5  # Iglewicz-Hoaglin modified-z alert (residuals are heavy-tailed)
_IFOREST_Z = 3.5  # standardized-residual corroboration for the IForest tail
_EWMA_LAMBDA = 0.3
_EWMA_L = 3.0
_ENGINE_FLOOR = 0.045  # a sustained SFOC step below ~4.5 % is load/noise, not degradation
_PROP_FLOOR = 0.025  # a sustained real-slip lift below this is noise, not propeller fouling
_SENSOR_Z = 6.0  # a gross single-channel spike
_SFOC_GLITCH = 0.06  # a single-day |SFOC| deviation this large is a FOC/power sensor glitch
_GLITCH_Z = 5.0  # a single-day MAD-z spike in a coupled channel (speed/slip sensor glitch)
_WIND_GLITCH_Z = 3.25  # a wind reading this far off its Beaufort-expected value is a wind-sensor glitch
_ROLL_CHANNELS = ('speed_loss', 'slip', 'sfoc')  # excess_foc residual ≈ scaled speed-loss (redundant)
_CHANNELS = ('speed_loss', 'slip', 'sfoc', 'excess_foc')
_METRIC_FIELD = {
    'speed_loss': 'speed_loss_pct',
    'slip': 'slip_real',
    'sfoc': 'sfoc_g_kwh',
    'excess_foc': 'excess_foc_mt',
}


def _mad_scale(r: np.ndarray) -> float:
    mad = float(np.median(np.abs(r - np.median(r))))
    scale = 1.4826 * mad
    if scale <= 1e-9:
        scale = float(r.std()) or 1.0
    return scale


def _global_z(r: np.ndarray) -> np.ndarray:
    return (r - np.median(r)) / _mad_scale(r)


def _wind_residual_z(wind: np.ndarray, beaufort: np.ndarray) -> np.ndarray:
    """z of wind speed against its Beaufort-expected value (~0.836·B^1.5).

    Wind is tightly coupled to Beaufort (C11); a sensor glitch scales wind but not
    Beaufort, so a reading far off the robust B^1.5 fit is the glitch — where raw
    wind z is swamped by the (legitimate) seasonal Beaufort swing.
    """
    pred = np.maximum(beaufort, 0.1) ** 1.5
    a = float(np.median(wind / pred))
    return _global_z(wind - a * pred)


def _rolling_z(r: np.ndarray, w: int = _W) -> np.ndarray:
    z = np.zeros(len(r))
    for i in range(len(r)):
        win = r[max(0, i - w + 1) : i + 1]
        med = np.median(win)
        mad = np.median(np.abs(win - med))
        if mad <= 1e-9:
            sd = float(win.std())
            z[i] = (r[i] - med) / sd if sd > 1e-9 else 0.0
        else:
            z[i] = 0.6745 * (r[i] - med) / mad
    return z


def _ewma(r: np.ndarray, lam: float = _EWMA_LAMBDA) -> np.ndarray:
    e = np.empty(len(r))
    prev = 0.0
    for i in range(len(r)):
        prev = lam * r[i] + (1.0 - lam) * prev
        e[i] = prev
    return e


def _sustained_oob(r: np.ndarray, floor: float, lam: float = _EWMA_LAMBDA, limit: float = _EWMA_L) -> np.ndarray:
    """EWMA control chart with a FIXED target — a positive level-shift stays
    out-of-control for its whole duration (unlike an adaptive z).

    Used for the engine SFOC step and the propeller-slip plateau. The absolute
    ``floor`` rejects sub-signal drift (e.g. the load-driven SFOC U-shape the flat
    baseline does not model) that a pure control limit would still trip on.
    """
    e = _ewma(r - np.median(r), lam)
    sigma_ewma = _mad_scale(r) * np.sqrt(lam / (2.0 - lam))
    return (e > limit * sigma_ewma) & (e >= floor)


def _engine_cycles(dates: list[dt.date], resets: list[dt.date]) -> tuple[np.ndarray, np.ndarray]:
    """(days_since_overhaul, cycle_id) per point over the engine reset clock.

    ``resets`` = engine_overhaul ∪ dry_dock; the first cycle (before any reset) is
    anchored at the window start — matching how the generator laid down the drift.
    """
    window_start = dates[0]
    dso = np.empty(len(dates))
    cid = np.empty(len(dates), dtype=int)
    for i, d in enumerate(dates):
        anchor, k = window_start, 0
        for j, r in enumerate(resets):
            if r <= d:
                anchor, k = r, j + 1
            else:
                break
        dso[i] = max(0, (d - anchor).days)
        cid[i] = k
    return dso, cid


def _clean_sfoc_frac(sfoc: np.ndarray, power: np.ndarray, mcr: float, dso: np.ndarray, cid: np.ndarray) -> np.ndarray:
    """Fractional SFOC deviation from a load-aware, drift-detrended clean baseline.

    SFOC efficiency is a load-driven property that also drifts slowly upward within
    each engine cycle (secular wear, reset at overhaul/dry dock). Dividing out the
    generator's U-shape ``A·(1+0.18·(load−0.8)²)`` leaves ``ratio ≈ A·(1+drift)``;
    a robust (Theil-Sen) line of ``ratio`` vs ``days_since_overhaul`` per cycle
    tracks the drift while ignoring the ≤120-day degradation step (a minority), so
    the residual isolates that discrete step for the EWMA/floor logic downstream.
    """
    load = np.clip(power / mcr, 0.2, 1.05)
    shape = 1.0 + _SFOC_LOAD_COEF * (load - 0.80) ** 2
    ratio = sfoc / shape
    fitted = np.empty(len(ratio))
    for c in np.unique(cid):
        idx = np.where(cid == c)[0]
        slope, intercept, _, _ = trends.robust_line(dso[idx], ratio[idx])
        fitted[idx] = intercept + slope * dso[idx]
    return np.where(fitted > 0, sfoc / (fitted * shape) - 1.0, 0.0)


def _iqr_gross(r: np.ndarray) -> np.ndarray:
    q1, q3 = np.percentile(r, [25, 75])
    iqr = q3 - q1
    return (r > q3 + 3.0 * iqr) | (r < q1 - 3.0 * iqr)


def _iforest_tail(feat: np.ndarray) -> np.ndarray:
    if len(feat) < 20:
        return np.zeros(len(feat), dtype=bool)
    clf = IsolationForest(n_estimators=200, contamination='auto', random_state=0, n_jobs=1)
    return clf.fit_predict(feat) == -1


def _run_lengths(flags: np.ndarray) -> np.ndarray:
    """Length of the maximal consecutive True-run each index belongs to (0 if False)."""
    run = np.zeros(len(flags), dtype=int)
    i = 0
    n = len(flags)
    while i < n:
        if flags[i]:
            j = i
            while j < n and flags[j]:
                j += 1
            run[i:j] = j - i
            i = j
        else:
            i += 1
    return run


def _severity_from(mag: float, med: float, high: float) -> str:
    if mag >= high:
        return 'high'
    if mag >= med:
        return 'medium'
    return 'low'


def detect(
    vessel_daily: list[dict],
    baselines: dict[str, dict],
    feats: dict[str, dict],
    spec: VesselSpec,
    engine_resets: list[dt.date],
) -> list[dict]:
    """Flag anomalies, mutate the daily rows in place, return ``fact_anomaly`` rows.

    Mutates every metric-bearing row's ``anomaly_flag`` / ``anomaly_cause`` /
    ``anomaly_severity`` (non-flagged → False / None) and emits one fact_anomaly
    row per flagged (imo, date) at the driver metric. ``engine_resets`` (engine_overhaul
    ∪ dry_dock) partition the SFOC drift into cycles the detector detrends away.
    """
    pts = sorted((r for r in vessel_daily if r['speed_loss_pct'] is not None), key=lambda r: r['report_date'])
    if not pts:
        return []

    def residual(row, channel):
        base = baselines.get(row['report_date'], {}).get(channel)
        obs = row[_METRIC_FIELD[channel]]
        if base is None or obs is None:
            return 0.0
        return obs - base

    res = {c: np.array([residual(r, c) for r in pts]) for c in _CHANNELS}
    sfoc = np.array([r['sfoc_g_kwh'] for r in pts])
    power = np.array([feats.get(r['report_date'], {}).get('power', np.nan) for r in pts])
    dso, cid = _engine_cycles([periods.to_date(r['report_date']) for r in pts], engine_resets)
    frac_sfoc = _clean_sfoc_frac(sfoc, power, spec.mcr_kw, dso, cid)
    gz = {c: _global_z(res[c]) for c in _CHANNELS}
    rz = {c: _rolling_z(res[c]) for c in _ROLL_CHANNELS}
    beaufort = np.array([feats.get(r['report_date'], {}).get('beaufort', 0) for r in pts], dtype=float)
    wave = np.array([feats.get(r['report_date'], {}).get('wave', 0.0) for r in pts], dtype=float)
    wind = np.array([feats.get(r['report_date'], {}).get('wind', 0.0) for r in pts], dtype=float)
    z_bf = _global_z(beaufort)
    wave_top = wave >= np.percentile(wave, 90)
    # A wind reading off its Beaufort-expected value with a normal sea state is a
    # wind-sensor glitch (weather carries the +3 Beaufort boost); invisible in the
    # ISO metrics because the wind correction absorbs it.
    wind_glitch = (np.abs(_wind_residual_z(wind, beaufort)) >= _WIND_GLITCH_Z) & (beaufort < 7)

    ewma_engine = _sustained_oob(frac_sfoc, _ENGINE_FLOOR)
    prop_shift = _sustained_oob(res['slip'], _PROP_FLOOR)
    # IQR gate on speed_loss/slip/sfoc only — the excess_foc residual is skewed by
    # fouling and over-flags. Robust single-point grosses.
    gross = np.zeros(len(pts), dtype=bool)
    for c in _ROLL_CHANNELS:
        gross |= _iqr_gross(res[c])

    feat = np.column_stack([gz['speed_loss'], gz['slip'], gz['sfoc'], z_bf, gz['excess_foc']])
    tail = _iforest_tail(feat)

    rz_max = np.max(np.abs([rz[c] for c in _ROLL_CHANNELS]), axis=0)
    gz_abs = np.abs([gz[c] for c in _CHANNELS])
    gz_max = np.max(gz_abs, axis=0)
    # Sustained load-aware SFOC elevation with flat speed loss = an engine
    # level-shift the adaptive detectors re-centre on; this holds for the plateau.
    engine = ewma_engine | ((frac_sfoc >= _ENGINE_FLOOR) & (np.abs(gz['speed_loss']) < 2.5))
    # Sustained slip lift = a propeller-fouling plateau (holds for its whole window).
    propeller = prop_shift | (gz['slip'] >= _GLITCH_Z)
    # Single-day sensor glitch: a large load-aware SFOC deviation (FOC/power sensor),
    # a MAD-z spike in a coupled channel (speed/slip sensor), or a wind-sensor glitch.
    glitch = (
        (np.abs(frac_sfoc) >= _SFOC_GLITCH)
        | (np.abs(gz['speed_loss']) >= _GLITCH_Z)
        | (np.abs(gz['slip']) >= _GLITCH_Z)
        | wind_glitch
    )
    # Targeted detectors (engine/propeller/glitch/weather) are high precision; the
    # generic catch-alls (rolling z, IForest, IQR) run at tightened gates.
    flag = engine | propeller | glitch | (rz_max >= _ROLL_Z) | (tail & (gz_max >= _IFOREST_Z)) | gross
    # Heavy weather clears the valid gate but its residual is corrected away — flag
    # the direct met signal (Beaufort ≥ 7 is the generator's +3 anomaly boost).
    flag |= beaufort >= 7
    run = _run_lengths(flag)
    driver = np.argmax(gz_abs, axis=0)

    anomalies: list[dict] = []
    for i, row in enumerate(pts):
        if not flag[i]:
            continue
        cause = _classify(i, gz, beaufort, wave_top, engine, gross, run, frac_sfoc, wind_glitch)
        sev = _severity(cause, i, res, frac_sfoc)
        ch = _CHANNELS[driver[i]]
        row['anomaly_flag'] = True
        row['anomaly_cause'] = cause
        row['anomaly_severity'] = sev
        anomalies.append(
            {
                'imo_number': row['imo_number'],
                'report_date': row['report_date'],
                'metric': ch,
                'value': row[_METRIC_FIELD[ch]],
                'z_score': float(gz[ch][i]),
                'severity': sev,
                'cause': cause,
            }
        )
    return anomalies


def _classify(i, gz, beaufort, wave_top, engine, gross, run, frac_sfoc, wind_glitch) -> str:
    z = {c: abs(float(gz[c][i])) for c in _CHANNELS}
    z_max = max(z.values())
    # 1. sensor — an isolated gross single-channel spike (no run), coupled channel calm.
    isolated_gross = gross[i] or z_max >= _SENSOR_Z or abs(frac_sfoc[i]) >= _SFOC_GLITCH or wind_glitch[i]
    if isolated_gross and run[i] <= 1 and beaufort[i] < 7:
        return 'sensor'
    # 2. weather — high Beaufort, or a speed-loss spike with a top-decile wave.
    if beaufort[i] >= 7 or (z['speed_loss'] >= 3.0 and wave_top[i]):
        return 'weather'
    # 3. engine degradation — SFOC elevated (sustained step) while speed loss is not.
    if engine[i] and z['speed_loss'] < 2.0:
        return 'engine_degradation'
    # 4. propeller — real-slip dominant.
    if z['slip'] >= 3.0:
        return 'propeller'
    # Fallback: assign by the dominant residual channel.
    dom = max(z, key=lambda c: z[c])
    if dom == 'slip':
        return 'propeller'
    if dom in ('sfoc', 'excess_foc'):
        return 'engine_degradation'
    return 'weather'


def _severity(cause, i, res, frac_sfoc) -> str:
    """Severity tracks the injected magnitude the generator used (noise._severity)."""
    if cause == 'weather':
        return 'medium'
    if cause == 'sensor':
        return 'high'
    if cause == 'engine_degradation':
        return _severity_from(float(frac_sfoc[i]), 0.10, 0.13)
    # propeller — additive slip elevation.
    return _severity_from(float(res['slip'][i]), 0.07, 0.10)
