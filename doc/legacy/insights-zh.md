# 統計洞察 (Statistical Insights)（POC M3）

M3 的 ETL 在 M2 的 **策展區 (curated zone)** 之上加了一層**統計層 (statistical
layer)**（規格 §5 / §9）：分段的汙損率 (fouling rate) 趨勢、帶規則式成因
(cause) 與嚴重度 (severity) 的點異常偵測 (point-anomaly detection)、每艘船的
維護效果 (maintenance effect) 加最佳清洗 (optimal cleaning) 建議、彙整為服務
窗口 (service window) 規劃的逐項維護預測，以及一層早期預警 (early-warning) 警示
(alert)。它填補 M2 留空的欄位，並輸出新的 `fact_anomaly` / `fact_recommendation`
/ `fact_maintenance_recommendation` / `fact_alert` 資料表。這是 M3 交付項
(deliverable)：注入的異常被**抓到**、其**成因正確**、建議**合理**——由閉迴路
(closed-loop) 的 **C14** 檢查評分。

- **在本機執行 (runs locally)**，僅用 numpy，外加一個 scikit-learn 的
  `IsolationForest`——不用 SageMaker（規格 §5 決策 #5）。
- 讀取 **M2 輸出**（`fact_performance_daily` 與指標／事件列）加上少數**原始
  (raw) 午報 (noon report) 特徵 (feature)**（蒲福風級 (Beaufort)、浪高、風速、軸
  功率 (shaft power)、主機油耗 ME FOC）；它**從不**讀 `truth/`——基準真相 (ground
  truth) 僅供 C14 使用。
- **只用規則與統計**。GenAI 敘事 (narrative) 層（規格 §5.7）延後；此處每項洞察都是
  確定性 (deterministic) 偵測器、穩健擬合 (robust fit) 或封閉解 (closed-form)
  最佳值。

---

## 1. 管線 (Pipeline)（S8–S10，`_apply_m3`）

`compute.py::_apply_m3` 逐船執行，順序如下（基線先算，因為偵測是拿殘差 (residual)
去**對照**它）：

| 階段 | 模組 | 產出 |
|---|---|---|
| S8 趨勢與汙損 | `trends.py` | 每週期 `Segment`（汙損率、信賴區間 CI）加殘差 `baseline_series` |
| S9 異常偵測＋成因 | `anomaly.py` | 每日列的 `anomaly_flag`/`cause`/`severity` 加 `fact_anomaly` |
| S10 維護效果＋建議 | `recommendation.py` | 事件列的 `me_recovery_pct`/`payback_days` 加 `fact_recommendation` |
| 維護規劃器 (planner) | `recommendation.py`（`recommend_actions`、`plan_maintenance`） | 逐項行動到期日彙整為服務窗口 → `fact_maintenance_recommendation` |
| 早期預警警示 | `alerts.py` | 異常＋汙損趨勢的事件集 (episode) → `fact_alert` |

兩項貫穿全層的事實：

- **偵測是在每一列有指標的海上 (at-sea) 列的「殘差對趨勢基線 (trend baseline)」上
  執行**，而非只在 `valid_flag` 點上。產生器把天氣異常推過了 ISO 19030 的蒲福
  ≤6 有效門檻 (valid gate)，若只在有效點偵測，這些異常在結構上就會隱形。趨勢／基
  線擬合仍只用 `valid_flag` 點；偵測再拿較廣的集合去對照它們。
- **`_apply_m3` 填補 M2 留空的欄位**：`fact_performance_daily` 的
  `anomaly_flag`/`anomaly_cause`/`anomaly_severity`、`fact_maintenance_event` 的
  `me_recovery_pct`/`payback_days`、`agg_fleet_daily` 的 `n_alerts`。每艘船的
  亂數產生器 (RNG) 以 `SeedSequence([int(imo)])` 播種 (seed)，因此結果與順序無關
  且具確定性。

**生物汙損 (biofouling) 是 §5.1 的趨勢斜率，絕非點異常成因。** 點異常的成因集合
是 `{engine_degradation, propeller, weather, sensor}`；漸進的船殼汙損只以分段斜率
呈現，而不是一個旗標 (flag)。

---

## 2. 效能趨勢與汙損率（`trends.py`，§5.1）

以穩健的 **Theil-Sen** 對 `speed_loss_pct` 對 `days_since_cleaning` 做分段
(piecewise) 迴歸，在每個船殼汙損重置點（`hull_cleaning ∪ dry_dock`）切開：

```
slope     = 相異橫座標上成對斜率的中位數        (Theil-Sen)
intercept = median(y − slope·t)
CI        = 100 次播種自助重抽 (bootstrap) 的 2.5/97.5 百分位（僅開放週期）
```

每個週期成為一個 `Segment(start, end, slope, intercept, ci_lo, ci_hi, n,
open_cycle)`，其中 **`slope` 即汙損率（%/天）**。只有開放（最後）週期帶自助信賴區
間 (bootstrap CI)——其餘的 CI 用不到，而重抽是耗時處。

`baseline_series` 把各分段轉成異常偵測器（§3）用來對照殘差的每日期望值：

| 通道 | 基線 |
|---|---|
| `speed_loss` | 分段直線 `slope·days_since_cleaning + intercept` |
| `sfoc`、`slip` | 每週期的穩健中位數（`_segment_median`） |
| `excess_foc` | `me_foc·[1 − (1 − s_exp)^n]`，`s_exp = max(0, base_sl/100)`，`n` = 曲線指數 |

`extrapolate(segment, target_pct, last_cleaning)` 把開放週期外推 (extrapolate) 至
目標速度損失 → 觸發預估到達 (trigger ETA) 日期（斜率 ≤ 0 則回傳 `None`）。它同時
驅動維護觸發與建議的時間視野 (horizon)（§4）。

**與規格偏離：** §5.1 要求「Huber／Theil-Sen」；實作**僅用 Theil-Sen**。

---

## 3. 異常偵測與成因分類（`anomaly.py`，§5.2 / §5.3）

四個**針對性、高精確 (high-precision)** 偵測器——每個成因一個——承載大部分訊號，
因為持續性位移 (shift) 會讓任何自適應（滾動）統計量在平台期 (plateau) 中途重新歸
中 (re-centre)。通用的兜底偵測器 (catch-all) 以收緊的門檻在其後執行。

### 針對性偵測器

| 成因 | 偵測器 |
|---|---|
| engine（主機） | 固定目標 **EWMA** 控制圖 (control chart)（λ=0.3、L=3）於負載感知 (load-aware) 的分數式 SFOC 殘差，下限 **0.045**——一個劣化階梯 (step) 會在整段期間持續失控 (out-of-control) |
| propeller（螺槳） | 同一固定目標 EWMA 於實際滑失率 (real slip) 殘差，下限 **0.025**（滑失平台期） |
| sensor（感測器） | 單日突波 (glitch)：`|frac SFOC| ≥ 0.06`，**或**耦合通道（速度／滑失）的 MAD-z ≥ 5，**或**風速讀值偏離其蒲福曲線（z ≥ 3.25、蒲福 < 7） |
| weather（天氣） | 直接的**蒲福 ≥ 7** 氣象訊號（產生器的 +3 異常加成），其附加阻力原本會被 ISO 15016 修正移除 |

負載感知的分數式 SFOC 殘差把產生器的 U 形 `A·(1 + 0.18·(load − 0.8)²)` 除掉
（A = 穩健中位數），把劣化階梯孤立成一個平坦基線無法建模的乾淨乘性殘差
(multiplicative residual)。

### 兜底偵測器（收緊門檻）

| 偵測器 | 門檻 |
|---|---|
| 滾動 z (rolling-z) | 修正 z ≥ **4.5**，跨 `{speed_loss, slip, sfoc}`，窗長 W = **30** |
| 孤立森林 (IsolationForest) | **200** 棵樹（`contamination='auto'`，需 ≥ 20 點），僅當全域殘差 z ≥ **3.5** 佐證時才旗標 |
| IQR 粗差 | 落在 `Q1 − 3·IQR … Q3 + 3·IQR` 之外（於 `{speed_loss, slip, sfoc}`） |

融合 (fusion) 後每個 (imo, date) 得**一個旗標**：
`flag = engine | propeller | glitch | rolling-z | (IForest & z≥3.5) | IQR | (Beaufort≥7)`。

### 成因規則（首個符合，`_classify`）

對映產生器的 `stamp` 優先序：

| 順序 | 成因 | 條件 |
|---|---|---|
| 1 | sensor | 孤立粗差突波（`gross`、或 z ≥ 6、或 `|frac SFOC| ≥ 0.06`、或風速突波）**且**連段 run ≤ 1 **且**蒲福 < 7 |
| 2 | weather | 蒲福 ≥ 7，**或** `z[speed_loss] ≥ 3` 且處於前十分位 (top-decile) 浪高 |
| 3 | engine_degradation | `engine` 偵測器觸發**且** `z[speed_loss] < 2`（有 SFOC 階梯卻無速度損失） |
| 4 | propeller | `z[slip] ≥ 3` |
| — | 兜底 | 主導殘差通道：slip → propeller；sfoc/excess_foc → engine；其餘 → weather |

### 嚴重度（`_severity`，對映產生器的注入分帶）

| 成因 | 嚴重度 |
|---|---|
| weather | `medium` |
| sensor | `high` |
| engine_degradation | `frac SFOC` 分帶：≥ 0.13 → high、≥ 0.10 → medium、其餘 low |
| propeller | 滑失殘差分帶：≥ 0.10 → high、≥ 0.07 → medium、其餘 low |

### 關鍵常數

| 常數 | 值 | 意義 |
|---|---|---|
| `_EWMA_LAMBDA` / `_EWMA_L` | 0.3 / 3.0 | EWMA 平滑 / 控制界限 |
| `_ENGINE_FLOOR` | 0.045 | 最小持續 SFOC 階梯（以下視為負載/噪音） |
| `_PROP_FLOOR` | 0.025 | 最小持續滑失抬升（以下視為噪音） |
| `_SFOC_GLITCH` | 0.06 | 單日 FOC/功率感測器突波門檻 |
| `_GLITCH_Z` / `_SENSOR_Z` | 5.0 / 6.0 | 耦合通道 MAD-z 突波 / 單通道粗差突波 |
| `_WIND_GLITCH_Z` | 3.25 | 風速讀值偏離其蒲福期望值 |
| `_ROLL_Z` / `_W` | 4.5 / 30 | 滾動修正 z 警示 / 窗長（天） |
| `_IFOREST_Z` | 3.5 | 佐證孤立森林尾端的殘差 z |
| `_SFOC_LOAD_COEF` | 0.18 | 產生器負載相依 SFOC U 形係數 |

---

## 4. 維護效果與清洗建議（`recommendation.py`，§5.4 / §5.5）

### 維護效果（`enrich_maintenance`）

重用 ISO 19030 的 **ME** 期間指標 (period indicator) 列（以 `(event_date,
event_type)` 為鍵）：

```
me_recovery_pct = me.value / me.reference_value × 100      # (前 − 後)/前 × 100
payback_days    = 事件全額成本 / 每日超額成本節省
```

`payback_days` 比較事件前後**各 ±30 天**窗內 `excess_cost_usd` 的均值（`前 −
後`）；任一窗為空或節省 ≤ 0 則為 `None`。事件全額成本 = `cost_usd +
downtime_hours·$1000/h`。

### 最佳清洗建議（`recommend`）

擬合**開放週期**每日的超額成本率，並以封閉解最小化週期成本率：

```
c(t) = α + β·t             # 對 excess_cost_usd 對 days_since_cleaning 的 Theil-Sen 擬合
J(T) = K/T + α + β·T/2     # 一個長度 T 週期的平均成本率
T*   = √(2K/β)             # 使成本率最小的週期長度
recommended_clean_date = last_cleaning + round(T*)
trigger_eta            = 外推至 MT_TRIGGER_PCT = 8 %
net_saving_usd         = ∫_{T*}^{trigger} (c(t) − J*) dt   # 於 T* 清洗相對於觸發點所省成本
```

`K` = 該船船殼清洗全額成本（現金 + 停機 downtime·$1000/h）的中位數；當該船無清洗
歷史時，退回 (fall back) 用**全船隊中位數**成本。

**退化守衛 (degeneracy guard)** → `status = insufficient_history`（一個仍會重建
`last_cleaning_date` 與 `fouling_rate_pct_per_day` 的佔位符 (placeholder)）：

- 開放週期已定價 (priced) 點少於 **30**，或
- 成本斜率非正 `β ≤ 0`，或
- 斜率信賴區間跨越零（`ci_lo ≤ 0 ≤ ci_hi`），或
- 無可用 `K`（全船隊皆無清洗）。

`net_saving_usd` 只在存在觸發 ETA **且**其落在 `T*` 之後（`t_trigger > T*`）時才
計算；否則為 `None`。

**注意：** 此處的維護觸發是 **8 %**（`periods.MT_TRIGGER_PCT`），而 §5.5 敘事中為
10 %。

### 逐項維護預測（`recommend_actions`）

把單一的船殼清洗建議擴展為**每個待辦維護行動一列**，最多 5 種行動類型
(action type)：`hull_cleaning`、`propeller_polishing`、`propeller_repair`、
`coating_renewal`、`engine_inspection`。除船殼清洗外，每個行動都對其獨立的
劣化訊號 (degradation signal) 做 **Theil-Sen** 擬合，並以自己的重置時鐘（螺旋槳
用 `propeller_polishing ∪ dry_dock`；塗層用 `coating_renewal ∪ dry_dock`；主機
用 `engine_overhaul ∪ dry_dock`）外推何時越過該行動的門檻——得到一個真正的
預測性 `due_date`：

| 行動 | 劣化訊號 → 門檻 | 優先度 |
|---|---|---|
| `hull_cleaning` | 汙損成本模型的觸發預估到達 (trigger ETA)（優先）、或 UWI 船殼汙損等級 ≥ 60 | 成本模型 ETA 在 60 天內（或已過）⇒ high，否則 medium |
| `propeller_polishing` | 粗糙度 (µm) → 300 µm | medium（Rubert 等級 C/D、預測即將到期、或有螺槳異常） |
| `propeller_repair` | 粗糙度 (µm) → 430 µm | high（Rubert 等級 E/F、或高嚴重度螺槳異常） |
| `coating_renewal` | 破損率 (%) → 45 %（poor） | medium（狀況 = poor、或預測落在規劃視野內） |
| `engine_inspection` | SFOC 漂移 (%) → +5 % 效率損失 | 有追蹤異常或已超過門檻 ⇒ high，否則 medium |

當訊號平坦、下降或過薄無法擬合時，`due_date` 回退為以最新報告為基準的優先度
水平線 (horizon)（high +30 天／medium +90 天，並設上限，避免一個緩慢訊號的
久遠交叉點滲入緊急待辦日期）——`due_date` **絕不為空**。每列都自帶與船殼清洗
相同的四項分析指標：`degradation_rate`/`degradation_unit`、
`current_value`/`threshold_value`、`trigger_eta`，以及——對於經濟性行動（船殼
清洗沿用自己的成本擬合；螺槳／塗層透過一個 POC 每單位超額功率占比係數；主機
則直接使用擬合出的 SFOC 漂移）——`t_star_days`/`net_saving_usd`。`source` 記錄
觸發該行動的證據來源（`uwi` / `anomaly` / `uwi+anomaly` / `fouling_model` /
`sfoc_trend`）；`rationale` 是由該證據組成的簡短敘述。若某船的清單為空，代表
目前無待辦事項。

### 整合規劃器（`plan_maintenance`）

把分散的逐項行動到期日彙整成少數幾個**服務窗口 (service window)**，讓一艘船
只拿到一個規劃答案，而非五個。`plan_service_type` 對
`coating_renewal`/`propeller_repair` 為 `dry_dock`——進塢是限制性事件，因此窗口
的 `plan_date` 錨定於（且絕不早於）其最早的進塢到期日——對
`hull_cleaning`/`propeller_polishing`/`engine_inspection` 為 `in_water`，這些會
併入鄰近的進塢窗口（在容許範圍內），否則彼此批次合併（規劃為最早的水下到期
日）。貪婪式兩階段批次：先進塢行動、後水下行動；批次容許度
`_PLAN_BATCH_DAYS = 60` 天。窗口內的每個行動都帶有該窗口的
`plan_date`/`plan_service_type`。

---

## 5. M3 資料表與已填欄位

### `fact_anomaly` — 每個被旗標的 (imo, date) 一列

以 `imo_number` 分割（列舉分割投影 (enum partition projection)）。在驅動指標
(driver metric) 上發出——即全域殘差 z 最大的通道。

| 欄位 | 來源 |
|---|---|
| `report_date` | 被旗標之日 |
| `metric` | 驅動通道（`speed_loss` / `slip` / `sfoc` / `excess_foc`） |
| `value` | 該通道的觀測值 |
| `z_score` | 驅動通道的全域 (MAD) 殘差 z |
| `severity` | `low` / `medium` / `high`（§3） |
| `cause` | `engine_degradation` / `propeller` / `weather` / `sensor` |

### `fact_recommendation` — 每艘船一列（扁平 flat）

| 欄位 | 來源 |
|---|---|
| `imo_number`、`last_cleaning_date` | 船舶 + 重建的最後重置日 |
| `recommended_clean_date` | `last_cleaning + round(T*)` |
| `trigger_eta` | 開放週期達到 8 % 速度損失之日 |
| `t_star_days` | `T* = √(2K/β)` |
| `fouling_rate_pct_per_day` | 開放週期分段斜率 |
| `net_saving_usd` | `∫_{T*}^{trigger}(c − J*)`（可為空） |
| `status` | `ok` / `insufficient_history` |

### `fact_maintenance_recommendation` — 每艘船 × 建議行動一列

| 欄位 | 來源 |
|---|---|
| `imo_number` | 船舶 |
| `action_type` | `hull_cleaning` / `propeller_polishing` / `propeller_repair` / `coating_renewal` / `engine_inspection` |
| `priority` | `high` / `medium`（§4 規則） |
| `due_date` | 預測越過門檻的日期，否則為優先度水平線回退值（絕不為空） |
| `rationale` | 證據敘述（狀況、粗糙度／破損率、異常次數、預測日期） |
| `source` | `uwi` / `anomaly` / `uwi+anomaly` / `fouling_model` / `sfoc_trend` |
| `degradation_rate`、`degradation_unit` | 該行動訊號對其重置時鐘的 Theil-Sen 斜率——`%/day`（汙損率、破損率、SFOC 漂移）或 `µm/day`（粗糙度） |
| `current_value`、`threshold_value` | 最新觀測訊號對比該行動門檻（船殼：目前速度損失 % 對 8% MT 觸發值；螺槳：粗糙度 µm 對 300/430；塗層：破損率 % 對 45%；主機：週期基線之上的 SFOC 漂移 % 對 +5%） |
| `trigger_eta` | 預測越過門檻的日期（可為空——訊號平坦／下降／無法擬合時） |
| `t_star_days`、`net_saving_usd` | 經濟性行動的最佳服務間隔＋淨節省（可為空——`propeller_repair` 為修正性底線，恆為空） |
| `plan_date`、`plan_service_type` | 該行動被併入的服務窗口（`plan_maintenance`，§4） |

### `fact_alert` — 每艘船 × 警示事件集 (episode) 一列

連續同一 `cause` 的 `fact_anomaly` 天數會被合併為一個事件集（容許間隔
`_GAP_DAYS = 7`——超過 7 天的空窗即視為新事件集開始）；`hull_biofouling`
另從汙損成本模型取得（正的汙損率，加上一個觸發 ETA 或已經超過門檻的近 14 日
速度損失均值），因為它是趨勢，而非點異常。

| 欄位 | 來源 |
|---|---|
| `alert_id` | `AL-{imo}-{opened_date}-{cause}` |
| `fleet_id` | 該船所屬的營運船隊 |
| `opened_date`、`last_seen_date` | 事件集起始／最近一次被旗標的日期（點異常）；本次汙損週期起點／最近的追蹤窗日期（船體生物附著） |
| `cause` | `engine_degradation` / `propeller` / `weather` / `sensor` / `hull_biofouling` |
| `severity` | 事件集內的峰值嚴重度（點異常）；依觸發鄰近度判定，high/medium（船體生物附著） |
| `driver_metric`、`peak_value`、`peak_z` | 峰值時異常的驅動通道／數值／`|z|`（點異常）；`speed_loss` / 近 14 日均值 / `None`（船體生物附著——趨勢無 z 分數） |
| `excess_cost_usd` | 事件集窗口內 `excess_cost_usd` 之和（點異常）；本汙損週期最新的 `cum_excess_cost_usd`（船體生物附著） |
| `recommended_action` | 依成因固定對照表產生的雙語 `"<中文> (<英文>)"` 字串 |
| `status` | 恆為 `open`（尚無結案流程） |
| `source` | `anomaly`（點異常事件集）/ `fouling_model`（船體生物附著） |
| `message_zh`、`message_en` | 由相同證據組成的雙語敘述 |

### 已填的 M2 留空欄位

- `fact_performance_daily.anomaly_flag` / `anomaly_cause` / `anomaly_severity`
- `fact_maintenance_event.me_recovery_pct` / `payback_days`
- `agg_fleet_daily.n_alerts` — 每個船隊日被旗標列的計數

Glue DDL：`deployment/athena_tool_stack.py`（`_FACT_ANOMALY_COLUMNS`、
`_FACT_RECOMMENDATION_COLUMNS`、`_FACT_MAINTENANCE_RECOMMENDATION_COLUMNS`、
`_FACT_ALERT_COLUMNS`；資料表接於 `_curated_by_imo_table` 與策展區表清單）。

---

## 6. C14 驗證（`validate.py`）

`check_c14` 於**偵測域 (detection domain)**——每一列有指標的海上列
（`speed_loss_pct` 非空）——把 `fact_performance_daily` 與基準真相 join，執行五項
檢查：

| 檢查 | 門檻 |
|---|---|
| 偵測 | 召回率 (recall) ≥ **0.70**、精確率 (precision) ≥ **0.60** |
| 成因分類 | 準確率 (accuracy) ≥ **0.75**（真陽性中成因正確）加各成因召回率：engine **0.75**、propeller **0.70**、sensor **0.70**、weather **0.40** |
| 嚴重度 | 完全相符 ≥ **0.50**、差一以內 (within-1) ≥ **0.85** |
| 建議 | 每個 `ok` 建議都在 `last_cleaning` 之後清洗，且 `t_star_days > 0`、`fouling_rate_pct_per_day > 0` |
| 維護效果 | 船殼清洗 ME 回復 **> 0** 者佔 ≥ **50 %** |

C14 僅在 `compute --validate` 內執行（它需要記憶體內的 M3 資料表）；獨立的
`validate --dir` 子命令只重跑 **C13**。

---

## 7. Phase 1 — 船隊地圖 (Fleet Map) 與航程情報 (Voyage Intelligence)

Phase 1 在 M2/M3 之上加入**空間 + 航程經濟 (voyage-economics)** 維度。它非統計性
（無新偵測器）；航程彙總是 M2 精選表（`fact_voyage`，curated-dataset §6），地圖則
讀取攜帶於 `fact_performance_daily` 上的裝飾性位置（table-schema §3.1.2）。列於此處
是因為它是儀表板的 Phase 1 *洞察 (insight)* 介面。

### 航程經濟（`fact_voyage`）

每個輪替航段 `(imo_number, voyage_no)` 一列 — 含其靠港日 — 將每日午報彙總為逐航程的
**距離、海上天數、平均船速、總 FOC、油費（每日以其自身 `(date, fuel_type)` 定價）、
CO₂、平均速度損失、$/nm**，另加 `planned_eta` / `on_time_flag`。計畫工期將設計速度
折減至 85%（服務裕度 service margin），故約半數航程準點 — 一個簡易的排程可靠度
(schedule reliability) 判讀。燃油／距離／CO₂ **加總原始每日值**，故逐船彙總精確守恆
燃油（**C18**，curated-dataset §7），CO₂ 亦與每日事實對帳。Deep-dive 以**可排序航程
經濟表**呈現（查詢 `vessel_voyages`）。

### 船隊地圖與逐船航跡（M6）

- **船隊地圖分頁** — 一張自足的 **D3 世界地圖**（Natural Earth 1:110m 陸地，
  committed 為 `web/assets/world.geojson`；**零外部圖磚 (map-tile) 請求**）。繪出
  每船最新位置（查詢 `fleet_positions`）、彎折經共用蘇伊士／麻六甲轉點的計畫航路弧線，
  以及港口（EU 港以不同樣式繪製）。船舶依**速度損失或 CII** 上色（可切換 toggle）；
  點擊船舶開啟其 Deep-dive。
- **逐船航跡地圖** — 同一地圖的*航跡模式*：該船每日位置的折線（查詢 `vessel_track`），
  顯示於 Deep-dive。
- `web/ports.js` 鏡像 `ports.py`（PORTS + ROUTE_WAYPOINTS），使儀表板地圖弧線與產生的
  航跡一致；座標取自該靜態鏡像，**而非**取自 `dim_port` Glue 表（後者僅供 Athena 端）。

三個後端查詢型別（`fleet_positions`、`vessel_track`、`vessel_voyages`）記載於
`api.md` §4.14–§4.16。

---

## 8. Phase 2 — 燃油與減速優化 (Bunker & Slow-Steaming Optimizer)

Phase 2 在 M2/M3 之上加入一層**燃油經濟 (bunker-economics)** 維度。與 Phase 1
一樣它非統計性（無偵測器、無亂數 RNG、無基準真相 (ground truth)）：航速掃描是一張
M2 策展表（`fact_speed_profile`，skill `skill/fact_speed_profile.md`），由參考
**速度功率曲線 (speed-power curve)** 加上**最新**的汙損 (fouling) 與**船用油價
(bunker price)** 狀態確定性 (deterministic) 地建成。燃油是船隊的**首要營運成本
(opex)**，但在此之前沒有任何東西找得出*經濟航速 (economical speed)*——那個使成本
最小的巡航速度。列於此處是因為它是儀表板的 Phase 2 *洞察 (insight)* 介面。

### 經濟航速（`fact_speed_profile`）

每個速度網格點 `(imo_number, speed_kn)` 一列——**24 點，涵蓋設計航速 (design
speed) 的 0.5 → 1.0**——把每個航速定價為單位航距的**總成本** `單位航距成本
(usd/nm) = (fuel_usd_per_day + charter_usd_per_day) / (航速·24)`。燃油項把參考
速度功率曲線依最新汙損狀態放大（`P_fouled = P_clean/(1 − s)^n`），並以最新船用
油價為其汙損油耗定價；**租金 (charter)** 項則是每日租金（時間成本）。純燃油
`usd/nm ∝ V^(n−1)` 嚴格遞增，故純燃油最佳值是**退化 (degenerate)** 的（落在最慢
的網格點）；加進每日時間成本後 `usd_per_nm` 成為**凸函數 (convex)**，帶一個內部
最小值——即**經濟航速**（`recommended_speed_kn`，即 `usd_per_nm` 的 argmin），通常
約為**設計航速的 60–70 %**（合乎現實的**減速航行 (slow steaming)**），並由檢查
**C19** 強制其嚴格落在網格內部。每列也帶純燃油的 `fuel_usd_per_nm` 分解，以及
船層級的 `current_speed_kn` / `annual_distance_nm`（在全部 24 列上相同）。

### 優化器頁面（`Optimizer.js`）

- **usd/nm 對航速曲線**——所選船舶的凸總成本曲線（查詢 `vessel_speed_profile`），
  標出**目前 (current) / 經濟 (economical) / 排程最佳 (schedule-optimal)** 三個
  標記，其下並以虛線畫出純燃油曲線。
- **排程試算 (schedule what-if)**——一組航距／天數滑桿，計算所需的**排程航速
  (schedule speed)** `D / (天數·24)`，並依輸入航距即時重算**本航程節省 (live
  voyage savings)**（由目前航速減速航行至經濟航速）；當趕船期迫使航速高於經濟
  最小值時會標示提醒。
- **船隊減速 KPI**——一個全船隊的**年化 (annualised)** 節省
  `Σ 各船 (usd_per_nm@目前 − usd_per_nm@經濟) × annual_distance_nm`，並附上逐船
  年化的對應值。

後端查詢型別 `vessel_speed_profile`（單表，對 `fact_speed_profile`）記載於 skill
`skill/fact_speed_profile.md`。

---

## 9. Phase 4 — 天氣歸因 (Weather attribution)

`_daily_row` 將每個航行日的燃油代價 (fuel penalty) 拆解為三個 **可加 (additive)** 分量
（`indicators.excess_cost_attribution`），皆以當日油價計價：

- **汙損 (fouling)** `excess_cost_fouling_usd = excess_cost_usd` — ISO 19030 速度損失罰則
  （船體／螺槳劣化），即 C13 驗證的既有指標。
- **天氣 (weather)** `excess_cost_weather_usd` — ISO 15016 修正移除的風浪增阻功率
  `dp_env_kw = resistance_to_power_kw((resistance_wind_kn + resistance_wave_kn)·1000, STW)`
  以當日 SFOC 換算的燃油成本。**之所以非零可加**，是因為 `excess_cost_usd` 建立在
  *修正後* 的速度損失上，天氣增阻已被扣除，故此處為額外堆疊而非汙損的切片。
- **操作 (operational)** `excess_cost_operational_usd` — 引擎負載偏離最佳點的 SFOC 罰則
  `me_foc · p/(1+p)`，`p = 0.18·(load−0.80)²`，`load = me_power/mcr`；鏡射生成器
  `_sfoc` 的負載 U 形曲線（約 80% MCR 為最低），無需設計 SFOC 欄位。

三者相加為 **大於** 既有 `excess_cost_usd`（即汙損分量）的總燃油代價。檢查 **C20** 釘住
`fouling == excess_cost_usd`、強制非負與同步 null，並斷言全船隊 `Σ weather` 明顯為正。
深潛頁「超額油費歸因」圖（`charts/attribution.js`）以堆疊面積（每分量 7 日滾動平均，
故堆疊仍貼合總額）呈現，用於釐清「非全屬汙損」的爭議。經擴充 `vessel_metrics` 供給。

---

## 10. Phase 6 — 維修預算與乾塢規劃 (Maintenance budget & dry-dock planner)

Phase 6 在 M3 規劃器之上新增**船隊層級的資本支出 (capex)／現金流 (cashflow) 與維修
行事曆 (maintenance calendar)** 面向。與 Phase 1／2 一樣，它不涉統計（無偵測器、無
RNG、無 ground truth）；且不同於前者——它**不新增資料表、不改 ETL、不重新產生資料**：
逐船的 `fact_maintenance_recommendation` 規劃器已存在（§4，`plan_date` /
`plan_service_type` 窗口），Phase 6 是它的*船隊*彙總，外加一個查詢時算出的指示性預算。
列於此處，因其為 Dashboard 的 Phase 6 *洞察*表面。

### 船隊待辦與指示性資本支出（`fleet_maintenance_recommendation`）

Planner 讀取一個新的 `query_type`：`fleet_maintenance_recommendation`（api.md §4.18）——
即 `vessel_maintenance_recommendation` 跨**全船隊**的逐行動列（同窗口／優先度排序），
每列 **LEFT JOIN** 一個指示性資本支出：

```
est_cost_usd = approx_percentile(cost_usd, 0.5)   # 歷史事件成本中位數
               over fact_maintenance_event GROUP BY event_type
```

`event_type` 與 `action_type` 一一對應，**唯** `engine_inspection` 對應到
`engine_overhaul` 事件成本（無純檢查事件）。每個行動對應到其*專屬*事件成本——絕不用
概括性的 `dry_dock` 事件——故一個批次窗口的總額為其各行動成本之 `Σ`，不會重複計算。
`est_cost_usd` 為**查詢時衍生、非儲存**：無 Glue 欄位、無 ETL。因此資本支出屬**指示性
(indicative)**——`engine_inspection→engine_overhaul` 的估計會高估純檢查——UI 與文件皆
如此標示。

### Planner 頁 (`Planner.js`)

- **維修排程（甘特圖 (Gantt chart)）**——泳道式甘特圖，每船一泳道，每個服務窗口在其
  `plan_date` 一根名目工期 `<rect>` 條，依 `plan_service_type`（乾塢 (dry dock) / 水下
  (in-water)) 著色，並以描邊／透明度編碼優先度。條長（`dry_dock` 12 天 / `in_water`
  2 天）為**示意常數**，非來自資料。窗口為待辦中 (imo, `plan_date`,
  `plan_service_type`) 的分組，攜帶其批次行動與 `Σ est_cost_usd`。
- **各季資本支出**——`Σ est_cost_usd` 依 `plan_date` 分季的堆疊長條，依
  `plan_service_type` 拆分——即船隊維修現金流。
- **投資報酬率 (ROI) 排序待辦**——扁平行動列附
  `roi = net_saving_usd / est_cost_usd`，可排序（預設 `net_saving_usd` 遞減、null 置底）；
  非經濟型行動（`net_saving_usd` 為 null）ROI 留白並排至最底。點列開啟該船深入探討。
- **KPI**——總資本支出（Σ est_cost）、總淨節省、乾塢窗口數、下個窗口日期、船隊 ROI
  （Σ 淨節省 ÷ Σ 資本支出）。

船名於前端由 `fleet_vessels` 名冊（app 啟動時載入）解析，故查詢僅回傳 `imo_number`。
無新增 C 檢查：未改 ETL 或資料，C1–C20 不受影響。

---

## 11. 指令

```bash
# 重新產生原始 (M1)、計算策展 (M2 + M3)，並跑 C13 + C14：
uv run python -m ym_datalake.synthetic_data generate --out ./tmp --seed 42 --validate
uv run python -m ym_datalake.etl compute --in ./tmp --out ./tmp --validate

# 獨立 validate 只重跑 C13（C14 需要記憶體內的 M3 資料表）：
uv run python -m ym_datalake.etl validate --dir ./tmp

# 計算並上傳策展 curated/（M2 + M3）至 S3：
uv run python -m ym_datalake.etl compute --in ./tmp --out ./tmp --upload --bucket <bucket>
```

透過已部署的 Athena Lambda 查詢 M3 資料表（只需改 `sql`）：

```bash
# fact_anomaly — 單船各成因異常計數（投影修剪至 imo_number）
... "sql":"SELECT cause, count(*) AS n FROM fact_anomaly WHERE imo_number='9700006' GROUP BY cause ORDER BY n DESC"

# fact_recommendation — 每艘船的建議清洗日期 + 淨節省
... "sql":"SELECT imo_number, recommended_clean_date, trigger_eta, net_saving_usd FROM fact_recommendation WHERE imo_number='9700006'"

# fact_maintenance_recommendation — 全船隊規劃器中最近到期的行動
... "sql":"SELECT imo_number, action_type, priority, due_date, plan_date, plan_service_type FROM fact_maintenance_recommendation ORDER BY due_date LIMIT 5"

# fact_alert — 單船的未結案警示事件集
... "sql":"SELECT cause, severity, opened_date, last_seen_date, message_en FROM fact_alert WHERE imo_number='9700006' ORDER BY last_seen_date DESC"
```
