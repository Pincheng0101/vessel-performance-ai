# Model Summary

以現行 `FEATURE_COLUMNS`（共 75 個特徵）為輸入、`target_value_normalized`（z-score 標準化 label）為訓練標的，由 `scripts/train_pipeline.py` 訓練。

> **分數量測方式**：模型在標準化空間預測後，用 `dataset/target_value_normalization.json` 的 mean/std 反正規化
> （`pred = pred_norm × std + mean`）回到 `target_value`（統一熱能）尺度，再與 test 的真實 `target_value` 比較。
> 因此下列 MAE / RMSE / R² 皆為**反正規化後的原始尺度**。

- 訓練列數：16707
- 測試列數：2841
- 標準化參數：mean = 2246.9630，std = 1362.5559

## Test 分數（denormalized，target_value 尺度）

| Model | MAE | RMSE | R² | CV MAE mean | CV MAE std |
|---|---|---|---|---|---|
| LinearRegression | 210.1025 | 295.2781 | 0.93014 | 209.2775 | 2.3472 |
| RandomForest | 138.8674 | 220.7714 | 0.96095 | 116.8158 | 1.3736 |
| XGBoost | 152.8262 | 231.9416 | 0.95690 | 114.7506 | 1.3712 |

## Best Model

- 以 test MAE 最低者為最佳：**RandomForest**（MAE = 138.8674）。
- 已保存的模型檔（`models/*.pkl`）皆以標準化 label 訓練，載入預測後需反正規化才是 `target_value`。

## 重新產生

```bash
uv run python scripts/train_pipeline.py
```
