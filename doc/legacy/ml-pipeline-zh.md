# M7 — 機器學習訓練與推論管線 (ML Training & Inference Pipeline)

> 狀態：**已實作**（XGBoost / HistGradientBoosting / PyTorch MLP 三架構賽馬 +
> Isolation Forest 健康分數 + 維修最佳化；Glue/API/Dashboard 接線為後續增量，見 §10）。
> (synthetic data) 測試，之後換上真實資料 (real data) 再調整。

## 1. 目標

| # | 目標 | 產出 |
|---|---|---|
| G1 | 預測未來的船速損失 (speed loss) | 每船未來 1–90 天的 `speed_loss_pct` 預測（p10/p50/p90 分位數） |
| G2 | 預測未來的燃油消耗 (fuel-oil consumption, FOC) | 每船未來每日 `total_foc_mt` 與超耗成本預測 |
| G3 | 最佳化維修時間 (maintenance-timing optimization) | 以「預測出的劣化曲線」取代 M3 的線性外插，求最佳清潔日期與不確定性區間 |

原則（沿用整個 POC 的既有模式）：

- **訓練在 local** — 只用 `uv` 環境（xgboost 為 dev-group 依賴；macOS 需
  `brew install libomp`），不需要任何 AWS 資源，與 M1/M2/M3 相同。
- **推論預先算好 (batch pre-inference)** — 不部署即時推論端點 (inference endpoint)；
  批次算完直接寫 JSONL，上傳 `s3://<bucket>/ml/`，Athena 直接查。
- **確定性 (deterministic)** — 固定隨機種子 (seed)、單執行緒訓練、`trained_at`
  取資料結束日而非 wall clock，同輸入同輸出；驗證檢查 C21–C23 延續 C1–C20。

## 2. 在整體管線中的位置

```
 M1 generate        M2+M3 compute        M7 ML train + infer         M4 catalog + M5 API
 ────────────       ─────────────        ────────────────────        ───────────────────
 raw/*.jsonl  ──▶   curated/*.jsonl ──▶  ml/*.jsonl（預測結果）──▶   S3 ─▶ Athena ─▶ API ─▶ Dashboard
      │                   │                    ▲
      └── FOC 標籤 ───────┴── 訓練特徵來源 ────┘   （模型檔留在 local ./tmp/models/，不上傳）
```

M7 讀 **curated 區**（特徵）加上 **raw `noon_report`**（`total_foc_mt` /
`me_foc_mt` / `speed_tw_kn` 等 FOC 標籤欄位——curated 日表沒有 FOC，而真實情境
的 noon report 本來就是第一手資料源）。**絕不讀 ground truth**——與 M2/M3 相同
的資訊邊界。換真實資料時只要改 `dataset.py`（§9）。

## 3. 模型架構（賽馬機制）

| 模型 | 定位 | 目標 | 理由 |
|---|---|---|---|
| **XGBoost**（梯度提升樹, gradient-boosted trees） | 參賽者 | G1 + G2 迴歸 | 表格型資料 (tabular) 最強基線；中心 booster 用 `reg:squarederror`（MSE 條件平均數 = 發佈的點預測），外側兩顆用 `reg:quantileerror`（p10/p90 內部區間）；樹模型原生吃 NaN |
| **HistGradientBoosting**（sklearn 直方圖梯度提升） | 參賽者 | G1 + G2 迴歸 | LightGBM 式的另一套 boosting 實作（中心 `squared_error` + 外側 `quantile`），零額外依賴；與 XGBoost 的失效模式不同，是便宜的多樣性 |
| **Random Forest**（隨機森林） | 參賽者 | G1 + G2 迴歸 | 非 boosting 的樹家族代表；中心 = 全森林平均（MSE 最適點），p10/p90 取自**每棵樹預測值的百分位**——一座森林同時給點與區間 |
| **Linear**（線性迴歸） | 參賽者 | G1 + G2 迴歸 | 可解釋性下限：中心 = OLS（標準化係數可直接讀，`coefficients()`），外側 = 線性分位數迴歸；贏不過它的複雜模型不值得上場 |
| **PyTorch MLP**（共享主幹 + 3 輸出頭） | 參賽者 | G1 + G2 迴歸 | 特徵已是 28 維表格，不需序列模型（時序資訊在 lag/rolling/Theil-Sen 特徵裡）；loss = 中心頭 MSE + 外側頭 pinball；NaN 以訓練集中位數插補 + 標準化（參數隨權重保存） |
| **Isolation Forest**（隔離森林） | 輔助（不參賽） | 健康分數 (health score) | 全船隊 pooled、單船 robust-z 標準化的多變量健康指數（0–1，1=正常），獨立輸出到預測表 |

**賽馬機制 (champion race)**：`train` 對每個目標把每個架構各跑一輪滾動回測，
champion = 通過 C21 gate 者中平均 **RMSE** 最低的（無人通過則取最低 RMSE 並記錄
gate 失敗）。所有模型**全部**存入模型庫（`is_champion` 標記贏家），推論只用
champion；`--arch` 可指定只跑部分架構。基線門檻：G1 對上持續性 (persistence)
與 M3 的 Theil-Sen 外插；G2 對上 7 天與 30 天滾動平均。

> macOS 注意：xgboost（homebrew libomp）與 torch（自帶 libomp）同進程會有雙
> OpenMP runtime 衝突，`models/nn.py` 開頭有 import 順序守衛（先載 xgboost 再載
> torch），不要移除。

## 4. 特徵與標籤設計

### 4.1 特徵（28 維，`features.FEATURE_NAMES`）

| 類別 | 特徵 |
|---|---|
| 預測期距 | `horizon_days`、`days_since_cleaning_target`（= 時鐘 + h，讓模型直接學「劣化 vs 時鐘」） |
| 劣化時鐘 | `days_since_cleaning` / `days_since_dry_dock` |
| 效能滯後 (lag) | `sl_last`、`sl_mean_7/14/30`、`sl_std_14`（只取 `valid_flag` 點） |
| 統計趨勢 | `ts_level` / `ts_slope` — open cycle 的 Theil-Sen 水準與斜率（因果計算；同時是 M3 基線的來源欄） |
| 引擎/推進 | `slip_mean_14`、`sfoc_mean_14`、`adm_mean_14` |
| 天氣 | `beaufort_mean_14`、`wave_mean_14` |
| 營運 | `foc_mean_7/30`、`me_foc_mean_30`、`speed_tw_mean_30`、`laden_frac_30`、`sea_frac_30`、目標月份 sin/cos |
| 船舶靜態 | `age_years`、`log_dwt`、`log_mcr`、`design_speed_kn`（不放 `imo_number`——換船隊可泛化） |

### 4.2 標籤與情境語意

- **direct multi-horizon**：horizon 是特徵、單一模型預測任意 h（訓練取
  h ∈ {1,3,7,14,21,30,45,60,75,90}，推論每日 1–90）。
- **G1**：t+h 當日的 `speed_loss_pct`（valid 點）。
- **G2**：t+h 當日海上 `total_foc_mt`。**情境式預測 (scenario forecast)**：
  假設維持近 30 天營運型態，回答「不清潔的話未來每天燒多少」。
- **無清潔情境**：`(as_of, target]` 之間有 hull_cleaning/dry_dock 的訓練樣本
  **剔除**（標籤含清潔後回復，違反情境）。
- 特徵嚴格因果（只用 ≤ as_of 的資料），有單元測試守護（未來擾動不得改變特徵）。

### 4.3 切分與回測

滾動原點 (rolling-origin) × 6 個月度 fold：訓練集只含 **target 日期 ≤ origin**
的樣本（標籤也不越界），評估 origin 後 30 天內的 as_of。MAE 分三個期距桶
（h≤7 / ≤30 / ≤90）與基線比較，另報 p10–p90 的實證覆蓋率。9 船 pooled 訓練。

## 5. 模組配置（實際檔案）

```
ym_datalake/ml/
  __main__.py        CLI：train / backtest / infer / validate
  dataset.py         讀 curated + raw noon_report JSONL → VesselSeries（唯一 I/O 邊界）
  features.py        因果特徵工程 + 訓練/推論樣本組裝（純函式、可單測）
  models/
    __init__.py      ARCHITECTURES 賽馬名單（model_type → class）
    base.py          QuantileRegressor 協定 + 分位數不交叉守衛
    xgb.py           XGBoost 分位數迴歸（p10/p50/p90 三顆 booster）
    hgb.py           sklearn HistGradientBoosting 分位數迴歸（challenger）
    rf.py            Random Forest（每樹百分位出分位數；challenger）
    linear.py        線性分位數迴歸（可解釋下限；challenger）
    nn.py            PyTorch MLP + 3 分位數輸出頭（challenger；含 OpenMP 載入守衛）
    iforest.py       Isolation Forest 健康分數（pooled + 單船 robust-z）
  backtest.py        滾動原點回測 + 基線比較 + C21 gate
  registry.py        local 模型庫 ./tmp/models/<model_id>/（artifact + meta.json）
  forecast.py        批次推論：每船 × 1–90 天 × 3 分位數 + 健康分數
  maintenance.py     G3：cycle 時鐘上的 J(τ) 數值最佳化
  writer.py          ml/*.jsonl 輸出（沿用 etl/writer 慣例：NaN→null、日期字串）
  uploader.py        put ml/ tree → s3://<bucket>/ml/（mirror etl/uploader）
  validate.py        C21 / C22 / C23
tests/unit/ym_datalake/ml/   單元測試（因果性、標籤對齊、模型 roundtrip、檢查器…）
```

### CLI

```bash
# 訓練：回測（C21 gate）→ 全資料重訓 → 寫入模型庫
uv run python -m ym_datalake.ml train --in ./tmp --models ./tmp/models --seed 42

# 只看回測報告（不寫模型）
uv run python -m ym_datalake.ml backtest --in ./tmp

# 批次推論：每船未來 90 天 → ./tmp/ml/*.jsonl（+C21–C23 驗證 +上傳）
AWS_PROFILE=ym-hackathon uv run python -m ym_datalake.ml infer \
  --in ./tmp --models ./tmp/models --out ./tmp --validate --upload --bucket "$BUCKET"

# 針對已寫出的 ml/ tree 重跑 C22/C23（--models 加跑 C21）
uv run python -m ym_datalake.ml validate --dir ./tmp --models ./tmp/models
```

## 6. 輸出表（3 張，`ml/` 前綴）

沿用既有慣例：JSONL + OpenX SerDe、日期存字串、`imo_number` 分割區投影
(partition projection)、不用 crawler。

### 6.1 `fact_ml_prediction`（G1 + G2）

粒度：船 × `as_of_date` × `target_date`（每船 90 列）。
位置：`ml/fact_ml_prediction/imo_number=<imo>/data.jsonl`。

> **點預測表、區間內裝**：發佈表只給單值——`*_pred` 是以 **MSE (squared loss)
> 訓練的條件平均數**；p10/p90 仍以 pinball loss 訓練但只留在推論內部，用來產生
> §6.2 的 early/late 日期區間與回測的 cover80 誠實度指標。回測/C21 gate 以
> **RMSE** 評分（與 MSE 訓練目標對齊）。

| 欄位 | 型別 | 說明 |
|---|---|---|
| imo_number | string | *(partition)* |
| as_of_date | string | 推論基準日（= 該船最新 curated 日；特徵只用 ≤ 此日資料） |
| target_date | string | 被預測日期 |
| horizon_days | int | `target_date − as_of_date` |
| speed_loss_pct_pred | double | G1 點預測（MSE 訓練的條件平均數） |
| foc_mt_pred | double | G2 日均 FOC 點預測（條件平均數；情境式，≥0） |
| excess_cost_usd_pred | double | 預測曲線經隱含經濟參數換算的超耗成本/日 |
| health_score | double | Isolation Forest 健康分數（0–1；船級值，**每列重複**——同 `fact_speed_profile` 慣例） |
| model_id_speed_loss / model_id_foc | string | FK → `dim_ml_model`（兩個目標各自的 champion） |

### 6.2 `fact_ml_maintenance_plan`（G3）

粒度：船。位置：`ml/fact_ml_maintenance_plan/`（flat）。

最佳化在 **days-since-cleaning 時鐘**上（與 M3 同框架）：

```
J(τ) = (K + C_past + Σ_{τ0<u≤τ} ĉ(u)) / τ
```

`τ0` = as_of 的 cycle 年齡（`days_since_cleaning`）、`C_past` = 本 cycle 已累積
超耗成本（`cum_excess_cost_usd`）、`ĉ` = 預測 p50 speed-loss 曲線經**隱含經濟
參數**（近 90 天推回的 ME 油耗中位數、隱含油價、隱含曲線指數 n、海上日比例）
換算的每日超耗成本，90 天後以尾段斜率線性外插至 730 天。錨定整個 cycle 使攤提
誠實——trigger 已過的船「明天就清」的候選解除以整個 cycle 長度，不會退化。

| 欄位 | 型別 | 說明 |
|---|---|---|
| imo_number | string | |
| as_of_date | string | 推論基準日 |
| recommended_clean_date | string | p50 曲線的 J(τ) 最小值日期 |
| recommended_date_early / late | string | p90 / p10 曲線重算的日期區間（排序後保證 early ≤ rec ≤ late） |
| trigger_eta_pred | string? | 外插 p50 曲線越過 8 %（`MT_TRIGGER_PCT`）的日期；730 天內未越過為 null |
| expected_saving_usd | double | (J(τ_trigger) − J(τ*)) × 365 — 照 ML 建議 vs 拖到 trigger 的年化省額（≥0） |
| clean_cost_usd | double | 使用的清潔全成本 K（現金 + downtime × $1000/h；船→船隊→常數 fallback） |
| baseline_clean_date | string? | M3 封閉解 `T*=√(2K/β)` 的日期（對照欄，取自 `fact_recommendation`） |
| model_id | string | FK → `dim_ml_model`（speed-loss champion） |

### 6.3 `dim_ml_model`（模型登錄, model registry）

粒度：model_id。位置：`ml/dim_ml_model/`（flat）。欄位：`model_id`、
`model_type`（xgboost / iforest）、`target`（speed_loss / foc / health）、
`trained_at`（= 資料結束日，確定性）、`train_start/end`、`seed`、`n_features`、
`is_champion`、`passes_gate`、`mae_h7/h30/h90`、`baseline_mae_h7/h30/h90`
（回測對照，取最強基線）。

> 模型二進位檔 (artifact) 留在 local `./tmp/models/<model_id>/`
> （booster JSON / pickle + meta.json），不上 S3/Athena；`dim_ml_model` 讓查詢端
> 能追溯每筆預測的模型、訓練窗與回測表現。

## 7. 部署與查詢端變更（後續增量，未實作）

1. `deployment/athena_tool_stack.py`：新增 3 張 Glue 表（`fact_ml_prediction`
   用 imo 投影，另兩張 flat）。
2. M5 API 新增 `query_type`：`vessel_prediction`（imo）、`vessel_ml_plan`（imo）、
   `ml_models`（—），維持 `?` 參數繫結。
3. M6 Dashboard：Deep-dive speed-loss 趨勢疊預測扇形帶 (fan chart, p10–p90)；
   建議面板並列 M3 統計解（`baseline_clean_date` 已備好對照欄）。

## 8. 驗證檢查（C21–C23；C20 = M2 的天氣歸因檢查）

| 檢查 | 內容 |
|---|---|
| **C21 回測門檻** | champion 中心預測的 **RMSE** 在每個期距桶 ≤ 最強基線 × 1.05，且至少兩桶嚴格 ≤ ——贏不過 naive 基線就 fail，強迫先修特徵而不是硬上 ML |
| **C22 預測表一致性** | p10 ≤ p50 ≤ p90（兩個目標）；`horizon_days` = 日期差；model_id 齊全；每船 horizon 1–90 完整且單一 as_of |
| **C23 維修建議合理性** | `as_of < recommended`；early ≤ rec ≤ late；省額 ≥ 0；`trigger_eta_pred` 與外插 p50 曲線自洽（有值⇒該日確實 ≥8%；null⇒730 天內確實未越過） |

合成資料的參考結果（seed 42、5 年 × 9 船、MSE 中心 + RMSE 評分，`train` 輸出）：

```
speed_loss champion = hgb    RMSE h7/h30/h90 = 0.99/1.00/1.11 pp
                             （最強基線 0.97/1.26/2.18；torch_mlp 唯一 FAIL）
foc        champion = xgboost RMSE h7/h30/h90 = 35.8/36.9/38.4 mt
                             （最強基線 38.7/40.3/44.7）
```

期距越長 ML 相對統計外插的優勢越大（h90 誤差約基線的一半）；h7 與
persistence/Theil-Sen 接近是預期行為（fouling 一週內變化 < 感測噪聲）。

## 9. 真實資料上線的調整點（預留的接縫）

| 接縫 | 合成資料現況 | 換真實資料時 |
|---|---|---|
| 資料載入 | `dataset.py` 讀 local curated/raw JSONL | 只改 `dataset.py`：改讀 Athena unload / S3；`features.py` 以上不動 |
| 資料品質 | `valid_flag` 已由 M2 算好 | ISO 19030 過濾照用；XGB 原生吃 NaN，NN challenger 才需插補 |
| 標籤口徑 | FOC 乾淨無偏 | 真實 FOC 有加油對帳誤差，考慮以航次 (voyage) 粒度驗證 G2 |
| 超參數 | 預設 + 固定值 | 回測框架不變，擴大搜尋（Optuna 可後補） |
| 重訓節奏 | 一次性 | 新資料落地 → `compute` → `ml train`（月度）→ `ml infer`（週度/日度批次） |
| 船隊泛化 | 9 艘船 pooled | 靜態規格特徵 + 無船名特徵已預留冷啟動路徑；`registry` 可分船隊訓練分支 |

## 10. 實作進度

1. ✅ `dataset.py` + `features.py` + XGBoost 端到端（train→backtest→infer→JSONL）
2. ✅ C21–C23 驗證 + `dim_ml_model` 登錄
3. ✅ Isolation Forest 健康分數 ＋ PyTorch MLP / HistGradientBoosting challenger（三架構賽馬）
4. ✅ G3 `maintenance.py`（cycle 時鐘 J(τ) 數值最佳化 + M3 對照欄）
5. ⬜ Glue 表 + API `query_type` + Dashboard 疊圖
