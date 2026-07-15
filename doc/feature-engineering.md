# 特徵工程 (Feature Engineering)

模型預測目標是主機全速油耗的統一熱能 (unified thermal energy)。這份文件記錄從原始航行日報
(`vt_fd.csv`) 產生 model-ready 資料時，對特徵做了哪些轉換、為什麼，以及最終進入模型的特徵名單。

- 轉換實作：[`scripts/feature_engineering.py`](../scripts/feature_engineering.py)
- 呼叫點：[`scripts/build_model_ready_data.py`](../scripts/build_model_ready_data.py)（逐列套用）
- **特徵名單 (feature allowlist)**：[`scripts/model_pipeline_utils.py`](../scripts/model_pipeline_utils.py)
  的 `FEATURE_COLUMNS`

> **所有特徵僅來自 `vt_fd.csv` 與養護事件欄位，不依賴 `vessel.jsonl`** —— 真實資料集不提供該檔。
> 因此需要船舶參數 (pitch、breadth、design_draft、dwt、hull_class、propeller_variant) 的特徵
> （如 `real_slip`、吃水比值、淺水偵測、船級身分等）**皆不採用**。

ISO 15016 / 19030 的物理公式與 [`ym_datalake/etl/physics.py`](../ym_datalake/etl/physics.py)
一致；因 `scripts/` 以純標準函式庫 (stdlib) 執行、無法匯入 `ym_datalake` 套件，故在
`feature_engineering.py` 內就地重述。

---

## 特徵名單以「包含 (include-list)」管理

`build_feature_columns()` **不再用排除清單**，而是回傳 `FEATURE_COLUMNS` 中實際存在於資料的欄位。
只有列在名單裡的欄位會成為特徵，其餘一律忽略 —— 要新增/移除特徵，只需編輯這份名單。

因為是 include-list，下列欄位**天生就不會進模型**（不需另外排除）：

| 類別 | 欄位 | 原因 |
|---|---|---|
| 識別欄 | `De-identification Name`, `VOYAGE` | 船隻/航次 ID，非特徵 |
| 目標欄 | `target_value`, `target_value_normalized`, `target_fuel_column`, `ME_FULLSPEED_CONSUMP_*` | 預測標的本身 |
| 遮蔽欄 (H 類) | `HORSE_POWER`, `LOAD_PCT`, `SFOC`, `ME_SLIP`, `THRUST`, `THRUST_QUOTIENT` | predict 時為 `HIDDEN`，取不到 |
| 遮蔽欄 (T 類) | `TOTAL_CONSUMP`, `ME_CONSUMPTION` | predict 時 `HIDDEN`，且**洩漏目標** |
| 原始方向索引 | `WIND_DIRECTION`, `SWELL_DIRECTION`, `SEA_DIRECTION` | 已由 `*_SIN`/`*_COS` 取代 |
| 原始汙損字串 | `last_maintenance_hull_fouling_type` | 已由 `fouling_*` multi-hot 取代 |

`FEATURE_COLUMNS` = `BASE_FEATURE_COLUMNS`（環境/航行 A 類 + 養護事件特徵，明列）
+ `feature_engineering.ENGINEERED_COLUMNS`（下列衍生特徵，隨轉換定義同步）。

---

## 特徵總覽

目前共 **75 個特徵**（71 numeric + 4 categorical）：

| 群組 | 數量 | 來源 |
|---|---:|---|
| 環境/航行原始欄（A 類，clip 後） | 22 | `vt_fd.csv` |
| 養護事件特徵 | 21 | `maintenance.csv` join（含 4 個類別欄） |
| 方向 cyclic 編碼 | 6 | 衍生 |
| Tier 1 推進物理 | 4 | 衍生 |
| Tier 2 裝載/吃水 | 2 | 衍生 |
| Tier 3 天候附加阻力 | 9 | 衍生 |
| Tier 4 船殼汙損 | 8 | 衍生 |
| Tier 7 缺失旗標 | 3 | 衍生 |
| **合計** | **75** | |

4 個類別欄（one-hot）：`last_maintenance_event_type_normalized`、
`last_maintenance_propeller_condition`、`last_maintenance_hull_coating_condition`、
`last_maintenance_cavitation_found`。

### BASE_FEATURE_COLUMNS（明列 43 欄）

- **環境/航行（22）**：`NOON_UTC`、`AVG_SPEED`、`SPEED_THROUGH_WATER`、`ME_AVG_RPM`、
  `PROPELLER_SPEED`、`FORE_DRAFT`、`AFTER_DRAFT`、`MID_DRAFT`、`DISPLACEMENT`、`CARGO_ON_BOARD`、
  `WIND_SCALE`、`SEA_HEIGHT`、`SEA_WATER_TEMP`、`WIND_SPEED`、`SWELL_HEIGHT`、`WATER_DEPTH`、
  `TOTAL_DISTANCE`、`SEA_SPEED_DISTANCE`、`DIFF_STW_SOG_SLIP`、`FULL_SPD_STW_SLIP`、
  `HOURS_FULL_SPEED`、`HOURS_TOTAL`
- **養護事件（21）**：`days_since_last_maintenance`、`has_ever_had_maintenance`、
  `maintenance_event_count_all/30d/90d/180d`、`has_maintenance_today`、
  `days_since_last_polishing`、`has_ever_had_polishing`、`days_since_last_cleaning`、
  `has_ever_had_cleaning`、`days_since_last_inspection`、`has_ever_had_inspection`、
  `days_since_last_dock`、`has_ever_had_dock`、`last_maintenance_draft_fwd_m`、
  `last_maintenance_draft_aft_m`、`last_maintenance_event_type_normalized`、
  `last_maintenance_propeller_condition`、`last_maintenance_hull_coating_condition`、
  `last_maintenance_cavitation_found`

---

## 資料清理 (Tier 7)

### 離群值裁切 (outlier clipping)

原始檔存在物理上不可能的值（見 [`dataset.md`](dataset.md) 的離群表）。在計算任何衍生特徵**之前**，
先把下列欄位就地裁切到物理界限（`CLIP_BOUNDS`），避免單一髒值污染 `stw_cubed`、`admiralty_power_term`
等三次方/乘積項。

| 欄位 | 界限 | 欄位 | 界限 |
|---|---|---|---|
| `AVG_SPEED` / `SPEED_THROUGH_WATER` | 0–30 kn | `WIND_SPEED` | 0–100 kn |
| `ME_AVG_RPM` / `PROPELLER_SPEED` | 0–90 RPM | `SEA_HEIGHT` / `SWELL_HEIGHT` | 0–20 m |
| `FORE_DRAFT` / `AFTER_DRAFT` / `MID_DRAFT` | 0–20 m | `WATER_DEPTH` | 0–12000 m |
| `DISPLACEMENT` / `CARGO_ON_BOARD` | 0–200000 MT | `TOTAL_DISTANCE` | 0–800 nm |
| `WIND_SCALE` | 0–12 Beaufort | `DIFF_STW_SOG_SLIP` | −20–20 |
| `HOURS_FULL_SPEED` / `HOURS_TOTAL` | 0–24 hr | `FULL_SPD_STW_SLIP` | −100–100 |

### 缺失指示旗標 (missing flags)

`DISPLACEMENT`、`MID_DRAFT`、`SEA_WATER_TEMP` 僅約 68.5% 填充，缺失本身可能帶訊息。各產生一個
`<col>_is_missing`（0/1）。

---

## 衍生特徵 (`ENGINEERED_COLUMNS`)

### 方向 cyclic 編碼

三個 16 方位羅經索引 (0–15) 是環狀的，改用單位圓上的 (sin, cos) 表示：`angle = index × 2π/16`。
相鄰方向（15↔0）自然靠近；**缺失映射到原點 (0, 0)**，與任何真實方向都不同。

`WIND_DIRECTION_SIN/COS`、`SWELL_DIRECTION_SIN/COS`、`SEA_DIRECTION_SIN/COS`

### Tier 1 — 推進物理 (propulsion physics)

目標是「全速時段的總能量 ≈ 功率 × 時數」，而功率 ∝ 速度³。這層乘法結構樹模型學不出來，故預先算好。

| 特徵 | 定義 |
|---|---|
| `stw_cubed` | `STW³` |
| `stw_cubed_x_full_speed_hours` | `STW³ × HOURS_FULL_SPEED`（能量 ≈ 功率 × 時數） |
| `admiralty_power_term` | `DISPLACEMENT^(2/3) × STW³`（Admiralty 係數分子） |
| `rpm_cubed` | `ME_AVG_RPM³`（HORSE_POWER 被遮蔽，RPM 為功率代理） |

### Tier 2 — 裝載 / 吃水 (loading / draft)

| 特徵 | 定義 |
|---|---|
| `trim_m` | `FORE_DRAFT − AFTER_DRAFT`（縱傾） |
| `mean_draft_m` | `(FORE_DRAFT + AFTER_DRAFT) / 2` |

### Tier 3 — 天候附加阻力 (weather added resistance)

方向分量比「sin/cos + 風速各自」更有物理意義：縱向 (longitudinal) 為頂/順風、橫向 (beam) 為側向。

| 特徵 | 定義 |
|---|---|
| `wind_long` / `wind_beam` | `WIND_SPEED × cos/sin(WIND_DIRECTION)` |
| `sea_long` / `sea_beam` | `SEA_HEIGHT × cos/sin(SEA_DIRECTION)` |
| `swell_long` / `swell_beam` | `SWELL_HEIGHT × cos/sin(SWELL_DIRECTION)` |
| `sea_height_sq` / `swell_height_sq` | `H²`（附加阻力 ∝ 波高平方） |
| `combined_wave_height` | `sqrt(SEA_HEIGHT² + SWELL_HEIGHT²)`（合成有義波高） |

### Tier 4 — 船殼汙損 (fouling)

| 特徵 | 定義 |
|---|---|
| `days_since_cleaning_sqrt` | `sqrt(days_since_last_cleaning)`（汙損成長後飽和） |
| `days_since_cleaning_log` | `log1p(days_since_last_cleaning)` |
| `fouling_x_load` | `days_since_last_cleaning × STW³`（汙損懲罰隨功率放大） |
| `fouling_barnacle` … `fouling_calcium` | 由 `hull_fouling_type` 逗號清單解析為 set 後 multi-hot（5 種：barnacle/slime/algae/tubeworm/calcium），解決順序/空格不一致造成的假 unique |

---

## 缺失值處理原則

- 衍生特徵若任一輸入缺失，輸出留空字串（由模型 pipeline 的 `SimpleImputer` 以中位數補值）。
- 方向 sin/cos 缺失 → 原點 (0, 0)。
- `admiralty_power_term` 等需正值輸入者，輸入無效時留空。

## 重新產生

```bash
uv run python scripts/engineer_maintenance_features.py
uv run python scripts/build_model_ready_data.py
```

輸出 `dataset/{train,test,prediction}_model_ready.csv` 會帶上所有衍生特徵；同時產出
`dataset/target_value_normalization.json`（label 的 z-score mean/std，供 predict 還原，屬 label
處理非特徵）。訓練 (`train_pipeline.py`) 與產出 submission (`generate_submission.py`) 透過共用的
`build_feature_columns()` 自動採用同一份 `FEATURE_COLUMNS`。
