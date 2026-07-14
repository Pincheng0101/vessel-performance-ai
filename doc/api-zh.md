# 非同步查詢 API — 客戶端整合指南 (client integration guide)

M5 非同步 (async) 查詢 API 的參考文件（poc-spec §7）：提交預先定義的
`query_type`、輪詢 (poll) 至完成、再以 inline JSON 分頁 (pagination) 取回結果。
前端儀表板 (front-end Dashboard) 透過本 API 存取資料，而非直接呼叫 Athena。

**真實來源 (source of truth)：** `lambda_function/async_query_api/{router,handlers,queries,config}.py`
（行為）與 `deployment/athena_tool_stack.py` §7（基礎設施 (infrastructure)）。
每個回傳欄位的*意義*見 `doc/table-schema.md`。Dashboard ↔ `query_type` ↔ 表的
對應見 poc-spec §8.6。

> 英文版本：`doc/api.md`。

---

## 1. 總覽 (Overview)

### 1.1 為何非同步

一次 Athena 查詢需數秒至數分鐘，可能超過 API Gateway 硬性的 **29 秒** 整合
逾時 (timeout)（poc-spec §7.1）。因此本 API 採「提交 → 輪詢 → 取結果」：`POST`
立即回傳 `query_id`；客戶端輪詢狀態至 `SUCCEEDED`，再取回結果（inline JSON
分頁，不用預簽章網址 (presigned URL)）。每次 Lambda 呼叫僅做一次 Athena／
DynamoDB 往返，絕不在 Lambda 內輪詢。

### 1.2 座標 (Coordinates)

| 設定 | 值 |
|---|---|
| 基底網址 (base URL) | `AsyncQueryApiUrl` 堆疊輸出 (stack output) = `https://<api-id>.execute-api.us-west-2.amazonaws.com/prod/` |
| 階段 (stage) | `prod` |
| 路徑前綴 (path prefix) | `/v1` |
| 區域 (region) | `us-west-2` |

基底網址已以 `/prod/` 結尾，故一個完整端點 (endpoint) 為
`https://<api-id>.execute-api.us-west-2.amazonaws.com/prod/v1/queries`。由堆疊
輸出取得實際值：

```bash
AWS_PROFILE=rdc-sso aws cloudformation describe-stacks \
  --stack-name YmHackathonAthenaToolStack \
  --query "Stacks[0].Outputs[?OutputKey=='AsyncQueryApiUrl' || OutputKey=='AsyncQueryApiKeyId']"
```

### 1.3 認證 (Authentication)

所有路由皆需 `x-api-key` 標頭 (header)。金鑰 **id** 即 `AsyncQueryApiKeyId`
輸出；以下列指令取得其祕密 **值 (value)**：

```bash
AWS_PROFILE=rdc-sso aws apigateway get-api-key \
  --api-key <AsyncQueryApiKeyId> --include-value --query value --output text
```

- 缺少／錯誤金鑰 → **403** `{"message":"Forbidden"}`（由 API Gateway 在
  Lambda 執行前擋下）。
- 使用計畫 (usage plan) 節流 (throttle) 為 **每秒 20 次、突發 (burst) 40**；
  超過 → **429** `{"message":"Too Many Requests"}`。
- **CORS** 為全開放（`allow_origin='*'`），允許 `x-api-key` 與 `content-type`
  請求標頭；瀏覽器預檢 (preflight，`OPTIONS`) 由 API Gateway MOCK 整合回應。

---

## 2. 端點 (Endpoints)

| 方法 | 路徑 | 成功碼 | 用途 |
|---|---|---|---|
| POST | `/v1/queries` | **202** | 提交查詢；回傳 `query_id` |
| GET | `/v1/queries/{query_id}` | **200** | 輪詢執行狀態 |
| GET | `/v1/queries/{query_id}/results?page_token=` | **200** | 取回一頁結果列 |

---

## 3. 生命週期／流程 (Lifecycle / flow)

提交 → 輪詢狀態至 `SUCCEEDED` → 取結果（只要有 `next_page_token` 就續傳）。
先設定一次座標：

```bash
BASE="https://<api-id>.execute-api.us-west-2.amazonaws.com/prod"
API_KEY="<value from aws apigateway get-api-key ...>"
```

**1. 提交** — `POST /v1/queries`，body `{query_type, params}` → **202**：

```bash
curl -s -X POST "$BASE/v1/queries" \
  -H "x-api-key: $API_KEY" -H "content-type: application/json" \
  -d '{"query_type":"vessel_speed_loss","params":{"imo_number":"9700006","start_date":"2024-01-01","end_date":"2024-01-07"}}'
# → {"query_id":"q_8f3a1c...","status":"PENDING"}
```

**2. 輪詢狀態** — `GET /v1/queries/{query_id}` 直到 `SUCCEEDED`（或
`FAILED`）；建議每約 2 秒輪詢一次：

```bash
curl -s "$BASE/v1/queries/q_8f3a1c..." -H "x-api-key: $API_KEY"
# → {"query_id":"q_8f3a1c...","status":"RUNNING"}
# → {"query_id":"q_8f3a1c...","status":"SUCCEEDED","result_location":"s3://<AthenaResultsBucket>/results/q_....csv"}
```

**3. 取回結果** — `GET /v1/queries/{query_id}/results`（須在 `SUCCEEDED`
之後；否則 → **409**）：

```bash
curl -s "$BASE/v1/queries/q_8f3a1c.../results" -H "x-api-key: $API_KEY"
# → {"query_id":"q_8f3a1c...",
#     "columns":["report_date","speed_loss_pct","v_expected_kn","days_since_cleaning","valid_flag"],
#     "rows":[["2024-01-01","3.82","21.55","294","true"], ...],
#     "next_page_token":"eyJvZmZzZXQiOjEwMDB9"}
```

**4. 下一頁** — 將權杖 (token) 經 `?page_token=`（URL 編碼）帶回；重複直到
回應不再有 `next_page_token`：

```bash
curl -s "$BASE/v1/queries/q_8f3a1c.../results?page_token=eyJvZmZzZXQiOjEwMDB9" \
  -H "x-api-key: $API_KEY"
```

---

## 4. `query_type` 目錄 (catalog)

十八種允許清單 (allow-list) 查詢型別（poc-spec §8.6；Phase 1 新增三種地圖／航程
型別 §4.14–§4.16，Phase 2 新增最佳化 (optimizer) 型別 §4.17，Phase 6 新增船隊維修
待辦 (fleet maintenance backlog) 型別 §4.18）。每種有固定的參數
模型，回傳下列欄位（所有值皆為字串 —
見 §5.3）。欄位*意義*見所連結的 `doc/table-schema.md` 章節。

**參數規則**（伺服器端驗證；違反 → **400**）：

| 參數 | 型別 | 樣式 (pattern) | 說明 |
|---|---|---|---|
| `imo_number` | string | `^\d{7}$` | 7 位 IMO 號，例 `9700006` = YM WELLNESS |
| `start_date` | string | `^\d{4}-\d{2}-\d{2}$` | 選填；`report_date` 的下界（含） |
| `end_date` | string | `^\d{4}-\d{2}-\d{2}$` | 選填；`report_date` 的上界（含） |
| `fleet_id` | string | `^(ALL\|FL-[A-Z]{2,})$` | 選填，預設 `ALL`；全船隊彙總 (rollup) 或單一 `FL-XX` 子船隊 |
| `severity` | string | `^(low\|medium\|high)$` | 選填；警示嚴重度 (severity) 篩選 |

`params` **僅**接受各型別所列欄位 — 任何未知鍵一律拒絕（`extra='forbid'`）。
日期範圍可只給 `start_date`、只給 `end_date`、兩者皆給（BETWEEN）或皆不給
（全歷史）。

### 4.1 `fleet_overview`

Fleet Overview 頁的船隊逐日 KPI 序列。後端表：`agg_fleet_daily`
（table-schema §3.7）。

- **參數：** `fleet_id?`（預設 `ALL`）、`start_date?`、`end_date?`。
- **回傳：** `report_date`、`n_vessels`、`avg_speed_loss_pct`、
  `total_excess_cost_usd`、`cii_count_a`、`cii_count_b`、`cii_count_c`、
  `cii_count_d`、`cii_count_e`、`n_alerts`。篩選至單一 `fleet_id` 粒度
  (grain)（`ALL` 全船隊彙總或某 `FL-XX` 子船隊）；依 `report_date` 排序。

### 4.2 `fleet_vessels`

船隊名冊 (roster) + 深入分析 (deep-dive) 表頭規格（每船一列）。後端表：
`dim_vessel`（table-schema §3.5）。

- **參數：** 無。
- **回傳：** `imo_number`、`vessel_name`、`vessel_type`、`build_year`、
  `lpp_m`、`breadth_m`、`dwt`、`mcr_kw`、`design_speed_kn`、
  `last_dry_dock_date`、`fleet_id`、`fleet_name`。依 `imo_number` 排序。

### 4.3 `fleet_list`

供船隊選單 (fleet-picker dropdown) 使用的相異 (distinct) fleet id/name
組合。後端表：`dim_vessel`（table-schema §3.5）。

- **參數：** 無。
- **回傳：** `fleet_id`、`fleet_name`（`DISTINCT`）。依 `fleet_id` 排序。

### 4.4 `fleet_alerts`

Alerts 頁的船隊層級未結案 (open) 警示事件 (alert episode)。後端表：
`fact_alert`（table-schema §4.4）。

**警示欄位 (alert columns)**（`_ALERT_COLUMNS`，與 `vessel_alerts` §4.9
共用，15 欄）：`alert_id`、`fleet_id`、`opened_date`、`last_seen_date`、
`cause`、`severity`、`driver_metric`、`peak_value`、`peak_z`、
`excess_cost_usd`、`recommended_action`、`status`、`source`、
`message_zh`、`message_en`。

- **參數：** `fleet_id?`（預設 `ALL`）、`severity?`（`low`|`medium`|`high`）。
- **回傳：** `imo_number` + 上述 15 個警示欄位。`WHERE status = 'open'`，
  並可選擇性限縮至單一 `fleet_id`（`ALL` 時略過）與／或 `severity`。依
  `last_seen_date` 降冪排序。

### 4.5 `vessel_speed_loss`

單船速度損失 (speed loss) 趨勢（Deep-dive 主圖）。後端表：
`fact_performance_daily`（table-schema §3.1）。

- **參數：** `imo_number`**（必填）**、`start_date?`、`end_date?`。
- **回傳：** `report_date`、`speed_loss_pct`、`v_expected_kn`、
  `days_since_cleaning`、`valid_flag`。依 `report_date` 排序。

### 4.6 `vessel_metrics`

驅動 Deep-dive Slip／SFOC／Admiralty／油耗／CII 面板的完整逐日指標集。後端
表：`fact_performance_daily`（table-schema §3.1）。

- **參數：** `imo_number`**（必填）**、`start_date?`、`end_date?`。
- **回傳：** `report_date`、`speed_loss_pct`、`v_expected_kn`、`slip_real`、
  `slip_apparent`、`sfoc_g_kwh`、`admiralty_coef`、`eeoi`、`cii_aer`、
  `cii_rating_aer`、`cii_imo`、`cii_rating_imo`、`excess_cost_usd`、
  `cum_excess_cost_usd`、`excess_cost_fouling_usd`、`excess_cost_weather_usd`、
  `excess_cost_operational_usd`、`power_corrected_kw`、`resistance_wind_kn`、
  `resistance_wave_kn`、`co2_mt`、`days_since_cleaning`、
  `days_since_dry_dock`、`days_since_in_water`、`anomaly_flag`、
  `valid_flag`。依 `report_date` 排序。

### 4.7 `vessel_speed_power`

速度–功率 (speed–power) 散點圖：量測點 **⋃** 淨船體 (clean-hull) 基準曲線，
以 `series` 判別欄合併為單一長格式 (long-format) 結果。後端表：
`fact_performance_daily`（量測，僅 `valid_flag`）**⋃** `dim_reference_curve`
（基準）（table-schema §3.1、§3.6）。

- **參數：** `imo_number`**（必填）**。
- **回傳：** `series`（`measured` | `reference`）、`speed_kn`、`power_kw`、
  `days_since_cleaning`（`reference` 列為 null）。

### 4.8 `vessel_anomalies`

單船異常 (anomaly) 時間軸／警示。後端表：`fact_anomaly`（table-schema §4.1）。

- **參數：** `imo_number`**（必填）**。
- **回傳：** `report_date`、`metric`、`value`、`z_score`、`severity`、
  `cause`。依 `report_date` 排序。

### 4.9 `vessel_alerts`

單船未結案 (open) 警示事件，供 Deep-dive Alerts 面板使用。後端表：
`fact_alert`（table-schema §4.4）。

- **參數：** `imo_number`**（必填）**。
- **回傳：** 15 個警示欄位（見 §4.4）。依 `last_seen_date` 降冪排序。

### 4.10 `vessel_maintenance_effect`

逐事件維修效益 (maintenance effect，回復、回收期)。後端表：
`fact_maintenance_event`（table-schema §3.4）。

- **參數：** `imo_number`**（必填）**。
- **回傳：** `event_date`、`event_type`、`cost_usd`、`downtime_hours`、
  `me_recovery_pct`、`payback_days`。依 `event_date` 排序。

### 4.11 `vessel_recommendation`

船殼清潔 (hull cleaning) 成本最佳化 + 淨節省（每船一列）。後端表：
`fact_recommendation`（table-schema §4.2）。

- **參數：** `imo_number`**（必填）**。
- **回傳：** `last_cleaning_date`、`recommended_clean_date`、`trigger_eta`、
  `t_star_days`、`fouling_rate_pct_per_day`、`net_saving_usd`、`status`。

### 4.12 `vessel_maintenance_recommendation`

單船整體維修行動 (overall maintenance actions)（0–N 列；空 ⇒ 維修進度良好）。
後端表：`fact_maintenance_recommendation`（table-schema §4.3）。

- **參數：** `imo_number`**（必填）**。
- **回傳：** `action_type`、`priority`、`due_date`、`rationale`、`source`，
  逐行動分析欄位組 (analytics strip)（`degradation_rate`、`degradation_unit`、
  `current_value`、`threshold_value`、`trigger_eta`、`t_star_days`、
  `net_saving_usd`），以及排程器 (planner) 的服務窗口 (service window) 標籤
  `plan_date`／`plan_service_type`。依服務窗口（`plan_date`）排序，再依優先度
  排序（high→medium→low），再依 `action_type` — 故各列已依窗口**預先分組**。
  每個行動皆帶有真正的預測性 (predictive) `due_date` — 即該行動劣化門檻
  (degradation threshold) 的預測越界日，限制於優先度視窗 (priority window) 內
  （否則以優先度期程 (priority-horizon) 回退：high +30 天／medium +90 天）；
  絕不為 null。`source` 為 `uwi`、`anomaly`、`fouling_model`、`sfoc_trend`
  （引擎 SFOC 漂移 (drift) 驅動）、`uwi+anomaly` 之一。**整合排程器
  (consolidated planner)** 將各行動分散的到期日批次整合為共用服務窗口：
  `plan_date` 為該窗口的「下次維修日期」，`plan_service_type` 為 `dry_dock`
  (需出塢／haul-out) 或 `in_water`；Dashboard 於前端依 `plan_date` 分組
  （deep-dive），並以最早窗口作為每艘船的下次維修（船隊表）。

### 4.13 `vessel_uwi`

單船水下檢查 (underwater inspection) findings（最新一列 = 目前狀況）。後端表：
`fact_uwi`（table-schema §2.4 / skill `fact_uwi.md`）。

- **參數：** `imo_number`**（必填）**。
- **回傳：** `inspection_date`、`inspection_type`、`hull_fouling_rating`、
  `hull_fouling_coverage_pct`、`propeller_condition`、`propeller_roughness_um`、
  `coating_breakdown_pct`、`coating_condition`、`recommended_action`。依
  `inspection_date` 排序。`propeller_roughness_um` 與 `coating_breakdown_pct` 現
  為獨立、可重置 (resettable) 的訊號（各有其重置時鐘 (reset clock)），不再由
  船殼結垢 (hull fouling) 推導。

### 4.14 `vessel_track`

單船每日位置 + 速度損失／CII — 驅動 Deep-dive 的**逐船航跡地圖 (track map)**
（每日 lat/lon 折線）。後端表：`fact_performance_daily`（table-schema §3.1）。

- **參數：** `imo_number`**（必填）**、`start_date?`、`end_date?`。
- **回傳：** `report_date`、`latitude`、`longitude`、`speed_loss_pct`、
  `cii_rating_aer`、`voyage_no`、`port_from`、`port_to`。依 `report_date` 排序。
  位置攜帶於每一每日列（航行中 + 靠港）使航跡連續；屬裝飾性（絕不進入物理 —
  table-schema §3.1.2）。

### 4.15 `vessel_voyages`

單船逐航程經濟 — 驅動 Deep-dive 的**可排序航程經濟表**（航路、日期、距離、海上
天數、平均船速、FOC、油費、CO₂、速度損失、$/nm、準點）。後端表：`fact_voyage`
（table-schema §3.8）。

- **參數：** `imo_number`**（必填）**。
- **回傳：** `voyage_no`、`vessel_name`、`from_port`、`to_port`、`depart_date`、
  `arrive_date`、`distance_nm`、`sea_days`、`avg_speed_kn`、`total_foc_mt`、
  `fuel_cost_usd`、`co2_mt`、`avg_speed_loss_pct`、`usd_per_nm`、`on_time_flag`、
  `planned_eta`。依 `depart_date` 排序（最舊在前）。

### 4.16 `fleet_positions`

每船最新一列 — 驅動**船隊地圖 (Fleet Map)**（每船一點）。後端表：
`fact_performance_daily`（table-schema §3.1）。

- **參數：** 無。
- **回傳：** `imo_number`、`vessel_name`、`report_date`、`latitude`、
  `longitude`、`speed_loss_pct`、`cii_rating_aer`、`voyage_phase`、`port_from`、
  `port_to`、`voyage_no`。依 `imo_number` 排序（約 9 列）。每個 `imo_number` 的
  最新列以 `row_number() OVER (PARTITION BY imo_number ORDER BY report_date DESC)`
  視窗挑出 — `report_date` 為 `YYYY-MM-DD` 字串，故 `DESC` 即時間先後。

### 4.17 `vessel_speed_profile`

單船速度網格 (speed grid) 的加油 (bunker) 經濟 — 驅動 Dashboard 的
**Optimizer 頁**（凸型 (convex) 的單位航距成本 (usd/nm)–航速曲線，含目前／經濟
航速 (economical speed)／排程標記、即時節省、船隊慢速航行 (slow steaming) KPI，
以及燃油對總成本的分解 (fuel decomposition)）。每列為 24 個速度網格點之一；船隻
層級 (vessel-level) 的目前航速 (current speed)、經濟航速與年航距 (annual
distance) 於每一列重複。後端表：`fact_speed_profile`（skill
`fact_speed_profile.md`）。

- **參數：** `imo_number`**（必填）**。
- **回傳：** `speed_kn`、`shaft_power_kw`、`foc_mt_per_day`、`co2_mt_per_day`、
  `fuel_usd_per_day`、`charter_usd_per_day`、`usd_per_day`、`usd_per_nm`、
  `fuel_usd_per_nm`、`vessel_name`、`recommended_speed_kn`、`current_speed_kn`、
  `annual_distance_nm`。依 `speed_kn` 排序。

### 4.18 `fleet_maintenance_recommendation`

全船隊維修待辦 (backlog)，驅動 Dashboard 的 **Planner 頁**（規劃器）——即
`vessel_maintenance_recommendation`（§4.12）跨**全船隊**的逐行動列，每列附一個
指示性資本支出 (indicative capex)。後端表：`fact_maintenance_recommendation`
（table-schema §4.3）**LEFT JOIN** 由 `fact_maintenance_event`（table-schema §3.4）
逐事件型別算出的中位數成本。

- **參數：** 無。
- **回傳：** `imo_number`、`action_type`、`priority`、`due_date`、`rationale`、
  `source`、逐行動分析欄組（`degradation_rate`、`degradation_unit`、
  `current_value`、`threshold_value`、`trigger_eta`、`t_star_days`、
  `net_saving_usd`）、規劃窗口標記（`plan_date`、`plan_service_type`），以及
  **`est_cost_usd`**。依服務窗口（`plan_date`）、優先度 (priority) 排序
  （high→medium→low）、再 `action_type` — 故各列**預先依窗口分組**（與 §4.12 同序），
  但為全船隊範圍。
- **`est_cost_usd` 為查詢時衍生欄位 (query-time derived)**，*非*儲存欄位：對應
  `fact_maintenance_event.event_type` 的 `cost_usd` 中位數
  （`approx_percentile(cost_usd, 0.5)`）。`event_type` 與 `action_type` 一一對應，
  **唯** `engine_inspection` 對應到 `engine_overhaul` 事件成本（無純檢查事件）——此
  為**指示性 (indicative)** 資本支出，會高估純檢查；Planner 以此標示。無對應事件型別
  的行動 `est_cost_usd` 為 null。

船名於前端由 `fleet_vessels` 名冊（§4.2）解析，故此查詢僅回傳 `imo_number` —
無需 join `dim_vessel`。

---

## 5. 請求／回應參考 (Request / response reference)

### 5.1 提交 body — `POST /v1/queries`

| 欄位 | 型別 | 必填 | 預設 | 說明 |
|---|---|---|---|---|
| `query_type` | string | 是 | — | §4 十八種型別之一 |
| `params` | object | 否 | `{}` | 各型別參數（§4）；未知鍵 → 400 |

未知的頂層鍵一律拒絕（`extra='forbid'`）。回應 — **202**：

```json
{ "query_id": "q_8f3a1c...", "status": "PENDING" }
```

`query_id` 恆為 `q_` + 32 位十六進位字元。

### 5.2 狀態回應 — `GET /v1/queries/{query_id}`

```json
{ "query_id": "q_8f3a1c...", "status": "SUCCEEDED",
  "result_location": "s3://<AthenaResultsBucket>/results/q_....csv" }
```

`result_location`（S3 中的 Athena 原始 CSV）**僅**在 `SUCCEEDED` 時出現；僅
供參考 — 客戶端應以 `/results` 讀取列，而非直接讀 S3。`status` 為四種 API
狀態之一，由 Athena 執行狀態映射而來：

| Athena 狀態 | API `status` |
|---|---|
| `QUEUED` | `PENDING` |
| `RUNNING` | `RUNNING` |
| `SUCCEEDED` | `SUCCEEDED` |
| `FAILED` | `FAILED` |
| `CANCELLED` | `FAILED` |

任何無法辨識的 Athena 狀態回退為 `PENDING`。

### 5.3 結果回應 — `GET /v1/queries/{query_id}/results`

```json
{ "query_id": "q_8f3a1c...",
  "columns": ["report_date","speed_loss_pct","v_expected_kn","days_since_cleaning","valid_flag"],
  "rows": [["2024-01-01","3.82","21.55","294","true"]],
  "next_page_token": "eyJvZmZzZXQiOjEwMDB9" }
```

- `columns` — 有序欄名（對應該型別 §4 的「回傳」清單）。
- `rows` — 列的清單；每列為與 `columns` 對齊的清單。**每個值皆為字串或
  `null`** — Athena 一律以 varchar 回傳，故數字（`"3.82"`、`"294"`）與布林
  （`"true"`）皆為字串；由客戶端自行轉型。
- `next_page_token` — 僅在尚有後續頁時出現。每頁上限 **1000 列**（Athena
  `GetQueryResults` 限制）。將此權杖經 `?page_token=`（URL 編碼）帶回以取下
  一頁。Athena 於**第一頁**前置的欄名標頭列會被自動剝除。

---

## 6. 錯誤 (Errors)

Lambda 產生的錯誤採 Powertools JSON 格式 `{"statusCode", "message"}`；403 來自
API Gateway，僅含 `{"message"}`。

| HTTP | 時機 | `message` 形狀 |
|---|---|---|
| **400** | body 格式錯誤（缺少／多餘欄位）、未知 `query_type`、或 `params` 無效（IMO／日期樣式錯、未知參數） | `Invalid request body: …` / `Unknown query_type …` / `Invalid params for …: …` |
| **403** | 缺少或無效的 `x-api-key` | `Forbidden`（API Gateway；無 `statusCode`） |
| **404** | 未知／過期的 `query_id` | `Unknown query_id: q_…` |
| **409** | 查詢尚未 `SUCCEEDED` 即請求 `/results` | `Query q_… is not ready (status=RUNNING); poll GET /v1/queries/q_… until SUCCEEDED` |
| **429** | 超過使用計畫節流 | `Too Many Requests`（API Gateway） |

遇 **409** 時，客戶端應續輪詢狀態，待 `SUCCEEDED` 後重試 `/results`。`FAILED`
為終態 — 應重新提交，而非無限輪詢。

---

## 7. 後端／部署附錄 (Backend / deployment appendix)

基礎設施精簡對照（`deployment/athena_tool_stack.py` §7）；呼叫 API 時不需此資訊。

**Lambda**（`AsyncQueryApiFunction`）：Python 3.13、ARM64、處理常式 (handler)
`router.lambda_handler`、512 MB、30 秒逾時。環境變數：`QUERY_TABLE`（登錄表
名）、`SSM_PREFIX`（`/ym-datalake-poc`）、`POWERTOOLS_SERVICE_NAME`
（`async-query-api`）。以 Powertools REST resolver 建構；每次請求僅一次
Athena／DynamoDB 往返。

**DynamoDB 登錄表 (registry)**（`QueryRegistryTable`，按量計費）：PK `query_id`；
項目 `{query_id, exec_id, query_type, status, ttl}`。`ttl` = 現在 + 24 小時，
自動清理過期記錄。所存的 `status` 僅為快取 (cache) — Athena 執行狀態才是權威
來源，每次 status／results 呼叫皆重新讀取。

**SSM** `/ym-datalake-poc/athena-config` — 於提交查詢時讀取的 JSON
`{database, workgroup, catalog}`。Athena 工作群組 (workgroup) `ym-datalake-poc`
強制結果位置為 `s3://<AthenaResultsBucket>/results/`（7 天生命週期）。

**安全性。** 使用者輸入絕不串接進 SQL：每個 `?` 佔位符 (placeholder) 皆經
Athena 執行參數 (ExecutionParameters) 依序綁定（以帶引號的字串常值 (string
literal) 呈現），且 `query_type` 採允許清單 — 故無 SQL 注入 (SQL injection)
或任意 SQL 之虞。Pydantic 先驗證每個參數（乾淨的 400、縱深防禦
(defence-in-depth)）。

**客戶端使用的堆疊輸出：** `AsyncQueryApiUrl`（基底網址）、
`AsyncQueryApiKeyId`（API 金鑰 id → 以 `aws apigateway get-api-key` 解出值）。
