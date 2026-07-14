# 陽明海運 AI 船舶效能分析 — POC 技術規格書

> 依據 `ym-predict.md` 之應用命題設計。本 POC 交付物為 **一組 Athena 資料表** 與 **一組非同步查詢 API**，供前端渲染 Dashboard。
> 重點：(1) 需要「計算哪些資料、如何算」；(2) Web Dashboard「如何呈現」。

---

## 0. 文件目的與範圍

| 項目 | 內容 |
|---|---|
| POC 目標 | 用合成歷史資料，端到端跑通「資料 → ETL(國際標準公式) → 統計洞察 → Athena 表 → 非同步 API → Dashboard」的資料與服務骨架；**合成資料產生與 ETL 皆於本機 (local) 純 Python 執行，產出 JSONL 後上傳 S3** |
| 交付物 | ① 合成資料集(S3, JSONL) ② 簡單 Python ETL（**本機執行**）產出的 Curated JSONL + Athena 表 ③ Lambda + API Gateway 非同步查詢 API ④ Dashboard 設計規格(本文件)。②之 raw/curated JSONL 均**本機產出後上傳 S3** |
| 不在範圍 | 真實船舶數據接入、正式前端實作、正式模型訓練/調參、IMO 合規認證、**生成式 AI (Bedrock) 敘事/報告（POC 暫緩，以後再追加）** |
| 示範船隊 | **9 艘貨櫃船（僅貨櫃船）**，橫跨常見船級：Feeder / Feedermax / Panamax / Post-Panamax / Neo-Panamax / ULCV；含 **YM WELLNESS**（Neo-Panamax，約 11,000 TEU，個船深入示範對象） |
| 歷史深度 | 每船 5 年、逐日 Noon Report + 事件型 UWI/維修紀錄 |

---

## 1. 系統架構總覽（本機 ETL + AWS）

> 合成資料產生與 ETL 皆於 **本機 (local)** 純 Python 執行，落地 raw/curated JSONL 後上傳 S3；Athena / Glue Data Catalog / Lambda API 仍於 AWS。（生成式 AI 敘事/報告本 POC 暫緩，見 §5.7）

```
          本機 (Local, 純 Python)                            AWS Cloud
┌──────────────────────────────────────┐              ┌────────────────────────────────────────────┐
│ 合成資料產生 (numpy)                   │              │  S3 zones                                    │
│       │                              │              │   ├ raw/       (JSONL)                       │
│       ▼                              │              │   ├ curated/   (imo/year/month 分區)         │
│ ETL (純 Python)                      │    upload    │   └ athena-results/                          │
│   ├ ISO 15016 修正                   │  aws s3 sync │          │                                   │
│   ├ ISO 19030 指標                   │   / boto3    │          ▼                                   │
│   └ 衍生指標/統計異常 (numpy/scikit)  │  ──────────▶ │  Glue Data Catalog (Athena metastore)        │
│       │                              │              │   partition projection, 免 crawler           │
│       ▼                              │              │          │                                   │
│ 產出 raw/curated JSONL               │              │          ▼                                   │
└──────────────────────────────────────┘              │  Athena (workgroup, 分區表)                  │
                                                       │          ▲                                   │
                                                       │          │ StartQueryExecution/GetResults    │
                                                       │     ┌────┴─────┐      ┌───────────┐          │
                                                       │     │ Lambda   │◀────▶│ DynamoDB  │          │
                                                       │     │(submit/  │      │ query_id→ │          │
                                                       │     │ status/  │      │ exec_id   │          │
                                                       │     │ result)  │      └───────────┘          │
                                                       │     └────┬─────┘                             │
                                                       │          ▲ REST                              │
                                                       │     API Gateway ◀──────── 前端 HTTPS         │
                                                       └────────────────────────────────────────────┘
```

**分區(zone)設計**（raw/curated 皆**本機產出後上傳**至對應 zone）
- `s3://ym-poc/raw/` — 合成原始資料（**JSONL**，一行一筆，貼近真實 Noon Report 欄位）；本機產生後上傳
- `s3://ym-poc/curated/` — ETL 後分析事實表（**JSONL**，S3 路徑分區 `imo_number/year/month/`）；本機 ETL 產出後上傳
- `s3://ym-poc/athena-results/` — Athena 查詢結果（API 讀取來源；由 Athena 於 AWS 寫入）

> 生成式 AI 敘事之 `insights/` zone 暫緩（以後再追加，見 §5.7）。

**元件對照**
| 功能 | 服務 / 執行位置 |
|---|---|
| 資料湖 | S3（AWS） |
| ETL/計算 | **純 Python，本機 (local) 執行**（numpy，不使用 PySpark）；以本機 CLI / Make target 編排，產出 JSONL 後上傳 S3（不使用 Glue / Step Functions / EventBridge） |
| 資料目錄 | Glue Data Catalog（AWS，Athena metastore）；表以 partition projection 一次性 DDL 建立，本機 ETL 只上傳分區 JSONL（免 crawler） |
| 查詢引擎 | Athena（AWS，獨立 workgroup） |
| 統計/ML 異常 | **本機** Python 以 numpy/scikit 計算（POC 免 SageMaker） |
| API | API Gateway (REST) + Lambda (Python)（AWS） |
| 非同步狀態 | DynamoDB（AWS，query_id 註冊表，TTL 自動清） |

---

## 2. 資料模型（Raw Zone）

> 這一節定義「我們有哪些原始欄位」；第 3 節定義「我們要算出哪些欄位」。

### 2.1 Noon Report（`raw.noon_report`）— 逐日、每船一筆
午報是效能分析的核心來源。欄位分五群：

**識別/航程**
| 欄位 | 型別 | 說明 |
|---|---|---|
| report_id | string | 主鍵 |
| imo_number | string | 船舶 IMO 號（分區鍵） |
| vessel_name | string | 船名 |
| report_datetime_utc | timestamp | 報告時間(UTC) |
| voyage_no / leg | string | 航次/航段 |
| port_from / port_to | string | 起訖港 |
| voyage_phase | string | at_sea / in_port / anchor / maneuvering |
| latitude / longitude | double | 位置 |

**航行/推進**
| 欄位 | 型別 | 說明 |
|---|---|---|
| steaming_hours | double | 航行小時(通常≈24) |
| distance_og_nm | double | 對地距離(GPS) |
| distance_tw_nm | double | 對水距離(速度計) |
| speed_og_kn (SOG) | double | 對地船速 |
| speed_tw_kn (STW) | double | 對水船速 |
| me_rpm | double | 主機平均轉速 |
| me_shaft_power_kw | double | 軸功率(有扭力計時) |
| me_foc_mt | double | 主機油耗(噸/日) |
| propeller_pitch_m | double | 螺距(FPP) |

**燃油/排放來源**
| 欄位 | 型別 | 說明 |
|---|---|---|
| fuel_type | string | HFO/VLSFO/LSMGO/MGO |
| fuel_lcv_mj_kg | double | 低位發熱值 |
| me_foc_mt / ae_foc_mt / boiler_foc_mt | double | 分機種油耗 |
| total_foc_mt | double | 全船日油耗 |

**載況**
| 欄位 | 型別 | 說明 |
|---|---|---|
| draft_fore_m / draft_aft_m | double | 艏/艉吃水 |
| mean_draft_m / trim_m | double | 平均吃水/俯仰 |
| displacement_mt | double | 排水量(查靜水力表) |
| cargo_weight_mt | double | 載貨量 |
| condition_flag | string | laden / ballast |

**環境/氣海象**
| 欄位 | 型別 | 說明 |
|---|---|---|
| wind_speed_kn / wind_dir_deg | double | 真風速/向 |
| beaufort | int | 蒲福風級 |
| wave_height_m / wave_dir_deg / wave_period_s | double | 有義波高/向/週期 |
| swell_height_m / swell_dir_deg | double | 湧浪 |
| sea_water_temp_c / air_temp_c | double | 海/氣溫 |
| air_pressure_hpa | double | 氣壓 |
| current_speed_kn / current_dir_deg | double | 海流 |
| sea_water_density_kg_m3 | double | 海水密度 |
| data_source | string | manual / autolog / sensor |

### 2.2 Underwater Inspection Report（`raw.uwi`）— 事件型
| 欄位 | 型別 | 說明 |
|---|---|---|
| inspection_id | string | 主鍵 |
| imo_number | string | |
| inspection_date | date | |
| inspection_type | string | UWI / diver / ROV |
| hull_fouling_rating | int | 汙損等級(0–100, NSTM) |
| hull_fouling_coverage_pct | double | 附著覆蓋率 |
| propeller_condition | string | Rubert A–F |
| propeller_roughness_um | double | 螺槳粗糙度 |
| coating_breakdown_pct | double | 塗層劣化百分比 (coating breakdown %) |
| coating_condition | string | good/fair/poor |
| recommended_action | string | polish / clean / none |

> `propeller_roughness_um` 與 `coating_breakdown_pct` 為各自獨立、可重置之退化過程 (independent resettable processes)；`propeller_condition`（Rubert A–F）由 `propeller_roughness_um` 分級，`coating_condition` 由 `coating_breakdown_pct` 分級（good <20% / fair [20,45%) / poor ≥45%）。

### 2.3 Maintenance / Event Log（`raw.maintenance_event`）— 事件型
| 欄位 | 型別 | 說明 |
|---|---|---|
| event_id | string | 主鍵 |
| imo_number | string | |
| event_date | date | |
| event_type | string | hull_cleaning / propeller_polishing / dry_dock / coating_renewal / propeller_repair / engine_overhaul |
| cost_usd | double | 維修成本 |
| downtime_hours | double | 停航時數 |
| location | string | 執行地點 |

### 2.4 Vessel Master（`raw.vessel_master`）— 每船一筆（維度）
| 欄位 | 型別 | 說明 |
|---|---|---|
| imo_number | string | 主鍵 |
| vessel_name | string | |
| vessel_type | string | container |
| fleet_id / fleet_name | string | 所屬船隊分組 (fleet grouping) 代碼/名稱（如 FL-IA / Intra-Asia），見 §3.1 |
| build_year | int | |
| lpp_m / breadth_m / design_draft_m | double | 船長/寬/設計吃水 |
| dwt / gross_tonnage | double | 載重噸/總噸 |
| mcr_kw / ncr_kw | double | 最大/常用續航功率 |
| design_speed_kn | double | 設計船速 |
| propeller_type / diameter_m / pitch_m / n_blades | | 螺槳規格 |
| transverse_area_m2 (A_XV) | double | 水線上正投影面積(風阻用) |
| ref_curve_id | string | 對應試航速度-功率曲線 |
| last_dry_dock_date | date | |

### 2.5 Reference Speed-Power Curve（`raw.reference_curve`）— 試航基準
每船一組 (speed_kn, shaft_power_kw, displacement_ref_mt) 基準點；ISO 19030 用來求「期望船速」。可由試航(sea trial)或模型試驗(model test)取得；POC 以合成曲線代入。

### 2.6 Fuel Price（`raw.fuel_price`）— 燃油價格時間序列
`date, fuel_type, price_usd_per_mt` — 供 excess fuel cost / 維修成本效益使用。

---

## 3. 合成資料產生策略

以 Python(numpy) 產生，**於本機純 Python 執行**，產出 **JSONL（一行一筆 JSON 物件）** 後上傳 `s3://ym-poc/raw/`。

**產生邏輯（讓資料「可被公式驗證」是關鍵）**
1. **建立船隊 + 基準曲線**：每船由設計船速/功率生成 `P = a·V^n`（n≈3.5–4.2）之基準速度-功率曲線。
2. **真實汙損軌跡**：每船維護週期內，speed loss 隨「距上次清洗天數」線性+雜訊成長（fouling rate ≈ 0.01–0.05 %/day），於 hull cleaning / dry dock 事件重置。**螺槳粗糙度 (propeller roughness) 與 塗層劣化 (coating breakdown) 為獨立於船體汙損 s 之各自可重置退化過程**：`propeller_roughness_um` 自 150µm 基線隨「距上次拋光/塢修天數」增長，於 propeller_polishing ∪ dry_dock 重置；`coating_breakdown_pct` 隨「距上次塗層更新/塢修天數」增長，於 coating_renewal ∪ dry_dock 重置。
3. **維修事件注入**：dry dock 每 2.5–5 年、hull cleaning/propeller polishing 每 6–12 月、**主機大修 (engine_overhaul) 約每 900–1300 天**；UWI 之 fouling rating 與當下真實汙損狀態相關。
4. **氣海象**：季節性 + 隨機的 Beaufort 分布，波高與風級相關。
5. **反算「量測值」**：由 (真實 speed loss + 環境附加阻力) 反推當日所需功率/油耗/船速，加感測雜訊 → 得 Noon Report 欄位。這樣 ETL 套用 ISO 公式後應能還原出植入的 speed loss。
6. **異常注入**：主機 SFOC 突升(引擎劣化)、螺槳受損(slip 跳升)、感測器離群值、極端海況 → 供異常偵測/成因分類驗證。另疊加**主機 SFOC 世代性漂移 (secular drift)**：每船固定漂移率，於 engine_overhaul ∪ dry_dock 重置、上限 +6%，同時寫入真值 `sfoc_g_kwh` 與 `me_foc`（維持 C2 能量平衡）。
7. **YM WELLNESS**：特意安排一段「汙損漸升→觸發門檻→清洗後回復」的完整故事線，作為 Dashboard 示範。

### 3.1 船隊組成（僅貨櫃船，橫跨常見船級）
| 船級 | 代表 TEU | Lpp(m) | Breadth(m) | 設計船速(kn) | MCR(kW) | 樣本數 |
|---|---|---|---|---|---|---|
| Feeder | ~1,100 | ~150 | ~23 | ~18 | ~9,000 | 1 |
| Feedermax | ~2,500 | ~200 | ~30 | ~21 | ~21,000 | 1 |
| Panamax | ~4,500 | ~260 | ~32.2 | ~24 | ~36,000 | 1–2 |
| Post-Panamax | ~8,500 | ~300 | ~43 | ~24.5 | ~55,000 | 1–2 |
| Neo-Panamax（含 **YM WELLNESS**） | ~11,000 | ~330 | ~48 | ~23 | ~62,000 | 2 |
| ULCV | ~20,000 | ~400 | ~59 | ~22.5 | ~75,000 | 1 |

> 各船級的 `a·V^n` 基準曲線、A_XV(風阻投影面積)、螺槳規格依上表尺度縮放，確保跨船級數值合理可比。

**船隊分組 (fleet grouping)**：9 艘船另依航線 (trade lane) 分為 3 個子船隊 (sub-fleet)，供 `agg_fleet_daily` 彙總與 Dashboard 船隊選擇器 (fleet picker) 使用；`fleet_id = 'ALL'` 為全船隊彙總 (all-fleet rollup)，非實際子船隊。

| fleet_id | fleet_name | 船舶（IMO） |
|---|---|---|
| FL-IA | Intra-Asia | 9700001 YM HARMONY, 9700002 YM ENLIGHTEN, 9700003 YM PLENTY |
| FL-TP | Trans-Pacific | 9700004 YM PROSPER, 9700005 YM EXCELLENCE, 9700008 YM TRIUMPH |
| FL-AE | Asia-Europe | 9700006 **YM WELLNESS**, 9700007 YM WARRANTY, 9700009 YM TITAN |

### 3.2 合成資料邏輯一致性規則（must-hold physics — 對應「資料需符合邏輯」）
產生器須讓下列關係在每筆/每船恆成立，並於產出後跑一致性檢核（見 §9 M1 驗收）：

| # | 一致性關係 | 公式/規則 |
|---|---|---|
| C1 | 速度-功率 | `P_shaft ≈ a·V_ref^n·(Δ/Δ_ref)^(2/3)`（乾淨船）；汙損時同速需更高 P |
| C2 | 能量平衡(油耗) | `me_foc_mt ≈ P_shaft·SFOC·steaming_hours / 1e6`（單位一致換算） |
| C3 | 航距 | `distance_tw_nm ≈ STW·steaming_hours`；`distance_og_nm ≈ SOG·steaming_hours` |
| C4 | 對地/對水一致 | `SOG ≈ STW + 海流投影分量`（向量一致，不得矛盾） |
| C5 | 排水量-吃水 | `displacement_mt` 由 mean_draft 經靜水力(近似)換算；`Δ = lightship + cargo + ballast + fuel + stores`(質量守恆) |
| C6 | 俯仰 | `trim = draft_aft − draft_fore`；`mean_draft = (fore+aft)/2` |
| C7 | 螺槳滑失 | `V_th = pitch·RPM·60/1852`；`slip = (V_th−V)/V_th` ∈ 合理區(通常 −5%~30%) |
| C8 | 碳排 | `co2_mt = Σ FOC_type · C_F,type`（HFO3.114/VLSFO3.151/MGO3.206） |
| C9 | 汙損單調性 | 週期內 `speed_loss` 隨 `days_since_cleaning` 大致遞增；維修事件當日重置(階梯下降) |
| C10 | UWI 佐證 | `hull_fouling_rating` / `propeller_condition` 與當下真實汙損狀態正相關 |
| C11 | 氣海象相關 | `beaufort` 與 `wave_height`、`wind_speed` 相關；海水密度隨溫度變化合理 |
| C12 | 量測=真值+雜訊 | 量測值 = 物理真值 + 有界感測雜訊；離群點僅由「已標記的注入異常」產生 |
| C13 | 可還原性 | ETL 套 ISO 15016/19030 後，還原之 speed_loss 與植入真值誤差在容忍區內（閉環驗證） |
| C15 | 螺槳粗糙度單調性 | `propeller_roughness_um` 與「距上次拋光天數」(propeller_polishing ∪ dry_dock) 之等級相關 (Spearman) ≥ 0.7；螺槳週期內非遞減 |
| C16 | 塗層劣化單調性 | `coating_breakdown_pct` 與「距上次塗層更新天數」(coating_renewal ∪ dry_dock) 之等級相關 (Spearman) ≥ 0.7；塗層週期內非遞減 |
| C17 | 引擎 SFOC 漂移 | 負載正規化 `sfoc_g_kwh` 與「距上次大修天數」(engine_overhaul ∪ dry_dock) 之等級相關 (Spearman) ≥ 0.5（每引擎週期）；中位 SFOC 落於 [160,215] |

> C14 為異常偵測 (anomaly detection) 之 recall/precision/成因驗收（見 §5.2），不列於本物理一致性表；M1 驗收整體跑 C1–C17。

---

## 4. ETL 與計算設計（核心）

### 4.1 Pipeline 階段（純 Python，**本機執行**）
```
S1 Ingest/Validate  原始清洗、單位一致化、缺漏補值、品質旗標
S2 Enrich           join vessel_master + reference_curve + fuel_price
S3 ISO 15016 修正    去除環境附加阻力 → 修正功率/船速
S4 ISO 19030 過濾    篩「有效穩態」資料點(valid_flag)
S5 Speed Loss       由基準曲線求期望船速 → 計算 speed loss %
S6 衍生指標          slip / SFOC / Admiralty / EEOI / CII / excess FOC & cost
S7 週期指標          ISP / DDP / MT / ME（ISO 19030 效能指標）
S8 統計異常          rolling z-score / EWMA / IsolationForest → 異常點
S9 成因分類          規則 + 特徵 → 汙損/螺槳/海況/引擎
S10 維修時機          fouling 成本模型 → 最佳清洗日推薦
S11 Publish          寫本機 curated JSONL 分區 → 上傳 S3（aws s3 sync / boto3）；partition projection 免更新 Catalog
                     （S12 GenAI 敘事：Bedrock 產生洞察/報告文字 — 本 POC 暫緩，以後再追加，見 §5.7）
```

### 4.2 ISO 15016（試航修正）— 每筆有效午報套用
目的：把「有環境干擾的量測值」修正到「參考條件」，取得可比較的 **修正功率 P_id / 修正船速**。修正項：

| 修正項 | 公式/方法（POC 採用） | 需要欄位 |
|---|---|---|
| 風阻 R_AA | `R_AA = ½·ρ_air·C_AA(ψ)·A_XV·V_WR² − ½·ρ_air·C_AA(0)·A_XV·V_G²`（C_AA 用 STA-JIP/Blendermann 係數集） | wind_speed/dir, A_XV |
| 波浪附加阻力 R_AW | STAWAVE-1（迎浪近似）`R_AWL = (1/16)·ρ_sw·g·H_s²·B·√(B/L_BWL)` | wave_height, B, Lpp |
| 水溫/密度 | 依實際海水密度/黏度對阻力做 ρ、Reynolds 修正 | sea_water_temp/density |
| 淺水 | Lackenby / Schlichting 修正（depth/draft 比不足時） | 水深(合成) |
| 海流 | 以 STW 為對水基準；SOG−current 一致性檢核 | current, SOG, STW |
| 排水量 | Admiralty 換算至參考排水量 `P ∝ Δ^(2/3)` | displacement |

輸出：`resistance_wind_kn`, `resistance_wave_kn`, `power_corrected_kw`, `speed_corrected_kn`，以及各修正量(供 Dashboard「修正瀑布圖」)。

### 4.3 ISO 19030（船體與螺旋槳效能）— 主指標

**資料過濾（valid_flag）** — 只留穩態、乾淨條件的點：
- STW ≥ 門檻（排除低速/操縱）
- Beaufort ≤ 6（風浪過大剔除）
- 水深/吃水比 ≥ 門檻（deep water）
- 舵角小、無加減速、voyage_phase = at_sea
- displacement 落在基準曲線適用範圍
- 資料完整、非離群

**Percentage Speed Loss（主指標）**
```
V_ref  = f_refcurve(P_corrected)        # 由基準速度-功率曲線，在修正功率下求期望船速
SL%    = (V_ref − V_corrected) / V_ref × 100     # 正值 = 效能衰退(損失)
```

**ISO 19030 效能指標（週期彙總）**
| 指標 | 定義 | 用途 |
|---|---|---|
| DDP (Dry-docking Performance) | 出塢後首段期間平均 speed loss 對比前一週期 | 塢修效益 |
| ISP (In-service Performance) | 評估期平均 speed loss 對比參考期 | 在航劣化 |
| MT (Maintenance Trigger) | speed loss 超過門檻 → 觸發維修 | 預警 |
| ME (Maintenance Effect) | 事件前後 speed loss 階梯落差 | 維修效益驗證 |

### 4.4 其他有用衍生指標
| 指標 | 公式 | 意義 |
|---|---|---|
| 螺槳滑失 Slip | `V_th = pitch·RPM·60/1852`；`slip = (V_th − V)/V_th`（apparent 用 SOG，real 用 STW） | 螺槳汙損/受損、海流指標 |
| 海軍係數 Admiralty | `C_A = Δ^(2/3)·V³ / P_S` | 簡易效能基準；下降=劣化 |
| SFOC | `SFOC = me_foc / me_power`（g/kWh） | 引擎狀態；無 speed loss 卻升→引擎問題 |
| EEOI | `Σ(FOC·C_F) / Σ(cargo·dist)` | 單位運輸碳強度 |
| CII — 簡化 AER | `AER = Σ CO₂ / (DWT·Σ dist)` → 對比 required → A–E 評級 | 快速碳強度指標 |
| CII — 完整 IMO | 依 MEPC.352/353/354(78)：`Attained CII = Σ(FOC·C_F)/(Capacity·Σ dist)`；`required = (1−Z%)·CII_ref`，`CII_ref = a·Capacity^(−c)`（貨櫃船參照線 a,c），以 dd 邊界向量定 A–E | 與 IMO 合規一致 |
| 超額油耗 excess FOC | `FOC_clean·[(1/(1−s))^n − 1]`，s=speed loss 分數 | 汙損造成的多耗油 |
| 超額油費 | `excess FOC × fuel_price` | 成本效益/維修時機輸入 |
| 累積超額油費 | `∫ excess_cost dt`（距上次清洗） | 汙損「代價」曲線 |

> 碳因子 C_F：HFO 3.114、VLSFO 3.151、MGO 3.206 tCO₂/t。

### 4.5 「要計算的欄位」總表 → 寫入事實表
`speed_corrected_kn, power_corrected_kw, resistance_wind_kn, resistance_wave_kn, v_expected_kn, speed_loss_pct, slip_apparent, slip_real, sfoc_g_kwh, admiralty_coef, eeoi, cii_aer, cii_rating_aer, cii_imo, cii_rating_imo, co2_mt, excess_foc_mt, excess_cost_usd, cum_excess_cost_usd, days_since_cleaning, valid_flag, anomaly_flag, anomaly_cause, anomaly_severity`

> **Speed Loss 正負號慣例（已定案）**：`speed_loss_pct` **正值 = 效能衰退（同功率下比基準慢）**，數值越大越糟；維修後應階梯下降。所有 Dashboard 圖表、門檻線、AI 敘事一致採此慣例。

---

## 5. AI / 統計洞察設計

對應 `ym-predict.md` 之「數據洞察與效能分析」四項。

> **POC 方法界定（已定案）**：全程採 **規則 + 統計**，**不使用 SageMaker**。IsolationForest 等輕量模型直接在**本機** Python 以 scikit-learn 執行。（生成式 AI (Bedrock) 敘事/報告本 POC **暫緩，以後再追加**，見 §5.7。）

### 5.1 效能趨勢與衰退率
- 對 valid 點的 `speed_loss_pct` vs `days_since_cleaning` 做穩健迴歸(Huber/Theil-Sen) → **fouling rate（%/day）**。
- 分段迴歸(piecewise)以維修事件切段 → 每個維護週期各自斜率。
- 輸出：趨勢線、95% 區間、外推軌跡（預測未來 speed loss）。

### 5.2 異常預警（油耗偏高高風險點）
- 統計法：對 `excess_foc` / `sfoc` 做 rolling z-score、IQR、EWMA 管制圖。
- ML：IsolationForest（特徵：speed_loss, slip, sfoc, beaufort, excess_foc 殘差）。
- 輸出 `fact_anomaly`（時間點、指標、嚴重度）。

### 5.3 成因分類（規則 + 特徵，POC 以規則為主）
| 成因 | 判斷特徵 |
|---|---|
| 船體生物附著 biofouling | speed loss 緩升、與 days_since_cleaning 正相關、UWI fouling rating 高、real slip 微升 |
| 螺槳損傷/汙損 | slip 突升、螺槳專屬、UWI propeller condition 差 |
| 海況異常 | 與 Beaufort/波高高相關、短暫、天氣過後消失 |
| 引擎劣化 | SFOC 升但 speed loss 未升 |

### 5.4 維修效益驗證
- 對每個 maintenance_event 計算 ISO 19030 **ME**：事件前後 N 天平均 speed loss 落差 → 回復幅度 %、推進效率即時改善。
- 與成本並列 → 回收期(payback)。

### 5.5 最佳維修時機（成本效益最佳化）
```
週期成本率  J(T) = [K + ∫₀ᵀ c(t)dt] / T      # K=清洗成本+停航成本, c(t)=每日超額油費
最佳週期    T*：當 c(T*) = J(T*)（邊際汙損成本 = 平均週期成本）
建議日期    = last_cleaning + T*
```
- 用 fouling 軌跡外推 c(t)，輸出「建議清洗日 / 預估到達觸發門檻日 / 淨節省」（寫入 `fact_recommendation`）。
- **整體維修行動 (overall maintenance actions) — 逐行動預測模型 (per-action forecast model)**：上述船體清潔 (hull cleaning) 成本模型僅涵蓋船殼；其餘各維修行動改採**逐行動預測模型**——每個行動各自對其**專屬退化訊號**、於其**專屬重置時鐘 (reset clock)** 上做穩健迴歸 (Theil-Sen) 並外推，求該訊號跨越其門檻之**預測到期日 (due_date / 到期日)**；若資料不足以外推，退回**優先度水平線 (priority-horizon fallback)**（high +30 天 / medium +90 天），故 `due_date` **恆不為 null**。寫入 `fact_maintenance_recommendation`（粒度：船×行動）：
  - `hull_cleaning` 船體清潔：由汙損成本模型 (`fact_recommendation.status='ok'`) 給定到期日，觸發預估日 ≤ ~60 天（或已逾期）為 high；或最新 UWI `hull_fouling_rating` ≥ 60 亦建議（medium, source=uwi，此僅憑 UWI 評級之分支亦給 horizon 到期日）。
  - `propeller_repair` 螺旋槳維修：`propeller_roughness_um` ≥ 430、Rubert `propeller_condition` ∈ {E,F} 或高嚴重度螺旋槳異常 ⇒ high（抑制拋光）；due_date 由螺槳粗糙度外推至門檻 **430µm**（重置時鐘 propeller_polishing ∪ dry_dock）。
  - `propeller_polishing` 螺旋槳拋光：`propeller_roughness_um` ≥ 300、Rubert `propeller_condition` ∈ {C,D}、180 天內外推可達 300µm 或 ≥1 螺旋槳異常 ⇒ medium；due_date 由螺槳粗糙度外推至門檻 **300µm**（重置時鐘 propeller_polishing ∪ dry_dock）。
  - `coating_renewal` 船體塗層更新：UWI `coating_condition` = poor 或 180 天內外推可達 45% ⇒ medium；due_date 由 `coating_breakdown_pct` 外推至門檻 **45%**（重置時鐘 coating_renewal ∪ dry_dock）。
  - `engine_inspection` 主機檢查：近 180 天內 `engine_degradation` 異常 ≥1（≥2 ⇒ high，否則 medium），或 SFOC 效率漂移外推（或已逾）達 **+5%**（source=`sfoc_trend`，無異常亦可觸發）；due_date 由負載正規化 SFOC 外推至 +5% 效率損失（重置時鐘 engine_overhaul ∪ dry_dock）。
  - `source` 取值：`uwi` / `anomaly` / `fouling_model` / `sfoc_trend` / `uwi+anomaly`。
  - 空集合（無任何 row）代表該船維修進度良好。
  - **整合排程 (consolidated planner)**：將上述逐行動 `due_date` 依 60 天視窗（`_PLAN_BATCH_DAYS = 60`）批次整併為船級維修班期 (service window)。每行動另標記 `plan_service_type`：`coating_renewal`、`propeller_repair` 需塢修（`dry_dock`）；`hull_cleaning`、`propeller_polishing`、`engine_inspection` 可在航/水下維修（`in_water`）。塢修班期為錨點 (anchor)：鄰近的水下行動併入同一塢修班期，其餘水下行動則自行依 60 天視窗互相合併。最終每行動寫入班期日 `plan_date` 與 `plan_service_type`。

### 5.6 早期預警彙整 (Early-Warning Alert Episodes)
`alerts.build_alerts` 將 §5.2 統計異常點 (point anomaly) 與 §5.5 船體生物附著趨勢 (hull-fouling trend) 提升為去重後的敘事化預警集 (deduplicated narrated alert episode)，寫入 `fact_alert`（船×預警集，partition by imo_number）。

- **點異常聚合**：同一 `cause` 之連續 `fact_anomaly` 天數合併為一預警集；容許缺口容忍 (gap tolerance) = **7 天**（`_GAP_DAYS`）內仍視為同一集，超過則另開新集。每集記錄開始/最後出現日 (`opened_date`/`last_seen_date`)、峰值嚴重度/|z-score|（`peak_value`/`peak_z`）、峰值時之驅動指標 (`driver_metric`)、預警期間累積超額油費 (`excess_cost_usd`)。
- **船體生物附著 (hull_biofouling)**：唯一「僅由趨勢觸發、不由點異常觸發」之成因；來源為 `fact_recommendation` 之正汙損率+觸發到期日，並比對近 14 天 speed loss 是否已逼近維修觸發門檻。
- **5 種預警成因 (cause)**：`engine_degradation`（引擎劣化）、`propeller`（螺槳）、`weather`（海況）、`sensor`（感測器）、`hull_biofouling`（船體生物附著）。
- 每筆預警集皆附中英雙語訊息 (bilingual message) `message_zh`/`message_en`、建議動作 `recommended_action`、狀態 `status`（新開恆為 `open`）、來源 `source`。

### 5.7 生成式 AI 敘事與報告（Amazon Bedrock / Claude）— 暫緩，以後再追加

> 本 POC **暫不實作** Bedrock(Claude) 文字敘事/定期節能報告；相關產出（`insights/` zone、`insight_narratives` 表、`vessel_report` API、Dashboard「報告 Reports」頁）皆延後。§5.1–5.5 之結構化指標、異常、成因、維修建議已足以支撐 Dashboard 之數值視覺化。以後再追加時的設計方向：

- 輸入：上述結構化指標 + 異常 + 建議 → 輸出**中文自然語言洞察與定期節能報告**。
- 範例輸出：
  > 「YM WELLNESS 近 90 天速度損失由 4%→9%，主因研判為船體生物附著（UWI fouling rating 65 佐證，real slip 同步微升）；依汙損軌跡外推將於約 30 天後達 10% 維修觸發門檻。建議於下一次靠港（XX）執行船體清洗，預估超額油費 $/day 目前約 X，清洗回收期約 45 天。」
- 產出寫入 `s3://ym-poc/insights/`，並登錄 `insight_narratives` 表。
- 知識傳承：把「老師傅判讀邏輯」固化為 prompt + 規則特徵，解決技術斷層。

---

## 6. Athena 資料表設計（Curated / 交付物之一）

**格式/分區**：**JSONL**（一行一筆 JSON），Athena 以 JSON SerDe（`org.openx.data.jsonserde.JsonSerDe`）建外部表；事實表以 S3 路徑分區 `imo_number/year/month/`，用 **partition projection**（免 crawler/MSCK）；維度表不分區。本機 ETL 產出分區 JSONL 並上傳 S3；Athena 以 partition projection 直查（Glue Data Catalog 僅一次性建表，免 crawler/MSCK）。

| # | 表 | 粒度 | 關鍵欄位 | 供給 Dashboard |
|---|---|---|---|---|
| 1 | `dim_vessel` | 每船 | 規格、設計船速、last_dry_dock、fleet_id/fleet_name | 個船表頭、船隊表、船隊選擇器 (fleet picker) |
| 2 | `dim_reference_curve` | 每船×點 | speed, power | speed-power 散點基準線 |
| 3 | `fact_performance_daily` | 船×日 | speed_loss_pct, power_corrected, v_expected, slip, sfoc, admiralty, eeoi, cii, excess_cost, days_since_dry_dock, days_since_in_water, valid_flag | 所有趨勢圖(主) |
| 4 | `fact_uwi` | 事件 | fouling_rating, propeller_condition | 事件標記、成因佐證 |
| 5 | `fact_maintenance_event` | 事件 | event_type, cost, ME_recovery, payback | 事件標記、維修效益面板 |
| 6 | `fact_performance_indicator` | 船×週期 | ISP, DDP, period | 效能指標卡 |
| 7 | `fact_anomaly` | 異常點 | metric, severity, cause | 異常時間軸/預警 |
| 8 | `fact_recommendation` | 船×建議 | recommended_clean_date, trigger_eta, net_saving | 船殼清潔最佳化子面板 (t*/淨節省) |
| 9 | `agg_fleet_daily` | **船隊×日**（`fleet_id='ALL'` 全船隊彙總 + 3 子船隊，見 §3.1） | fleet_id, n_vessels, avg_speed_loss_pct, total_excess_cost_usd, cii_count_a~e, n_alerts | 船隊總覽 KPI |
| 10 | `fact_maintenance_recommendation` | 船×行動 | action_type, priority, due_date, source, plan_date, plan_service_type | 維修建議面板（行動清單/規劃班期）、船隊「下一步行動」欄 |
| 11 | `fact_alert` | 船×預警集 (episode) | cause, severity, status, message_zh/message_en | 異常預警 (Alerts) 面板 |

> 合計 **17** 張表：6 張 raw zone（見 §2）+ 11 張 curated zone（上表）。
> `fact_maintenance_recommendation.due_date` 現以逐行動預測 (per-action forecast) 對每個行動皆填入（預測跨越門檻之到期日），恆不為 null；`plan_date`/`plan_service_type` 為整合排程後之班期標記（見 §5.5）。
> `fact_alert` 由 `alerts.build_alerts` 產生（見 §5.6）。
> `insight_narratives`（船×報告，GenAI 敘事）表暫緩，以後再追加（見 §5.7）。

---

## 7. 非同步查詢 API 設計（API Gateway + Lambda）

### 7.1 為何非同步
Athena 查詢需數秒~數分鐘，可能超過 API Gateway 29s 同步上限 → 採「提交取 query_id → 輪詢取結果」。

### 7.2 端點
| 方法 | 路徑 | 說明 |
|---|---|---|
| POST | `/v1/queries` | 提交查詢，body `{query_type, params}` → 回 `{query_id, status:"PENDING"}` |
| GET | `/v1/queries/{query_id}` | 回 `{status: RUNNING\|SUCCEEDED\|FAILED, result_location, meta}` |
| GET | `/v1/queries/{query_id}/results?page_token=` | 分頁回傳結果列（**一律 inline JSON**；大結果集以 page_token 續傳） |

`query_type` 對應預定義參數化 SQL（避免前端拼 SQL、防注入），共 **13 種**：

| # | query_type | 說明 |
|---|---|---|
| 1 | `fleet_overview` | 船隊日彙總指標（KPI/趨勢） |
| 2 | `fleet_vessels` | 全船隊船舶清單（船舶選擇器） |
| 3 | `fleet_list` | 船隊/子船隊下拉清單（船隊選擇器） |
| 4 | `fleet_alerts` | 船隊層級開放中預警清單 |
| 5 | `vessel_speed_loss` | 個船 speed loss 趨勢 |
| 6 | `vessel_metrics` | 個船指標總覽（趨勢圖群） |
| 7 | `vessel_speed_power` | 個船 speed-power 散點 |
| 8 | `vessel_anomalies` | 個船異常點 |
| 9 | `vessel_alerts` | 個船預警清單 |
| 10 | `vessel_maintenance_effect` | 個船維修效益 |
| 11 | `vessel_recommendation` | 個船船殼清潔最佳化 |
| 12 | `vessel_maintenance_recommendation` | 個船維修建議行動清單 |
| 13 | `vessel_uwi` | 個船最新水下檢查 |

（`vessel_report` 暫緩，以後再追加，見 §5.7）

### 7.3 生命週期
```
POST /queries
  Lambda(submit): 依 query_type 取 SQL 樣板 + 綁參數(imo,date_range)
                  → Athena StartQueryExecution → 得 exec_id
                  → DynamoDB put {query_id, exec_id, type, status:PENDING, ttl}
                  → 回 query_id (可直接用 exec_id)
GET /queries/{id}
  Lambda(status): Athena GetQueryExecution(exec_id) → 映射狀態
                  SUCCEEDED → 回 result_location(S3)
GET /queries/{id}/results
  Lambda(result): Athena GetQueryResults 分頁 → **inline JSON**（大結果集以 page_token 續傳，不用 presigned URL）
```
- DynamoDB TTL 自動清理過期 query 記錄。

### 7.4 回應範例
```json
// POST /v1/queries  → 202
{ "query_id": "q_8f3a...", "status": "PENDING" }
// GET  /v1/queries/q_8f3a  → 200
{ "query_id": "q_8f3a...", "status": "SUCCEEDED", "row_count": 1825 }
// GET  /v1/queries/q_8f3a/results  → 200  (inline JSON)
{ "query_id": "q_8f3a...",
  "columns": ["report_date","speed_loss_pct","cii_rating_imo"],
  "rows": [ ["2026-06-30", 8.7, "C"], ["2026-06-29", 8.5, "C"] ],
  "next_page_token": "eyJvZmZzZXQiOjEwMDB9" }
```

---

## 8. Web Dashboard 設計

對應 `ym-predict.md`「整合式 Web Dashboard」三項需求：視覺化分析、船隊總覽+個船深入、決策支援（維修建議）。（AI 生成報告本 POC 暫緩，以後再追加，見 §5.7）

> **實作狀態（已建置 BUILT）**：Vue3 + D3、no-build（`web/`），3 視圖（船隊總覽/個船深入/異常預警）皆已實作，消費全部 13 種 query_type；含船隊選擇器 (fleet picker)、預警集列表、逐行動規劃條 (per-action planner strip，plan_date/plan_service_type)。尚未建置（暫緩）：船隊地圖、報告 Reports（AI 生成，見 §5.7）。

### 8.1 資訊架構
```
Dashboard
├─ 船隊總覽 Fleet Overview        （進場首頁）
├─ 個船深入 Vessel Deep-dive      （e.g. YM WELLNESS）
├─ 異常預警 Alerts
└─ 報告 Reports（AI 生成，暫緩，以後再追加）
```

### 8.2 船隊總覽（Fleet Overview）
- **船隊選擇器 (fleet picker)**：`ALL`（全船隊彙總）+ 3 子船隊（FL-IA/FL-TP/FL-AE，見 §3.1）切換。
- **KPI 卡列**：船隊艘數、平均 speed loss、預警船數、CII 評級分布、本期船隊超額油費、可節省潛力。
- **船隊表/熱力矩陣**（每列一船）：目前 speed loss %、趨勢箭頭、CII 評級(A–E 色塊)、距上次清洗天數、下次建議動作、預警徽章；可排序/篩選。
- **船隊地圖**（尚未建置，暫緩）：船位以效能狀態上色（綠/黃/紅）。
- **分布圖**：speed loss 直方圖、CII 評級長條。
- **排行**：最佳/最差表現船。
- 資料源：`agg_fleet_daily`（`fleet_overview`）+ `dim_vessel`（`fleet_list`/`fleet_vessels`）+ 逐船 `vessel_metrics`/`vessel_recommendation`/`vessel_maintenance_recommendation` 補齊表列 + `fact_alert`（`fleet_alerts`，預警徽章）。

### 8.3 個船深入（以 YM WELLNESS 示範）
- **表頭**：船舶規格、目前狀態、CII 評級、speed loss 儀表(gauge)。
- **★ Speed Loss 趨勢圖（主視覺）**：`speed_loss_pct` 對時間，疊加：
  - 維修事件垂直標記（UWI/polishing/dry dock/cleaning）
  - 趨勢線 + 衰退斜率、觸發門檻線
  - **外推軌跡（虛線）+ 預測觸發日期**
- **Speed-Power 散點**：量測點 vs 基準曲線，依週期上色（看曲線右移=劣化）。
- **修正瀑布圖**：量測功率 → 扣風阻/波浪/密度… → 修正功率（呈現 ISO 15016 修正貢獻）。
- **Slip / SFOC / Admiralty 趨勢**：輔助研判成因（螺槳 vs 引擎 vs 船體）。
- **油耗面板**：實際 vs 基準、超額油耗、**累積超額油費曲線**。
- **異常時間軸**：預警點依成因上色（汙損/螺槳/海況/引擎）+ 嚴重度。
- **個船預警清單**：該船開放中預警集 (alert episode)，成因/嚴重度/驅動指標/建議動作。
- **維修效益面板**：各事件前後 speed loss 落差(ME)、回復 %、回收期。
- **CII / EEOI 趨勢**。
- **氣海象疊圖**切換（Beaufort/波高）。
- **★ 維修建議面板 (Maintenance recommendations)**：整體維修行動清單（船體清潔/螺旋槳拋光·修理/船體塗層更新/主機檢查，附優先度+到期日+佐證），並依 `plan_date`/`plan_service_type` 呈現逐行動規劃條 (per-action planner strip，塢修/在航班期)；船體清潔行動下方展開「船殼清潔最佳化 (hull-cleaning optimization)」子區塊（建議清洗日 + 預估觸發門檻日 + t*/淨節省）。（AI 敘事與一鍵生成報告暫緩，以後再追加，見 §5.7）
- **最新水下檢查面板 (Latest inspection)**：最新 UWI 之螺槳狀況、塗層狀況、船體汙損等級。
- **資料品質面板**：過濾後有效點比例（透明化 ISO 19030 篩選）。
- 資料源：`fact_performance_daily`, `fact_uwi`, `fact_maintenance_event`, `fact_anomaly`, `fact_alert`, `fact_recommendation`, `fact_maintenance_recommendation`, `dim_reference_curve`。

### 8.4 異常預警（Alerts）
- 全船隊開放中預警集 (open alert episode) 清單：船名、開始/最後出現日、成因、嚴重度、驅動指標/峰值、預警期間超額油費、建議動作、狀態、中英雙語訊息 (message_zh/message_en)。
- 資料源：`fact_alert`（`fleet_alerts`；個船層級另有 `vessel_alerts`，見 §8.6）。

### 8.5 報告（Reports）— 暫緩，以後再追加
- AI 生成之定期節能分析報告與維修建議摘要（可預覽/下載 PDF/MD）本 POC **暫不實作**；待 §5.7 生成式 AI 敘事追加後再納入。
- 屆時資料源：`insight_narratives`（`report_url` 指向 S3）。

### 8.6 圖表 ↔ API ↔ 表 對應
| Dashboard 元件 | query_type | 主要表 |
|---|---|---|
| 船隊 KPI/表 | `fleet_overview` | agg_fleet_daily |
| 船隊選擇器 (fleet picker) | `fleet_list` | dim_vessel |
| 全船隊船舶清單/選擇器 | `fleet_vessels` | dim_vessel |
| 船隊預警徽章/Alerts 頁 | `fleet_alerts` | fact_alert |
| Speed Loss 趨勢+事件 | `vessel_speed_loss` | fact_performance_daily, fact_maintenance_event, fact_uwi |
| 個船/船隊表指標總覽 | `vessel_metrics` | fact_performance_daily |
| Speed-Power 散點 | `vessel_speed_power` | fact_performance_daily, dim_reference_curve |
| 異常時間軸 | `vessel_anomalies` | fact_anomaly |
| 個船預警清單 | `vessel_alerts` | fact_alert |
| 維修效益 | `vessel_maintenance_effect` | fact_maintenance_event |
| 船殼清潔最佳化 (t*/淨節省) | `vessel_recommendation` | fact_recommendation |
| 維修建議（行動清單/規劃班期） | `vessel_maintenance_recommendation` | fact_maintenance_recommendation |
| 最新水下檢查面板 | `vessel_uwi` | fact_uwi |

---

## 9. POC 里程碑與範圍界定

| 階段 | 產出 | 驗收 |
|---|---|---|
| M1 合成資料 | raw zone 5 年×船隊 JSONL | 欄位齊、**通過 §3.2 C1–C17 一致性檢核**、YM WELLNESS 故事線就緒 |
| M2 ETL 計算 | ISO 15016/19030 + 衍生指標 curated 表（**本機執行，產出上傳 S3**） | 能還原植入的 speed loss；指標合理 |
| M3 統計洞察 | anomaly/成因/維修時機/預警（規則+統計） | 異常被抓出、成因分類正確、維修建議合理、預警集正確去重 |
| M4 Athena 表 | Glue Catalog 包含 M1-M3 產出資料表格（17 張，見 §6） | Athena 查詢通過 |
| M5 非同步 API | API GW+Lambda+DynamoDB | query_id → 結果流程可用 — **已完成 (DONE)** |
| M6 Dashboard | Vue3+D3 no-build 前端（`web/`），3 視圖 + 船隊選擇器，消費全部 13 種 query_type | 前端可用、可據以操作 — **已完成 (DONE)**（船隊地圖、Reports/GenAI 暫緩） |

**In scope**：合成資料、ETL、統計洞察、Athena 表、非同步 API、Dashboard 設計。
**Out of scope**：真實資料接入、正式模型訓練。

---

## 10. 已定案決策與假設

**已定案決策**
| # | 議題 | 決策 |
|---|---|---|
| 1 | 船型範圍 | **僅貨櫃船**，橫跨常見船級 Feeder→ULCV（見 §3.1） |
| 2 | Speed Loss 慣例 | **正值 = 效能衰退**（越大越糟），全系統一致（見 §4.5 註） |
| 3 | CII | **AER 與完整 IMO 兩種都算**並各自評級（見 §4.4） |
| 4 | API 結果回傳 | **一律 inline JSON**，大結果集以 page_token 分頁（見 §7） |
| 5 | 異常/AI 方法 | **規則 + 統計，不使用 SageMaker**（見 §5）；生成式 AI (Bedrock) 敘事/報告本 POC **暫緩，以後再追加**（見 §5.7） |
| 6 | 資料來源 | **全部合成**（成本、油價、UWI 皆合成），且須符合 §3.2 邏輯一致性規則 |
| 7 | ETL 執行位置 | **本機 (local)** 執行純 Python ETL（含 ISO 15016/19030、統計異常），raw/curated JSONL 產出後上傳 S3；**不使用 Glue / Step Functions / EventBridge**。Athena / Glue Data Catalog（metastore）/ Lambda API 仍於 AWS |

**技術假設（合成資料據此產生）**
- Noon Report 具 STW（速度計）與載況；否則以 SOG + 海流修正替代。
- 每船具試航速度-功率基準曲線（POC 以縮放合成曲線代入）。
- 具軸功率(扭力計)，或由 `me_foc × LCV / SFOC` 反推功率。

**待你確認（非阻擋，可先開工）**
- CII 參照線係數 (a, c) 與逐年折減 Z%：POC 先採 IMO 貨櫃船公告值，正式化時再校準。
- 各船級具體規格：POC 採 §3.1 代表值，如陽明有實船參數可替換以提升擬真度。
