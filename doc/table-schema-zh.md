# 資料表結構 — Athena / Glue 資料字典 (data dictionary)

`ym_datalake_poc` 資料湖 (data lake) 中每一張表的逐表參考：粒度 (grain)、S3
位置、分割 (partition)、每一欄位（型別／可空性／意義）、一列逐字 (verbatim) 樣本，
另附列舉值 (enum) 參考與 Athena 查詢範例。

**型別／分割的真實來源 (source of truth)：** `deployment/athena_tool_stack.py`
（`*_COLUMNS` 清單與 `CfnTable` 定義）。欄位*意義*取自 `doc/synthetic-dataset.md`
（raw）、`doc/curated-dataset.md`（M2）、`doc/insights.md`（M3）與 ETL 原始碼。
樣本列逐字複製自 `tmp/**/*.jsonl`（以 `--seed 42` 產生）。

> 英文版：`doc/table-schema.md`。

---

## 1. 總覽 (Overview)

### 1.1 目錄座標 (catalog coordinates)

| 設定 | 值 |
|---|---|
| Glue 資料庫 (database) | `ym_datalake_poc` |
| Athena 目錄 (catalog) | `AwsDataCatalog` |
| Athena 工作群組 (workgroup) | `ym-datalake-poc`（強制指定自己的結果位置） |
| 區域 (region) | `us-west-2` |

全部 20 張表皆為建立在 **JSONL**（每行一個 JSON 物件）之上的外部表 (external
table，`EXTERNAL_TABLE`)，以 OpenX 的 `org.openx.data.jsonserde.JsonSerDe`
序列化／反序列化器 (SerDe) 讀取，並帶 Glue 表參數 `classification=json`。它們
**不是** 欄式儲存 (Parquet)。此 SerDe 以**名稱**對應 JSON 鍵到欄位，因此若某個
本文 (body) 鍵同時也是分割欄，就會被直接忽略。

### 1.2 兩個 S3 區 (zone)

| 區 | 前綴 (prefix) | 產生者 |
|---|---|---|
| 原始區 (raw zone，M1) | `s3://<DataLakeBucket>/raw/…` | `ym_datalake.synthetic_data` 產生器 |
| 精煉區 (curated zone，M2 + M3) | `s3://<DataLakeBucket>/curated/…` | `ym_datalake.etl`（M2 ISO 15016/19030 + M3 統計） |

`<DataLakeBucket>` 是 CDK 在部署時指派、以堆疊輸出 (stack output)
`DataLakeBucketName` 揭露的儲存桶 (bucket) 名稱。地面實況 (ground truth)
`tmp/truth/` 樹**永不上傳或編目 (catalogue)**（僅供驗證）。

### 1.3 分割投影 (partition projection)（免爬蟲、免 `MSCK`）

9 張表使用 **Hive 分割投影 (partition projection)** — Athena 由表屬性推算分割
位置，故不需爬蟲 (crawler)、也不需 `MSCK REPAIR TABLE`。其餘 11 張為未分割
(unpartitioned)（單一扁平前綴）。

| 分割方案 | 表 | 投影 |
|---|---|---|
| `imo_number` + `year` | `noon_report` | imo 列舉（9 個 IMO）；year 整數 `2021,2026` |
| `imo_number` + `year` + `month` | `fact_performance_daily` | 另加 month 整數 `1,12`（2 位數） |
| 僅 `imo_number` | `fact_performance_indicator`、`fact_uwi`、`fact_maintenance_event`、`fact_anomaly`、`fact_alert`、`fact_voyage`、`fact_speed_profile` | imo 列舉（9 個 IMO） |

`imo_number` 列舉為靜態船隊 `9700001`–`9700009`
（`synthetic_data.fleet.IMO_NUMBERS`）。**務必加分割述詞 (predicate)**
（`WHERE imo_number=… AND year=…`），讓 Athena 修剪 (prune) 到相符前綴，而非
掃描整張表。

### 1.4 S3 佈局 (layout)

```
s3://<DataLakeBucket>/
├── raw/                                        # M1
│   ├── noon_report/imo_number=<imo>/year=<yyyy>/data.jsonl   # 投影
│   ├── vessel_master/vessel_master.jsonl
│   ├── reference_curve/reference_curve.jsonl
│   ├── uwi/uwi.jsonl
│   ├── maintenance_event/maintenance_event.jsonl
│   └── fuel_price/fuel_price.jsonl
└── curated/                                    # M2 + M3
    ├── fact_performance_daily/imo_number=<imo>/year=<yyyy>/month=<mm>/data.jsonl  # 投影
    ├── fact_performance_indicator/imo_number=<imo>/data.jsonl                     # 投影
    ├── fact_uwi/imo_number=<imo>/data.jsonl                                       # 投影
    ├── fact_maintenance_event/imo_number=<imo>/data.jsonl                         # 投影
    ├── fact_anomaly/imo_number=<imo>/data.jsonl                                   # 投影（M3）
    ├── fact_alert/imo_number=<imo>/data.jsonl                                     # 投影（M3）
    ├── fact_voyage/imo_number=<imo>/data.jsonl                                    # 投影（M2，航程彙總）
    ├── fact_speed_profile/imo_number=<imo>/data.jsonl                             # 投影（M2，速度最佳化）
    ├── dim_port/dim_port.jsonl
    ├── dim_vessel/dim_vessel.jsonl
    ├── dim_reference_curve/dim_reference_curve.jsonl
    ├── agg_fleet_daily/agg_fleet_daily.jsonl
    ├── fact_recommendation/fact_recommendation.jsonl                             # M3
    └── fact_maintenance_recommendation/fact_maintenance_recommendation.jsonl     # M3
```

### 1.5 慣例 (conventions)

- **所有時間欄位皆為 `string`** — `YYYY-MM-DD`（日期）或
  `YYYY-MM-DD HH:MM:SS`（日期時間）。JSON SerDe 的時間戳 (timestamp) 剖析脆弱，
  故日期以文字儲存，需要日期運算或排序時由呼叫端 **`CAST(col AS date)`**。
- **空值 (null)：** 任何非有限浮點數（`NaN`/`Inf`）皆寫為 `null`（SerDe 拒絕
  `NaN`）。此外，空值帶*語意*：ISO／衍生欄位在靠港 (in-port) 日與粗大功率離群值
  (gross power outlier) 上為 null；`eeoi` 在壓載 (ballast)／零貨量日為 null；
  M2 將異常 (anomaly)／維修效益／建議這些占位欄位輸出為 null，**由 M3 填入**。
- **分割鍵 vs 本文鍵。** 分割鍵獨立宣告，*不*在本文 `*_COLUMNS` 清單中。但產生的
  JSONL 本文仍會冗餘攜帶部分分割鍵：`noon_report` 本文重複 `imo_number`；
  `fact_performance_daily` 本文重複 `imo_number`、`year`、`month`；以 imo 分割的
  精煉表本文重複 `imo_number`。Athena 從 S3 路徑讀取這些值，故冗餘的本文複本被忽略。
  （在扁平的 `agg_fleet_daily`、`fact_recommendation` 與
  `fact_maintenance_recommendation` 中，`year`/`month`/`imo_number` 是一般本文
  欄位，而非分割鍵。）

### 1.6 船隊 (fleet)

9 個合成的 7 位數 IMO `9700001`–`9700009`，貨櫃船 (container ship) 由
支線型 (Feeder) 到超大型 (ULCV)。**`9700006` = YM WELLNESS** 是儀表板
(Dashboard) 深入探討 (deep-dive) 的船（一段刻意設計的
汙損 (fouling) 上升 → 越過門檻 → 清潔 → 恢復 的故事線）。資料涵蓋
**2021-07-01 … 2026-06-30**（5 年）。9 艘船依營運航線分為 3 個
船隊 (fleet)：**`FL-IA`** 亞洲區間 (Intra-Asia)、**`FL-TP`** 跨太平洋
(Trans-Pacific)、**`FL-AE`** 亞歐 (Asia-Europe)（`fleet_id`/`fleet_name` 載於
`vessel_master`/`dim_vessel`；`agg_fleet_daily` 另加一個 `ALL` 彙總粒度）。

| IMO | 名稱 | 船級 | 船隊 |
|---|---|---|---|
| 9700001 | YM HARMONY | Feeder | FL-IA |
| 9700002 | YM ENLIGHTEN | Feedermax | FL-IA |
| 9700003 | YM PLENTY | Panamax（含洗滌器 scrubber） | FL-IA |
| 9700004 | YM PROSPER | Panamax | FL-TP |
| 9700005 | YM EXCELLENCE | Post-Panamax | FL-TP |
| **9700006** | **YM WELLNESS** | **Neo-Panamax（深入探討）** | **FL-AE** |
| 9700007 | YM WARRANTY | Neo-Panamax | FL-AE |
| 9700008 | YM TRIUMPH | Post-Panamax | FL-TP |
| 9700009 | YM TITAN | ULCV（含洗滌器） | FL-AE |

### 1.7 資料表摘要 (summary)

| # | 表 | 區／里程碑 (milestone) | 粒度 | 分割鍵 | 本文欄數 |
|---|---|---|---|---|---|
| 1 | `noon_report` | raw / M1 | 船 × 日 | imo_number, year | 47 |
| 2 | `vessel_master` | raw / M1 | 船 | — | 21 |
| 3 | `reference_curve` | raw / M1 | 船 × 速度點 | — | 5 |
| 4 | `uwi` | raw / M1 | 檢查 | — | 11 |
| 5 | `maintenance_event` | raw / M1 | 事件 | — | 7 |
| 6 | `fuel_price` | raw / M1 | 日 × 燃油 | — | 3 |
| 7 | `fact_performance_daily` | curated / M2 | 船 × 日 | imo_number, year, month | 35 |
| 8 | `fact_performance_indicator` | curated / M2 | 船 × 指標 | imo_number | 8 |
| 9 | `fact_uwi` | curated / M2 | 檢查 | imo_number | 10 |
| 10 | `fact_maintenance_event` | curated / M2（+M3 欄） | 事件 | imo_number | 8 |
| 11 | `dim_vessel` | curated / M2 | 船 | — | 21 |
| 12 | `dim_reference_curve` | curated / M2 | 船 × 速度點 | — | 5 |
| 13 | `agg_fleet_daily` | curated / M2（+M3 欄） | 船隊 × 日（`ALL` 彙總 + 子船隊） | — | 13 |
| 14 | `fact_recommendation` | curated / M3 | 船 | — | 8 |
| 15 | `fact_anomaly` | curated / M3 | 被標記的（船, 日） | imo_number | 6 |
| 16 | `fact_maintenance_recommendation` | curated / M3 | 船 × 行動 | — | 15 |
| 17 | `fact_alert` | curated / M3 | 警示事件（船 × 事件） | imo_number | 15 |
| 18 | `fact_voyage` | curated / M2 | 船 × 航程（航段） | imo_number | 16 |
| 19 | `dim_port` | curated / M2 | 港口 | — | 5 |
| 20 | `fact_speed_profile` | curated / M2（Phase 2） | 船 × 速度網格點 | imo_number | 13 |

> **觸發門檻 (trigger threshold) 註記。** 維修觸發門檻為 **8 %**
> （`periods.MT_TRIGGER_PCT = 8.0`），驅動 `fact_performance_indicator` 的
> `indicator=MT` 與 `fact_recommendation.trigger_eta`。規格 §5.5 與 WELLNESS
> 敘述將其描述為約 10 %。**程式碼中的 8 % 值為權威值 (authoritative)**，代表
> 這些表中的實際資料；約 10 % 僅為文字敘述。

---

## 2. 原始區 (raw zone，M1)

產生器落地的六個資料集。時間欄位為字串；NaN/Inf → null。

### 2.1 `noon_report`（每日報告 noon report）

粒度：每船每日一列。位置：
`s3://<DataLakeBucket>/raw/noon_report/imo_number=<imo>/year=<yyyy>/data.jsonl`。
以 **`imo_number`**（列舉，9 個 IMO）+ **`year`**（整數 `2021,2026`）投影分割。
本文重複 `imo_number`（被忽略）。C 規則標籤參照 §3.2 一致性檢核
(consistency check)。

| 欄位 | 型別 | 可空? | 說明 |
|---|---|---|---|
| imo_number | string | 否 | *(分割)* IMO 號 |
| year | int | 否 | *(分割)* 報告的日曆年 |
| report_id | string | 否 | `NR-<imo>-<date>` |
| vessel_name | string | 否 | 船名 |
| report_datetime_utc | string | 否 | `YYYY-MM-DD HH:MM:SS`，UTC 正午 |
| voyage_no | string | 否 | 航次號 |
| leg | string | 否 | 航段 (leg) 代碼（`<from>-<to>`） |
| port_from | string | 否 | 出發 UN/LOCODE |
| port_to | string | 否 | 抵達 UN/LOCODE |
| voyage_phase | string | 否 | `at_sea`（航行中）/ `in_port`（靠港） |
| latitude | double | 否 | 緯度 (°) |
| longitude | double | 否 | 經度 (°) |
| heading_deg | double | 否 | 船艏向 (heading，°)；ETL 需要它重建風／浪修正 |
| steaming_hours | double | 否 | 航行時數（航行中約 24，靠港 0） |
| distance_og_nm | double | 否 | 對地航距 (over ground，nm) = 速度·時數 (C3) |
| distance_tw_nm | double | 否 | 對水航距 (through water，nm) (C3) |
| speed_og_kn | double | 否 | 對地速度 (SOG，kn) (C4) |
| speed_tw_kn | double | 否 | 對水速度 (STW，kn) (C4) |
| me_rpm | double | 否 | 主機 (main engine) 轉速 (C7) |
| me_shaft_power_kw | double | 否 | 量測軸功率 (shaft power，kW) (C1) |
| me_foc_mt | double | 否 | 主機燃油消耗量 (fuel oil consumption，t) (C2) |
| propeller_pitch_m | double | 否 | 定距螺槳 (FPP) 螺距 (pitch，m) |
| fuel_type | string | 否 | 海上燃油：`HFO`（含洗滌器船）/ `VLSFO`；靠港為 `MGO` |
| fuel_lcv_mj_kg | double | 否 | 低位發熱值 (lower calorific value，MJ/kg) |
| ae_foc_mt | double | 否 | 輔機 (auxiliary engine) FOC (t) |
| boiler_foc_mt | double | 否 | 鍋爐 (boiler) FOC (t) |
| total_foc_mt | double | 否 | 總 FOC = 主機+輔機+鍋爐 (t) (C8) |
| draft_fore_m | double | 否 | 艏吃水 (draft，m) (C6) |
| draft_aft_m | double | 否 | 艉吃水 (m) (C6) |
| mean_draft_m | double | 否 | 平均吃水 = (艏+艉)/2 (m) (C5, C6) |
| trim_m | double | 否 | 俯仰差 (trim) = 艉 − 艏 (m) (C6) |
| displacement_mt | double | 否 | 排水量 (displacement) Δ，由質量平衡→靜水力 (t) (C5) |
| cargo_weight_mt | double | 否 | 貨重 (t) |
| condition_flag | string | 否 | `laden`（載貨）/ `ballast`（壓載） |
| wind_speed_kn | double | 否 | 真風速 (kn) |
| wind_dir_deg | double | 否 | 風向 (°) |
| beaufort | int | 否 | 蒲福風級 (Beaufort，C11) |
| wave_height_m | double | 否 | 有義波高 (significant wave height，Hs，m) (C11) |
| wave_dir_deg | double | 否 | 波向 (°) |
| wave_period_s | double | 否 | 波週期 (s) |
| swell_height_m | double | 否 | 湧浪 (swell) 高度 (m) |
| swell_dir_deg | double | 否 | 湧浪方向 (°) |
| sea_water_temp_c | double | 否 | 海水溫度 (°C) |
| air_temp_c | double | 否 | 氣溫 (°C) |
| air_pressure_hpa | double | 否 | 氣壓 (hPa) |
| current_speed_kn | double | 否 | 海流速度 (current，kn) (C4) |
| current_dir_deg | double | 否 | 海流方向 (°) |
| sea_water_density_kg_m3 | double | 否 | 海水密度 (kg/m³) (C11) |
| data_source | string | 否 | `sensor` |

```json
{"report_id": "NR-9700006-2023-01-01", "imo_number": "9700006", "vessel_name": "YM WELLNESS", "report_datetime_utc": "2023-01-01 12:00:00", "voyage_no": "1377", "leg": "KRPUS-NLRTM", "port_from": "KRPUS", "port_to": "NLRTM", "voyage_phase": "at_sea", "latitude": -60.0, "longitude": -115.0629, "heading_deg": 168.2397, "steaming_hours": 24.0, "distance_og_nm": 413.4125, "distance_tw_nm": 432.3379, "speed_og_kn": 17.3591, "speed_tw_kn": 18.0461, "me_rpm": 77.2897, "me_shaft_power_kw": 21409.3764, "me_foc_mt": 94.8735, "propeller_pitch_m": 8.0, "fuel_type": "VLSFO", "fuel_lcv_mj_kg": 41.0, "ae_foc_mt": 2.9132, "boiler_foc_mt": 1.5119, "total_foc_mt": 99.2985, "draft_fore_m": 13.427, "draft_aft_m": 12.603, "mean_draft_m": 13.015, "trim_m": -0.824, "displacement_mt": 141578.4202, "cargo_weight_mt": 88144.1068, "condition_flag": "laden", "wind_speed_kn": 25.1942, "wind_dir_deg": 136.4022, "beaufort": 6, "wave_height_m": 2.3193, "wave_dir_deg": 119.0958, "wave_period_s": 5.9777, "swell_height_m": 1.0521, "swell_dir_deg": 22.6473, "sea_water_temp_c": 10.0262, "air_temp_c": 10.9505, "air_pressure_hpa": 1011.983, "current_speed_kn": 0.8764, "current_dir_deg": 26.6252, "sea_water_density_kg_m3": 1027.0883, "data_source": "sensor"}
```

### 2.2 `vessel_master`（船舶主檔）

粒度：每船一列（維度表 dimension）。位置：
`s3://<DataLakeBucket>/raw/vessel_master/vessel_master.jsonl`。未分割。

| 欄位 | 型別 | 可空? | 說明 |
|---|---|---|---|
| imo_number | string | 否 | IMO 號（鍵） |
| vessel_name | string | 否 | 船名 |
| vessel_type | string | 否 | `container` |
| fleet_id | string | 否 | 營運船隊 id（`FL-IA` / `FL-TP` / `FL-AE`） |
| fleet_name | string | 否 | 營運船隊名（`Intra-Asia` / `Trans-Pacific` / `Asia-Europe`） |
| build_year | int | 否 | 建造年 |
| lpp_m | double | 否 | 垂線間長 (length between perpendiculars，m) |
| breadth_m | double | 否 | 模寬 (moulded breadth，B，m) |
| design_draft_m | double | 否 | 設計吃水 (m) |
| dwt | double | 否 | 載重噸 (deadweight tonnage，t)；CII 容量 |
| gross_tonnage | double | 否 | 總噸位 (gross tonnage) |
| mcr_kw | double | 否 | 最大持續額定 (maximum continuous rating，kW) |
| ncr_kw | double | 否 | 正常持續額定 (normal continuous rating，kW) ≈ 0.85·MCR |
| design_speed_kn | double | 否 | 設計／合約速度 (Vdes，kn) |
| propeller_type | string | 否 | `FPP`（定距螺槳 fixed-pitch propeller） |
| diameter_m | double | 否 | 螺槳直徑 (m) |
| pitch_m | double | 否 | 螺槳螺距 (m) |
| n_blades | int | 否 | 槳葉數 |
| transverse_area_m2 | double | 否 | 橫向受風面積 (transverse windage area，A_XV，m²)，供風阻計算 |
| ref_curve_id | string | 否 | 外鍵 → `reference_curve.ref_curve_id`（`RC-<imo>`） |
| last_dry_dock_date | string | 是 | 上次進塢 (dry dock) 日；raw 中未知時**為 null**（`dim_vessel` 補齊） |

```json
{"imo_number": "9700001", "vessel_name": "YM HARMONY", "vessel_type": "container", "fleet_id": "FL-IA", "fleet_name": "Intra-Asia", "build_year": 2012, "lpp_m": 150.0, "breadth_m": 23.0, "design_draft_m": 8.5, "dwt": 13500, "gross_tonnage": 9500, "mcr_kw": 9000, "ncr_kw": 7650, "design_speed_kn": 18.0, "propeller_type": "FPP", "diameter_m": 5.0, "pitch_m": 4.5, "n_blades": 4, "transverse_area_m2": 700.0, "ref_curve_id": "RC-9700001", "last_dry_dock_date": null}
```

**船隊分組 (§21)。** 9 艘船分為 3 個營運船隊：`FL-IA` 亞洲區間（9700001–3）、
`FL-TP` 跨太平洋（9700004/5/8）、`FL-AE` 亞歐（9700006 WELLNESS / 9700007 /
9700009）。儀表板船隊下拉選單可限縮至單一船隊；`agg_fleet_daily` 另有一個涵蓋全隊
的 `ALL` 彙總列。

### 2.3 `reference_curve`（參考曲線）

粒度：每船每個海試 (sea trial) 速度點一列（每船 12 點，0.5–1.05·Vdes 於 Δ_ref）。
位置：`s3://<DataLakeBucket>/raw/reference_curve/reference_curve.jsonl`。未分割。
這條乾淨船體 (clean-hull) 速度–功率曲線是產生器與 M2 ETL 共用的**單一真實來源** —
共用它正是使植入的速度損失 (speed loss) 可還原的關鍵。

| 欄位 | 型別 | 可空? | 說明 |
|---|---|---|---|
| ref_curve_id | string | 否 | 曲線 id `RC-<imo>` |
| imo_number | string | 否 | 外鍵 → 船 |
| speed_kn | double | 否 | 速度點 (kn) |
| shaft_power_kw | double | 否 | 在 `speed_kn` 與 Δ_ref 下的乾淨船體軸功率 (kW) |
| displacement_ref_mt | double | 否 | 曲線擬合所用的參考排水量 Δ_ref (t) |

```json
{"ref_curve_id": "RC-9700001", "imo_number": "9700001", "speed_kn": 9.0, "shaft_power_kw": 588.6409, "displacement_ref_mt": 19838.3625}
```

### 2.4 `uwi`（水下檢查 underwater inspection）

粒度：每次水下檢查一列。位置：`s3://<DataLakeBucket>/raw/uwi/uwi.jsonl`。未分割。
檢查結果追蹤真實汙損狀態（C10：`hull_fouling_rating` 與真實速度損失相關）。

| 欄位 | 型別 | 可空? | 說明 |
|---|---|---|---|
| inspection_id | string | 否 | `UWI-<imo>-<date>` |
| imo_number | string | 否 | 外鍵 → 船 |
| inspection_date | string | 否 | `YYYY-MM-DD` |
| inspection_type | string | 否 | `diver`（潛水員）/ `ROV`（遙控載具）/ `UWI` |
| hull_fouling_rating | int | 否 | 船體汙損評分（越高越髒） |
| hull_fouling_coverage_pct | double | 否 | 船體汙損面積 % |
| propeller_condition | string | 否 | 魯伯特量表 (Rubert scale) `A`–`F`（A 最光滑／最佳）；由 `propeller_roughness_um` 分級：A[150,210) B[210,270) C[270,330) D[330,390) E[390,470) F[470,600] µm（拋光起點 C=270µm，維修起點 E=390µm） |
| propeller_roughness_um | double | 否 | 螺槳表面粗糙度 (roughness，µm)；獨立、可重設的過程 — 非由船體汙損推導 |
| coating_breakdown_pct | double | 否 | 塗層破損 (coating breakdown) 佔比（% 面積），0–100；獨立、可重設的過程 — 非由船體汙損推導 |
| coating_condition | string | 否 | `good` / `fair` / `poor`；由 `coating_breakdown_pct` 分級：good <20 / fair [20,45) / poor ≥45 |
| recommended_action | string | 否 | `none` / `polish`（拋光）/ `clean`（清潔） |

```json
{"inspection_id": "UWI-9700001-2021-09-18", "imo_number": "9700001", "inspection_date": "2021-09-18", "inspection_type": "diver", "hull_fouling_rating": 31, "hull_fouling_coverage_pct": 41.5888, "propeller_condition": "C", "propeller_roughness_um": 274.7663, "coating_breakdown_pct": 30.0, "coating_condition": "fair", "recommended_action": "polish"}
```

### 2.5 `maintenance_event`（維修事件）

粒度：每筆維修／事件一列。位置：
`s3://<DataLakeBucket>/raw/maintenance_event/maintenance_event.jsonl`。未分割。
只有 **`hull_cleaning`（船體清潔）∪ `dry_dock`（進塢）** 會重設汙損時鐘
（`days_since_cleaning`）；其他事件類型不會。

| 欄位 | 型別 | 可空? | 說明 |
|---|---|---|---|
| event_id | string | 否 | `MV-<imo>-<date>-<type>` |
| imo_number | string | 否 | 外鍵 → 船 |
| event_date | string | 否 | `YYYY-MM-DD` |
| event_type | string | 否 | `hull_cleaning` / `propeller_polishing`（螺槳拋光）/ `dry_dock` / `coating_renewal`（塗層更新）/ `propeller_repair`（螺槳維修）/ `engine_overhaul`（引擎大修 engine overhaul） |
| cost_usd | double | 否 | 現金成本 (USD) |
| downtime_hours | double | 否 | 停役時數（事件全額成本另加 `停役時數·$1000/h`） |
| location | string | 否 | 港口／船廠 |

```json
{"event_id": "MV-9700001-2023-11-25-dry_", "imo_number": "9700001", "event_date": "2023-11-25", "event_type": "dry_dock", "cost_usd": 763713.3099, "downtime_hours": 487.5134, "location": "Dubai"}
```

### 2.6 `fuel_price`（燃油價格）

粒度：每日每種燃油一列（隨機漫步 random walk）。位置：
`s3://<DataLakeBucket>/raw/fuel_price/fuel_price.jsonl`。未分割。M2 以
`(date, fuel_type)` 聯結 (join) 來為超耗燃油成本定價。

| 欄位 | 型別 | 可空? | 說明 |
|---|---|---|---|
| date | string | 否 | `YYYY-MM-DD` |
| fuel_type | string | 否 | `HFO` / `VLSFO` / `MGO` |
| price_usd_per_mt | double | 否 | 加油價 (bunker price，USD/t) |

```json
{"date": "2021-07-01", "fuel_type": "HFO", "price_usd_per_mt": 482.5519}
```

---

## 3. 精煉區 (curated zone，M2)

M2 ETL（`ym_datalake/etl/`）反推產生器所用的完全相同前向物理 —
ISO 15016 海試修正 + ISO 19030 船體／螺槳性能 + 衍生指標 — 將植入的速度損失
還原至感測器雜訊底線 (sensor-noise floor)（閉環 closed-loop C13）。它只讀原始區
（永不讀 `truth/`）。

### 3.1 `fact_performance_daily`（每日性能事實表）

粒度：每船每日一列（主要分析表）。位置：
`s3://<DataLakeBucket>/curated/fact_performance_daily/imo_number=<imo>/year=<yyyy>/month=<mm>/data.jsonl`。
以 **`imo_number`**（列舉）+ **`year`**（整數 `2021,2026`）+ **`month`**（整數
`1,12`，2 位數）投影分割。本文重複 `imo_number`、`year`、`month`（Athena 忽略）。
**ISO／衍生**欄位在靠港日與粗大功率離群值（修正後功率 ≤ 0）上為 null；`eeoi`
另在壓載／零貨量日為 null。

以下公式取自 `corrections.py`、`indicators.py`、`cii.py`；`s = speed_loss_pct/100`，`n = 參考曲線指數`。

| 欄位 | 型別 | 可空? | 說明 |
|---|---|---|---|
| imo_number | string | 否 | *(分割)* IMO 號 |
| year | int | 否 | *(分割)* 日曆年 |
| month | int | 否 | *(分割)* 日曆月 |
| report_date | string | 否 | `YYYY-MM-DD` |
| vessel_name | string | 否 | 船名 |
| voyage_phase | string | 否 | `at_sea` / `in_port` |
| condition_flag | string | 否 | `laden` / `ballast` |
| latitude | double | 否 | 位置緯度 (°)，由每日報告 (noon report) 複製；**每一列**（航行中 + 靠港）皆攜帶，使航跡 (track) 連續。**裝飾性 (decorative)** — 絕不進入物理／CII（§3.1.2） |
| longitude | double | 否 | 位置經度 (°)，由每日報告複製；每一列皆攜帶 |
| port_from | string | 否 | 出發 UN/LOCODE（∈ `dim_port.locode`），由每日報告複製 |
| port_to | string | 否 | 抵達 UN/LOCODE（∈ `dim_port.locode`），由每日報告複製 |
| voyage_no | string | 否 | 航次號，由每日報告複製；以 `(imo_number, voyage_no)` 外鍵 → `fact_voyage.voyage_no` |
| co2_mt | double | 否 | `total_foc · C_F[fuel]` (t)；靠港亦有值 |
| days_since_cleaning | int | 否 | 距最近 `hull_cleaning`/`dry_dock` 的天數（聯集時鐘 union clock，`= min(days_since_dry_dock, days_since_in_water)`）；首週期錨定於視窗起點 |
| days_since_dry_dock | int | 否 | 距最近 `dry_dock` 的天數；首週期錨定於視窗起點 |
| days_since_in_water | int | 否 | 距最近 `hull_cleaning`（水下船體清潔 in-water hull cleaning）的天數；首週期錨定於視窗起點 |
| resistance_wind_kn | double | 靠港 null | Blendermann 風增阻 R_AA (kN) |
| resistance_wave_kn | double | 靠港 null | STAWAVE-1 波增阻 R_AW (kN) |
| power_corrected_kw | double | 靠港 null | `me_shaft_power_kw − ΔP_env`（移除風+浪功率） |
| speed_corrected_kn | double | 靠港 null | `speed_tw_kn`（STW；海流已移除） |
| v_expected_kn | double | 靠港 null | `curve.clean_speed_kn(power_corrected, Δ)` — 乾淨船體期望速度 |
| speed_loss_pct | double | 靠港 null | `(v_expected − STW)/v_expected × 100`（+ = 劣化 degradation） |
| slip_apparent | double | 靠港 null | `(V_th − SOG)/V_th`（用 SOG）視滑失 (apparent slip) |
| slip_real | double | 靠港 null | `(V_th − STW)/V_th`（用 STW）真滑失 (real slip) |
| sfoc_g_kwh | double | 靠港 null | 比油耗 (specific fuel oil consumption)：`me_foc · 1e6 / (me_power · hours)` (g/kWh) |
| admiralty_coef | double | 靠港 null | 海軍係數 (Admiralty coefficient)：`Δ^(2/3) · STW³ / me_power` |
| eeoi | double | 靠港／壓載 null | 能效營運指標 (EEOI)：`co2 · 1e6 / (cargo · distance_og)` (gCO₂/t·nm)；貨量 0 時為 null |
| excess_foc_mt | double | 靠港 null | `me_foc · [1 − (1−s)^n]` — 因汙損浪費的燃油 (t) |
| excess_cost_usd | double | 靠港 null | `excess_foc × fuel_price(date, fuel_type)` |
| cum_excess_cost_usd | double | 靠港 null | 目前汙損週期內 `excess_cost_usd` 的累計 Σ |
| excess_cost_fouling_usd | double | 靠港 null | 燃油代價的汙損 (fouling) 分量（= `excess_cost_usd`） |
| excess_cost_weather_usd | double | 靠港 null | 天氣 (weather) 分量：風浪增阻功率 (`dp_env_kw`) 的燃油成本 |
| excess_cost_operational_usd | double | 靠港 null | 操作 (operational) 分量：引擎負載偏離最佳點的 SFOC 罰則 |
| cii_aer | double | 否 | 年度 AER 達成值 (gCO₂/dwt·nm)，廣播至該年每一天（§3.5） |
| cii_rating_aer | string | 否 | 對基準 AER 參考線的 `A`–`E` 評級 |
| cii_imo | double | 否 | 年度 IMO 達成值（貨櫃船等同 AER） |
| cii_rating_imo | string | 否 | 對該年折減後 `required` 線的 `A`–`E` 評級 |
| anomaly_flag | boolean | 否 | M3：此（imo, date）是否被標記 |
| anomaly_cause | string | 未標記時 null | M3：`engine_degradation`/`propeller`/`weather`/`sensor` |
| anomaly_severity | string | 未標記時 null | M3：`low`/`medium`/`high` |
| valid_flag | boolean | 否 | ISO 19030 閘門（§3.1.1）— 是否可用於趨勢／指標擬合 |

**§3.x 天氣歸因 (weather attribution，可加性)。** 三個 `excess_cost_*_usd` 分量依物理來源
拆解當日燃油代價：`fouling` **等於** `excess_cost_usd`（ISO 19030 速度損失罰則）、`weather`
為 ISO 15016 修正移除的風浪增阻燃油成本、`operational` 為引擎負載偏離最佳點的 SFOC 罰則。
三者為 **可加性**（weather 與 operational 是在 fouling 之上的額外燃油），故深潛頁「超額油費歸因」
圖將三者堆疊為一個 **大於** 既有 `excess_cost_usd` 的總額。三者與 `excess_cost_usd` 同為靠港 null。

**ISO 19030 `valid_flag`**（`filters.py`）：當
`voyage_phase = at_sea` **且**航行中 **且** `STW ≥ 0.5·V_design` **且**
`Beaufort ≤ 6` **且** `Δ ∈ [0.5, 1.2]·Δ_ref` **且**推進欄位有限／為正 時為 true。
水深／舵角濾除 N/A（raw 皆無）；統計離群值剔除屬 M3，故少數植入的感測器離群值
仍會通過 `valid_flag`。

**§3.1.2 位置為裝飾性。** `latitude`/`longitude`/`port_from`/`port_to`/`voyage_no`
直接由每日報告複製，僅用於繪製船隊地圖 (Fleet Map) 與逐船航跡 (track)（M6）以及
彙總 `fact_voyage`（§3.8）。它們**絕不**進入物理：燃油、CII 與 ISO 速度損失皆以
距離與速度為依據，永不用經緯度（見 `synthetic-dataset.md` §9）。下方樣本列早於
Phase 1 欄位；在現行資料集上，它同樣攜帶這五個位置欄位。

```json
{"imo_number": "9700006", "report_date": "2023-03-02", "year": 2023, "month": 3, "vessel_name": "YM WELLNESS", "voyage_phase": "at_sea", "condition_flag": "laden", "co2_mt": 594.4106, "days_since_cleaning": 294, "days_since_dry_dock": 294, "days_since_in_water": 609, "resistance_wind_kn": 304.5735, "resistance_wave_kn": 7.2253, "power_corrected_kw": 38392.0983, "speed_corrected_kn": 20.7254, "v_expected_kn": 21.5495, "speed_loss_pct": 3.824, "slip_apparent": 0.0852, "slip_real": 0.0993, "sfoc_g_kwh": 177.372, "admiralty_coef": 593.4715, "eeoi": 11.3147, "excess_foc_mt": 26.6063, "excess_cost_usd": 14197.2725, "cum_excess_cost_usd": 1322668.6233, "excess_cost_fouling_usd": 14197.2725, "excess_cost_weather_usd": 11105.121, "excess_cost_operational_usd": 183.4828, "cii_aer": 6.35, "cii_rating_aer": "C", "cii_imo": 6.35, "cii_rating_imo": "C", "anomaly_flag": false, "anomaly_cause": null, "anomaly_severity": null, "valid_flag": true}
```

### 3.2 `fact_performance_indicator`（性能指標事實表）

粒度：每船每個 ISO 19030 期間指標一列（長格式 long format）。位置：
`s3://<DataLakeBucket>/curated/fact_performance_indicator/imo_number=<imo>/data.jsonl`。
以 **`imo_number`**（列舉）分割。建於*有效*每日速度損失之上（`periods.py`）。
`value` / `reference_value` / `period_*` / `event_*` / `detail` 的意義
**取決於 `indicator` 代碼**。

| 欄位 | 型別 | 可空? | 說明 |
|---|---|---|---|
| imo_number | string | 否 | *(分割)* IMO 號 |
| indicator | string | 否 | `ISP` / `DDP` / `ME` / `MT`（見下） |
| period_start | string | 僅 ISP | 期間起 `YYYY-MM-DD` |
| period_end | string | ISP、DDP | 期間迄 `YYYY-MM-DD` |
| event_type | string | ME、DDP | 該列所對應的維修事件類型 |
| event_date | string | ME、DDP、MT | 事件／越界日 |
| value | double | 是 | 指標值（依下方代碼） |
| reference_value | double | ISP、ME、DDP | 指標基準（依下方代碼） |
| detail | string | ME、MT | 自由文字細節 |

各代碼語意：

| 代碼 | 意義 | `value` | `reference_value` | 其他 |
|---|---|---|---|---|
| **ISP** | 在役性能 (in-service performance)：各週期平均速度損失 vs 首週期 | 該週期 speed_loss_pct 平均 | 首週期平均 | `period_start`/`period_end` = 週期邊界 |
| **DDP** | 進塢性能 (dry-dock performance)：進塢前後各 ±45 天視窗的平均速度損失 | 進塢**後** 45 天平均 | 進塢**前** 45 天平均 | `event_type=dry_dock`、`event_date`、`period_end`=日期+45 天 |
| **ME** | 維修效益 (maintenance effect)：單一事件的恢復（前 − 後，±30 天） | 前 − 後（+ = 已恢復） | 前視窗平均 | `event_type`、`event_date`、`detail="after=<x>"` |
| **MT** | 維修觸發 (maintenance trigger)：14 天移動平均速度損失首次越過門檻的日期 | `8.0`（門檻） | null | `event_date`=越界日、`detail="trailing-mean speed loss crossed trigger"` |

```json
{"imo_number": "9700006", "indicator": "ISP", "period_start": "2021-07-01", "period_end": "2022-05-12", "event_type": null, "event_date": null, "value": 3.3379, "reference_value": 3.3379, "detail": null}
```

### 3.3 `fact_uwi`

粒度：每次水下檢查一列（raw `uwi` 的直通 pass-through，`imo_number` 本文鍵轉為
分割）。位置：`s3://<DataLakeBucket>/curated/fact_uwi/imo_number=<imo>/data.jsonl`。
以 **`imo_number`**（列舉）分割。

| 欄位 | 型別 | 可空? | 說明 |
|---|---|---|---|
| imo_number | string | 否 | *(分割)* IMO 號 |
| inspection_id | string | 否 | `UWI-<imo>-<date>` |
| inspection_date | string | 否 | `YYYY-MM-DD` |
| inspection_type | string | 否 | `diver` / `ROV` / `UWI` |
| hull_fouling_rating | int | 否 | 船體汙損評分（越高越髒） |
| hull_fouling_coverage_pct | double | 否 | 船體汙損面積 % |
| propeller_condition | string | 否 | 魯伯特量表 `A`–`F`（A 最佳）；由 `propeller_roughness_um` 分級：A[150,210) B[210,270) C[270,330) D[330,390) E[390,470) F[470,600] µm |
| propeller_roughness_um | double | 否 | 螺槳粗糙度 (µm)；獨立、可重設的過程 — 非由船體汙損推導 |
| coating_breakdown_pct | double | 否 | 塗層破損佔比（% 面積），0–100；獨立、可重設的過程 |
| coating_condition | string | 否 | `good` / `fair` / `poor`；由 `coating_breakdown_pct` 分級：good <20 / fair [20,45) / poor ≥45 |
| recommended_action | string | 否 | `none` / `polish` / `clean` |

```json
{"inspection_id": "UWI-9700006-2021-10-06", "imo_number": "9700006", "inspection_date": "2021-10-06", "inspection_type": "UWI", "hull_fouling_rating": 16, "hull_fouling_coverage_pct": 21.7, "propeller_condition": "B", "propeller_roughness_um": 215.1, "coating_breakdown_pct": 8.0, "coating_condition": "good", "recommended_action": "none"}
```

### 3.4 `fact_maintenance_event`

粒度：每筆維修事件一列（raw `maintenance_event` 直通，另加兩個 M3 填入的效益欄）。
位置：`s3://<DataLakeBucket>/curated/fact_maintenance_event/imo_number=<imo>/data.jsonl`。
以 **`imo_number`**（列舉）分割。`me_recovery_pct` / `payback_days` 由 M2 輸出為
null，**由 M3 填入**（`recommendation.py`）。

| 欄位 | 型別 | 可空? | 說明 |
|---|---|---|---|
| imo_number | string | 否 | *(分割)* IMO 號 |
| event_id | string | 否 | `MV-<imo>-<date>-<type>` |
| event_date | string | 否 | `YYYY-MM-DD` |
| event_type | string | 否 | `hull_cleaning` / `propeller_polishing` / `dry_dock` / `coating_renewal` / `propeller_repair` / `engine_overhaul` |
| cost_usd | double | 否 | 現金成本 (USD) |
| downtime_hours | double | 否 | 停役時數 |
| location | string | 否 | 港口／船廠 |
| me_recovery_pct | double | 是 | M3：`ME.value / ME.reference_value × 100` =（前−後）/前 × 100；可為負；無 ME 列時為 null |
| payback_days | double | 是 | M3：事件全額成本 ÷ 每日超耗成本節省（±30 天）；視窗空或節省 ≤ 0 時為 null |

```json
{"event_id": "MV-9700006-2022-05-12-dry_", "imo_number": "9700006", "event_date": "2022-05-12", "event_type": "dry_dock", "cost_usd": 1425326.009, "downtime_hours": 390.2169, "location": "Colombo", "me_recovery_pct": 95.1563, "payback_days": 130.5487}
```

### 3.5 `dim_vessel`（船舶維度）

粒度：每船一列。位置：`s3://<DataLakeBucket>/curated/dim_vessel/dim_vessel.jsonl`。
未分割。**與 raw `vessel_master` 結構完全相同**，但 `last_dry_dock_date` 由該船
最近的 `dry_dock` 事件填入（raw 常留 null）。

欄位：與 `vessel_master`（§2.2）相同的 21 欄（含 `fleet_id`/`fleet_name`）。實務上
僅 `last_dry_dock_date` 可空性不同 — 此處已填入。

```json
{"imo_number": "9700006", "vessel_name": "YM WELLNESS", "vessel_type": "container", "fleet_id": "FL-AE", "fleet_name": "Asia-Europe", "build_year": 2016, "lpp_m": 330.0, "breadth_m": 48.0, "design_draft_m": 15.5, "dwt": 128000, "gross_tonnage": 113000, "mcr_kw": 62000, "ncr_kw": 52700, "design_speed_kn": 23.0, "propeller_type": "FPP", "diameter_m": 9.2, "pitch_m": 8.0, "n_blades": 6, "transverse_area_m2": 2800.0, "ref_curve_id": "RC-9700006", "last_dry_dock_date": "2022-05-12"}
```

### 3.6 `dim_reference_curve`（參考曲線維度）

粒度：每船每個速度點一列（raw `reference_curve` 直通）。位置：
`s3://<DataLakeBucket>/curated/dim_reference_curve/dim_reference_curve.jsonl`。
未分割。欄位：與 `reference_curve`（§2.3）相同的 5 欄。與
`fact_performance_daily` 搭配畫速度–功率散點圖 (scatter plot)。

```json
{"ref_curve_id": "RC-9700001", "imo_number": "9700001", "speed_kn": 9.0, "shaft_power_kw": 588.6409, "displacement_ref_mt": 19838.3625}
```

### 3.7 `agg_fleet_daily`（船隊每日彙總 aggregate）

粒度：每個 **(船隊, 日)** 一列。位置：
`s3://<DataLakeBucket>/curated/agg_fleet_daily/agg_fleet_daily.jsonl`。未分割 —
此處 `fleet_id`/`year`/`month` 是一般本文欄位，**非**分割鍵。`n_alerts` 由 M2 輸出
為 null，**由 M3 填入**。每個日期都有一個合成的 **`fleet_id='ALL'` 彙總列**（涵蓋
全隊，與過去單一粒度彙總完全相同）**加上每個子船隊各一列**
（`FL-IA`/`FL-TP`/`FL-AE`）。儀表板 `fleet_overview` 查詢預設 `fleet_id='ALL'`，
船隊下拉選單則傳入子船隊 id。

| 欄位 | 型別 | 可空? | 說明 |
|---|---|---|---|
| fleet_id | string | 否 | `ALL`（全隊彙總）或子船隊（`FL-IA`/`FL-TP`/`FL-AE`） |
| report_date | string | 否 | `YYYY-MM-DD` |
| year | int | 否 | 日曆年（本文欄位） |
| month | int | 否 | 日曆月（本文欄位） |
| n_vessels | int | 否 | 當日回報的船數（該船隊內） |
| avg_speed_loss_pct | double | 是 | 全船隊有效每日 `speed_loss_pct` 平均 |
| total_excess_cost_usd | double | 是 | 全船隊 `excess_cost_usd` 的 Σ |
| cii_count_a | int | 否 | 當日 CII 評 A 的船數 |
| cii_count_b | int | 否 | 當日 CII 評 B 的船數 |
| cii_count_c | int | 否 | 當日 CII 評 C 的船數 |
| cii_count_d | int | 否 | 當日 CII 評 D 的船數 |
| cii_count_e | int | 否 | 當日 CII 評 E 的船數 |
| n_alerts | int | 否 | M3：當日全船隊被標記的列數 |

```json
{"fleet_id": "ALL", "report_date": "2021-07-01", "year": 2021, "month": 7, "n_vessels": 9, "avg_speed_loss_pct": 5.2652, "total_excess_cost_usd": 110240.0158, "cii_count_a": 2, "cii_count_b": 2, "cii_count_c": 1, "cii_count_d": 1, "cii_count_e": 3, "n_alerts": 0}
{"fleet_id": "FL-AE", "report_date": "2021-07-01", "year": 2021, "month": 7, "n_vessels": 3, "avg_speed_loss_pct": 4.9388, "total_excess_cost_usd": 57549.9189, "cii_count_a": 0, "cii_count_b": 1, "cii_count_c": 1, "cii_count_d": 0, "cii_count_e": 1, "n_alerts": 0}
```

> **務必過濾 `fleet_id`**（例如 `WHERE fleet_id='ALL'`）— 否則掃描會把彙總列與子
> 船隊列重複計入。

**CII 計算**（`cii.py`，年度，廣播至該年每一天）。碳強度指標 (Carbon Intensity
Indicator，CII) 貨櫃船以容量 = DWT，故 AER 與完整 IMO 達成值一致；兩者只差在
評級參考線：

```
attained = Σ_year(total_foc · C_F) · 1e6 / (DWT · Σ_year distance_og)   # gCO2/dwt·nm
CII_ref  = a · DWT^(−c)                     # a = 1984, c = 0.489（MEPC.353，貨櫃）
required = (1 − Z%_year) · CII_ref          # Z%: 2023→5, 2024→7, 2025→9, 2026→11
rating   = A–E 依 dd 向量 (0.83, 0.94, 1.07, 1.19)   # MEPC.354，貨櫃
```

`cii_rating_aer` 對 `CII_ref`（基準）評級；`cii_rating_imo` 對該年折減後
`required` 線評級。

### 3.8 `fact_voyage`（航程事實表 voyage）

粒度：每個 **(imo_number, voyage_no)** 一列 — 一段港口輪替航段 (rotation leg)
**含其靠港日**（該船在兩港之間所處的航程 voyage）。位置：
`s3://<DataLakeBucket>/curated/fact_voyage/imo_number=<imo>/data.jsonl`。以
**`imo_number`**（列舉）分割。由 `ym_datalake/etl/voyages.py::build_voyages` 建立，
將每日報告依 `(imo, voyage_no)` 分組後彙總。距離／FOC／CO₂ **加總原始每日值**，故
逐船能量平衡精確成立（**C18**，curated-dataset §7）。支撐深入探討的可排序航程經濟
(voyage-economics) 表。

| 欄位 | 型別 | 可空? | 說明 |
|---|---|---|---|
| imo_number | string | 否 | *(分割)* IMO 號 |
| voyage_no | string | 否 | 航次號（航段 id） |
| vessel_name | string | 否 | 船名 |
| from_port | string | 否 | 出發 UN/LOCODE（∈ `dim_port.locode`）= 該航段的 `port_from` |
| to_port | string | 否 | 抵達 UN/LOCODE（∈ `dim_port.locode`）= 該航段的 `port_to` |
| depart_date | string | 否 | 分組中最小 `report_date`（`YYYY-MM-DD`） |
| arrive_date | string | 否 | 分組中最大 `report_date`（`YYYY-MM-DD`） |
| distance_nm | double | 否 | 全部列的 Σ 原始 `distance_og_nm` |
| sea_days | int | 否 | 航程中航行中列的數量 |
| avg_speed_kn | double | 零航行時 null | `distance_nm / Σ steaming_hours` |
| total_foc_mt | double | 否 | **全部**列（航行中 + 靠港）的 Σ 原始 `total_foc_mt` → 使 C18 精確 |
| fuel_cost_usd | double | 否 | Σ（`total_foc_mt` × `fuel_price(date, fuel_type)`），每日以其自身燃油類型定價 |
| co2_mt | double | 否 | 依 `(imo, date)` 之每日 `co2_mt` 加總 — 與 `fact_performance_daily` 對帳 |
| avg_speed_loss_pct | double | 無有效日 null | 航行中每日非 null `speed_loss_pct` 的平均 |
| usd_per_nm | double | 零距離 null | `fuel_cost_usd / distance_nm` |
| on_time_flag | boolean | 否 | `(arrive − depart).days ≤ 計畫天數` |
| planned_eta | string | 否 | `depart + round(path_nm / (0.85 · design_speed · 24))` 天；服務速度 = 設計速度 85%（Vdes 折減 derate）→ 約半數航程準點 |

```json
{"imo_number": "9700006", "voyage_no": "1377", "vessel_name": "YM WELLNESS", "from_port": "CNSHA", "to_port": "SGSIN", "depart_date": "2023-01-01", "arrive_date": "2023-01-06", "distance_nm": 2059.7314, "sea_days": 5, "avg_speed_kn": 17.1644, "total_foc_mt": 512.3401, "fuel_cost_usd": 315480.51, "co2_mt": 1614.39, "avg_speed_loss_pct": 3.824, "usd_per_nm": 153.1663, "on_time_flag": false, "planned_eta": "2023-01-05"}
```

> `planned_eta` 的折減（設計速度 85%）是航程**唯一**接觸地理之處：計畫工期取自
> 彎折大圓 (bent great-circle) `route_path` 的長度（`ports.py`），而非船的實際午報
> 位置。實際距離／FOC／CO₂ 仍以回報的每日值為依據。

### 3.9 `dim_port`（港口維度）

粒度：每個**港口**一列（扁平維度）。位置：
`s3://<DataLakeBucket>/curated/dim_port/dim_port.jsonl`。未分割（10 列）。列直接取自
`synthetic_data/ports.py::PORTS`。以 Glue 表形式提供，供**伺服器端聯結
(server-side join)**（例如 `fact_voyage.from_port` → `dim_port.locode`），並藉 `is_eu`
解鎖 Phase 3 由港口判定 EU 範疇的工作。**註記：** 儀表板地圖由 `web/ports.js`（靜態
鏡像 mirror）讀取座標，**而非**由 `dim_port` — `dim_port` 供 Athena／伺服器端使用。

| 欄位 | 型別 | 可空? | 說明 |
|---|---|---|---|
| locode | string | 否 | UN/LOCODE（鍵），如 `SGSIN`、`NLRTM` |
| name | string | 否 | 港名 |
| lat | double | 否 | 港口緯度 (°) |
| lon | double | 否 | 港口經度 (°) |
| is_eu | boolean | 否 | 是否 EU 港？**僅** `NLRTM`（Rotterdam）與 `DEHAM`（Hamburg）為 true |

```json
{"locode": "SGSIN", "name": "Singapore", "lat": 1.27, "lon": 103.83, "is_eu": false}
{"locode": "NLRTM", "name": "Rotterdam", "lat": 51.95, "lon": 4.14, "is_eu": true}
```

10 個 LOCODE 為 `SGSIN`、`NLRTM`、`KRPUS`、`CNSHA`、`LKCMB`、`AEDXB`、`USLAX`、
`DEHAM`、`JPTYO`、`HKHKG`（真實座標）；見 `synthetic-dataset.md` §9。

### 3.10 `fact_speed_profile`（速度剖面事實表 speed profile）

粒度：每個 **(imo_number, speed_kn)** 一列 — 每船 **24** 個速度網格 (speed-grid)
點，涵蓋**設計速度 (design speed) 的 0.5 → 1.0**。位置：
`s3://<DataLakeBucket>/curated/fact_speed_profile/imo_number=<imo>/data.jsonl`。以
**`imo_number`**（列舉）分割。由 `ym_datalake/etl/optimize.py::build_speed_profiles`
建立（curated M2，**Phase 2**）：逐船在參考位移下掃掠參考速度–功率曲線，將乾淨
船殼 (clean hull) 功率以**最新**汙損狀態放大（`P_fouled = P_clean / (1 − s)^n`，
`s` = 最新有效 `speed_loss_pct/100`，`n` = `curve_n`），把汙損後的燃油消耗以最新
船用油價格 (bunker price) 定價，再加上該船每日的**租金／傭船費 (charter/hire)**。所得
`usd_per_nm` 為**凸函數 (convex)** — 純燃油單位成本隨速度單調上升（極小值退化落在
最慢網格點），故是每日的時間成本造出一個位於內部的**經濟航速 (economical speed)**：
`recommended_speed_kn` = `usd_per_nm` 的 argmin（極小值所在點），嚴格位於網格內部
（**C19**，curated-dataset §7）。確定性 (deterministic) — 無亂數 (RNG)、無地面實況
（附加於 M2/M3，故 C1–C18 不受影響）。支撐最佳化 (Optimizer) 頁
（`vessel_speed_profile`）。

| 欄位 | 型別 | 可空? | 說明 |
|---|---|---|---|
| imo_number | string | 否 | *(分割)* IMO 號 |
| speed_kn | double | 否 | 網格速度 (kn)；24 點，`0.5·V_design … 1.0·V_design` |
| shaft_power_kw | double | 否 | 此速度、參考位移下的乾淨船殼軸功率（`curve.clean_power_kw`） |
| foc_mt_per_day | double | 否 | 汙損放大後的每日燃油消耗 `physics.foc_mt(P_fouled, sfoc, 24)`（mt/day） |
| co2_mt_per_day | double | 否 | `foc_mt_per_day × carbon_factor(fuel_type)`（mt/day） |
| fuel_usd_per_day | double | 否 | `foc_mt_per_day × 最新船用油價格`（USD/day） |
| charter_usd_per_day | double | 否 | 逐船租金／傭船費率（USD/day）；靜態 `VesselSpec` 屬性 — 即時間成本。**不**在 `dim_vessel`／`vessel_master` 中 |
| usd_per_day | double | 否 | `fuel_usd_per_day + charter_usd_per_day`（USD/day，總計） |
| usd_per_nm | double | 否 | **總**單位距離成本 `usd_per_day / (speed_kn·24)` — 凸函數，極小值 = 經濟航速 |
| fuel_usd_per_nm | double | 否 | 純燃油單位距離成本 `fuel_usd_per_day / (speed_kn·24)` — 嚴格遞增（分解 decomposition） |
| vessel_name | string | 否 | 船名 *(每個網格列重複)* |
| recommended_speed_kn | double | 否 | 經濟航速 = `usd_per_nm` 的 argmin（內部，C19）*(重複)* |
| current_speed_kn | double | 是 | 最新有效 `speed_corrected_kn`（kn）*(重複；若無有效航行中點則 null)* |
| annual_distance_nm | double | 否 | 依午報日期跨度年化的 Σ 每日 `distance_og_nm`（nm/yr）*(重複)* |

```json
{"imo_number": "9700006", "speed_kn": 11.5, "shaft_power_kw": 3293.75, "foc_mt_per_day": 19.5287, "co2_mt_per_day": 61.5348, "fuel_usd_per_day": 11058.2466, "charter_usd_per_day": 101000.0, "usd_per_day": 112058.2466, "usd_per_nm": 406.0081, "fuel_usd_per_nm": 40.0661, "vessel_name": "YM WELLNESS", "recommended_speed_kn": 15.0, "current_speed_kn": 17.2317, "annual_distance_nm": 141202.5669}
```

13 個本文欄 + 1 個分割鍵。四個船級欄位（`vessel_name`、`recommended_speed_kn`、
`current_speed_kn`、`annual_distance_nm`）在一船的 **24 列上完全相同**（與
`fact_voyage.vessel_name` 同一手法）；以 `speed_kn = recommended_speed_kn` 篩選即可
每船取一列經濟航速。

> `charter_usd_per_day` 是**唯一**的非物理輸入 — 一個靜態 `VesselSpec` 每日傭船
> 費率，並非由任何每日／午報值推導。正是它把單調的純燃油 `fuel_usd_per_nm` 彎成
> 一條具內部極小值的**凸**總 `usd_per_nm`；若拿掉它，argmin 便退化到最慢網格點
> （即 C19 的邊界失敗 boundary failure）。

---

## 4. 精煉區（M3 — 統計洞察 statistical insight）

M3（`compute.py::_apply_m3`，逐船）在 M2 之上加一層統計：分段汙損率趨勢
（`trends.py`）、含規則式成因 (cause) 與嚴重度 (severity) 的點異常
(point-anomaly) 偵測（`anomaly.py`）、維修效益 + 最佳清潔建議
（`recommendation.py`），以及早期預警的警示事件層（`alerts.py`）。它產生新表
`fact_anomaly`、`fact_recommendation`、`fact_maintenance_recommendation` 與
`fact_alert`，並填補 M2 的 null 占位欄（`fact_performance_daily.anomaly_*`、
`fact_maintenance_event.me_recovery_pct`/`payback_days`、
`agg_fleet_daily.n_alerts`）。

> **生物汙損 (biofouling) 是趨勢斜率，永不是點異常成因。** 異常成因集合為
> `{engine_degradation, propeller, weather, sensor}`；漸進的船體汙損表現為
> 分段斜率，而非旗標。

### 4.1 `fact_anomaly`（異常事實表）

粒度：每個被標記的 `(imo, date)` 一列，發射於**主導指標 (driver metric)** —
全域殘差 (residual) z 分數最大的通道。位置：
`s3://<DataLakeBucket>/curated/fact_anomaly/imo_number=<imo>/data.jsonl`。
以 **`imo_number`**（列舉）分割。

| 欄位 | 型別 | 可空? | 說明 |
|---|---|---|---|
| imo_number | string | 否 | *(分割)* IMO 號 |
| report_date | string | 否 | 被標記日 `YYYY-MM-DD` |
| metric | string | 否 | 主導通道：`speed_loss` / `slip` / `sfoc` / `excess_foc` |
| value | double | 否 | 該通道在被標記日的觀測值 |
| z_score | double | 否 | 主導通道的全域（MAD）殘差 z 分數 |
| severity | string | 否 | `low` / `medium` / `high` |
| cause | string | 否 | `engine_degradation` / `propeller` / `weather` / `sensor` |

```json
{"imo_number": "9700006", "report_date": "2021-12-17", "metric": "sfoc", "value": 187.5096, "z_score": 1.1714, "severity": "medium", "cause": "weather"}
```

### 4.2 `fact_recommendation`（維修建議事實表）

粒度：每船一列（扁平 — 此處 `imo_number` 是本文欄位，**非**分割）。位置：
`s3://<DataLakeBucket>/curated/fact_recommendation/fact_recommendation.jsonl`。
未分割。擬合開放週期 (open cycle) 的每日超耗成本率，並以封閉解 (closed form)
最小化週期成本率（`recommendation.py`）：`c(t)=α+β·t`、`J(T)=K/T+α+β·T/2`、
`T*=√(2K/β)`；`K` = 船體清潔全額成本中位數（無清潔史時退回船隊中位數）。

| 欄位 | 型別 | 可空? | 說明 |
|---|---|---|---|
| imo_number | string | 否 | IMO 號（本文欄位） |
| last_cleaning_date | string | 否 | 重建的最近 `hull_cleaning`/`dry_dock` 重設 |
| recommended_clean_date | string | 是 | `last_cleaning + round(T*)` |
| trigger_eta | string | 是 | 開放週期達 **8 %** 速度損失的日期（斜率 ≤ 0 時為 null） |
| t_star_days | double | 是 | `T* = √(2K/β)` — 成本率最小化的週期長度（天） |
| fouling_rate_pct_per_day | double | 是 | 開放週期分段斜率（%/天） |
| net_saving_usd | double | 是 | `∫_{T*}^{trigger}(c(t) − J*) dt` — 相對於在門檻才清潔的節省；除非 trigger ETA 存在且晚於 T*，否則 null |
| status | string | 否 | `ok` / `insufficient_history`（退化：<30 個定價點、β ≤ 0、CI 跨越 0、或無 K） |

```json
{"imo_number": "9700006", "last_cleaning_date": "2025-01-15", "recommended_clean_date": "2025-03-30", "trigger_eta": "2026-11-26", "t_star_days": 74.0, "fouling_rate_pct_per_day": 0.012, "net_saving_usd": 5400000.0, "status": "ok"}
```

`fact_performance_daily.anomaly_*`（§3.1）、`fact_maintenance_event` 的
`me_recovery_pct`/`payback_days`（§3.4）與 `agg_fleet_daily.n_alerts`（§3.7）
是 M3 填補的其他欄位。

### 4.3 `fact_maintenance_recommendation`（維修行動建議事實表）

粒度：每（船, 建議行動）一列，僅在有需要時（扁平 — `imo_number` 是本文欄位，
**非**分割；某船若無待辦則**無任何列**）。位置：
`s3://<DataLakeBucket>/curated/fact_maintenance_recommendation/fact_maintenance_recommendation.jsonl`。
未分割。以**成因→行動決策表 (cause→action decision table)**（`recommendation.py`
之 `recommend_actions`）將僅涵蓋船殼的 `fact_recommendation` 擴展為整體維修行動，
依據最新 `fact_uwi` 狀況、近 **180 天**的 `fact_anomaly` 成因，以及汙損成本模型
(`fact_recommendation`)。**每個行動現在都帶有預測性 (predictive) 的 `due_date`** —
即該行動劣化門檻的預測越界日（在該行動的重設時鐘上做 Theil-Sen 擬合：螺槳拋光 →
300µm、螺槳維修 → 430µm、塗層更新 → 45%、引擎檢查 (engine inspection) → SFOC 效率
損失 +5%），限制在優先級視窗 (priority window) 內，否則退回優先級期限
(priority horizon) 預設值（high +30 天／medium +90 天）；`hull_cleaning` 於
`fact_recommendation.recommended_clean_date` 仍為未來時採用之，否則（逾期 (overdue)）
改用 8% 觸發截止日 (trigger deadline) ／期限。實質上永不為 null。**每個行動同時帶有
與船殼清潔相同的四項分析指標 (analytics)** — 衰退速率 (degradation rate)、門檻預估日
(threshold ETA)，以及（經濟性行動）最佳服務週期 (optimal service interval) `t*` 與
淨節省 (net saving)。

| 欄位 | 型別 | 可空? | 說明 |
|---|---|---|---|
| imo_number | string | 否 | IMO 號（本文欄位） |
| action_type | string | 否 | `hull_cleaning` / `propeller_polishing` / `propeller_repair` / `coating_renewal` / `engine_inspection` |
| priority | string | 否 | `high` / `medium` / `low` |
| due_date | string | 否 | `YYYY-MM-DD`；劣化門檻的預測越界日，限制在優先級視窗內，否則退回優先級期限預設值（high +30 天／medium +90 天）；`hull_cleaning` 於 `fact_recommendation.recommended_clean_date` 仍為未來時採用之，否則（逾期）改用 8% 觸發截止日／期限。實質上永不為 null |
| rationale | string | 否 | 簡短英文佐證字串（UWI 等級、異常次數、成本模型日期） |
| source | string | 否 | `uwi` / `anomaly` / `fouling_model` / `sfoc_trend` / `uwi+anomaly`（觸發之證據來源） |
| degradation_rate | double | 是 | 該行動劣化訊號的 Theil-Sen 斜率（每日）；擬合點太少時為 null |
| degradation_unit | string | 是 | `degradation_rate` 的單位：`%/day`（船殼／塗層／主機）或 `µm/day`（螺槳） |
| current_value | double | 是 | 訊號現值（速度損失 %、螺槳粗糙度 µm、塗層破損 %、SFOC 漂移 %） |
| threshold_value | double | 是 | 行動門檻：8（船殼）、300/430（螺槳拋光／維修 µm）、45（塗層 %）、5（主機 %） |
| trigger_eta | string | 是 | `YYYY-MM-DD`；訊號預計達到 `threshold_value` 的日期（趨勢平坦／下降時為 null） |
| t_star_days | double | 是 | 使總成本最小的最佳服務週期（天）；僅經濟性行動 |
| net_saving_usd | double | 是 | 於 `t*` 服務相對於等到門檻的節省成本；僅經濟性行動，有值時 > 0 |
| plan_date | string | 是 | `YYYY-MM-DD`；此行動所屬批次**窗口 (window)** 的計畫服務日（整合後的「下次維修日」）；同窗口內每個行動共用 |
| plan_service_type | string | 是 | `dry_dock`（進塢）/ `in_water`（水下）— 該窗口是否需要進塢；同窗口內每個行動共用 |

**整合排程器 (consolidated planner)** — `recommendation.plan_maintenance`（於
`recommend_actions` 尾端執行）將各行動分散的到期日整合成共用的服務窗口：進塢行動
（`coating_renewal` / `propeller_repair`）以其最早到期日錨定一個窗口；水下行動
（`hull_cleaning` / `propeller_polishing` / `engine_inspection`）併入 ±60 天內最近的
進塢窗口，否則自行分組。每列標記所屬窗口的 `plan_date`（窗口內最早的限制到期日）與
`plan_service_type`（窗口內含任何進塢行動則為 `dry_dock`，否則為 `in_water`）；儀表板
依 `plan_date` 將扁平列分組顯示。完整批次演算法詳見 `fact_maintenance_recommendation`
技能文件。

`hull_cleaning` 列**自帶 (self-carries)** 其 `fact_recommendation` 成本模型。經濟模型：
船殼／主機為資料驅動 (data-driven)；螺槳／塗層以一個具文件說明的 POC 懲罰係數
(penalty coefficient)（每單位訊號的額外主機功率占比）換算成本 — 詳見
`fact_maintenance_recommendation` 技能文件 (skill doc)。

```json
{"imo_number": "9700006", "action_type": "hull_cleaning", "priority": "high", "due_date": "2025-03-30", "rationale": "fouling cost model recommends cleaning by 2025-03-30; 8% speed-loss trigger ETA 2026-11-26", "source": "fouling_model", "degradation_rate": 0.041, "degradation_unit": "%/day", "current_value": 9.13, "threshold_value": 8.0, "trigger_eta": "2026-11-26", "t_star_days": 90.0, "net_saving_usd": 97231.6, "plan_date": "2025-03-30", "plan_service_type": "in_water"}
{"imo_number": "9700006", "action_type": "propeller_polishing", "priority": "medium", "due_date": "2025-06-15", "rationale": "propeller condition Rubert C; 2 anomalies caused by propeller fouling in 180d", "source": "uwi+anomaly", "degradation_rate": 0.63, "degradation_unit": "µm/day", "current_value": 362.0, "threshold_value": 300.0, "trigger_eta": "2025-06-15", "t_star_days": 166.0, "net_saving_usd": 2852.6, "plan_date": "2025-06-15", "plan_service_type": "in_water"}
```

### 4.4 `fact_alert`（警示事件表）

粒度：每個 **開啟中警示事件** `(imo, cause, opened_date)` 一列。位置：
`s3://<DataLakeBucket>/curated/fact_alert/imo_number=<imo>/data.jsonl`。以
**`imo_number`**（列舉）分割。這是點事實之上的推升／敘事層（`alerts.py`），本身
不做新偵測。兩個來源：**點異常事件**（連續同 `cause` 的 `fact_anomaly` 日以
**7 天**間隔容忍度收斂；`source=anomaly`）與**船體生物汙損趨勢**（取自
`fact_recommendation` 的正汙損率 + 觸發 ETA，以及近 14 日速度損失相對 8 % 門檻；
`source=fouling_model`）。生物汙損在此**是一種成因**，即使它在 `fact_anomaly` 中
刻意**永不**作為點異常成因。支撐儀表板 `fleet_alerts` / `vessel_alerts` 動態列表與
船隊總覽的「作用中警示」KPI。

| 欄位 | 型別 | 可空? | 說明 |
|---|---|---|---|
| imo_number | string | 否 | *(分割)* IMO 號 |
| alert_id | string | 否 | `AL-<imo>-<opened_date>-<cause>`（每事件唯一） |
| fleet_id | string | 否 | 營運船隊（`FL-IA`/`FL-TP`/`FL-AE`） |
| opened_date | string | 否 | 事件起始 `YYYY-MM-DD`（生物汙損：清潔週期起點） |
| last_seen_date | string | 否 | 最近一次被標記日（生物汙損：最新回報日） |
| cause | string | 否 | `hull_biofouling`/`propeller`/`engine_degradation`/`weather`/`sensor` |
| severity | string | 否 | `low`/`medium`/`high`（事件峰值） |
| driver_metric | string | 否 | `speed_loss`/`slip`/`sfoc`/`excess_foc`（生物汙損 = `speed_loss`） |
| peak_value | double | 是 | 峰值處的驅動指標值（生物汙損：近 14 日速度損失 %） |
| peak_z | double | 是 | 事件峰值殘差 z 分數（**生物汙損為 null** — 是趨勢而非 z） |
| excess_cost_usd | double | 是 | 視窗超耗燃油成本（生物汙損：本週期累計汙損罰則） |
| recommended_action | string | 否 | 雙語 `中文 (English)` 建議行動 |
| status | string | 否 | `open`（唯一值；ack 為儀表板本地狀態） |
| source | string | 否 | `anomaly`（點事件）／`fouling_model`（生物汙損趨勢） |
| message_zh | string | 否 | 中文敘述 |
| message_en | string | 否 | 英文敘述 |

```json
{"imo_number": "9700006", "alert_id": "AL-9700006-2021-07-03-weather", "fleet_id": "FL-AE", "opened_date": "2021-07-03", "last_seen_date": "2021-07-03", "cause": "weather", "severity": "medium", "driver_metric": "speed_loss", "peak_value": 2.5432, "peak_z": 1.3037, "excess_cost_usd": 4467.0161, "recommended_action": "持續監控，與海氣象相關 (Monitor; weather-related)", "status": "open", "source": "anomaly", "message_zh": "惡劣海氣象：1 天異常（2021-07-03–2021-07-03），峰值 z=1.3，估計燃油損失 $4,467", "message_en": "Heavy weather: 1 anomaly-day (2021-07-03–2021-07-03), peak z=1.3, est. excess fuel $4,467"}
{"imo_number": "9700006", "alert_id": "AL-9700006-2025-01-15-hull_biofouling", "fleet_id": "FL-AE", "opened_date": "2025-01-15", "last_seen_date": "2026-06-30", "cause": "hull_biofouling", "severity": "medium", "driver_metric": "speed_loss", "peak_value": 6.0045, "peak_z": null, "excess_cost_usd": 4031011.4957, "recommended_action": "規劃船體清潔 (Plan hull cleaning)", "status": "open", "source": "fouling_model", "message_zh": "船體生物附著：速度損失趨勢上升，近 14 日平均 6.0%（門檻 8%），預估 2026-11-27 觸發，UWI 汙損等級 32，本週期燃油損失 $4,031,011", "message_en": "Hull biofouling: speed loss trending up, 14-day mean 6.0% (trigger 8%), est. trigger 2026-11-27, UWI fouling rating 32, cycle excess fuel $4,031,011"}
```

---

## 5. 列舉／域 (enum / domain) 參考

允許值，已對照產生器／ETL 原始碼與 `tmp/`（`--seed 42`）中實際出現的相異值確認。

| 欄位 | 表 | 允許值 |
|---|---|---|
| `voyage_phase` | noon_report, fact_performance_daily | `at_sea`、`in_port` ¹ |
| `condition_flag` | noon_report, fact_performance_daily | `laden`、`ballast` |
| `fuel_type` | noon_report | `HFO`（含洗滌器船 9700003/9700009 於海上）、`VLSFO`（其他海上）、`MGO`（靠港） |
| `fuel_type` | fuel_price | `HFO`、`VLSFO`、`MGO` |
| `data_source` | noon_report | `sensor` |
| `event_type` | maintenance_event, fact_maintenance_event | `hull_cleaning`、`propeller_polishing`、`dry_dock`、`coating_renewal`、`propeller_repair`、`engine_overhaul` ² |
| `inspection_type` | uwi, fact_uwi | `diver`、`ROV`、`UWI` |
| `propeller_condition` | uwi, fact_uwi | `A`、`B`、`C`、`D`、`E`、`F`（魯伯特量表；A 最佳） |
| `coating_condition` | uwi, fact_uwi | `good`、`fair`、`poor`（由 `coating_breakdown_pct` 分級：good <20 / fair [20,45) / poor ≥45） |
| `recommended_action` | uwi, fact_uwi | `none`、`polish`、`clean` |
| `cii_rating_aer`, `cii_rating_imo` | fact_performance_daily | `A`、`B`、`C`、`D`、`E` |
| `indicator` | fact_performance_indicator | `ISP`、`DDP`、`ME`、`MT` |
| `event_type` | fact_performance_indicator | `dry_dock`、`hull_cleaning`、`propeller_polishing`、`coating_renewal`，或 null（ISP/MT 列） |
| `metric` | fact_anomaly | `speed_loss`、`slip`、`sfoc`、`excess_foc` |
| `driver_metric` | fact_alert | `speed_loss`、`slip`、`sfoc`、`excess_foc` |
| `cause` | fact_anomaly, fact_performance_daily | `engine_degradation`、`propeller`、`weather`、`sensor` |
| `cause` | fact_alert | `hull_biofouling`、`propeller`、`engine_degradation`、`weather`、`sensor`（生物汙損**僅**此處） |
| `severity` | fact_anomaly, fact_performance_daily, fact_alert | `low`、`medium`、`high` |
| `status` | fact_recommendation | `ok`、`insufficient_history` ³ |
| `status` | fact_alert | `open`（唯一值；ack 為儀表板本地狀態） |
| `action_type` | fact_maintenance_recommendation | `hull_cleaning`、`propeller_polishing`、`propeller_repair`、`coating_renewal`、`engine_inspection` |
| `priority` | fact_maintenance_recommendation | `high`、`medium`、`low` |
| `source` | fact_maintenance_recommendation | `uwi`、`anomaly`、`fouling_model`、`sfoc_trend`、`uwi+anomaly` |
| `source` | fact_alert | `anomaly`（點事件）、`fouling_model`（生物汙損趨勢） |
| `fleet_id` | vessel_master, dim_vessel | `FL-IA`、`FL-TP`、`FL-AE` |
| `fleet_id` | agg_fleet_daily | `ALL`（彙總）、`FL-IA`、`FL-TP`、`FL-AE` |
| `locode` | dim_port | `SGSIN`、`NLRTM`、`KRPUS`、`CNSHA`、`LKCMB`、`AEDXB`、`USLAX`、`DEHAM`、`JPTYO`、`HKHKG` |
| `port_from`、`port_to` | noon_report, fact_performance_daily | 上列 10 個 `dim_port.locode` 值 |
| `from_port`、`to_port` | fact_voyage | 上列 10 個 `dim_port.locode` 值 |
| `is_eu` | dim_port | `true`（僅 NLRTM、DEHAM）、`false`（其餘 8 個） |

¹ 規格允許 `anchor`/`maneuvering`；產生器只發射 `at_sea`/`in_port`。
² `propeller_repair` 是產生器中合法的 `event_type`，但未出現在 `--seed 42`
資料集中。`propeller_polishing`/`coating_renewal`/`propeller_repair`/`engine_overhaul`
**不會**重設汙損時鐘 — 只有 `hull_cleaning` ∪ `dry_dock` 會；`engine_overhaul`
是輕度的引擎重設，而非汙損重設。各過程的重設時鐘為：船體汙損 =
`hull_cleaning` ∪ `dry_dock`；螺槳 = `propeller_polishing` ∪ `dry_dock`；
塗層 = `coating_renewal` ∪ `dry_dock`；引擎 = `engine_overhaul` ∪ `dry_dock`。
³ `--seed 42` 資料集只出現 `ok`；`insufficient_history` 是退化占位。

**燃油常數**（`synthetic_data/physics.py`）：

| 燃油 | 碳因子 (carbon factor) C_F (tCO₂/t) | 低位發熱值 (MJ/kg) |
|---|---|---|
| HFO | 3.114 | 40.2 |
| VLSFO | 3.151 | 41.0 |
| MGO / LSMGO | 3.206 | 42.7 |

---

## 6. Athena 查詢範例

於 Athena 主控台（資料庫 `ym_datalake_poc`、工作群組 `ym-datalake-poc`）或已部署的
查詢 Lambda 執行。分割表上**務必加分割述詞**讓投影修剪掃描範圍，並對日期字串
**`CAST`** 以利排序／運算。

```sql
-- 1. 單一船-年的列數（分割修剪：imo_number + year）
SELECT count(*)
FROM noon_report
WHERE imo_number = '9700006' AND year = 2023;

-- 2. YM WELLNESS 每日速度損失，僅有效點（修剪 imo/year/month，CAST 日期）
SELECT report_date, speed_loss_pct, cum_excess_cost_usd, cii_rating_aer
FROM fact_performance_daily
WHERE imo_number = '9700006' AND year = 2024 AND month = 8
  AND valid_flag = true
ORDER BY CAST(report_date AS date);

-- 3. 單一船的異常成因 × 嚴重度分佈
SELECT cause, severity, count(*) AS n
FROM fact_anomaly
WHERE imo_number = '9700006'
GROUP BY cause, severity
ORDER BY n DESC;

-- 4. 船隊維度（全掃描 — 小型扁平表）
SELECT imo_number, vessel_name, dwt, design_speed_kn, last_dry_dock_date
FROM dim_vessel
ORDER BY imo_number;

-- 5. 船隊趨勢：月平均速度損失 + 總超耗成本
SELECT year, month,
       round(avg(avg_speed_loss_pct), 2)   AS avg_speed_loss_pct,
       round(sum(total_excess_cost_usd), 0) AS excess_cost_usd,
       sum(n_alerts)                        AS alerts
FROM agg_fleet_daily
GROUP BY year, month
ORDER BY year, month;

-- 6. 單一船的期間指標（ISP/DDP/ME/MT 長格式）
SELECT indicator, period_start, period_end, event_type, event_date, value, reference_value
FROM fact_performance_indicator
WHERE imo_number = '9700006'
ORDER BY indicator, event_date;

-- 7. 各船的清潔建議 + 淨節省
SELECT imo_number, last_cleaning_date, recommended_clean_date, trigger_eta,
       t_star_days, net_saving_usd, status
FROM fact_recommendation
WHERE imo_number = '9700006';

-- 8. 單一船的航程經濟（分割修剪：imo_number），聯結港口
SELECT v.voyage_no, v.from_port, p.name AS from_name, v.to_port,
       v.depart_date, v.arrive_date, v.distance_nm, v.avg_speed_kn,
       v.total_foc_mt, v.fuel_cost_usd, v.usd_per_nm, v.on_time_flag
FROM fact_voyage v
JOIN dim_port p ON v.from_port = p.locode
WHERE v.imo_number = '9700006'
ORDER BY CAST(v.depart_date AS date);

-- 9. 每船最新位置，供船隊地圖使用（row_number 視窗，約 9 列）
SELECT imo_number, vessel_name, report_date, latitude, longitude,
       speed_loss_pct, cii_rating_aer, voyage_phase, port_from, port_to, voyage_no
FROM (
  SELECT *, row_number() OVER (PARTITION BY imo_number ORDER BY report_date DESC) AS rn
  FROM fact_performance_daily
) WHERE rn = 1
ORDER BY imo_number;
```

### 6.1 儀表板 ↔ 查詢 ↔ 表 對應（`poc-spec.md` §8.6）

全部 18 個 `query_type`（`queries.py::QUERY_TYPES`）皆對應一個儀表板元件：

| 儀表板元件 | `query_type` | 主要表 |
|---|---|---|
| 船隊 KPI／表／地圖（以 `fleet_id` 參數限縮，預設 `ALL`） | `fleet_overview` | `agg_fleet_daily`、`dim_vessel` |
| 船隊船舶名冊／深入探討頁頭資訊 | `fleet_vessels` | `dim_vessel` |
| 船隊分組下拉選單 | `fleet_list` | `dim_vessel` |
| 船隊警示動態列表／「作用中警示」KPI | `fleet_alerts` | `fact_alert` |
| Speed Loss 趨勢 + 事件 | `vessel_speed_loss` | `fact_performance_daily`、`fact_maintenance_event`、`fact_uwi` |
| 深入探討 Slip／SFOC／Admiralty／燃油／CII 面板；船隊表逐船 CII／異常數欄位 | `vessel_metrics` | `fact_performance_daily` |
| Speed–Power 散點 | `vessel_speed_power` | `fact_performance_daily`、`dim_reference_curve` |
| 異常時間軸 | `vessel_anomalies` | `fact_anomaly` |
| 單船警示面板 | `vessel_alerts` | `fact_alert` |
| 維修效益 | `vessel_maintenance_effect` | `fact_maintenance_event` |
| 船殼清潔最佳化（t*/淨節省） | `vessel_recommendation` | `fact_recommendation` |
| 維修建議（分組規劃窗口／船隊下一步維修） | `vessel_maintenance_recommendation` | `fact_maintenance_recommendation` |
| Planner 頁 — 船隊維修待辦（甘特圖／各季資本支出／ROI 待辦）；`est_cost_usd` 查詢時衍生 | `fleet_maintenance_recommendation` | `fact_maintenance_recommendation`、`fact_maintenance_event` |
| 最新水下檢查面板 | `vessel_uwi` | `fact_uwi` |
| 船隊地圖 (Fleet Map) — 每船一點於最新位置 | `fleet_positions` | `fact_performance_daily` |
| 深入探討逐船航跡地圖（每日位置折線） | `vessel_track` | `fact_performance_daily` |
| 深入探討可排序航程經濟表 | `vessel_voyages` | `fact_voyage` |
| 最佳化 (Optimizer) 頁 — 船用油／慢速航行 (slow-steaming) 每浬美元曲線（目前／經濟／排程標記、即時節省） | `vessel_speed_profile` | `fact_speed_profile` |
