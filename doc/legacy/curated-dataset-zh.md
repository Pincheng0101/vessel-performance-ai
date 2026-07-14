# 精選資料集 (Curated Dataset)（POC M2）

M2 的 ETL 將 M1 的原始區 (raw zone) 轉換為**精選區 (curated zone)**：ISO 15016
（海試修正，sea-trial correction）＋ ISO 19030（船殼與螺旋槳性能，hull &
propeller performance）＋衍生指標 (derived indicators)，以分區 (partition) 後的
JSONL 格式寫出供 Athena 使用，並上傳至 S3。這就是 M2 的交付成果：此 ETL
**能還原被注入的速度損失 (speed loss)**（閉環 (closed-loop) C13），且其指標在物理上
合理。

- ETL 套件：`ym_datalake/etl/`（僅使用 numpy、純 Python，於**本機 (locally)** 執行）。
- 重用 M1 的共用模組 `physics.py`、`curves.py`、`fleet.py`——此 ETL 反轉 (invert)
  了產生器 (generator) 所使用的完全相同的正向路徑 (forward path)，這正是被注入的
  速度損失得以還原的原因。
- **僅**讀取原始資料集（絕不讀取 `truth/` 真實值 (ground truth)，該資料不會上傳、
  且在正式環境 (production) 中並不存在）；真實值僅供 C13 驗證器 (validator) 使用。

---

## 1. 管線 (Pipeline)（`etl/`）

| 階段 (Stage) | 模組 (Module) | 輸出 (Output) |
|---|---|---|
| S1/S2 擷取 + 豐富化（ingest + enrich） | `compute.py` | 連接 (join) vessel_master + reference_curve + fuel_price；依船舶 (vessel) 分組 |
| S3 ISO 15016 修正 | `corrections.py` | 移除風 (wind) + 波浪附加阻力 (wave added resistance) → `power_corrected_kw` |
| S4 ISO 19030 過濾 (filter) | `filters.py` | `valid_flag`（穩態、深水、蒲福風級 (Beaufort) ≤ 6 之資料點） |
| S5 速度損失 (Speed loss) | `indicators.py` | `v_expected_kn`、`speed_loss_pct` |
| S6 衍生指標 (Derived indicators) | `indicators.py`、`cii.py` | 滑失率 (slip)、SFOC、Admiralty、EEOI、CO2、CII、超額油耗 (excess FOC) + 成本 |
| S7 期間指標 (Period indicators) | `periods.py` | ISP / DDP / MT / ME → `fact_performance_indicator` |
| S7b 航程彙總 (Voyage roll-up) | `voyages.py` | 依 `(imo, voyage_no)` 分組午報 → `fact_voyage`；由 `ports.PORTS` 產生 `dim_port` |
| S7c 航速最佳化器 (speed optimizer) | `optimize.py` | 掃描 24 點速度網格 (speed grid) → 凸 (convex) usd/nm 曲線 → `fact_speed_profile`（Phase 2） |
| S11 發佈 (Publish) | `writer.py`、`uploader.py` | 分區後的精選 JSONL → S3 |

異常偵測 (anomaly detection)、成因分類 (cause classification) 與維護建議
(maintenance recommendations)（S8–S10）屬於 **M3**；此處 `fact_performance_daily.anomaly_*`
以及 `fact_maintenance_event` 的 `me_recovery_pct` / `payback_days` 均輸出為 null。

### 閉環（為何速度損失可還原）

產生器將每個海上日 (at-sea day) 建構為
`P_shaft = clean_power(STW / (1 − s), Δ) + ΔP_env`。ETL 以相同的 `physics`/`curves`
輔助函式及回報的航向 (heading) 將其反轉：

```
ΔP_env       = wind (Blendermann) + wave (STAWAVE-1 head-sea) added power
P_corrected  = me_shaft_power_kw − ΔP_env                 # corrections.py
v_expected   = curve.clean_speed_kn(P_corrected, Δ)       # = f_refcurve, curves.py
speed_loss%  = (v_expected − STW) / v_expected × 100      # + = degradation (§4.5)
```

因此在感測器雜訊 (sensor noise) 範圍內 `speed_loss ≈ s`。航向讀取自加入 Noon Report
（午報）的 `heading_deg` 欄位（真實的午報會帶有航向，course）；若缺少此欄位，
便無法重建風/波浪修正（約佔功率的 10–20 %）。

---

## 2. `fact_performance_daily` — 船舶 × 日（主資料表）

依 `imo_number/year/month` 分區。ISO/衍生欄位在靠港日 (in-port days) 以及毛功率
離群值 (gross power outliers)（修正後功率 ≤ 0）時為 null。`days_since_cleaning`
由 `maintenance_event` 的重置日期 (reset dates)（hull_cleaning ∪ dry_dock）重新推導；
第一個週期 (cycle) 錨定於該船舶視窗 (window) 的起始點（其視窗前的重置並不在原始
資料中）。

| 欄位 (Column) | 公式 / 來源 |
|---|---|
| `resistance_wind_kn`、`resistance_wave_kn` | Blendermann `R_AA`、STAWAVE-1 `R_AW`（kN） |
| `power_corrected_kw` | `me_shaft_power_kw − ΔP_env` |
| `speed_corrected_kn` | `speed_tw_kn`（STW——洋流 (current) 已先行移除） |
| `v_expected_kn` | `curve.clean_speed_kn(power_corrected, Δ)` |
| `speed_loss_pct` | `(v_expected − STW) / v_expected × 100`（+ = 劣化，degradation） |
| `slip_apparent`、`slip_real` | `(V_th − V)/V_th`，apparent 使用 SOG，real 使用 STW |
| `sfoc_g_kwh` | `me_foc · 1e6 / (me_power · hours)` |
| `admiralty_coef` | `Δ^(2/3) · STW³ / me_power` |
| `eeoi` | `co2 · 1e6 / (cargo · distance_og)`（gCO2/t·nm） |
| `co2_mt` | `total_foc · C_F[fuel]` |
| `excess_foc_mt` | `me_foc · [1 − (1−s)^n]`，`s = speed_loss/100`，`n = curve exponent` |
| `excess_cost_usd` | `excess_foc × fuel_price(date, fuel_type)` |
| `cum_excess_cost_usd` | 當前結垢週期 (fouling cycle) 內超額成本的累計 Σ |
| `excess_cost_fouling_usd` | `= excess_cost_usd`（燃油代價的汙損 (fouling) 分量） |
| `excess_cost_weather_usd` | `foc_mt(dp_env_kw, sfoc, hours) × price`，`dp_env_kw = resistance_to_power_kw((r_wind+r_wave)·1000, STW)` |
| `excess_cost_operational_usd` | `me_foc · p/(1+p) × price`，`p = 0.18·(load−0.80)²`，`load = me_power/mcr` |
| `cii_aer`、`cii_imo`、`cii_rating_aer`、`cii_rating_imo` | 見 §4 |
| `days_since_cleaning` | 距最近一次 hull_cleaning/dry_dock 的天數（聯集時鐘，union clock，`= min(days_since_dry_dock, days_since_in_water)`） |
| `days_since_dry_dock` | 距最近一次 dry_dock（進塢）的天數 |
| `days_since_in_water` | 距最近一次 hull_cleaning（水下船殼清潔，in-water hull cleaning）的天數 |
| `valid_flag` | ISO 19030 過濾器（§3） |
| `anomaly_flag`、`anomaly_cause`、`anomaly_severity` | null（M3） |

### ISO 19030 `valid_flag`（`filters.py`）

`voyage_phase = at_sea` & 航行中 (steaming) & `STW ≥ 0.5·V_design` & `Beaufort ≤ 6` &
`Δ ∈ [0.5, 1.2]·Δ_ref` & 推進 (propulsion) 欄位為有限值/正值。深水 (deep-water) 與
舵角 (rudder-angle) 過濾器不適用（原始報告未帶有水深/舵角資訊）；統計離群值剔除
(statistical outlier rejection) 屬於 M3，因此少部分被注入的感測器離群值會通過
`valid_flag`。

---

## 3. 其他精選資料表

| 資料表 (Table) | 粒度 (Grain) | 分區 (Partition) | 說明 (Notes) |
|---|---|---|---|
| `fact_performance_indicator` | 船舶 × 指標 | imo_number | ISO 19030 ISP / DDP / MT / ME（長格式，long format） |
| `fact_uwi` | 檢驗 (inspection) | imo_number | 原始 UWI 的直通 (passthrough) |
| `fact_maintenance_event` | 事件 (event) | imo_number | 直通 + null 的 `me_recovery_pct`、`payback_days`（M3） |
| `dim_vessel` | 船舶 | 扁平 (flat) | vessel_master（+ `fleet_id`/`fleet_name`，船隊 (fleet) 代碼與名稱）+ 來自最近一次進塢 (dry dock) 的 `last_dry_dock_date` |
| `dim_reference_curve` | 船舶 × 資料點 | 扁平 | 原始參考曲線 (reference curve) 的直通 |
| `agg_fleet_daily` | 船隊 (fleet) × 日 | 扁平 | `fleet_id`：`ALL`（全船隊彙總，rollup）+ 3 個子船隊（FL-IA/FL-TP/FL-AE）；平均有效速度損失、超額成本總計、CII A–E 計數；`n_alerts` 為 null（M3） |
| `fact_voyage` | 船舶 × 航程 (voyage) | imo_number | 一段輪替航段含其靠港日；逐航程距離／FOC／油費／CO₂／準點 (§6) |
| `dim_port` | 港口 | 扁平 | 來自 `ports.PORTS` 的 10 個港口（locode、name、lat、lon、is_eu）；伺服器端聯結維度 (§6) |
| `fact_speed_profile` | 船舶 × 速度網格點 | imo_number | 24 點 0.5→1.0·V_design 成本曲線；凸 usd/nm，經濟航速 (economical speed) = 最小值點 (argmin)（§8） |

**期間指標**（`fact_performance_indicator`，基於有效的每日速度損失）：
- **ISP** — 各週期的平均速度損失對比第一個週期。
- **DDP** — 每次進塢後視窗的平均速度損失對比進塢前。
- **ME** — 每個維護事件，維護前 − 維護後的平均速度損失（恢復量，recovery）。
- **MT** — 追蹤平均 (trailing-mean) 速度損失首次越過觸發門檻 (trigger)（8 %，POC）的日期。

---

## 4. CII（`cii.py`）— 年度指標，廣播至每一天

CII 是年度指標，以船舶 × 曆年 (calendar year) 計算，並烙印 (stamp) 至該年度的每一
筆每日資料列。貨櫃船 (container ships) 以載重噸 (DWT) 作為 Capacity，因此 AER 與
完整 IMO 的**達成值 (attained)** 相同；兩者僅在評級參考線 (rating reference line)
上有差異（AER = 基準參考線；IMO = 該年度下修的 `required` 線）。

```
attained  = Σ_year(total_foc · C_F) · 1e6 / (DWT · Σ_year distance_og)   # gCO2/dwt·nm
CII_ref   = a · DWT^(−c)                 # container a = 1984, c = 0.489 (MEPC.353)
required  = (1 − Z%_year) · CII_ref      # Z%: 2023 5, 2024 7, 2025 9, 2026 11
rating    = A–E via dd vector (0.83, 0.94, 1.07, 1.19)  (MEPC.354, container)
```

POC 採用 IMO 已發佈的貨櫃船數值；正式化 (formalising) 時再校準 (calibrate) 參考線、
Z% 與 dd 向量（規格 §10）。

---

## 5. C13 閉環驗證（`validate.py`）

以 (imo, date) 將 `fact_performance_daily` × 真實值連接；在有效、非異常、海上的
資料點上斷言 (assert)：
- **速度損失還原** — `|recovered − true|`：偏差 (bias) ≤ 0.2 pp、平均 ≤ 0.8 pp
  （STW 感測器雜訊下限，sensor-noise floor），≥ 98 % 的資料點在 2 pp 以內。
- **修正後功率還原** — `|P_corrected − truth| / truth ≤ 3 %`，須達 ≥ 95 %。

全船隊執行（9 艘船 × 5 年）：速度損失還原——`|recovered − true|`——在整個執行
過程中維持於感測器雜訊下限、無系統性誤差 (systematic error)，修正後功率還原亦
維持在容許範圍內——**C13 檢查全數通過 (PASS)**。

---

## 6. 航程彙總 (`fact_voyage`) + `dim_port`（`voyages.py`）

`fact_voyage` 將每日午報彙總為**每個輪替航段 (rotation leg) 一列** — 粒度
`(imo_number, voyage_no)`，一段航段**含其靠港日**。`build_voyages` 將原始午報依
`(imo, voyage_no)` 分組，自 `fact_performance_daily` 取每日 ISO `speed_loss_pct` 與
對帳後 `co2_mt`，並以 `(date, fuel_type)` 燃油價格索引（`compute._price_index`）為
每日定價。以 `imo_number` 分割（投影）；`imo_number` 為分割鍵，依慣例自本文欄位省略。

| 欄位 | 推導 |
|---|---|
| `voyage_no`、`vessel_name`、`from_port`、`to_port` | 分組的原始 `voyage_no` / `vessel_name` / `port_from` / `port_to` |
| `depart_date` / `arrive_date` | 分組中最小 / 最大 `report_date` |
| `distance_nm` | Σ 原始 `distance_og_nm`（全部列） |
| `sea_days` | 航行中列數 |
| `avg_speed_kn` | `distance_nm / Σ steaming_hours`（航行中） |
| `total_foc_mt` | **全部列（航行中 + 靠港）的 Σ 原始 `total_foc_mt`** → 使 C18 精確 |
| `fuel_cost_usd` | Σ（`total_foc_mt` × 該日 `(date, fuel_type)` 之燃油價）— 每日以其自身燃油類型定價 |
| `co2_mt` | 依 `(imo, date)` 之每日 `co2_mt` 加總 — 與 `fact_performance_daily` 對帳 |
| `avg_speed_loss_pct` | 航行中每日非 null `speed_loss_pct` 的平均 |
| `usd_per_nm` | `fuel_cost_usd / distance_nm`（零距離為 null） |
| `planned_eta` | `depart + round(path_nm / (0.85 · design_speed · 24))` 天 — 服務速度 = 設計速度 85%（Vdes 折減），故約半數航程準點 |
| `on_time_flag` | `(arrive − depart).days ≤ 計畫天數` |

`planned_eta` 是航程**唯一**接觸地理的欄位：計畫工期取自彎折大圓 `route_path` 的
長度（`synthetic-dataset.md` §9 的 `ports.py`），而非實際午報位置。其餘皆以回報的
每日值為依據。

`dim_port` 是直接取自 `ports.PORTS` 的扁平 10 列港口維度（`locode`、`name`、`lat`、
`lon`、`is_eu`）。以 Glue 表提供供**伺服器端聯結**（例如
`fact_voyage.from_port → dim_port.locode`），藉 `is_eu` 解鎖 Phase 3 由港口判定 EU
範疇的工作。儀表板地圖改由靜態 `web/ports.js` 鏡像讀取座標；`dim_port` 僅供 Athena
端使用。完整結構：table-schema §3.8 / §3.9。

---

## 7. C18 航程能量平衡（`etl/validate.py`，`check_c18`）

因為**每一列午報恰屬於一個航程**，航程彙總必須精確守恆燃油。逐船：

```
Σ fact_voyage.total_foc_mt  ==  Σ noon_report.total_foc_mt      # 相對容差 1e-6
```

遺漏或重複計算任一航段都會破壞平衡。`check_c18` 接在
`python -m ym_datalake.etl compute --validate` 的 **C14 之後**，失敗時以非零 exit
結束。**已驗證通過**（最大相對誤差約 2.5e-15）。註記編號：既有的一致性檢查為
**C1–C12 + C15–C17**（`synthetic_data/validate.py`）與 **C13 / C14**
（`etl/validate.py`）；**C18** / **C19**（§9）為最新 — 航程並無所謂 C15/C16
（那些是螺槳／塗層／引擎檢查）。

---

## 8. 燃油加注 (bunker) 與減速航行 (slow steaming) 最佳化器（`fact_speed_profile`）（`optimize.py`）

`fact_speed_profile` 將每艘船掃過一組**速度網格**，形成一條凸的成本對航速曲線 —
粒度 `(imo_number, speed_kn)`，**24 個網格點，涵蓋設計速度 (design speed) 的
0.5 → 1.0**。`build_speed_profiles`（Phase 2，緊接 `fact_voyage` 之後呼叫）自
`fact_performance_daily` 取每艘船的最新狀態（結垢／SFOC／修正後航速）、最新午報的
燃油類型 + 年距離，以及原始燃油價格序列。在每個網格航速 `v` 上，它自參考曲線
（`curves.build_curve`）在參考排水量 (reference displacement) 下讀取乾淨船殼功率，
依最新結垢加以放大（`P_fouled = P_clean / (1 − s)^n`，`s = 最新有效
speed_loss_pct / 100`），以最新燃油加注價為結垢後油耗定價，再加上該船每日的
**租金 (charter，hire)** 成本。以 `imo_number` 分割（投影）；`imo_number` 為分割鍵，
依慣例自本文欄位省略。具決定性 (deterministic) — 無 RNG，且對 M2/M3 資料表為附加
(additive)，故 **C1–C18 不受影響**。

| 欄位 | 推導 |
|---|---|
| `speed_kn` | 網格航速（kn）；24 點，`0.5·V_design … 1.0·V_design` |
| `shaft_power_kw` | 此航速、參考排水量下的乾淨船殼軸功率（`curve.clean_power_kw`） |
| `foc_mt_per_day` | 結垢放大後的每日油耗 `physics.foc_mt(P_fouled, sfoc, 24)`（mt/day） |
| `co2_mt_per_day` | `foc_mt_per_day × carbon_factor(fuel_type)`（mt/day） |
| `fuel_usd_per_day` | `foc_mt_per_day × 最新燃油加注價`（USD/day） |
| `charter_usd_per_day` | 各船租金／hire 費率 — 靜態 `VesselSpec` 屬性（時間成本，time cost） |
| `usd_per_day` | `fuel_usd_per_day + charter_usd_per_day`（總計） |
| `usd_per_nm` | **總**單位距離成本 `usd_per_day / (speed_kn·24)` — 凸，最小值 = 經濟航速 |
| `fuel_usd_per_nm` | 僅燃油的單位距離成本 `fuel_usd_per_day / (speed_kn·24)` — 嚴格遞增（分解，decomposition） |
| `vessel_name` | 船名 *（每列網格重複）* |
| `recommended_speed_kn` | 經濟航速 = `usd_per_nm` 最小值點（內部 interior，C19）*（重複）* |
| `current_speed_kn` | 最新有效 `speed_corrected_kn`（kn）*（重複；無有效海上資料點時為 null）* |
| `annual_distance_nm` | 每日 `distance_og_nm` 之 Σ，於午報日期跨度年化（nm/yr）*（重複）* |

`usd_per_nm` 依構造為**凸**：僅燃油那段 `usd/nm ∝ V^(n−1)` 隨航速單調遞增（其最小值
會落在最慢的網格點，屬退化 (degenerate) 解），因此是每日租金的**時間成本 (time cost)**
在曲線上造就一個**內部 (interior)** 的經濟航速。`recommended_speed_kn` 即該最小值點。
四個船舶層級欄位（`vessel_name`、`recommended_speed_kn`、`current_speed_kn`、
`annual_distance_nm`）在一艘船的**全部 24 列上完全相同**（與 `fact_voyage.vessel_name`
同一手法）；以 `speed_kn = recommended_speed_kn` 過濾即可每船取出一列經濟航速。此表支撐
儀表板 `vessel_speed_profile` 最佳化器頁面（usd/nm 曲線、目前／經濟航速標記、即時節省、
船隊減速航行 KPI）。完整結構與範例查詢：`doc/skill/fact_speed_profile.md`。

---

## 9. C19 經濟航速檢查（`etl/validate.py`，`check_c19`）

因為 `recommended_speed_kn` 是可據以行動的輸出，它必須是真正的內部最小值 — 而非退化
的端點。逐船，於 24 點網格上：

```
recommended_speed_kn  ==  argmin_v fact_speed_profile.usd_per_nm    # 容差 1e-9
0.5·V_design  <  recommended_speed_kn  <  1.0·V_design              # 嚴格內部
```

落在邊界的最小值（最慢或最快網格點）代表每日租金時間成本被設錯 — 一條單調的僅燃油
曲線 — 因而**未通過**檢查。`check_c19` 接在
`python -m ym_datalake.etl compute --validate` 的 **C18 之後**，失敗時以非零 exit
結束。它對 M2/M3 層為附加（C1–C18 不受影響），為最新的檢查。

---

## 10. 指令 (Commands)

```bash
# Regenerate raw (M1) then compute curated (M2), validating C13:
uv run python -m ym_datalake.synthetic_data generate --out ./tmp --seed 42 --validate
uv run python -m ym_datalake.etl compute --in ./tmp --out ./tmp --validate

# Validate a previously written curated tree:
uv run python -m ym_datalake.etl validate --dir ./tmp

# Upload curated/ to S3 (mirrors the layout onto the Glue partition prefixes):
uv run python -m ym_datalake.etl compute --in ./tmp --out ./tmp --upload --bucket <bucket>
```
