# 資料字典 (data dictionary) — `etl/vt_fd_features.csv`

`etl/vt_fd_features.csv` 的每個欄位 (column) 都在此定義一次，可追溯至其來源與公式。此檔有
**214 個欄位**、**21,219 列** (`feature_manifest.json::n_rows`)。它是訓練程式讀取的單一特徵表
(feature table)；配套的 `etl/feature_manifest.json` 是機器可讀的契約，宣告其中哪些欄位是合法的模型
輸入。

- **原始欄位原封不動沿用** 自 `dataset/vt_fd.csv`——由 `dataset/README.md` 定義，並在
  `feature_engineering/io.py` 重新宣告。
- **工程特徵欄位** 由 `feature_engineering/{maintenance,physics_features,statistics}.py` 加入。

---

## 1. 檔案如何建立

```bash
python -m ym_datalake.ml_york.feature_engineering --data dataset --out etl
```

`build.py::assemble_features` 執行固定的管線 (pipeline)；**順序很重要**（統計特徵讀取物理欄位；
熱指數同時讀取養護時鐘與回溯 (trailing) 溫度平均）：

```
io.load_vt_fd            → 原始欄位 + 鍵 + 旗標 + 標的 + Group F 燃料特徵
maintenance.add_*        → Group B  （汙損 / 養護年齡）
physics_features.add_*   → Group C  （流體 / 航速）  +  Group D  （天氣 / 阻力）
statistics.add_*         → Group E  （回溯統計、速度損失、熱指數）
```

唯一的資料來源是 `dataset/vt_fd.csv`（40 個欄位）與 `dataset/maintenance.csv`。沒有外部資料、沒有
靜水力表、不依賴精煉資料湖 (curated lake)——每個工程值都是原始輸入上的公式。載入時會先移除 63 列
完全重複的列，剩下 21,219 列。

### A/H/T/F 類別模型（出自 `dataset/README.md`）

原始欄位依其在**遮蔽預測區間 (masked prediction window)** 內是否可見來分級：

| 類別 | 意義 | 遮蔽區間內 |
|:-----:|---------|------------------------|
| **A** | 環境 / 航行 | **可見** |
| **H** | 主機性能（功率、負載、SFOC、滑失 (slip)、推力） | **HIDDEN** |
| **T** | 油耗（總計、主機、各燃料別） | **HIDDEN**，或標的儲存格上為 **PREDICT** |
| **F** | 預測日篩選 / 建模輔助（`WIND_SCALE`、`HOURS_FULL_SPEED`） | **可見** |

### 預測安全 (predict-safe) / 洩漏 (leakage) 契約

- **模型輸入 = 僅那 163 個 `predict_safe_features`。** 每一個都僅由 A + F 欄位、`maintenance.csv`
  與時間衍生，因此即使在遮蔽預測列上也全都是合法輸入。
- **`leakage_columns`（13 個）= 6 個 H 欄位 + 7 個 T 欄位。** 它們以*標籤*形式存在於 CSV 中，但絕不
  可進入模型；在真實的 PREDICT 區間中它們是 HIDDEN。
- 標記是在數值轉型*之前*從原始字串解析出來的：`PREDICT` → `is_predict`、`HIDDEN`/`PREDICT` →
  `is_masked`。轉型後每個 `HIDDEN`/`PREDICT`/非數值儲存格都是 `NaN`。
- 三艘預測船共有 **102 個 PREDICT 儲存格**（14 個事件 × 每個 5–10 天）。

### 船舶與 W 型 (W-type) 分組

15 艘船：**S1–S12** 是完全標註的訓練船；**S21–S23** 是有遮蔽區間的預測船。不同航線上的姊妹設計
依船殼類型 (hull type)（`io.SHIP_TYPE`）分組：

- **W1** = S1–S8, S21
- **W2** = S9–S12, S22, S23

### 物理合理性 (physical plausibility) 處理

`io._clip_physical` 會將任何超出其 `_PHYSICAL_BOUNDS` 範圍的讀數設為 `NaN`（絕不箝制——箝制會憑空
造出一個邊界值）；接著由各船的插補 (imputation) 與穩態 (steady-state) 閘門吸收缺口。燃料欄位僅拒絕
負質量。邊界 (bound) 列於下方的原始欄位表。

> **欄位數一覽：** 40 原始 + 3 新增鍵 + 3 旗標 + 5 標的 + 163 預測安全 = 214。
> 預測安全的細分：Group F **6**、Group B **40**、Group C **38**、Group D **25**、Group E **54**。

---

## 2. 原始欄位（40）

依檔案順序原封不動沿用自 `vt_fd.csv`（`io.ORIGINAL_COLUMNS`）。定義與單位出自 `dataset/README.md`
的欄位詳細表；物理邊界為 `io._PHYSICAL_BOUNDS`（超出者變為 `NaN`）。**洩漏欄位已特別標示——所有
H 欄位與所有 T 欄位皆禁止作為模型輸入。**

| # | 欄位 | 類別 | 定義 | 單位 | Bound → NaN | 備註 |
|--:|--------|:-----:|------------|------|-------------|-------|
| 1 | `De-identification Name` | A | 船舶代號 | S1–S23 | — | `ship_id` 的來源；字串直通 |
| 2 | `VOYAGE` | A | 航次 (voyage) 編號 | — | — | 亦為一個鍵欄位 |
| 3 | `NOON_UTC` | A | **相對天數**（Day 0 = 該船最早紀錄） | days | — | 非日曆日期；`noon_utc` 的來源 |
| 4 | `AVG_SPEED` | A | 對地航速 (speed over ground, SOG) | knots | [0, 30] | 100% 填充 |
| 5 | `SPEED_THROUGH_WATER` | A | 對水航速 (speed through water, STW) | knots | [0, 30] | 100% 填充；與 SOG 為獨立來源 |
| 6 | `ME_AVG_RPM` | A | 主機平均轉速 | RPM | [0, 90] | |
| 7 | `PROPELLER_SPEED` | A | 螺旋槳轉速 | RPM | [0, 45] | |
| 8 | `FORE_DRAFT` | A | 首吃水 (draft) | m | [0, 20] | |
| 9 | `AFTER_DRAFT` | A | 尾吃水 | m | [0, 20] | |
| 10 | `DISPLACEMENT` | A | 排水量 (displacement) | MT | [30 000, 200 000] | 缺失時於下游插補 |
| 11 | `CARGO_ON_BOARD` | A | 載貨量 (cargo) | MT | [0, 155 000] | |
| 12 | `WIND_SCALE` | A / F | 風力等級 (wind force) | Beaufort | — | 穩態閘門輸入 |
| 13 | `SEA_HEIGHT` | A | 浪高 | m | [0, 20] | ~81% 填充 |
| 14 | `SEA_WATER_TEMP` | A | 海水溫度 | °C | — | 驅動汙損 (fouling) / 密度項 |
| 15 | `WIND_SPEED` | A | 風速 | knots | [0, 80] | ~81% 填充 |
| 16 | `WIND_DIRECTION` | A | 風向（相對 / 羅經） | deg / point | — | 羅經點 0–15 |
| 17 | `SWELL_HEIGHT` | A | 湧浪 (swell) 高度 | m | [0, 20] | |
| 18 | `SWELL_DIRECTION` | A | 湧浪方向 | deg / point | — | |
| 19 | `SEA_DIRECTION` | A | 浪方向 | deg / point | — | |
| 20 | `WATER_DEPTH` | A | 水深（淺水 (shallow-water) 判定） | m | [0, 12 000] | |
| 21 | `MID_DRAFT` | A | 舯吃水 | m | [0, 20] | |
| 22 | `TOTAL_DISTANCE` | A | 當日對地總航距 | nm | — | |
| 23 | `SEA_SPEED_DISTANCE` | A | 全速對水航距 | nm | — | |
| 24 | `DIFF_STW_SOG_SLIP` | A | STW−SOG 速差（洋流代理 (current proxy)） | knots / % | [-15, 15] | |
| 25 | `FULL_SPD_STW_SLIP` | A | 全速 STW 滑失 | % | [-30, 100] | |
| 26 | `HORSE_POWER` | **H** | 主機功率 | kW | — | **洩漏** — 預測區間內為 HIDDEN |
| 27 | `LOAD_PCT` | **H** | 主機負載 | %MCR | — | **洩漏** |
| 28 | `SFOC` | **H** | 比油耗 | g/kWh | — | **洩漏** |
| 29 | `ME_SLIP` | **H** | 主機 / 螺旋槳滑失 | % | — | **洩漏** |
| 30 | `THRUST` | **H** | 推力 | kN | — | **洩漏** |
| 31 | `THRUST_QUOTIENT` | **H** | 推力係數 | — | — | **洩漏** |
| 32 | `TOTAL_CONSUMP` | **T** | 當日總油耗（含輔機 / 鍋爐） | MT/day | — | **洩漏** |
| 33 | `ME_CONSUMPTION` | **T** | 主機油耗合計 | MT/day | — | **洩漏** |
| 34 | `ME_FULLSPEED_CONSUMP_HSHFO` | **T** | 主機全速油耗 — HSHFO | MT/day | ≥ 0 | **洩漏 / PREDICT 標的** |
| 35 | `ME_FULLSPEED_CONSUMP_ULSFO` | **T** | 主機全速油耗 — ULSFO | MT/day | ≥ 0 | **洩漏 / PREDICT 標的** |
| 36 | `ME_FULLSPEED_CONSUMP_VLSFO` | **T** | 主機全速油耗 — VLSFO | MT/day | ≥ 0 | **洩漏 / PREDICT 標的** |
| 37 | `ME_FULLSPEED_CONSUMP_LSMGO` | **T** | 主機全速油耗 — LSMGO | MT/day | ≥ 0 | **洩漏 / PREDICT 標的** |
| 38 | `ME_FULLSPEED_CONSUMP_BIO_HSFO` | **T** | 主機全速油耗 — BIO_HSFO | MT/day | ≥ 0 | **洩漏**；預測區間內未使用 |
| 39 | `HOURS_FULL_SPEED` | F | 全速航行時數 | hr | — | 穩態閘門 + 每小時標的 |
| 40 | `HOURS_TOTAL` | F | 總航行時數 | hr | — | 營運直通 |

> 燃料欄位（34–38）僅拒絕**負**質量（`s >= 0`）；其上尾 (upper tail) 是真實訊號。
> 負讀數也會使該燃料的訓練標的失效。

---

## 3. 中繼欄位 — 鍵、旗標、標的、燃料身分

由 `io.load_vt_fd` 加入。這些**不是**模型輸入（Group F 燃料特徵除外）：鍵識別一列、旗標把關訓練、
標的是標籤。

### 3.1 鍵（3 個新增 + `VOYAGE`）

| 欄位 | 定義 | 來源 |
|--------|------------|--------|
| `ship_id` | 船舶代號（字串） | `De-identification Name` |
| `noon_utc` | 相對天數（整數，Day 0 = 該船最早紀錄） | `NOON_UTC` |
| `ship_type` | W 型（`W1`/`W2`） | `ship_id` → `io.SHIP_TYPE` |
| `VOYAGE` | 航次編號（亦為原始欄位 #2） | 原始 |

### 3.2 旗標（3）

| 欄位 | 定義 | 規則 |
|--------|------------|------|
| `is_masked` | 該列有任何隱藏標籤 | 6 個 H + 7 個 T 儲存格中任一 `== 'HIDDEN'`，**或** `is_predict` |
| `is_predict` | 該列是待預測標的儲存格 | 任一燃料儲存格 `== 'PREDICT'`（共 102 個儲存格） |
| `is_steady_state` | 乾淨穩態點（README PREDICT 閘門 + 訓練權重） | `HOURS_FULL_SPEED >= 22` **且** `WIND_SCALE <= 4` |

### 3.3 標的（5）— 標籤，絕非輸入

每個標的在遮蔽列上皆為 `NaN`，因此那 102 個預測儲存格維持未標註。下方欄位順序為 CSV 順序
（`_attach_targets`）。

| 欄位 | 定義 | 公式 | 單位 |
|--------|------------|---------|------|
| `target_fuel_type` | 當日的燃料簡碼 | 預測列上為標記 PREDICT 的欄位，否則為正質量最大的燃料；若無正值則 `NaN` | HSHFO / ULSFO / VLSFO / LSMGO / BIO_HSFO |
| `target_me_fs_consump` | 當日主機全速燃料質量 | 對 5 個燃料欄位取 `Σ_fuel mass`（跳過 NaN，`min_count=1`） | MT/day |
| `target_energy_mj` | 以低位發熱值 (Lower Calorific Value, LCV) 統一的能量（使各燃料可比較） | `Σ_fuel (mass × LCV_fuel)` — 見下方 LCV 表 | MT·MJ/kg（與能量成正比；相對字面 MJ 固定差 1000×，作為標的無關緊要） |
| `target_me_fs_consump_per_hour` | 以全速時數校正的質量 | `target_me_fs_consump / HOURS_FULL_SPEED` | MT/hr |
| `target_energy_mj_per_hour` | 以全速時數校正的能量 | `target_energy_mj / HOURS_FULL_SPEED` | per hr |

`target_for_training = target_energy_mj`。每小時欄位套用 README 的校正：每日全速時數各異；預測標的
是*全速時段內消耗*的燃料。

**低位發熱值**（`io.LCV`，MJ/kg，出自 README 的燃料熱值對照表）：

| 燃料簡碼 | LCV (MJ/kg) |
|----------|:-----------:|
| HSHFO | 40.2 |
| ULSFO | 41.2 |
| VLSFO | 40.2 |
| LSMGO | 42.7 |
| BIO_HSFO | 39.4（近似值） |

### 3.4 Group F — 燃料特徵（6，預測安全）

`_attach_fuel_features`。**預測安全**：燃料身分在預測列上*是給定的*（即標記 `PREDICT` 的那個
欄位），因此這些獨熱 (one-hot) 將該合法資訊重新編碼為模型輸入。在遮蔽的非預測列上 `target_fuel_type`
為 `NaN`，因此每個獨熱皆為 0、`fuel_lcv` 為 `NaN`。

| 欄位 | 定義 | 公式 |
|--------|------------|---------|
| `fuel_is_hshfo` | HSHFO 指示 (indicator) | `(target_fuel_type == 'HSHFO')` → 0/1 |
| `fuel_is_ulsfo` | ULSFO 指示 | `(target_fuel_type == 'ULSFO')` → 0/1 |
| `fuel_is_vlsfo` | VLSFO 指示 | `(target_fuel_type == 'VLSFO')` → 0/1 |
| `fuel_is_lsmgo` | LSMGO 指示 | `(target_fuel_type == 'LSMGO')` → 0/1 |
| `fuel_is_bio_hsfo` | BIO_HSFO 指示 | `(target_fuel_type == 'BIO_HSFO')` → 0/1 |
| `fuel_lcv` | 當日燃料的 LCV | `target_fuel_type` → `LCV` (MJ/kg) |

---

## 4. Group B — 養護 / 汙損年齡（40）

來源：`maintenance.py`，僅由 `maintenance.csv` + 時間——完全預測安全。汙損年齡以**重置時鐘
(reset clock)** 建模：距上一次實體重置某表面的事件過了幾天。所有運算皆為純整數日；每個時鐘的第一個
週期錨定 (anchor) 在該船的資料起點（`anchor = min(noon_utc)`），且時鐘為**包含式**（第 *d* 天的
清洗使該時鐘在當天為 0）。

### 重置原子（出自 README 養護類型）

原始 `event_type` 以 `+` 拆分為原子；每個時鐘在其集合中的原子上重置：

| 時鐘重置於 | 原子 | 觸發它的原始代碼 |
|-----------------|-------|---------------------------|
| 船殼清洗 (underwater cleaning) | `UWC`, `DD` | UWC, UWC+PP, DD |
| 螺旋槳拋光 (propeller polishing) | `PP`, `DD` | PP, UWI+PP, UWC+PP, DD |
| 進塢 (dry dock) | `DD` | DD |
| 檢查（僅計數） | `UWI` | UWI, UWI+PP |

`UWI`（水下檢查 (underwater inspection)——僅拍照）**不重置任何時鐘**。事件代碼及其物理意義：
`PP` 拋光、`UWC` 船殼清洗、`DD` 進塢（全面重新塗裝 + 機械）、`UWI` 檢查。

### 4.1 主要重置時鐘 + 轉換

| 欄位 | 定義 | 公式 |
|--------|------------|---------|
| `days_since_hull_clean` | 距上次船殼重置事件的天數 | `max(0, day − last_reset)`；第一個週期上錨定 |
| `days_since_hull_clean_log1p` | 對數轉換 | `ln(1 + days_since_hull_clean)` |
| `days_since_hull_clean_sqrt` | 平方根轉換 | `√days_since_hull_clean` |
| `days_since_prop_polish` | 距上次拋光重置事件的天數 | 於拋光重置上的同一時鐘 |
| `days_since_prop_polish_log1p` | 對數轉換 | `ln(1 + days_since_prop_polish)` |
| `days_since_prop_polish_sqrt` | 平方根轉換 | `√days_since_prop_polish` |
| `days_since_dry_dock` | 距上次進塢的天數 | 於 DD 上的同一時鐘 |
| `days_since_dry_dock_log1p` | 對數轉換 | `ln(1 + days_since_dry_dock)` |
| `days_since_dry_dock_sqrt` | 平方根轉換 | `√days_since_dry_dock` |
| `coating_age_years` | 塗層年齡 | `days_since_dry_dock / 365` |

`log1p`/`sqrt` 配對讓樹模型 (tree) 取得凹形的汙損成長形狀，而不必擬合常數。

### 4.2 設限 (censored) 旗標（2）

| 欄位 | 定義 | 公式 |
|--------|------------|---------|
| `hull_clock_censored` | 船殼時鐘為下界（尚未觀測到重置） | 若該日之前無船殼重置則 `1`，否則 `0` |
| `polish_clock_censored` | 拋光時鐘為下界 | 若該日之前無拋光重置則 `1`，否則 `0` |

### 4.3 各原始型別的距今天數（6）+ 彙總（2）

以下每一個都比對**完全一致**的 `event_type` 字串（非原子）。Slug 規則：`+` → `_`、轉小寫。

| 欄位 | 定義 |
|--------|------------|
| `days_since_dd` | 距上次完全一致的 `DD` 事件的天數 |
| `days_since_uwc` | 距上次完全一致的 `UWC` 事件的天數 |
| `days_since_pp` | 距上次完全一致的 `PP` 事件的天數 |
| `days_since_uwi_pp` | 距上次完全一致的 `UWI+PP` 事件的天數 |
| `days_since_uwc_pp` | 距上次完全一致的 `UWC+PP` 事件的天數 |
| `days_since_uwi` | 距上次完全一致的 `UWI` 事件的天數 |
| `days_since_any_service` | 距上次**非 UWI** 事件的天數（純檢查不算一次養護） |
| `days_since_any_event` | 距上次**任何**型別事件的天數 |

### 4.4 事件計數 — 累計（5）+ 窗口（3）

累計計數是該日（含）之前的事件（`searchsorted`，右側）；窗口計數是回溯 `(day − w, day]` 內的事件。

| 欄位 | 定義 |
|--------|------------|
| `n_hull_cleans` | 至今累計的船殼重置事件（UWC 或 DD） |
| `n_prop_polishes` | 至今累計的拋光重置事件（PP 或 DD） |
| `n_drydocks` | 至今累計的 DD 事件 |
| `n_inspections` | 至今累計含 UWI 原子的事件（UWI、UWI+PP） |
| `n_services_to_date` | 至今累計的非 UWI 事件 |
| `event_count_30d` | 過去 30 天內任何型別的事件 |
| `event_count_90d` | 過去 90 天內任何型別的事件 |
| `event_count_180d` | 過去 180 天內任何型別的事件 |

### 4.5 前向填補的檢查發現（9）

自最近一次實際記錄各發現的事件做末次觀測前向填補 (last-observation-carry-forward)（空白儲存格
不會抹除先前的讀數）；若從未觀測則 `NaN`。編碼：狀態 `{Good:0, Fair:1, Poor:2}`、空蝕 (cavitation)
`{Yes:1, No:0}`、汙損嚴重度權重 `{barnacle:3, tubeworm:3, calcium:2, algae:1, slime:1}`。

| 欄位 | 定義 | 公式 |
|--------|------------|---------|
| `last_prop_condition` | 最新螺旋槳狀態 | `propeller_condition` 的 LOCF，序數 0–2 |
| `last_hull_coating_condition` | 最新塗層狀態 | `hull_coating_condition` 的 LOCF，序數 0–2 |
| `last_cavitation_found` | 最新空蝕旗標 | `cavitation_found` 的 LOCF，0/1 |
| `last_fouling_severity` | 最新汙損集合的嚴重度 | 對最新汙損集合取 `Σ weight(t)` |
| `had_barnacle` | 最新集合含 barnacle | 若 `barnacle` ∈ 最新集合則 `1` |
| `had_tubeworm` | 最新集合含 tubeworm | 若 `tubeworm` ∈ 最新集合則 `1` |
| `had_calcium` | 最新集合含 calcium | 若 `calcium` ∈ 最新集合則 `1` |
| `had_algae` | 最新集合含 algae | 若 `algae` ∈ 最新集合則 `1` |
| `had_slime` | 最新集合含 slime | 若 `slime` ∈ 最新集合則 `1` |

### 4.6 飽和時鐘 + 交互項（3）

| 欄位 | 定義 | 公式 |
|--------|------------|---------|
| `hull_clock_sat` | 飽和船殼時鐘（成長趨平） | `1 − exp(−days_since_hull_clean / 180)` |
| `prop_cond_x_polishclock` | 更差且更舊的螺旋槳 | `last_prop_condition × days_since_prop_polish` |
| `cavitation_x_polishclock` | 有空蝕且更舊的螺旋槳 | `last_cavitation_found × days_since_prop_polish` |

---

## 5. Group C — 流體 / 航速（38）

來源：`physics_features.py::_hydro` + `_speed`。物理僅以 A 欄位上的*公式*進入——無擬合指數、無船舶
諸元。主要項是乾淨船殼的冪律：主機油耗 ∝ SFOC·功率，且功率 ∝ displacement^(2/3)·STW³。

### 5.1 流體 / 載況（13）

| 欄位 | 定義 | 公式 / 來源 | 單位 / 範圍 |
|--------|------------|------------------|--------------|
| `mean_draft` | 平均吃水 | `(FORE_DRAFT + AFTER_DRAFT) / 2` | m |
| `trim` | 縱傾 (trim)（+ = 尾傾） | `AFTER_DRAFT − FORE_DRAFT` | m |
| `trim_abs` | 絕對縱傾 | `abs(trim)` | m |
| `mid_draft` | 舯吃水（補值） | `MID_DRAFT`，否則 `mean_draft` | m |
| `displacement_filled` | 排水量，已插補 | `DISPLACEMENT`，否則各船吃水回歸，否則該船中位數，否則全域中位數 | MT |
| `displacement_missing` | 排水量原為缺失 | 若 `DISPLACEMENT` 為 `NaN` 則 `1` | 0/1 |
| `displacement_23` | 排水量^(2/3)（冪律項） | `displacement_filled^(2/3)` | — |
| `cargo` | 載貨量 | `CARGO_ON_BOARD` | MT |
| `depth_draft_ratio` | 龍骨下淨空代理 | `WATER_DEPTH / mean_draft` | — |
| `cargo_utilization` | 載貨相對該船自身峰值 | `cargo / max_cargo(ship)`（安全除法） | 0–1 |
| `is_laden` | 重載指示 | 若 `cargo_utilization > 0.5` 則 `1` | 0/1 |
| `wetted_proxy` | 船型代理（≈ Lpp·B） | `displacement_filled / mean_draft`（安全除法） | — |
| `trim_ratio` | 正規化縱傾 | `trim / mean_draft`（安全除法） | — |

`displacement_filled` 的插補（`_impute_displacement`）：`DISPLACEMENT` 缺失時，於該船自身的列上
擬合 `displacement ~ a + b·mean_draft`（需 ≥2 列且 ≥2 個不同吃水），退而取該船中位數，再取全域
中位數。

### 5.2 航速 / 螺旋槳（25）

| 欄位 | 定義 | 公式 / 來源 | 單位 / 範圍 |
|--------|------------|------------------|--------------|
| `stw` | 對水航速 | `SPEED_THROUGH_WATER` | knots |
| `sog` | 對地航速 | `AVG_SPEED` | knots |
| `rpm` | 主機轉速 | `ME_AVG_RPM` | RPM |
| `prop_speed` | 螺旋槳轉速 | `PROPELLER_SPEED` | RPM |
| `stw2` | STW² | `stw²` | — |
| `stw3` | STW³ | `stw³` | — |
| `rpm2` | RPM² | `rpm²` | — |
| `rpm3` | RPM³（∝ 軸功率） | `rpm³` | — |
| `prop_speed3` | 螺旋槳 RPM³ | `prop_speed³` | — |
| `admiralty_fuel_proxy` | 乾淨船殼油耗基線 | `displacement_23 × stw3` = `disp^(2/3)·STW³` | — |
| `speed_per_rpm` | 進速效率（汙損時下降） | `stw / rpm`（安全除法） | — |
| `stw_minus_sog` | STW−SOG（洋流代理） | `stw − sog` | knots |
| `apparent_advance` | 進速係數代理 | `stw / prop_speed`（安全除法） | — |
| `slip_ratio` | 螺旋槳負載代理 | `rpm / prop_speed`（安全除法） | — |
| `rpm2_stw` | 功率替代交叉項 | `rpm² × stw` | — |
| `full_spd_stw_slip` | 全速 STW 滑失 | `FULL_SPD_STW_SLIP` | % |
| `diff_stw_sog_slip` | STW−SOG 滑失（洋流代理） | `DIFF_STW_SOG_SLIP` | knots / % |
| `slip_excess` | 超出乾淨船殼基線的滑失 | `FULL_SPD_STW_SLIP − slip_baseline` | % |
| `sea_speed_fraction` | 當日全速占比 | `SEA_SPEED_DISTANCE / TOTAL_DISTANCE`（安全除法） | 0–1 |
| `total_distance` | 當日對地航距 | `TOTAL_DISTANCE` | nm |
| `froude_depth` | 此航速的臨界水深 | `2.75 × (stw·0.514444)² / 9.80665` | m |
| `shallow_flag` | 淺水旗標 | 若 `WATER_DEPTH < froude_depth` 則 `1` | 0/1 |
| `water_depth` | 水深 | `WATER_DEPTH` | m |
| `hours_full_speed` | 全速航行時數 | `HOURS_FULL_SPEED` | hr |
| `wind_scale` | 風力等級 | `WIND_SCALE` | Beaufort |

`slip_baseline`（`_slip_baseline`）= 該船穩態列上 `FULL_SPD_STW_SLIP` 的第 5 百分位數（退回全隊
p5）——一個穩健的乾淨船殼參考。`froude_depth` 將 STW 換算為 m/s（`0.514444`）並套用淺水臨界水深
關係 `h_crit = 2.75·V²/g`。

---

## 6. Group D — 天氣 / 附加阻力 (added resistance)（25）

來源：`physics_features.py::_weather`。天氣欄位約 81% 填充；缺失值以各船中位數插補並附明確的缺失
旗標，再轉為阻力代理。方向視為**相對船艏**（真實船艏向未知——一個可接受的模稜）：迎向分量 = cos。

| 欄位 | 定義 | 公式 / 來源 | 單位 / 範圍 |
|--------|------------|------------------|--------------|
| `weather_missing` | 風或浪原為缺失 | 若 `SEA_HEIGHT` 或 `WIND_SPEED` 為 `NaN` 則 `1` | 0/1 |
| `sea_water_temp_missing` | 海溫原為缺失 | 若 `SEA_WATER_TEMP` 為 `NaN` 則 `1` | 0/1 |
| `wind_speed` | 風速（已插補） | `WIND_SPEED` 的各船中位數插補 | knots |
| `wind_speed2` | 風速² | `wind_speed²` | — |
| `sea_height` | 浪高（已插補） | `SEA_HEIGHT` 的各船中位數插補 | m |
| `sea_height2` | 浪高² | `sea_height²` | — |
| `swell_height` | 湧浪高度（已插補） | `SWELL_HEIGHT` 的各船中位數插補 | m |
| `combined_wave` | 合成浪+湧浪 | `hypot(sea_height, swell_height)` = `√(sea_height² + swell_height²)` | m |
| `sea_water_temp` | 海溫（已插補） | `SEA_WATER_TEMP` 的各船中位數插補 | °C |
| `temp_dev` | 相對生物附著 (biofouling) 中性 15 °C 的溫度差 | `sea_water_temp − 15` | °C |
| `density` | 35 PSU 下的海水密度 | `1028.11 − 0.07717·T − 0.004517·T²` (T = `sea_water_temp`) | kg/m³ |
| `density_factor` | 相對 15 °C 參考的密度 | `density / density(15 °C)` | ≈1 |
| `kin_visc` | 35 PSU 下的運動黏度 (kinematic viscosity) | `1.83e-6 − 5.267e-8·T + 6.67e-10·T²` | m²/s |
| `reynolds_proxy` | 黏性阻力區制 | `stw·0.514444·mean_draft / kin_visc` | — |
| `wind_dir_sin` | 風向正弦 | `sin(θ)`, `θ = deg2rad(pt·22.5)`, pt = 插補後的羅經點 0–15 | −1…1 |
| `wind_dir_cos` | 風向餘弦 | `cos(θ)` | −1…1 |
| `sea_dir_sin` | 浪向正弦 | `sin(θ_sea)` | −1…1 |
| `sea_dir_cos` | 浪向餘弦 | `cos(θ_sea)` | −1…1 |
| `swell_dir_sin` | 湧浪方向正弦 | `sin(θ_swell)` | −1…1 |
| `swell_dir_cos` | 湧浪方向餘弦 | `cos(θ_swell)` | −1…1 |
| `head_wind` | 迎面風分量 | `wind_speed · cos(θ_wind)` | knots |
| `beam_wind` | 橫向風分量 | `wind_speed · sin(θ_wind)` | knots |
| `head_sea` | 迎面浪分量 | `sea_height · cos(θ_sea)` | m |
| `beam_sea` | 橫向浪分量 | `sea_height · sin(θ_sea)` | m |
| `head_sea_sq` | 迎浪附加阻力代理 | `sea_height² · max(0, cos θ_sea)` | — |

密度/黏度的二次式是擬合至 35 PSU 下的 EOS-80 參考點：暖水較輕較稀，因此在相同航速與吃水下阻力
略小、雷諾 (Reynolds) 數較高。`density(15 °C) ≈ 1025.94 kg/m³`。羅經點以 22.5°/點 換算。

---

## 7. Group E — 回溯統計與速度損失 (Speed Loss)（54）

來源：`statistics.py`。每個窗口皆為**回溯**（第 *d* 天只看到 ≤ *d* 的日子），以整數日為時間基準，
故無未來資訊、亦無標的洩漏。這些讀取 Group C/D 欄位，那些欄位必須已存在。

### 7.1 滾動平均 / 滾動標準差（42）— 7 欄位 × 3 窗口 × {mean, std}

被滾動的欄位（`ROLL_COLUMNS`）：`stw`、`rpm`、`full_spd_stw_slip`、`sea_height`、`wind_speed`、
`mean_draft`、`sea_water_temp`。窗口：7、14、30 天（`pandas` 以時間為基準的 `rolling`，
`min_periods=1`）。命名：`{col}_roll{window}_{mean|std}`。`std` 在單列窗口（第一天）上為 `NaN`，
留給下游 0 填補。

| 欄位族 | 定義 |
|---------------|------------|
| `stw_roll{7,14,30}_{mean,std}` | 回溯 STW 平均 / 標準差 |
| `rpm_roll{7,14,30}_{mean,std}` | 回溯 RPM 平均 / 標準差 |
| `full_spd_stw_slip_roll{7,14,30}_{mean,std}` | 回溯全速滑失平均 / 標準差 |
| `sea_height_roll{7,14,30}_{mean,std}` | 回溯浪高平均 / 標準差 |
| `wind_speed_roll{7,14,30}_{mean,std}` | 回溯風速平均 / 標準差 |
| `mean_draft_roll{7,14,30}_{mean,std}` | 回溯平均吃水的平均 / 標準差 |
| `sea_water_temp_roll{7,14,30}_{mean,std}` | 回溯海溫平均 / 標準差 |

（42 欄位：每欄位 6 個組合，於附錄檢查清單中逐一列出。）

### 7.2 擴展平均 (expanding mean)、熱暴露、跨船 / 航次參考（7）

| 欄位 | 定義 | 公式 |
|--------|------------|---------|
| `stw_minus_expanding_mean` | STW 相對全歷史平均的漂移 | `stw − expanding_mean(stw)` |
| `sea_water_temp_expanding_mean` | 全歷史平均海溫 | `expanding_mean(sea_water_temp)` |
| `thermal_exposure_since_clean` | 距上次船殼清洗以來的暖水劑量 | 回溯 `Σ max(0, temp − 15)`，每個 `days_since_hull_clean == 0` 的日子重置 |
| `stw_vs_type_ref` | STW 相對 W 型參考 | `stw − mean(steady-state stw over ship_type)`（退回全隊平均） |
| `voyage_position` | 航次內的第幾天（0 起算） | `noon_utc` 在 `(ship, VOYAGE)` 內的排名，同分取先，再減 1 |
| `voyage_mean_stw` | 航次參考航速 | 各 `(ship, VOYAGE)` 的穩態 `stw` 平均（航次全列平均，再退回全隊平均） |
| `coating_x_thermal` | 塗層年齡 × 熱劑量（複合驅動因子） | `coating_age_years × thermal_exposure_since_clean` |

`thermal_exposure_since_clean` 在每個船殼清洗日（時鐘 = 0，包括資料起點的錨定）開啟一個新區段，
並在該區段內累積每日暖水超量 `max(0, temp − 15)`。

### 7.3 速度損失超額線（4）

`add_speed_loss_features`。在**乾淨列**（穩態**且** `days_since_hull_clean ≤ 60`）上擬合兩條最小
平方線；殘差 `observed − clean-predicted` 即附加阻力訊號。當該船有 ≥30 個乾淨列時逐船（`*_ship`）
產出，否則逐 W 型（`*_type`）；船欄位在無資料時也退回型別殘差。線是在整個序列上擬合的（輕微的
前視 (look-ahead)，可接受——交叉驗證 (CV) 不在範圍內）。

| 欄位 | 定義 | 乾淨擬合線 | 殘差 |
|--------|------------|----------------|----------|
| `rpm_excess_ship` | 該航速下的額外 RPM（逐船，退回型別） | `rpm ~ a + b·stw` | `rpm − (a + b·stw)` |
| `rpm_excess_type` | 該航速下的額外 RPM（逐 W 型） | `rpm ~ a + b·stw` | `rpm − (a + b·stw)` |
| `admiralty_excess_ship` | 超出乾淨 rpm→功率曲線的功率（逐船，退回型別） | `admiralty_fuel_proxy ~ a + b·rpm3` | `admiralty_fuel_proxy − (a + b·rpm3)` |
| `admiralty_excess_type` | 超出乾淨 rpm→功率曲線的功率（逐 W 型） | `admiralty_fuel_proxy ~ a + b·rpm3` | `admiralty_fuel_proxy − (a + b·rpm3)` |

### 7.4 熱汙損指數（1）

| 欄位 | 定義 | 公式 |
|--------|------------|---------|
| `thermal_fouling_index` | 汙損年齡 × 累計暖水劑量 | `days_since_hull_clean × sea_water_temp_expanding_mean` |

---

## 8. 附錄 — 完整有序欄位檢查清單（214）

CSV 欄位順序，對應至群組。請逐一對照 `etl/vt_fd_features.csv` 表頭勾銷。

**原始（1–40）：** `De-identification Name` · `VOYAGE` · `NOON_UTC` · `AVG_SPEED` ·
`SPEED_THROUGH_WATER` · `ME_AVG_RPM` · `PROPELLER_SPEED` · `FORE_DRAFT` · `AFTER_DRAFT` ·
`DISPLACEMENT` · `CARGO_ON_BOARD` · `WIND_SCALE` · `SEA_HEIGHT` · `SEA_WATER_TEMP` · `WIND_SPEED` ·
`WIND_DIRECTION` · `SWELL_HEIGHT` · `SWELL_DIRECTION` · `SEA_DIRECTION` · `WATER_DEPTH` · `MID_DRAFT` ·
`TOTAL_DISTANCE` · `SEA_SPEED_DISTANCE` · `DIFF_STW_SOG_SLIP` · `FULL_SPD_STW_SLIP` ·
`HORSE_POWER`* · `LOAD_PCT`* · `SFOC`* · `ME_SLIP`* · `THRUST`* · `THRUST_QUOTIENT`* ·
`TOTAL_CONSUMP`* · `ME_CONSUMPTION`* · `ME_FULLSPEED_CONSUMP_HSHFO`* · `ME_FULLSPEED_CONSUMP_ULSFO`* ·
`ME_FULLSPEED_CONSUMP_VLSFO`* · `ME_FULLSPEED_CONSUMP_LSMGO`* · `ME_FULLSPEED_CONSUMP_BIO_HSFO`* ·
`HOURS_FULL_SPEED` · `HOURS_TOTAL`  — *(`*` = 洩漏：H + T，禁止作為輸入)*

**鍵（41–43）：** `ship_id` · `noon_utc` · `ship_type`

**旗標（44–46）：** `is_masked` · `is_predict` · `is_steady_state`

**標的（47–51）：** `target_fuel_type` · `target_me_fs_consump` · `target_energy_mj` ·
`target_me_fs_consump_per_hour` · `target_energy_mj_per_hour`

**Group F — 燃料（52–57）：** `fuel_is_hshfo` · `fuel_is_ulsfo` · `fuel_is_vlsfo` · `fuel_is_lsmgo` ·
`fuel_is_bio_hsfo` · `fuel_lcv`

**Group B — 養護（58–97）：** `days_since_hull_clean` · `days_since_hull_clean_log1p` ·
`days_since_hull_clean_sqrt` · `days_since_prop_polish` · `days_since_prop_polish_log1p` ·
`days_since_prop_polish_sqrt` · `days_since_dry_dock` · `days_since_dry_dock_log1p` ·
`days_since_dry_dock_sqrt` · `coating_age_years` · `hull_clock_censored` · `polish_clock_censored` ·
`days_since_dd` · `days_since_uwc` · `days_since_pp` · `days_since_uwi_pp` · `days_since_uwc_pp` ·
`days_since_uwi` · `days_since_any_service` · `days_since_any_event` · `n_hull_cleans` ·
`n_prop_polishes` · `n_drydocks` · `n_inspections` · `n_services_to_date` · `event_count_30d` ·
`event_count_90d` · `event_count_180d` · `last_prop_condition` · `last_hull_coating_condition` ·
`last_cavitation_found` · `last_fouling_severity` · `had_barnacle` · `had_tubeworm` · `had_calcium` ·
`had_algae` · `had_slime` · `hull_clock_sat` · `prop_cond_x_polishclock` · `cavitation_x_polishclock`

**Group C — 流體/航速（98–135）：** `mean_draft` · `trim` · `trim_abs` · `mid_draft` ·
`displacement_filled` · `displacement_missing` · `displacement_23` · `cargo` · `depth_draft_ratio` ·
`cargo_utilization` · `is_laden` · `wetted_proxy` · `trim_ratio` · `stw` · `sog` · `rpm` ·
`prop_speed` · `stw2` · `stw3` · `rpm2` · `rpm3` · `prop_speed3` · `admiralty_fuel_proxy` ·
`speed_per_rpm` · `stw_minus_sog` · `apparent_advance` · `slip_ratio` · `rpm2_stw` ·
`full_spd_stw_slip` · `diff_stw_sog_slip` · `slip_excess` · `sea_speed_fraction` · `total_distance` ·
`froude_depth` · `shallow_flag` · `water_depth` · `hours_full_speed` · `wind_scale`

**Group D — 天氣（136–160）：** `weather_missing` · `sea_water_temp_missing` · `wind_speed` ·
`wind_speed2` · `sea_height` · `sea_height2` · `swell_height` · `combined_wave` · `sea_water_temp` ·
`temp_dev` · `density` · `density_factor` · `kin_visc` · `reynolds_proxy` · `wind_dir_sin` ·
`wind_dir_cos` · `sea_dir_sin` · `sea_dir_cos` · `swell_dir_sin` · `swell_dir_cos` · `head_wind` ·
`beam_wind` · `head_sea` · `beam_sea` · `head_sea_sq`

**Group E — 統計（161–214）：** `stw_roll7_mean` · `stw_roll7_std` · `stw_roll14_mean` ·
`stw_roll14_std` · `stw_roll30_mean` · `stw_roll30_std` · `rpm_roll7_mean` · `rpm_roll7_std` ·
`rpm_roll14_mean` · `rpm_roll14_std` · `rpm_roll30_mean` · `rpm_roll30_std` ·
`full_spd_stw_slip_roll7_mean` · `full_spd_stw_slip_roll7_std` · `full_spd_stw_slip_roll14_mean` ·
`full_spd_stw_slip_roll14_std` · `full_spd_stw_slip_roll30_mean` · `full_spd_stw_slip_roll30_std` ·
`sea_height_roll7_mean` · `sea_height_roll7_std` · `sea_height_roll14_mean` · `sea_height_roll14_std` ·
`sea_height_roll30_mean` · `sea_height_roll30_std` · `wind_speed_roll7_mean` · `wind_speed_roll7_std` ·
`wind_speed_roll14_mean` · `wind_speed_roll14_std` · `wind_speed_roll30_mean` · `wind_speed_roll30_std` ·
`mean_draft_roll7_mean` · `mean_draft_roll7_std` · `mean_draft_roll14_mean` · `mean_draft_roll14_std` ·
`mean_draft_roll30_mean` · `mean_draft_roll30_std` · `sea_water_temp_roll7_mean` ·
`sea_water_temp_roll7_std` · `sea_water_temp_roll14_mean` · `sea_water_temp_roll14_std` ·
`sea_water_temp_roll30_mean` · `sea_water_temp_roll30_std` · `stw_minus_expanding_mean` ·
`sea_water_temp_expanding_mean` · `thermal_exposure_since_clean` · `stw_vs_type_ref` ·
`voyage_position` · `voyage_mean_stw` · `coating_x_thermal` · `rpm_excess_ship` · `rpm_excess_type` ·
`admiralty_excess_ship` · `admiralty_excess_type` · `thermal_fouling_index`

### 訊號合理性檢查

`baseline.py`（`python -m ym_datalake.ml_york.feature_engineering.baseline`）在那 163 個
`predict_safe_features` 上訓練一個 RandomForest（S1–S12、穩態列、標的 `target_energy_mj`），純粹
為了證明無洩漏特徵帶有訊號並排名重要度——它**不是**提交模型。
