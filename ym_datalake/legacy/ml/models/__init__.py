"""M7 model architectures — the horse-race roster (§3).

``ARCHITECTURES`` maps ``model_type`` → class for every quantile regressor
that can compete for champion. Adding an architecture = implement the
``base.QuantileRegressor`` protocol, register it here, and add its loader to
``registry._ARCH_LOADERS``.
"""

from ym_datalake.ml.models.hgb import HGBQuantile
from ym_datalake.ml.models.linear import LinearQuantile
from ym_datalake.ml.models.nn import TorchQuantile
from ym_datalake.ml.models.rf import RFQuantile
from ym_datalake.ml.models.xgb import XGBQuantile

ARCHITECTURES: dict[str, type] = {
    XGBQuantile.model_type: XGBQuantile,
    HGBQuantile.model_type: HGBQuantile,
    RFQuantile.model_type: RFQuantile,
    LinearQuantile.model_type: LinearQuantile,
    TorchQuantile.model_type: TorchQuantile,
}
