# Model Summary

## Overview
This document summarizes the test performance of the regression models built for the hackathon prediction task.

The models compared are:
- `LinearRegression`
- `RandomForest`
- `XGBoost`

The target variable is total thermal energy computed from fuel consumption and fuel heat values.

## Test Metrics
| Model | MAE | RMSE | R2 | CV MAE mean | CV MAE std |
|---|---|---|---|---|---|
| LinearRegression | 72.4633 | 90.7626 | 0.99340 | 93.8881 | 1.5617 |
| RandomForest | 31.0251 | 54.2797 | 0.99764 | 50.6031 | 0.8290 |
| XGBoost | 46.5724 | 65.7152 | 0.99654 | 50.9886 | 0.8582 |

## Best Model
- `RandomForest` was selected as the best model based on the lowest test MAE.
- Submission file: `yangming-aws-summit-hackathon/submission_RandomForest.csv`

## Notes
- `RandomForest` still outperforms both `LinearRegression` and `XGBoost` on MAE and RMSE for the current dataset.
- `XGBoost` is now available and evaluated in the current environment.

## Next steps
- Tune hyperparameters for `RandomForest` and `XGBoost` to see if either can improve test MAE.
- Consider using feature engineering or model stacking for further performance gains.

## Next steps
- Install `xgboost` or use `lightgbm` to compare with gradient boosting models.
- Consider tuning hyperparameters for `RandomForest` or using feature selection to further improve performance.
