"""Feature engineering for ME full-speed fuel-consumption prediction.

The governing constraint (README class table): in a masked ``PREDICT`` window only the **A**
(env/nav) and **F** (``WIND_SCALE``, ``HOURS_FULL_SPEED``) columns are visible; the **H** (engine)
and **T** (all fuel / ``TOTAL_CONSUMP`` / ``ME_CONSUMPTION``) columns are ``HIDDEN``. So a model
feature may depend only on A/F columns + ``maintenance.csv`` + time. H/T columns stay in the output
as labels but are flagged leakage and must never be model inputs.

Pipeline: :mod:`io` (load, clean, flags, targets, fuel) -> :mod:`maintenance` (fouling-age clocks) ->
:mod:`physics_features` (hydro/speed/weather/shallow) -> :mod:`statistics` (per-ship trailing rolling)
-> :mod:`build` (orchestrate, manifest, write ``etl/``).
"""

from ym_datalake.ml_york.feature_engineering.build import build_features

__all__ = ['build_features']
