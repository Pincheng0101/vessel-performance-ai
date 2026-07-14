"""PyTorch MLP quantile regressor — the neural challenger (§3).

The M7 features are a fixed 28-column tabular matrix, so the neural challenger
is a small MLP with **one shared trunk and a 3-unit quantile head** trained on
the mean pinball (quantile) loss — not a sequence model; the temporal context
already lives in the lag/rolling/Theil-Sen feature columns. Unlike the tree
models, a net needs dense inputs: NaNs are imputed with train-column medians
and features standardised (both stored with the weights).

Deterministic: fixed torch/numpy seeds, single thread, full-batch shuffling
from a seeded generator, fixed epoch count (no early stopping on a random
split).
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

# macOS dual-OpenMP guard: xgboost (homebrew libomp) must be loaded before
# torch brings in its bundled libomp, or later xgboost native calls segfault.
try:
    import xgboost  # noqa: F401
except ImportError:  # pragma: no cover - torch-only environments are fine
    pass

import torch
from torch import nn

from ym_datalake.ml.models.base import QUANTILES, monotone

_HIDDEN = (128, 64)
_EPOCHS = 150
_BATCH = 256
_LR = 1e-3
_WEIGHT_DECAY = 1e-4


class _Net(nn.Module):
    def __init__(self, n_features: int):
        super().__init__()
        layers: list[nn.Module] = []
        width = n_features
        for hidden in _HIDDEN:
            layers += [nn.Linear(width, hidden), nn.ReLU()]
            width = hidden
        layers.append(nn.Linear(width, len(QUANTILES)))
        self.body = nn.Sequential(*layers)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.body(x)


def _loss(pred: torch.Tensor, y: torch.Tensor) -> torch.Tensor:
    """MSE on the centre head + pinball on the p10/p90 heads."""
    diff_band = y.unsqueeze(1) - pred[:, [0, 2]]
    alphas = torch.tensor((QUANTILES[0], QUANTILES[2]), dtype=pred.dtype)
    pinball = torch.maximum(alphas * diff_band, (alphas - 1.0) * diff_band).mean()
    mse = ((y - pred[:, 1]) ** 2).mean()
    return mse + pinball


class TorchQuantile:
    """MLP whose 3-unit head trains on MSE (centre) + pinball (p10/p90 band)."""

    model_type = 'torch_mlp'

    def __init__(self, seed: int = 42, epochs: int = _EPOCHS):
        self.seed = seed
        self.epochs = epochs
        self._net: _Net | None = None
        self._median: np.ndarray | None = None
        self._mean: np.ndarray | None = None
        self._std: np.ndarray | None = None
        self._y_loc = 0.0
        self._y_scale = 1.0

    def _transform(self, x: np.ndarray) -> np.ndarray:
        x = np.where(np.isfinite(x), x, self._median)
        return (x - self._mean) / self._std

    def fit(self, x: np.ndarray, y: np.ndarray) -> TorchQuantile:
        keep = np.isfinite(y)
        x, y = x[keep], y[keep].astype(np.float64)

        self._median = np.nanmedian(x, axis=0)
        self._median = np.where(np.isfinite(self._median), self._median, 0.0)
        filled = np.where(np.isfinite(x), x, self._median)
        self._mean = filled.mean(axis=0)
        std = filled.std(axis=0)
        self._std = np.where(std > 1e-9, std, 1.0)
        self._y_loc = float(np.median(y))
        self._y_scale = float(np.std(y)) or 1.0

        torch.manual_seed(self.seed)
        torch.set_num_threads(1)
        rng = np.random.default_rng(self.seed)

        xt = torch.tensor(self._transform(x), dtype=torch.float32)
        yt = torch.tensor((y - self._y_loc) / self._y_scale, dtype=torch.float32)

        self._net = _Net(x.shape[1])
        optim = torch.optim.Adam(self._net.parameters(), lr=_LR, weight_decay=_WEIGHT_DECAY)
        n = len(xt)
        for _ in range(self.epochs):
            order = torch.tensor(rng.permutation(n))
            for start in range(0, n, _BATCH):
                idx = order[start : start + _BATCH]
                optim.zero_grad()
                loss = _loss(self._net(xt[idx]), yt[idx])
                loss.backward()
                optim.step()
        self._net.eval()
        return self

    def predict_quantiles(self, x: np.ndarray) -> np.ndarray:
        if self._net is None:
            raise RuntimeError('model is not fitted')
        xt = torch.tensor(self._transform(x), dtype=torch.float32)
        with torch.no_grad():
            q = self._net(xt).numpy().astype(float)
        return monotone(q * self._y_scale + self._y_loc)

    def save(self, out_dir: Path) -> None:
        out_dir.mkdir(parents=True, exist_ok=True)
        torch.save(
            {
                'state_dict': self._net.state_dict(),
                'n_features': int(len(self._mean)),
                'median': self._median,
                'mean': self._mean,
                'std': self._std,
                'y_loc': self._y_loc,
                'y_scale': self._y_scale,
            },
            out_dir / 'model.pt',
        )
        (out_dir / 'params.json').write_text(json.dumps({'seed': self.seed, 'epochs': self.epochs}))

    @classmethod
    def load(cls, out_dir: Path) -> TorchQuantile:
        spec = json.loads((out_dir / 'params.json').read_text())
        state = torch.load(out_dir / 'model.pt', weights_only=False)
        model = cls(seed=spec['seed'], epochs=spec['epochs'])
        model._net = _Net(state['n_features'])
        model._net.load_state_dict(state['state_dict'])
        model._net.eval()
        model._median, model._mean, model._std = state['median'], state['mean'], state['std']
        model._y_loc, model._y_scale = state['y_loc'], state['y_scale']
        return model
