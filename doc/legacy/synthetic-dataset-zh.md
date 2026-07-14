# 合成原始資料集 (Synthetic Raw Dataset)（POC M1）

一支 9 艘貨櫃船隊 (container fleet) 的 5 年、物理一致 (physics-consistent) 之
**原始區 (raw-zone)** 海事資料。由 `ym_datalake/synthetic_data/` 產生，以 JSONL
格式落地 (land) 於 S3，在 Glue 中建立編目 (catalogue)，並透過 Athena 查詢。這是 M1
交付項 (deliverable)：原始欄位齊備、資料通過 §3.2 的 **C1–C17** 一致性檢查
(consistency checks)、YM WELLNESS 故事線 (storyline) 就緒。M2 的 ETL（ISO
15016/19030）會消費此資料，且必須還原 (recover) 注入的速度損失 (speed loss)。

- 產生器套件 (generator package)：`ym_datalake/synthetic_data/`（僅用 numpy，不用
  pandas）。
- 曲線模組 `curves.py` 是**唯一共用的速度-功率真理來源 (single shared
  speed-power source of truth)**，由 M2 重用——正是這份共用讓注入的速度損失得以還原。

---

## 1. 船隊 (Fleet)（`fleet.py`，僅用標準函式庫 stdlib）

合成的 7 位數 IMO 編號 `9700001`–`9700009`，規格依 §3.1 縮放。**YM WELLNESS =
`9700006`**（Neo-Panamax，儀表板 (Dashboard) 深入分析對象）。

| IMO | Name | Class | TEU | Lpp (m) | B (m) | Vdes (kn) | MCR (kW) | Fleet |
|---|---|---|---|---|---|---|---|---|
| 9700001 | YM HARMONY | Feeder | 1,100 | 150 | 23.0 | 18.0 | 9,000 | FL-IA |
| 9700002 | YM ENLIGHTEN | Feedermax | 2,500 | 200 | 30.0 | 21.0 | 21,000 | FL-IA |
| 9700003 | YM PLENTY | Panamax | 4,500 | 260 | 32.2 | 24.0 | 36,000 | FL-IA |
| 9700004 | YM PROSPER | Panamax | 4,600 | 262 | 32.2 | 24.0 | 36,500 | FL-TP |
| 9700005 | YM EXCELLENCE | Post-Panamax | 8,500 | 300 | 43.0 | 24.5 | 55,000 | FL-TP |
| **9700006** | **YM WELLNESS** | **Neo-Panamax** | 11,000 | 330 | 48.0 | 23.0 | 62,000 | FL-AE |
| 9700007 | YM WARRANTY | Neo-Panamax | 11,000 | 331 | 48.2 | 23.0 | 62,000 | FL-AE |
| 9700008 | YM TRIUMPH | Post-Panamax | 8,600 | 301 | 43.0 | 24.5 | 55,500 | FL-TP |
| 9700009 | YM TITAN | ULCV | 20,000 | 400 | 59.0 | 22.5 | 75,000 | FL-AE |

船隊分配 (fleet assignments)（`fleet_id`/`fleet_name`）：**FL-IA** 亞洲域內線
(Intra-Asia)（HARMONY、ENLIGHTEN、PLENTY）、**FL-TP** 跨太平洋線
(Trans-Pacific)（PROSPER、EXCELLENCE、TRIUMPH）、**FL-AE** 亞歐線
(Asia-Europe)（WELLNESS、WARRANTY、TITAN）。

`fleet.py` 也會為每艘船預先計算：`design_displacement_mt`（設計排水量
(displacement)，Δ_ref = ρ·Cb·Lpp·B·T）、`lightship_mt`（輕載排水量 lightship，
Δ_ref − dwt）以及 `curve_a`（擬合 (fit) 使得在 Δ_ref 下 `P(design_speed)=ncr`）。
它**僅用標準函式庫**，因為 `cdk synth` 會從中匯入 `IMO_NUMBERS`（供分割投影
(partition projection) 的列舉 enum 使用），且不得依賴 numpy。

IMO 集合是**靜態的 (static)**——`noon_report` 的分割投影列舉依賴於它。

---

## 2. 資料集與結構描述 (Datasets & schemas)

共六個原始資料集（§2）。時間欄位以**字串 (string)** 儲存
（`YYYY-MM-DD HH:MM:SS` 日期時間 (datetime) / `YYYY-MM-DD` 日期 date），因為 JSON
SerDe 的時間戳 (timestamp) 解析容易出錯 (brittle)——儀表板稍後再 `CAST`。浮點數
(float) 會四捨五入；NaN/Inf 寫為 `null`（SerDe 拒絕 `NaN`）。

### 2.1 `noon_report` — 每日、每船一列（已分割 partitioned）
以 **`imo_number` + `year`** 透過分割投影分割。本體 (body) 中冗餘的 `imo_number`
鍵會被 Athena 忽略（它是分割欄 partition column）。

| column | type | notes |
|---|---|---|
| report_id | string | `NR-<imo>-<date>` |
| report_datetime_utc | string | `YYYY-MM-DD HH:MM:SS` |
| vessel_name | string | |
| voyage_no / leg | string | |
| port_from / port_to | string | 近似 UN/LOCODE |
| voyage_phase | string | `at_sea` / `in_port` |
| latitude / longitude | double | |
| steaming_hours | double | 海上航行時 ≈24，在港時為 0 |
| distance_og_nm / distance_tw_nm | double | 對地 (over-ground) / 對水 (through-water)（C3） |
| speed_og_kn / speed_tw_kn | double | SOG / STW（C4） |
| me_rpm | double | 主機 (main-engine) RPM（C7） |
| me_shaft_power_kw | double | 軸功率 (shaft power)（C1） |
| me_foc_mt | double | 主機燃油消耗 (ME fuel oil consumption)（C2） |
| propeller_pitch_m | double | 定距槳 (FPP) 螺距 (pitch) |
| fuel_type | string | HFO / VLSFO / MGO |
| fuel_lcv_mj_kg | double | 低位熱值 (lower calorific value) |
| ae_foc_mt / boiler_foc_mt / total_foc_mt | double | 輔機 (aux) / 鍋爐 (boiler) / 總計 total（C8） |
| draft_fore_m / draft_aft_m / mean_draft_m / trim_m | double | C5 / C6 |
| displacement_mt | double | 質量平衡 (mass balance) → 靜水力 (hydrostatic)（C5） |
| cargo_weight_mt | double | |
| condition_flag | string | `laden`（滿載）/ `ballast`（壓艙） |
| wind_speed_kn / wind_dir_deg | double | |
| beaufort | int | （C11） |
| wave_height_m / wave_dir_deg / wave_period_s | double | （C11） |
| swell_height_m / swell_dir_deg | double | |
| sea_water_temp_c / air_temp_c / air_pressure_hpa | double | |
| current_speed_kn / current_dir_deg | double | （C4） |
| sea_water_density_kg_m3 | double | （C11） |
| data_source | string | `sensor` |

### 2.2 `vessel_master` — 每船一列（維度表 dimension）
`imo_number, vessel_name, vessel_type, fleet_id, fleet_name, build_year, lpp_m,
breadth_m, design_draft_m, dwt, gross_tonnage, mcr_kw, ncr_kw, design_speed_kn,
propeller_type, diameter_m, pitch_m, n_blades, transverse_area_m2, ref_curve_id,
last_dry_dock_date`（共 21 欄；`fleet_id`/`fleet_name` 即 §1 的子船隊
(sub-fleet) 分配）。

### 2.3 `reference_curve` — 海上試航 (sea-trial) 速度-功率點
`ref_curve_id, imo_number, speed_kn, shaft_power_kw, displacement_ref_mt`
（每船 12 個點，於 Δ_ref 下 0.5–1.05·Vdes）。

### 2.4 `uwi` — 水下檢驗 (underwater inspection) 事件
`inspection_id, imo_number, inspection_date, inspection_type,
hull_fouling_rating, hull_fouling_coverage_pct, propeller_condition,
propeller_roughness_um, coating_breakdown_pct, coating_condition,
recommended_action`。`propeller_roughness_um` 與 `coating_breakdown_pct` 現為
**獨立且可重置的過程 (independent, resettable processes)**——各有自己的重置時鐘
(reset clock)，**不再**由船殼污損 (hull fouling) `s` 推導；僅 `hull_fouling_rating`
／`hull_fouling_coverage_pct` 仍繫於真實污損（C10）。

### 2.5 `maintenance_event` — 維護／事件日誌
`event_id, imo_number, event_date, event_type, cost_usd, downtime_hours,
location`。`event_type` ∈ hull_cleaning（船殼清潔）/ propeller_polishing（螺旋槳
拋光）/ dry_dock（進塢 dry dock）/ coating_renewal（塗層更新）/ propeller_repair
（螺旋槳維修）/ engine_overhaul（引擎大修 engine overhaul）。

### 2.6 `fuel_price` — 每日燃油 (bunker) 價格
`date, fuel_type, price_usd_per_mt`（HFO / VLSFO / MGO 隨機漫步 random walk）。

---

## 3. S3 / 分割配置 (partition layout)

```
s3://<DataLakeBucketName>/raw/
├── noon_report/imo_number=<imo>/year=<yyyy>/data.jsonl   # partition projection
├── vessel_master/vessel_master.jsonl
├── reference_curve/reference_curve.jsonl
├── uwi/uwi.jsonl
├── maintenance_event/maintenance_event.jsonl
└── fuel_price/fuel_price.jsonl
```

`noon_report` 使用**分割投影**（無爬蟲 crawler／無 `MSCK`）：
`projection.imo_number` = 9 個 IMO 的列舉，`projection.year` = 整數範圍
`2021,2026`。其餘五張表未分割 (unpartitioned)。所有表皆使用
`org.openx.data.jsonserde.JsonSerDe`，`classification=json`。

真值 (ground truth) 寫入 `./tmp/truth/`（位於 `raw/` 之外），且**永不上傳或
建立編目**（§4）。

---

## 4. 真值 (Ground truth)（供 M2 / C13 使用）

寫入 `./tmp/truth/`：

- **`ground_truth_daily.jsonl`** — 每 (imo, date)：`true_speed_loss_frac`、
  `days_since_cleaning`、`fouling_segment_id`、`displacement_mt`、`mean_draft_m`、
  `r_aa_kn`、`r_aw_kn`、`p_corrected_kw`、`true_shaft_power_kw`、`true_stw_kn`、
  `true_sog_kn`、`heading_deg`、`current_proj_kn`、`sfoc_g_kwh`、
  `sfoc_drift_frac`、`days_since_overhaul`、`co2_mt`、`anomaly_flag`、
  `anomaly_cause`、`anomaly_severity`。
- **`fouling_segments.jsonl`** — 每段 (segment)：`fouling_rate_per_day`、
  `reset_date`、`reset_type`。

M2 會將其 ETL 還原出的 `speed_loss_pct` 與 `true_speed_loss_frac` 相比對
（閉環 (closed-loop) **C13**）。持久化 (persist) `r_aa`/`r_aw`/`p_corrected` 可讓 M2
避免附加阻力 (added resistance) 的重複計算 (double-counting) 與正負號 (sign) 錯誤。

---

## 5. 產生邏輯與 C1–C17 對應

每船 × 每日的前向模型 (forward model) 依保證可還原性 (recoverability) 的順序推導各值
（見 `generate.py::_forward_day`）。`s` = 在定功率下的分數速度損失
(fractional speed loss)；`V_ref = STW/(1−s)` 為潔淨等效速度 (clean-equivalent speed)。

1. **真值優先** — `days_since_cleaning`、真實 `s`（fouling_rate·days + 有界雜訊
   bounded noise），於事件時重置 (reset)（**C9**）。
2. 裝載狀態（滿載 laden／壓艙 ballast）→ 貨量 → **由質量平衡得 Δ**（輕載
   lightship + 貨物 + 壓艙水 + 燃油 + 物料 stores）→ 以單一靜水力曲線反推
   (invert) 出 `mean_draft` → 前／後吃水 (draft)／俯仰差 trim（**C5**、**C6**）。
3. 季節性氣海況 (seasonal met-ocean)：蒲福風級 (Beaufort) 驅動風與浪；密度隨溫度
   下降（**C11**）。
4. **指令 STW (Command STW)** 接近設計速度（慢速航行 slow-steaming 因子 + 變異）。
5. `V_ref = STW/(1−s)`；**`P_corrected = a·V_ref^n·(Δ/Δ_ref)^(2/3)`**（**C1** ——
   M2 所要反轉 (invert) 的精確關係式）。
6. 附加阻力 `R_AA`（Blendermann 風阻，A_XV）+ `R_AW`（STAWAVE-1
   `≈(1/16)ρg·H_s²·B·√(B/L)`，迎浪 head-sea 因子）；`ΔP_env=(R_AA+R_AW)·STW/η`；
   `P_shaft = P_corrected + ΔP_env`。
7. `me_foc = P_shaft·SFOC·h/1e6`（**C2**），SFOC 隨負載 (load) 變化 + 每船一份的
   **長期引擎漂移 (secular engine drift)** `(1 + sfoc_drift_frac)`（於
   `engine_overhaul ∪ dry_dock` 時重置，上限 +6%）+ 引擎劣化 (engine-degradation)
   異常。此漂移同時併入真值 `sfoc_g_kwh` 與 `me_foc`，故 C2 能量平衡仍成立；
   + 輔機／鍋爐 → `total_foc`。
8. RPM 由 STW 與目標滑失 (slip) 得出；`slip=(V_th−STW)/V_th ∈ [−5%,30%]`（**C7**）。
9. `SOG = STW + 洋流投影 (current projection)`（**C4**）；`distance = speed·h`
   （**C3**）。
10. `co2 = Σ FOC·C_F`（**C8**），碳因子 (carbon factor) 見下。
11. **雜訊最後** — 對量測欄位加上有界感測器雜訊 (sensor noise) + 標記的異常
    (labeled anomalies)；距離／SOG 由加噪後的速度重新推導；真值保持未加噪
    （**C12**、**C13** 輸入）。UWI 日期將當前真實 `s` 對應至船殼污損
    (hull fouling) 評等／覆蓋率（**C10**）；`propeller_condition`（Rubert A–F）改由
    `propeller_roughness_um` 分帶 (band)，`coating_condition` 則由
    `coating_breakdown_pct` 分帶。

螺旋槳粗糙度 (propeller roughness) 與塗層破損 (coating breakdown) 為**獨立且可重置
的過程 (independent resettable processes)**——各有自己的重置時鐘，**不再**由船殼
污損 `s` 推導：`propeller_roughness_um` 自上一次 `propeller_polishing ∪ dry_dock`
起以 `U(0.35,0.75)` µm/日 由 150 增長至 600 µm（再以 Rubert 分帶為
`propeller_condition`）；`coating_breakdown_pct` 自上一次
`coating_renewal ∪ dry_dock` 起以 `U(0.02,0.05)` %/日 於 0–100 % 間增長。SFOC 長期
漂移（步驟 7）則於 `engine_overhaul ∪ dry_dock` 時重置。

**一致性驗證器 (consistency validator)**（`validate.py`，透過 CLI `validate` 或
`generate --validate` 執行）以每條規則各自的容差 (tolerance) 檢查，並印出
PASS/FAIL + 違規數 (violation counts)（失敗時以非零 exit code 結束）：

| rule | check | tolerance |
|---|---|---|
| C1 | 軸功率 = 潔淨曲線功率(V_ref) + 環境功率 | ≤5% |
| C2 | 隱含 SFOC = me_foc·1e6/(power·h) vs 真值 | ≤5% |
| C3 | 距離 = 速度·小時 | ≤1% |
| C4 | SOG − STW = 洋流投影 | ≤0.05 kn |
| C5 | 排水量 = 靜水力(mean_draft) | ≤2% |
| C6 | mean=(fore+aft)/2、trim=aft−fore | 1e-6 m |
| C7 | slip ∈ [−5%, 30%] | 區間 (band) |
| C8 | 由 total_foc 得的 co2 = 由各分量加總得的 co2；因子已知 | ≤0.5% |
| C9 | 每段斜率 (slope) ≥ 0；於重置事件時階梯下降 (step-down) | slope ≥ −3e-5 |
| C10 | Spearman(hull_fouling_rating, 真實 s) | ≥0.7 |
| C11 | Pearson(beaufort, wave/wind) ≥0.6；corr(temp, density) ≤ −0.6 | — |
| C12 | 非異常量測值落在雜訊界限內；粗大離群值 (gross outliers) 全部標記 | ≤3% |
| C13 | 閉環 ISO 速度損失還原 | **延後至 M2 (deferred to M2)** |
| C15 | 每段 `propeller_roughness_um` 非遞減；Spearman(距上次拋光天數, 粗糙度) | ≥0.7 |
| C16 | `coating_breakdown_pct` 於週期內非遞減；Spearman(距上次塗層重置天數, 破損) | ≥0.7 |
| C17 | 負載正規化 (load-normalized) SFOC 每引擎週期 Spearman(距上次大修天數) ≥0.5；SFOC 中位數 ∈ [160,215] | 區間 (band) |

物理規則（C1–C7、C12）於穩態 (steady) **海上、非異常**點上評估；標記的異常屬預期
離群值，另由 C12 單獨檢驗。

### 異常 (Anomalies)（已標記，供 M3）
`engine_degradation`（引擎劣化，持續性 SFOC 階躍 (step)——FOC 上升、速度損失持平）、
`propeller`（螺旋槳，暫時性滑失跳升）、`weather`（天氣，孤立的惡劣天數）、`sensor`
（感測器，單一欄位粗大離群值）。每個離群值在真值中皆帶有 `anomaly_cause` /
`anomaly_severity`。M3 偵測器 (detector) 會先**依每個引擎週期去趨勢 (detrend) 長期
SFOC 漂移**（以負載正規化 SFOC 對距上次大修天數做 Theil-Sen 擬合 (fit)），使離散的
`engine_degradation` 階躍仍能自平滑漂移中凸顯。

### 決定性 (Determinism)
單一主 `--seed` → 由 `(imo, purpose)` 鍵控的 `numpy.random.SeedSequence([seed,
imo, purpose])` 子串流 (substream)（purpose：fouling / uwi / environment /
operating / noise / anomaly / fuel_price / prop_rough / coating / engine /
**route**）。prop_rough / coating / engine 為獨立的螺槳粗糙度 (propeller
roughness)、塗層破損 (coating breakdown) 與引擎漂移／大修 (engine drift/overhaul)
串流；**`route`（purpose id 11）** 是專用子串流，其*唯一*抽樣是港口輪替
(port rotation) 的起始索引 (start index，§9)，使 `operating` 得以保留給與物理相關
的抽樣。順序無關 (order-independent)：新增欄位或船舶絕不會改變另一艘船的抽樣
(draw)；全域 `np.random` 從不被觸碰。

> **Seed-42 重建（Phase 1）。** 將營運剖面 (operating profile) 改寫為每船隊港口
> 輪替（§9）位移了 `operating` 子串流的抽樣順序，因此 `--seed 42` 資料集為**全新**
> （每船新的 `sfoc_base` / `base_slip`）。驗收關卡 (acceptance gate) 不變：
> **C1–C17 維持通過 + 新增的 C18 航程能量平衡通過**（curated-dataset §7）。
> fouling／env／noise／anomaly 子串流不受影響 — 僅位置、港口、`voyage_no`、`leg`
> 以及以重排後 `operating` 抽樣為依據的物理量會變動。

---

## 6. YM WELLNESS 故事線（`9700006`）

一段刻意設計的污損弧線 (fouling arc)（`fouling.py` 中的參數覆寫 override）：早期一次
進塢 (dry dock) 重置船殼，接著一段**長時間的高污損段 (elevated segment)** 被設計為
突破約 **10% 的維護觸發門檻 (maintenance trigger)**（程式碼常數 (code constant)
`MT_TRIGGER_PCT=8.0`；約 10% 為敘事性描述），並由上升的 UWI `hull_fouling_rating`
佐證；隨後一次船殼清潔將其**還原**（階梯下降至約 0）。這即是供儀表板深入分析的
「逐步上升 → 越過門檻 → 清潔 → 還原」敘事。

---

## 7. 碳 / 假設 (Carbon / assumptions)

- **碳因子 (carbon factors)**（tCO2/t-fuel）：HFO 3.114、VLSFO 3.151、
  MGO/LSMGO 3.206。
- 船舶 `9700003`/`9700009` 視為裝有洗滌器 (scrubber-fitted)（海上燒 HFO）；其餘船舶
  海上燒 VLSFO；所有船舶在港皆燒 MGO。
- CII 參考線 (reference-line) 係數 (a, c) 與減量 Z% 屬 **M2/ETL 範疇**——M1 僅產出
  原始輸入。
- 靜水力採用箱型近似 (box approximation) `Δ = ρ·Cb·Lpp·B·T`，各船有各自的 Cb；同一
  函式既將 Δ→吃水 反推（產生器），也還原 Δ（驗證器 C5）。

---

## 8. 指令 (Commands)

本地重新產生 + 驗證（不需 AWS）：

```bash
uv run python -m ym_datalake.synthetic_data generate --out ./tmp --seed 42 --validate
uv run python -m ym_datalake.synthetic_data validate --dir ./tmp
```

部署（區域固定為 `us-west-2`）：

```bash
bash scripts/export-requirements.sh
CDK_DEFAULT_REGION=us-west-2 uv run cdk synth  -c env=dev
CDK_DEFAULT_REGION=us-west-2 uv run cdk deploy -c env=dev   # note DataLakeBucketName output
```

將 raw/ 上傳至 S3（略過 `truth/`）：

```bash
uv run python -m ym_datalake.synthetic_data generate --out ./tmp --bucket <DataLakeBucketName> --upload
```

查詢（Athena 主控台或已部署的 Lambda）：

```sql
SELECT count(*) FROM ym_hackathon.noon_report WHERE imo_number='9700006' AND year=2023;
SELECT * FROM ym_hackathon.vessel_master;
```

```bash
aws lambda invoke --function-name <AthenaQueryFunctionArn> \
  --cli-binary-format raw-in-base64-out \
  --payload '{"action":"run_query","sql":"SELECT count(*) FROM noon_report"}' out.json
```

---

## 9. 港口、航路與航程輪替 (Ports, routes & voyage rotations)（`ports.py`）

Phase 1 為船隊加入**空間維度 (spatial dimension)**：每艘船走一條真實的每船隊港口
輪替 (port rotation)，其午報 `latitude`/`longitude` 落在兩港間的彎折大圓
(bent great-circle) 航路上。`ports.py` **僅用標準函式庫**（只用 `math`），因為它
與 `fleet.py` 一樣會在 `cdk synth` 時被匯入，不得引入 numpy。

### 9.1 港口 (`PORTS`)

十個 UN/LOCODE，附**真實**座標。`is_eu` **僅**兩個歐洲港（Rotterdam + Hamburg）
為 true；用以把關 Phase 3 由港口判定 EU 範疇的聯結。這些列逐字發佈為精煉表
`dim_port`（table-schema §3.9），並鏡像至 `web/ports.js` 供船隊地圖 (Fleet Map)。

| LOCODE | 名稱 | Lat | Lon | `is_eu` |
|---|---|---|---|---|
| SGSIN | Singapore | 1.27 | 103.83 | false |
| NLRTM | Rotterdam | 51.95 | 4.14 | **true** |
| KRPUS | Busan | 35.10 | 129.04 | false |
| CNSHA | Shanghai | 31.23 | 121.50 | false |
| LKCMB | Colombo | 6.95 | 79.85 | false |
| AEDXB | Dubai | 25.01 | 55.06 | false |
| USLAX | Los Angeles | 33.74 | −118.27 | false |
| DEHAM | Hamburg | 53.53 | 9.92 | **true** |
| JPTYO | Tokyo | 35.62 | 139.77 | false |
| HKHKG | Hong Kong | 22.30 | 114.17 | false |

### 9.2 大圓幾何 (great-circle geometry)

純 `math` 輔助函式，地球半徑 **3440.065 nm**：

- `haversine(lat1, lon1, lat2, lon2) → nm` — 大圓距離。
- `gc_point(lat1, lon1, lat2, lon2, frac)` — 大圓上 `frac`（0→1）處的點，以 **3-D
  單位向量球面線性內插 (slerp)** 計算，**跨越換日線安全 (antimeridian-safe)** —
  絕不對經度做線性內插。
- `route_path(a, b) = [A, *waypoints, B]` — 一段航段的有序 lat/lon 路徑（waypoints
  依 A→B 定向）。
- `path_distance_nm(path)` — 相鄰點大圓距離之 Σ。
- `path_point(path, frac)` — 依**累計大圓距離**沿多段路徑行走（於當前段內做 slerp）。

### 9.3 航路轉點 (`ROUTE_WAYPOINTS`)

以無向港口對為鍵的海上轉點，將航段彎折繞過陸地，使地圖弧線保持在水上；
`route_path` 於反向時將其反轉。任何**未**列出的港口對採用直接大圓。

- **AEDXB ↔ {DEHAM, NLRTM}** 穿越曼德海峽 (Bab-el-Mandeb) `(12.6, 43.4)` → 蘇伊士
  (Suez) `(30.0, 32.6)` → 塞得港 (Port Said) `(31.5, 32.3)` → 直布羅陀 (Gibraltar)
  `(35.95, −5.6)` → 韋桑島 (Ushant) `(48.5, −5.5)`。
- **SGSIN ↔ LKCMB** 經一個麻六甲／安達曼 (Malacca/Andaman) 點 `(5.5, 95.0)` 北拉。

### 9.4 每船隊輪替 (`_ROTATIONS`，位於 `generate.py`)

`build_operating_profile` **逐航段**走該船的船隊輪替（取代舊的隨機艏向直線推算
(dead-reckoning) 走法）。每個輪替皆為**往返環路 (out-and-back loop)**，使壓載回程
段回溯載貨去程段，而非跨陸地繞行；`laden`／`ballast` 依航段奇偶交替。

| 船隊 | 輪替 | 形態 |
|---|---|---|
| **FL-IA** 亞洲區間 | CNSHA · KRPUS · JPTYO · HKHKG · SGSIN | 環路；**絕不**停靠歐洲港 |
| **FL-TP** 跨太平洋 | CNSHA · KRPUS · USLAX · JPTYO | 鐘擺式 (pendulum)，經東京返回 |
| **FL-AE** 亞歐 | CNSHA · SGSIN · LKCMB · AEDXB · DEHAM · NLRTM · AEDXB · LKCMB · SGSIN | 經蘇伊士的鐘擺式 |

每航段：港口、路徑與位置皆由大圓**推導**；
`leg_days = max(2, round(path_distance_nm / (nominal · 24)))`，其中
`nominal = max(6, design_speed · speed_factor)`。航行中位置取自 `path_point`；
唯一的靠港日則釘在目的港座標。**唯一**的 `rng_route` 抽樣是輪替**起始索引**（使
各船分散於環路上）；`rng_op` 保留其每航段物理抽樣（`heading`、`speed_factor`、
載況 ×3，再加每航行日一次速度）。

### 9.5 關鍵不變量 (KEY INVARIANT) — 位置為裝飾性

`heading_deg` 維持為隨機 `rng_op` 抽樣 — **並非**大圓方位角 (bearing) — 故地理**絕不**
會滲入物理。燃油、CII、ISO 速度損失與 C3 距離恆等式全部以**距離與速度為依據，
永不用經緯度**。lat/lon/港口/`voyage_no` 貫穿 raw → curated → API → 地圖，純粹用於
繪製船隊地圖與逐船航跡；不帶任何物理意義。這正是為何加入它們仍使 C1–C17 維持通過
（僅重排的 `operating` 抽樣位移了資料集；見 §5 的 seed-42 註記）。
