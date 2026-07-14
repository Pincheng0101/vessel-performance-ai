<!--
簡報格式：純 Markdown、工具無關。以 `---` 分頁；標準 H2/表格/清單；
ASCII fenced code 畫簡圖（任何 Markdown 工具皆可渲染）。
版面目標：16:9、1920x1080。每頁預算 = 1 個 H2 標題 +（≤7 條列
／或 1 張 ≤10 列表格／或 1 個 ASCII 簡圖 + ≤4 條輔助文字）。
常數採 seed 42、5 年區間（2021-07-01 ~ 2026-06-30）；驗收經
C1–C14 驗證器（PASS/FAIL）——本頁僅陳述定性結論、不列單次跑數。
Marp 預覽（可選）：marp doc/slide.md -o slide.html
-->

# 陽明海運 AI 船舶效能分析 POC
## M1–M6 全數完成：合成資料 → ETL → 統計洞察 → Athena → API → Dashboard

把「人工查閱 5 年航行紀錄 + 手算 ISO 公式」
轉為**自動化、可驗證、可視覺化**的智慧船舶效能平台

節能小組 (energy-efficiency team) · 買方簡報
簡報者：＿＿＿＿　|　日期：2026-07

---

## 情境與痛點 → 平台價值

**現況痛點**

- 節能小組須人工查閱各船近 **5 年**午報 (Noon Report) 與水下檢驗
  (Underwater Inspection) 紀錄
- ISO 15016／19030 等標準公式**手動查表、手算**，耗時且易錯
- 判讀仰賴資深人員經驗 → **技術斷層 (knowledge-succession)** 風險：
  「無人可接手」

**平台三大價值**

- **流程數位化**：歷史數據自動整合、國際標準公式自動導入
- **效能洞察**：速度損失 (speed loss) 趨勢、維修效益驗證、異常成因分類
- **整合儀表板 (Dashboard)**：船隊總覽 + 單船深入 + 早期預警（已建置）

---

## 里程碑總覽（M1–M6，全數完成）

| 階段 | 產出 | 狀態／驗收 |
|---|---|---|
| **M1 合成資料** | 原始區 6 表 × 5 年 × 船隊 JSONL | ✓ 完成｜C1–C13 全數 PASS |
| **M2 ETL 計算** | ISO 15016/19030 + 衍生指標 | ✓ 完成｜C13 閉環還原 PASS |
| **M3 統計洞察** | 異常/成因/維修時機/預警/規劃 | ✓ 完成｜C14 偵測+成因 PASS |
| **M4 Athena 表** | Glue Catalog **17 表**可查 | ✓ 完成｜分區投影，免爬蟲 |
| **M5 非同步 API** | API GW + Lambda + DynamoDB | ✓ 完成｜**13 種查詢類型** |
| **M6 Dashboard** | Vue3 + D3 前端（3 視圖） | ✓ 完成｜船隊/單船/預警 |

---

## M1 概觀 — 為何要合成資料

- **真實船舶數據不可用**（匿名化／取得時程限制）→ 以合成資料先行
- 產出一支 **9 艘貨櫃船隊**、**5 年**、**物理一致 (physics-consistent)**
  的原始區 (raw zone) 海事資料
- 由 `ym_datalake/synthetic_data/` 產生（僅用 numpy，不用 pandas）
- 這是整個 POC 的**可信資料地基**——下游 M2–M6 全部建立於此
- 設計原則：**先注入已知真值 (ground truth)，再依物理前向推導**，
  使分析「可驗證、非黑箱」

---

## 交付項與驗收標準

**交付項 (deliverables)**

- 原始欄位齊備的六大資料集（JSONL 格式）
- 資料通過 **C1–C13** 一致性檢查 (consistency checks)
- YM WELLNESS 維護故事線 (storyline) 就緒，供儀表板深入分析

**產物與流向**

```
本地產生 (numpy) ─▶ JSONL ─▶ S3 raw/ ─▶ Glue 編目 ─▶ Athena 查詢
```

- 真值另存 `./tmp/truth/`，**永不上傳、不建立編目**（供 M2／C13 使用）
- 決定性 (deterministic)：單一 `--seed 42` → 可完整重現

---

## 合成船隊（9 艘）

| IMO | Name | Class | TEU | MCR (kW) |
|---|---|---|---|---|
| 9700001 | YM HARMONY | Feeder | 1,100 | 9,000 |
| 9700002 | YM ENLIGHTEN | Feedermax | 2,500 | 21,000 |
| 9700003 | YM PLENTY | Panamax | 4,500 | 36,000 |
| 9700004 | YM PROSPER | Panamax | 4,600 | 36,500 |
| 9700005 | YM EXCELLENCE | Post-Panamax | 8,500 | 55,000 |
| **9700006** | **YM WELLNESS** | **Neo-Panamax** | **11,000** | **62,000** |
| 9700007 | YM WARRANTY | Neo-Panamax | 11,000 | 62,000 |
| 9700008 | YM TRIUMPH | Post-Panamax | 8,600 | 55,500 |
| 9700009 | YM TITAN | ULCV | 20,000 | 75,000 |

> **YM WELLNESS = 9700006**（Neo-Panamax，儀表板深入分析對象）。

---

## 營運子船隊 (sub-fleets) — 3 隊 × 3 船

| 子船隊 | 代碼 | 航線定位 | 成員 (IMO) |
|---|---|---|---|
| 亞洲區間 (Intra-Asia) | `FL-IA` | 近洋接駁 | 9700001 / 9700002 / 9700003 |
| 跨太平洋 (Trans-Pacific) | `FL-TP` | 遠洋幹線 | 9700004 / 9700005 / 9700008 |
| 亞歐 (Asia-Europe) | `FL-AE` | 遠洋幹線 | 9700006 / 9700007 / 9700009 |

- `fleet_id`／`fleet_name` 已寫入 `vessel_master`／`dim_vessel`（欄 4–5）
- **`ALL`** = 全船隊彙總 (rollup)；加 3 子船隊 → `agg_fleet_daily`
  共 **4 個分群值**
- 船隊總覽與早期預警查詢皆以 `fleet_id` 篩選（`ALL` 或單一子船隊）

---

## 六大原始資料集

| 資料集 | 粒度 (grain) | 分區 | 用途 |
|---|---|---|---|
| `noon_report` | 每日×每船 | imo + year | 效能主資料 |
| `vessel_master` | 每船一列（維度） | 平表 | 船舶規格＋`fleet_id` |
| `reference_curve` | 試航速度-功率點 | 平表 | 潔淨基準 |
| `uwi` | 水下檢驗事件 | 平表 | 污損佐證 |
| `maintenance_event` | 維護／事件日誌 | 平表 | 維修節點 |
| `fuel_price` | 每日燃油價格 | 平表 | 成本換算 |

> `noon_report` 以 `imo_number` + `year` 分割投影 (partition projection)。

---

## noon_report — 核心欄位（分組）

| 分組 | 代表欄位 |
|---|---|
| 識別／航程 | `report_id`、`report_datetime_utc`、`voyage_phase`、`port_from/to` |
| 推進性能 | `speed_tw_kn`、`me_rpm`、`me_shaft_power_kw`、`propeller_pitch_m` |
| 燃油／排放 | `me_foc_mt`、`ae/boiler/total_foc_mt`、`fuel_type`、`fuel_lcv_mj_kg` |
| 裝載／吃水 | `displacement_mt`、`mean_draft_m`、`trim_m`、`condition_flag` |
| 氣海況 | `beaufort`、`wind_*`、`wave_*`、`sea_water_temp_c`、`current_*` |

> 時間以字串儲存（JSON SerDe 解析穩健）；浮點四捨五入，NaN/Inf → `null`。

---

## 物理前向模型 (forward model)

概念推導鏈（每船×每日，**先真值、後物理**）：

- **① 真值優先**：污損 (fouling) → 真實速度損失 `s`（含有界雜訊）
- **② 裝載 → 質量平衡**：Δ 排水量 (displacement) → 吃水 (draft)、俯仰差 (trim)
- **③ 季節氣海況**：蒲福風級 (Beaufort) 驅動風/浪；密度隨溫度
- **④ 潔淨等效速度 (clean-equivalent speed)** `V_ref = STW / (1 − s)`，
  再算修正功率：

```
P_corrected = a · V_ref^n · (Δ / Δ_ref)^(2/3)
```

- **⑤ 附加阻力**（風阻 R_AA + 浪阻 R_AW）→ 軸功率 (shaft power) →
  燃油 (C2) → CO₂ (C8)
- **⑥ 最後加感測器雜訊 (sensor noise) + 標記異常**；真值保持未加噪

---

## 閉環可還原性 (closed-loop) — 核心賣點

`curves.py` 是**唯一共用的速度-功率真理來源**，M2 重用它反演：

```
  真實速度損失 s  ──前向模型──▶  原始午報 noon_report
   (ground truth)                      |
        ^                              | M2 ISO 15016/19030 反演
        |                              v
        +----  C13 比對：還原 ≈ 真值  <--  speed_loss_pct
```

- 注入**真實**速度損失 → M2 的 ETL **必須把它還原**回來（**C13**）
- 真值保留在 `./tmp/truth/`、**不上傳**——證明分析非黑箱、可稽核
- 這讓買方能驗證：平台算出的效能衰退，等於實際植入的衰退

---

## C1–C13 一致性檢查（精選）

| 規則 | 檢查 | 容差 |
|---|---|---|
| C1 | 軸功率 = 潔淨曲線功率 + 環境功率 | ≤5% |
| C2 | 隱含 SFOC vs 真值（能量平衡） | ≤5% |
| C5 | 排水量 = 靜水力 (hydrostatic)(吃水) | ≤2% |
| C9 | 污損每段斜率 ≥ 0、重置時階梯下降 | slope ≥ −3e-5 |
| C10 | Spearman(污損評等, 真實 s) | ≥0.7 |
| C11 | corr(蒲福, 浪/風)；corr(溫, 密度) | 強相關 |
| C12 | 量測 = 真值 + 有界雜訊；粗離群全標記 | ≤3% |
| C13 | 閉環 ISO 速度損失還原 | **PASS（M2 閉環）** |

> 自動驗證器 (`validate.py`) 印 PASS/FAIL；失敗以**非零 exit code** 結束。

---

## 真實性特徵 (realism)

- **季節氣海況**：蒲福風級驅動風浪、密度隨水溫變化（非隨機噪音）
- **污損軌跡**：每段單調上升、維護事件時階梯重置 (reset)
- **有界感測器雜訊**：量測值落在真值 + 界限內，可還原
- **4 類標記點異常 (labeled anomalies)**，皆帶成因與嚴重度：
  - 引擎劣化 `engine_degradation`、螺旋槳 `propeller`
  - 天氣 `weather`、感測器 `sensor`
- **決定性種子 (seed 42)**：子串流按 `(imo, purpose)` 鍵控 → 完整重現

---

## YM WELLNESS 故事線（9700006）

```
speed_loss
   高 |                          *  污損峰值
      |                        /    (越過維護門檻)
門檻  |- - - - - - - - - - - -/- - - MT 門檻 8% - - - -
      |         進塢重置     /             | 清潔→階梯還原
    0 |__________\________/_______________v____________
      2021-07   dry_dock   長高污損段(單調↑)   hull_cleaning
```

- 逐步上升 → **越過 MT 維護門檻 8%**（`MT_TRIGGER_PCT`）→ 清潔 → 還原（≈0）
- 上升的 UWI `hull_fouling_rating` 同步佐證（C10 強相關）
- 賣點：**維修效益分析 (maintenance-effect)**——量化清潔前後的效能改善

---

## M2 概觀 — 原始區 → 策展區 (curated zone)

- 目的：把 M1 原始區 (raw zone) 資料轉為**策展區 (curated zone)**——套用
  ISO 15016（試航修正）、ISO 19030（**船體效能 (hull performance)**）
  與衍生指標
- 全程**本機 numpy** 純 Python（`ym_datalake/etl/`），與 M1 同技術棧
- **關鍵**：重用 M1 `curves.py`／`physics.py` 反演生成器前向路徑
  → 這正是**速度損失可還原**的原因（閉環 C13）
- **只讀原始資料**：永不讀 `truth/` 真值（生產環境不存在），
  真值僅供 C13 驗證器比對
- 產物：分區 JSONL → S3 `curated/`，供 Glue／Athena 查詢
- M2 產出扁平維度＋船隊彙總＋事實表；統計洞察 (S8–S10) 由 M3 補完（已完成）

---

## ETL Pipeline（S1–S11）

```
raw（noon_report, vessel_master, ref_curve, fuel_price）
  │
  ├─ S1/S2  擷取＋擴充（依 imo 分組，join 維度／曲線／油價）
  ├─ S3     ISO 15016 修正 → power_corrected_kw
  ├─ S4     ISO 19030 過濾 → valid_flag
  ├─ S5     速度損失 → speed_loss_pct
  ├─ S6     衍生指標：slip / SFOC / Admiralty / EEOI / CO2 / CII
  ├─ S7     週期指標：ISP / DDP / ME / MT
  ├─ S8     異常偵測 (anomaly)：殘差 + EWMA/IForest → anomaly_flag
  ├─ S9     成因分類 (cause)：engine/prop/weather/sensor
  ├─ S10    維修時機 (recommendation)：J(T) 最小化 → T*、規劃器、預警
  ▼
  S11 發布 (publish) → 分區 JSONL → S3 curated/
```

- 已實作全鏈：S1/S2 → S3 → S4 → S5 → S6 → S7 → **S8 → S9 → S10** → S11
- **M3 補完**：S8 異常偵測、S9 成因分類、S10 維修建議＋規劃器＋預警（見後續頁）

---

## ISO 15016 試航修正 → 修正功率 (corrected power)

從實測軸功率剝除**附加阻力 (added resistance)**，還原潔淨試航等效功率：

```
  me_shaft_power_kw
  − ΔP_env  （風阻 R_AA + 浪阻 R_AW 換算功率）
  ─────────────────────────────────────────
  = power_corrected_kw   （潔淨試航等效功率）
```

- **風阻 (wind resistance)**：Blendermann 法（`C_AA = 0.9`）→ `resistance_wind_kn`
- **浪阻 (wave resistance)**：STAWAVE-1 迎浪 (head-sea) → `resistance_wave_kn`
- ETL 用 M1 `curves.py` 反演前向路徑（只讀 raw、不碰 `truth/`）
- 需 `heading_deg`（於午報補上）；風／浪修正依海況佔軸功率一定比例

---

## ISO 19030 速度損失 + valid_flag

```
  v_expected  = curve.clean_speed_kn(power_corrected, Δ)
  speed_loss% = (v_expected − STW) / v_expected × 100   （正 = 衰退）
```

- `valid_flag` 過濾（保留穩態、可比對的資料點）：
  - `voyage_phase = at_sea` 且航行中 (steaming)
  - `STW ≥ 0.5·V_design`、蒲福風級 ≤ 6
  - `Δ ∈ [0.5, 1.2]·Δ_ref`、推進欄位有限正值
- 深水／舵角過濾 N/A（午報無水深／舵角）；統計離群 (z/IForest) 於 M3
- 在港、惡劣海況、異常裝載之資料點剔除，僅穩態點納入分析

---

## 衍生指標 + 碳強度指標 (Carbon Intensity Indicator, CII) 評級

| 指標 | 公式／定義 |
|---|---|
| `slip_apparent`／`real` | `(V_th−V)/V_th`；apparent 用 SOG、real 用 STW |
| `sfoc_g_kwh` | 主機比油耗 `me_foc·1e6/(me_power·hrs)` |
| `admiralty_coef` | `Δ^(2/3)·STW³ / me_power` |
| `eeoi` | `co2·1e6/(cargo·distance)`（gCO₂/t·nm） |
| `co2_mt` | `total_foc · C_F[fuel]` |
| `excess_foc_mt`／`excess_cost_usd` | 速度損失造成的超額油耗×燃油價 |
| `cii_aer`／`cii_imo` + 評級 | 見下 |

- **碳排因子 C_F**：HFO 3.114／VLSFO 3.151／MGO 3.206 (t-CO₂/t-fuel)
- **CII**：年度指標逐日廣播；貨櫃 Capacity=DWT，attained 相同、僅參照線不同
- 參數：`a=1984`、`c=0.489`（MEPC.353）；`dd (0.83,0.94,1.07,1.19)`（MEPC.354）
- 削減率 Z%：2023→5、2024→7、2025→9、2026→11 → A–E 評級

---

## 週期效能指標（fact_performance_indicator）

| 指標 | 定義 | 視窗 |
|---|---|---|
| ISP 在役效能 | 每循環平均速度損失 vs 首循環 | 每循環 |
| DDP 進塢效能 | 進塢後 vs 前平均速度損失 | 45 天 |
| ME 維護效益 | 每次維護事件前 − 後（回復量） | 30 天 |
| MT 維護時機 | 尾均速度損失首次越過門檻 8% | 14 天尾均 |

> 長格式 (long format)，分區 `imo_number`；門檻 8% = `MT_TRIGGER_PCT`。

---

## ★ C13 閉環驗收 — 核心賣點

```
  注入真值 s  ──前向模型──▶  原始午報 noon_report
      ^                              |
      |                              | ISO 15016/19030 反演
      |                              v
      +----  C13：還原 ≈ 真值  <----  speed_loss_pct
```

- 注入**真實**速度損失 → ISO 15016/19030 反演**必須把它還原**回來
- 還原值**收斂至感測器雜訊底線**——**C13 全數 PASS**
- 修正功率落在容差內；`etl validate` 印 `ALL CHECKS PASSED`
- 賣點：買方可驗證平台算出的衰退 = 實際植入的衰退（非黑箱、可稽核）

---

## M3 概觀 — 統計洞察層 (statistical-insight layer)

- 範圍：ETL 的 S8–S10——在 M2 策展區之上加**統計洞察 (insight)**：
  異常偵測、成因分類、維修時機、早期預警 (early-warning)、維修規劃 (planner)
- 全程**本機 numpy + scikit-learn**（`ym_datalake/etl/`），與 M1/M2 同技術棧
- **只讀** raw + M2 輸出；真值 (ground truth) **永不讀取**，僅供 C14 驗收比對
- 模組：`trends`（Theil-Sen 分段迴歸 → 每循環**污損率 (fouling rate)** %/日）、
  `anomaly`、`recommendation`（維修時機＋規劃器）、`alerts`（早期預警事件）
- 產物：`fact_anomaly`／`fact_recommendation`／`fact_maintenance_recommendation`／
  `fact_alert`，並回填 `anomaly_*`／`me_recovery_pct`／`payback_days`／`n_alerts`

---

## 異常偵測 (anomaly detection, S8)

殘差基礎 (residual = 觀測 − 趨勢基線)；4 目標偵測器 + 通用兜底，
融合為每 (imo,日) 一旗標：

| 偵測器 | 訊號 |
|---|---|
| 引擎 (engine) | 定標 EWMA（λ=0.3,L=3.0）於載重感知 SFOC，下限 0.045 |
| 螺旋槳 (propeller) | 定標 EWMA 於真實滑失 (real slip) 殘差，下限 0.025 |
| 感測器 (sensor) | 單日突波：SFOC≥0.06／耦合 MAD-z≥5.0／風偏 z≥3.25 |
| 天氣 (weather) | 直接蒲福風級 (Beaufort) ≥7 氣象訊號 |
| 兜底 (catch-all) | 滾動 z (W=30,≥4.5)、IsolationForest (n=200,≥3.5)、IQR 閘 |

- 融合輸出每 (imo,日) 一 `anomaly_flag` ＋驅動指標（sfoc／slip／excess_foc／speed）
- 點異常寫入 `fact_anomaly`（趨勢型污損由早期預警層處理，見後）

---

## 成因分類 (cause classification, S9)

4 類成因（依生成器 first-match 優先序判定）：

| 成因 | 判斷特徵 |
|---|---|
| `engine_degradation` | SFOC 持續抬升、速度損失未同步 |
| `propeller` | 真實滑失 (real slip) 主導 |
| `weather` | 蒲福 ≥7，或速度損失突波遇高浪 |
| `sensor` | 孤立單通道粗突波（無持續段） |

- 嚴重度 (severity) 分 low／medium／high
- 註：生物污損 (biofouling) 屬**趨勢**、非點異常 → 由早期預警層處理（見後）
- 對映生成器注入標記 → C14 可還原比對（見後頁）

---

## 維修時機最佳化 (optimal cleaning, S10)

循環成本率最小化 → 閉式最佳清潔週期：

```
  J(T) = K/T + α + βT/2   （K=清潔成本；c(t)=α+βt 超額成本率）
  dJ/dT = 0  ⟹  T* = √(2K/β)
  net_saving = ∫_{T*}^{trigger} ( c(t) − J* ) dt
```

- `trigger_eta`：外推速度損失至 MT 8% 尾均門檻的日期
- `T*`＝最佳清潔週期；`net_saving`＝**每船量化節省**（如期清潔 vs 拖延）
- ME 回填：`me_recovery_pct`／`payback_days`（hull_cleaning 維護事件）
- 寫入 `fact_recommendation`（每船一列），並延伸為維修規劃器（下頁）

---

## 維修規劃器 (maintenance planner) — fact_maintenance_recommendation

每動作 (per-action) Theil-Sen 外推劣化指標 → 交越門檻即設 `due_date`：

| 動作 (action_type) | 劣化門檻 | 服務型態 (plan_service_type) |
|---|---|---|
| `propeller_polishing` | 粗糙度 → 300µm | `in_water` |
| `propeller_repair` | 粗糙度 → 430µm | `dry_dock` |
| `coating_renewal` | 塗層破損 → 45% | `dry_dock` |
| `engine_inspection` | SFOC +5% | `in_water` |
| `hull_cleaning` | 污損評等／尾均速損 | `in_water` |

- **整併服務窗 (service window)**：各動作 due_date 批次併入服務窗
  （`_PLAN_BATCH_DAYS = 60`）→ 標記 `plan_date`／`plan_service_type`
- **進塢 (dry_dock) 為約束錨點**；在水 (in_water) 動作就近併入鄰近進塢窗
- 每列（15 欄）自帶分析條：`degradation_rate`／`threshold`／`trigger_eta`／
  `t_star`／`net_saving`

---

## 早期預警事件 (early-warning episodes) — fact_alert

`alerts.py` 把點異常 + 污損趨勢**收斂為去重的敘事事件 (episodes)**：

- **事件化**：同 `cause` 連續日之 `fact_anomaly` 併為一事件，
  間隔容差 `_GAP_DAYS = 7`
- 捕捉 `opened_date`／`last_seen_date`、峰值嚴重度／|z|、峰值驅動指標、
  視窗超額油耗成本
- **5 種成因**：`engine_degradation`／`propeller`／`weather`／`sensor`／
  **`hull_biofouling`**——唯一「趨勢型」成因（非點異常，源自 `fact_recommendation`）
- 每列（15 欄）：雙語 (bilingual) `message_zh`／`message_en`、
  `recommended_action`、`status='open'`、`source`
- 供 M6 Dashboard 預警視圖與 `fleet_alerts`／`vessel_alerts` 查詢

---

## ★ C14 統計洞察驗收 (closed-loop) — 核心賣點

```
  注入標記異常 (labeled)  ──前向模型──▶  原始午報 noon_report
        ^                                    |
        |                                    | M3 偵測 + 成因 + 嚴重度
        +----  C14：還原標記 ≈ 注入  <--------  fact_anomaly
```

- **異常偵測 C14 PASS**：召回率達標、幾無漏報
- **成因分類 C14 PASS**：engine／prop／weather／sensor 準確對映
- 嚴重度 within-1 收斂；維修建議皆合理、維修事件呈正回復
- **容差全數 PASS**：`etl compute --validate` 印 C13＋C14 全通過

---

## 策展區 11 表（M4 共 17 表 = 6 raw + 11 curated）

| 表 | 分群／分區 | 層級 |
|---|---|---|
| `dim_vessel`／`dim_reference_curve` | 平表 | M2 維度 |
| `agg_fleet_daily` | `fleet_id`（ALL＋3 隊） | M2 船隊彙總 |
| `fact_performance_daily` | imo/year/month | M2 效能（30 欄） |
| `fact_performance_indicator` | imo | M2 週期指標 |
| `fact_uwi`／`fact_maintenance_event` | imo | M2 事實 |
| `fact_anomaly` | imo/year/month | M3 點異常 |
| `fact_recommendation` | 平表 | M3 清潔時機 |
| `fact_maintenance_recommendation` | 平表 | M3 規劃器（15 欄） |
| `fact_alert` | imo | M3 早期預警（15 欄） |

> 加 6 raw 表 → **共 17 表**。M3 新增 `fact_maintenance_recommendation`／`fact_alert`。

---

## M4 Athena 表 — Glue Catalog

- **17 張 Glue 表** = 11 curated（M2 7 表＋M3 4 表）＋ 6 raw，全部可查
- 皆為 **EXTERNAL 表 + JSON SerDe + 分區投影 (partition projection)**
  → **免 crawler／`MSCK`**（新分區自動可見）
- `fact_anomaly` 依 `imo/year/month` 分區；`fact_alert` 依 `imo_number`；
  維度／規劃器／建議為平表——即建即查
- 部署：`npx aws-cdk deploy`（`deployment/athena_tool_stack.py`）
- 驗收：`python -m ym_datalake.etl compute --validate`（C13＋C14 全 PASS）；
  Athena 直接 `SELECT` 全部策展表（分區投影，無爬蟲）

---

## M5 非同步查詢 API (async query API) — 13 種查詢

```
Client ─▶ API Gateway ─▶ Lambda(submit) ─▶ DynamoDB(query_id)
                               │
                         Athena 非同步執行
                               │
Client ◀── poll query_id ◀── Lambda(status/result) ◀── S3 result
```

- **13 種查詢類型 (query types)**，涵蓋船隊與單船分析
- 船隊：`fleet_overview`／`fleet_vessels`／`fleet_list`／`fleet_alerts`
- 單船：`vessel_metrics`／`vessel_speed_loss`／`vessel_speed_power`／
  `vessel_anomalies`／`vessel_alerts`／`vessel_maintenance_effect`／
  `vessel_recommendation`／`vessel_maintenance_recommendation`／`vessel_uwi`
- 參數驗證：`fleet_id`（`ALL` 或 `FL-XX`）、`imo_number`（7 碼）、日期區間
- 流程：提交 → `query_id` → 輪詢 (poll) → 取結果（`queries.py` 為 SQL 真理來源）

---

## M6 Dashboard — Vue3 + D3（免建置 no-build）

**3 大視圖 (views)**

- **船隊總覽 (Fleet Overview)**：`fleet_id` 選擇器（`ALL` ＋ 3 子船隊）、
  速度損失趨勢、CII 評級分布、超額成本
- **單船深入 (Vessel Deep-dive)**：如 YM WELLNESS——速度損失、速度-功率
  散點、指標時序、UWI、維修效益、清潔建議、**維修規劃器條**
  （`plan_date`／`plan_service_type` 服務窗）
- **預警 (Alerts)**：早期預警事件列表（雙語訊息、成因、嚴重度、狀態）

- 消費全部 **13 種查詢類型**（`web/`，前端純瀏覽器、無打包步驟）
- 延後 (deferred)：船隊地圖、報告 (Reports) GenAI 敘事

---

## 從資料到 Dashboard · M1–M6 全數完成

```
generate ─▶ raw ─▶ [ETL M2/M3] ─▶ curated(11) ─▶ Athena(17) ─▶ API(13) ─▶ Dashboard
 (numpy)    S3    ISO+統計洞察     分區投影         Glue        非同步      Vue3+D3
./tmp/truth/（真值，永不上傳）─────────────────────▶ 僅供 C13/C14 比對
```

- **M1–M6 全數完成**：合成資料 → ETL → 統計洞察 → Athena → API → Dashboard
- 閉環 **C13＋C14 PASS**：速度損失還原至雜訊底線＋異常/成因可驗證
- 地基已成：資料**可驗證、可重現、可查詢、可洞察、可視覺化**
- 買方價值：流程數位化 · 每船量化節省 · 早期預警 · 維修規劃 · 整合儀表板
