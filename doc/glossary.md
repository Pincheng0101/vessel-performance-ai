# 航運術語辭典 (Shipping & Vessel-Performance Terminology)

本檔是本專案的**單一權威術語辭典 (single source of truth for terminology)**。專案為陽明海運
(Yang Ming) 船舶效能分析：以**真實的**去識別化午報 (Noon Report)、船舶主檔與維修事件為輸入，
套用 ISO 15016 / ISO 19030 國際標準公式，再疊加異常偵測 (anomaly detection)、碳強度指標 (CII)
與維修最佳化，落地為 20 張 Athena 資料表。

**數值以程式碼為權威。** 每則術語標註其實作位置；若本檔與程式碼不一致，**以程式碼為準**，本檔即為
臭蟲 (bug)。本檔所有數字均已對照 `ym_datalake/` 原始碼與線上資料湖 (data lake) 查核。

> 相關文件：資料字典 (data dictionary) 見 [`schema.md`](schema.md)；來源檔案見
> [`dataset.md`](dataset.md)；精煉區演算法見 [`curated-dataset.md`](curated-dataset.md)；
> **哪些欄位是合成的**見 [`synthetic-dataset.md`](synthetic-dataset.md)；ISO 19030 方法見
> [`iso-19030.md`](iso-19030.md)；船舶諸元反推見 [`vessel.md`](vessel.md)。

---

## 0. 讀本檔之前：三個必要前提

### 資料是真的，疊加層是估計的 (Real data, estimated overlay)

`dataset/vt_fd.csv`（21,282 筆午報）、`dataset/vessel.jsonl`（15 艘）、`dataset/maintenance.csv`
（77 筆事件）是**真實的去識別化營運資料**，原封不動落地於原始區 (raw zone)。本專案**沒有資料
產生器 (generator)，也沒有地面實況 (ground truth)**——無從比對「植入的真值」，因為沒有植入。

但為了讓分析可行，部分欄位是**合成 (synthesized) 的估計值**，集合為：**日曆紀元 (calendar
epoch)、全部地理資訊 (lat/lon/heading/港口)、全部美金金額 (USD)、IMO 船舶識別號、UWI 的四個數值
訊號、以及維修事件的成本/停役/地點**。這些欄位在 `schema.md` 標記為 `estimated`，**永遠不可當作
事實引用 (never quote as fact)**。

### 沒有任何資料表分割 (No partitions)

全湖約 4 MB，遠低於分割修剪 (partition pruning) 划算的規模。**20 張表全部未分割**，`ship_id` 是
普通欄位而非分割鍵 (partition key)。不要寫分割述詞 (partition predicate)。

### 時間是相對日整數 (Relative-day integer axis)

`noon_utc` / `event_day` / `inspection_day` / `fuel_price.day` 共用同一條**相對日**軸，第 0 天到
第 1825 天（約 5 年）。原始區**完全沒有日曆**；精煉區 (curated zone) 才補上日曆，且該日曆的紀元
本身就是估計值（見〈日曆紀元〉）。

---

## 目錄 (Table of Contents)

1. [法規與標準](#1-法規與標準)
2. [碳排放與能效指標](#2-碳排放與能效指標)
3. [船體與螺槳性能指標](#3-船體與螺槳性能指標)
4. [物理與環境修正](#4-物理與環境修正)
5. [船舶規格與尺寸](#5-船舶規格與尺寸)
6. [載況與靜水力](#6-載況與靜水力)
7. [氣海象環境](#7-氣海象環境)
8. [航行與推進](#8-航行與推進)
9. [燃油與機械](#9-燃油與機械)
10. [汙損與維護行動](#10-汙損與維護行動)
11. [水下檢查與船況](#11-水下檢查與船況)
12. [成本與經濟](#12-成本與經濟)
13. [統計與分析方法](#13-統計與分析方法)
14. [資料與系統概念](#14-資料與系統概念)

---

## 1. 法規與標準

### 國際海事組織 (International Maritime Organization, IMO)

聯合國轄下負責船舶安全與海洋環境保護的專門機構。制定防止船舶污染國際公約 (MARPOL) 與其下的海洋
環境保護委員會 (MEPC) 決議，是 CII 等能效法規的來源。

### IMO 船舶識別號 (IMO Number)

IMO 核發的船舶唯一識別碼，終生不變。**本專案的 `imo_number` 是合成的** (`9800001`–`9800015`)，
**不是真實 IMO 號**，也**不是分割鍵**——它只是 `dim_vessel` 上一個估計欄位。真正的船舶主鍵是
去識別化的 `ship_id`（`S1`…`S23`）。

### 防止船舶污染國際公約 (MARPOL)

International Convention for the Prevention of Pollution from Ships。其附則六 (Annex VI) 規範船舶
大氣排放，是 CII 碳強度法規的母法脈絡。

### 海洋環境保護委員會決議 (MEPC.352/353/354(78))

**MEPC.352(78)** 定 CII 計算方法、**MEPC.353(78)** 定各船型參照線係數 `a, c`、**MEPC.354(78)** 定
A–E 評級的 dd 邊界向量。本專案採其貨櫃船 (container ship) 公告值（見〈CII 參照線〉、
〈dd 評級邊界向量〉）。碳因子採 **MEPC.308(73)**。

### ISO 15016 船舶速度功率修正標準 (ISO 15016)

規範如何把受環境干擾的量測值修正到參考條件，取得可比較的**修正功率 (corrected power)** 與**修正
船速 (corrected speed)**。本專案實作於 `etl/curated/corrections.py`。

> ⚠️ **實測結果：本資料集上此修正是「不作用」的。** 見〈修正功率〉——修正慣例 (convention) 由執行期
> 擇優選出，而勝出者是 `none`，故 `power_corrected_kw` 恆等於量測的 `horse_power`（線上資料 20,036
> 筆非空列，100% 相等）。風阻/浪阻仍然計算並保留，供成本歸因使用。

### ISO 19030 船體與螺槳性能量測標準 (ISO 19030)

規範以**百分比速度損失 (percentage speed loss)** 量化船體與螺槳性能衰退，並定義 ISP / DDP / ME /
MT 四個週期指標。它同時提供資料過濾準則（穩態、深水、低風浪），本專案以 `valid_flag` 落實（見
〈有效點旗標〉）。

### CII 碳強度法規 (Carbon Intensity Indicator regulation)

IMO 自 2023 年起對 5,000 總噸 (GT) 以上船舶施行的營運碳強度規範：每年計算達成值 (attained CII)，
對照逐年折減的 required 線，給予 A–E 評級。實作於 `etl/curated/cii.py`。

### 逐年折減率 (Reduction Factor, Z%)

required 線相對基準參照線的逐年加嚴百分比：`required = (1 − Z%) · CII_ref`。程式碼權威值
（`cii.py:20`）：

| 年 | 2021 | 2022 | 2023 | 2024 | 2025 | 2026 | 其他 |
|---|---|---|---|---|---|---|---|
| Z% | 0 | 0 | **5** | **7** | **9** | **11** | 11 |

折減的效果在資料上看得見：2023 年以前 AER 評級與 IMO 評級完全一致；2024 年起同一達成值的 IMO 評級
開始落後 AER 一級（如 2025 年有 3,223 個船日 AER=A 但 IMO=B）。

### UN/LOCODE 聯合國港口代碼 (UN/LOCODE)

5 碼的港口代碼（前 2 碼國家、後 3 碼地點，如 `KRPUS` = 韓國釜山、`NLRTM` = 荷蘭鹿特丹）。
`dim_port` 收錄 10 個真實港口，但**本船隊從未真正靠泊過它們**——港口是合成航線的產物（見
〈合成地理〉）。

---

## 2. 碳排放與能效指標

### 碳強度指標 (Carbon Intensity Indicator, CII)

船舶每載重噸·海里的 CO₂ 排放量評級 (A–E)，A 最佳。屬**年度**指標，本專案逐船×年計算後**廣播
(broadcast)** 至該年每一天的資料列（`fact_performance_daily.cii_*`）。貨櫃船的容量 (capacity) 即
載重噸 (DWT)，故 `cii_aer` 與 `cii_imo` **數值完全相同**，只差在評級所對照的線。

### CII 達成值 (Attained CII)

`attained = Σ_year(co2_mt) · 1e6 / (DWT · Σ_year total_distance)`，單位 gCO₂/dwt·nm
（`cii.py:60`）。分子分母皆對該年**所有**日資料求和（不套 `valid_flag`）。

### CII 參照線 (CII Reference Line, CII_ref)

`CII_ref = a · DWT^(−c)`，貨櫃船 **a = 1984、c = 0.489**（MEPC.353，`cii.py:17-18`）。

### CII 評級（AER 基準）(cii_rating_aer)

達成值對**未折減的基準參照線** `CII_ref` 評出的 A–E 等級。

### CII 評級（IMO 折減線）(cii_rating_imo)

達成值對**該年折減後的 required 線** `(1 − Z%)·CII_ref` 評出的 A–E 等級。因逐年折減，同一達成值在
後續年份會逐步變差。

### dd 評級邊界向量 (dd Vector)

把「達成值 / 參照線」比值切成 A–E 五級的邊界乘數，貨櫃船為 **(0.83, 0.94, 1.07, 1.19)**
（MEPC.354，`cii.py:19`）：比值 ≤0.83 為 A、≤0.94 為 B、≤1.07 為 C、≤1.19 為 D，其上為 E。

### 年度效率比 (Annual Efficiency Ratio, AER)

每載重噸·海里的 CO₂ 排放量 (gCO₂/dwt·nm)，越低越佳。貨櫃船以 DWT 為容量，故 AER 達成值與 IMO
達成值相同。

### 能效營運指標 (Energy Efficiency Operational Indicator, EEOI)

每**貨噸**·海里的 CO₂ 排放量：`eeoi = co2_mt · 1e6 / (cargo_on_board · total_distance)`，單位
gCO₂/t·nm（`physics.py:132`）。以實際載貨量為分母，反映真實運輸效率；壓載或零貨量日為 null。

### 二氧化碳排放量 (CO₂ Emissions, co2_mt)

`co2_mt = total_consump · C_F[當日燃油]`（`daily.py:118`）。用**全船總油耗**乘上**當日主燃油**的
碳因子。

### 碳因子 (Carbon Factor, C_F)

每噸燃油完全燃燒的 CO₂ 排放係數 (tCO₂/t)，MEPC.308(73)（`fuel.py:38`）：

| 燃油 | HSHFO | ULSFO | VLSFO | LSMGO | BIO_HSFO |
|---|---|---|---|---|---|
| C_F | 3.114 | 3.151 | 3.151 | 3.206 | **3.114** |

`BIO_HSFO` **刻意沿用化石 HSHFO 的因子**（保守估計，不給生質燃油減碳優惠）。

### 主機燃油消耗率 (Specific Fuel Oil Consumption, SFOC)

每產生 1 kWh 軸功率所耗燃油克數 (g/kWh)，越低越省油。來源即午報的 `sfoc` 欄位（精煉區改名
`sfoc_g_kwh`，並經離群裁剪至 120–400）。是引擎狀態指標——**速度損失未升但 SFOC 升 → 研判引擎劣化
(engine degradation)**。

---

## 3. 船體與螺槳性能指標

ISO 19030 核心指標。**速度損失正值 = 效能衰退**（同功率下比乾淨船體慢），數值越大越糟，維修後應
階梯下降——全系統一致採此正負號慣例。

### 速度損失 (Speed Loss, speed_loss_pct)

相同（修正）主機功率下，實際對水船速較乾淨船體基準的下降百分比：

```
speed_loss_pct = (v_expected_kn − STW) / v_expected_kn × 100     # daily.py:113
```

正值 = 劣化。是本專案的主指標。**注意：它在每一列都會計算**（含 `valid_flag = false` 的列）；
`valid_flag` 只規範「哪些點可以拿來擬合/趨勢分析」，不規範哪些點有值。

### 期望船速 / 乾淨船速 (Expected / Clean-hull Speed, v_expected_kn)

在修正功率下由乾淨船體速度–功率曲線反解的應有船速：

```
v_expected = (P_corrected / (a · (Δ/Δ_ref)^(2/3)))^(1/n)          # reference_curve.py:81
```

### 乾淨船體參考曲線 (Clean-hull Reference Curve)

`P = a · V^n · (Δ/Δ_ref)^(2/3)`（`reference_curve.py:76`）。**每艘船一組 `curve_a` / `curve_n`**，
存於 `reference_curve` / `dim_reference_curve`（15 船 × 12 個速度點 = 180 列，速度網格
0.50–1.05 × 設計船速）。

### 部分池化擬合 (Partially Pooled Fit)

曲線擬合的核心設計（`reference_curve.py:178-217`）：

- **`curve_n`（速度指數）是「池化 (pooled)」的**——同一 `(hull_class, propeller_variant)` 池共用一
  個指數。它是船型的性質，單船約 26 個乾淨點無法定出，但整池數百點可以。池內點數 < 30 時，池擴大到
  整個 `hull_class`（`fit_pool` 欄位記錄實際用的池）。指數夾在 **[2.5, 4.5]**。
- **`curve_a`（尺度）是「逐船 (per ship)」擬合的**——姊妹船並不全等。若用池化的尺度，各船自身的基準
  效率差異會變成速度損失的常數偏移，**那個偏移足以讓一次清潔看起來把船弄得更糟**。單船乾淨點
  < 8 (`MIN_SHIP_FIT_POINTS`) 時才退回池值（`n_fit_points` 欄位可查；S6、S8、S21、S22 屬之）。

擬合樣本 = **乾淨視窗 (clean window)**：每艘船的首日與每次 UWC/DD 事件日之後 **60 天**內、且通過
`valid_flag` 的點（`reference_curve.py:96`）。注意 **PP（螺槳拋光）不開啟乾淨視窗**。

### 螺槳滑失率 (Propeller Slip, slip_apparent / slip_real)

理論航距與實際航距的差異比例。先由螺距 (pitch) 與轉速求理論船速：

```
V_th = pitch_m · rpm · 60 / 1852       (kn)                       # physics.py:101
slip = (V_th − V) / V_th                                          # physics.py:109
```

- **視滑失 (apparent slip)** 用對地船速 (SOG, `avg_speed`)
- **真滑失 (real slip)** 用對水船速 (STW, `speed_through_water`)

⚠️ 兩者皆為**分數 (fraction)，不是百分比**——`slip_real = 0.05` 代表 5%。真滑失突升是螺槳異常的
主要判據。

### 海軍係數 (Admiralty Coefficient, admiralty_coef)

簡易船體推進效率基準：`C_A = Δ^(2/3) · STW³ / P`（`physics.py:129`）。**數值下降代表船體/螺槳汙損
加劇**。注意它餵入的是**原始 `horse_power`**，不是修正功率。它同時是 `valid_flag` 的守門條件之一
（合理帶 300–1300）。

### 在役性能指標 (In-service Performance, ISP)

ISO 19030 週期指標：各汙損週期的平均速度損失，對照**首週期**。`value` = 該週期平均、
`reference_value` = 首週期平均。週期由 UWC/DD 切分。線上 34 列，涵蓋 15 艘船。

### 進塢性能指標 (Dry-docking Performance, DDP)

進塢 (dry dock) 前後各 **45 天**視窗的平均速度損失對比。`value` = 進塢**後** 45 天平均、
`reference_value` = 進塢**前** 45 天平均。

> 每個視窗至少要 3 個有效點才成立，加上 5 艘船（S9–S12、S23）根本沒進過塢，**線上只有 2 列**。
> DDP 在本資料集上幾乎是空的——引用前先查。

### 維修觸發指標 (Maintenance Trigger, MT)

速度損失的 **14 天移動平均**首次越過 **8.0%** 觸發門檻的日期（`indicators.py:148`）。
`value` = **8.0（門檻常數本身，不是觀測值）**、`reference_value` = null、`event_day` = 越界日。
每艘船至多一列（首次越界即停），線上 13 列。

### 維修效益 (Maintenance Effect, ME)

單一維修事件前後各 **30 天**的平均速度損失落差（`indicators.py:110`）：

```
value           = before − after      # 正值 = 船體已回復
reference_value = before
```

`UWI`（純檢查）不計 ME。派生欄位 `fact_maintenance_event.me_recovery_pct = value / reference_value
× 100`。線上 38 列，涵蓋 12 艘船。

### 超額油耗 (Excess Fuel Oil Consumption, excess_foc_mt)

汙損造成的每日多耗燃油（`physics.py:140`）：

```
excess_foc_mt = me_consumption · [1 − (1 − s)^n]    s = speed_loss_pct/100, n = curve_n
```

`s ≤ 0` 或 `s ≥ 1` 時為 0。是成本模型與維修時機最佳化的輸入。

---

## 4. 物理與環境修正

### 附加阻力 (Added Resistance)

相對於平靜水面條件，風、浪等環境因素額外造成的船體阻力。ISO 15016 修正即在扣除其對應功率。

### 風阻 (Wind Resistance, R_AA / resistance_wind_kn)

Blendermann 縱向風阻，以單一係數配餘弦角度形狀（`physics.py:71`）：

```
C_AA = 0.85 · cos(θ_apparent)          # C_AA_HEAD = 0.85（貨櫃船滿載迎風值）
R_AA = ½ · ρ_air · C_AA · A_XV · V_apparent²        ρ_air = 1.225 kg/m³
```

`A_XV` = `transverse_area_m2`（**估計值**，非量測）。順風時 cos < 0，阻力可為**負**。

> 這是 Blendermann 的**單係數近似**，不是完整的 Blendermann 係數表查表。

### 波浪附加阻力 (Added Wave Resistance, R_AW / resistance_wave_kn)

STAWAVE-1 迎浪近似（`physics.py:77`）：

```
R_AWL = (1/16) · ρ_sw · g · Hs² · B · √(B / Lpp)    ρ_sw = 1025, g = 9.81
```

角度衰減：相對浪向 ≤45° 全額、45°→90° 線性遞減、≥90° 為 0。`Hs` = `sea_height`。

### 環境附加功率 (Environmental Power, ΔP_env)

風阻與浪阻換算成的額外軸功率（`physics.py:94`）：

```
ΔP_env_kw = (R_AA + R_AW) · V_ms / η / 1000         η = PROPULSIVE_EFFICIENCY = 0.70
```

### 修正功率 / 修正船速 (Corrected Power / Speed)

`power_corrected_kw` 與 `speed_corrected_kn`。

- **`speed_corrected_kn` 恆等於 STW**——海流已內含於對水基準，本專案不做任何速度修正。
- **`power_corrected_kw` 在本資料集上恆等於 `horse_power`。** 原因見下。

### 修正慣例擇優 (Correction Convention Selection) ⚠️

午報的風/浪方向是 **16 方位點 (0–15)**，但**沒有註明是「相對船艏」還是「真方位」**。
`corrections.py` 因此實作三種慣例 `('bow_relative', 'true_compass', 'none')`，在執行期各跑一遍，
以**去趨勢散布 (detrended scatter)** 最小者勝出（`corrections.py:223`）。

實測（4,657 個 ISO 有效點）：**`none` = 4.534 pp、`bow_relative` = 5.009 pp、`true_compass` =
5.011 pp** → **`none` 勝出**，即「不修正」比任何一種方向假設都更能收斂散布。

**後果：`power_corrected_kw` = 量測的 `horse_power`，ISO 15016 修正完全不影響速度損失。** 線上資料
20,036 筆非空列 100% 相等，可自行驗證。風阻/浪阻欄位仍照算並保留——它們被用於**超額油費的天氣
歸因**（見〈天氣分量〉）。

> 這不是臭蟲，是誠實。方向欄位語意不明時，硬套一個錯的慣例只會把雜訊放大。

### 排水量換算 (Displacement Correction)

把不同載況的功率換算到參考排水量：`P ∝ Δ^(2/3)`。`valid_flag` 亦要求
`Δ ∈ [0.5, 1.2] · Δ_design`。

### 推進效率 (Propulsion Efficiency, η)

軸功率轉換為有效推進力的效率，本專案取固定 **0.70**（`physics.py:29`），僅用於阻力→功率換算。

### 深水門檻 (Deep-water Threshold)

淺水會抬高阻力，故 ISO 19030 要求深水。本專案**有** `water_depth` 欄位，門檻為兩條規則取大
（`physics.py:153`）：

```
h_min = max( 3 · √(B · T) ,  2.75 · V² / g )       V 為 STW (m/s), g = 9.81
```

水深缺值即判為無效點。

---

## 5. 船舶規格與尺寸

`vessel_master` / `dim_vessel` 的每船靜態規格。**本船隊是 15 艘去識別化貨櫃船，分成兩個姊妹船級**
(sister-ship class)。諸元多為由午報反推擬合而得，見 [`vessel.md`](vessel.md)。

### 船級 / 船殼級 (Hull Class, hull_class)

**`W1` / `W2`**——本專案僅有的兩個船型分組，由午報的功率–速度關係與螺距分群反推。**船隊 (fleet)
就等於船殼級**，沒有第二個船隊維度。

### 螺槳型式 (Propeller Variant, propeller_variant)

**`P1`**（螺距 9.886 m）/ **`P2`**（9.556 m）。與 `hull_class` 組成參考曲線的池化鍵。

### 載重噸 (Deadweight Tonnage, DWT)

船舶可裝載的最大總重量 (t)。貨櫃船以 DWT 作為 CII 的容量。**本欄為估計值**（用估計的輕載排水量
反推）。

### 總噸位 (Gross Tonnage, GT)

船舶內部容積的無因次量度，CII 法規適用門檻（5,000 GT 以上）以此界定。

### 垂線間長 (Length Between Perpendiculars, Lpp)

船艏艉垂線間的船長 (m)，STAWAVE-1 浪阻公式中的水線長即以此代入。

### 船寬 (Breadth, B) / 設計吃水 (Design Draft) / 貨櫃當量 (TEU)

`breadth_m`、`design_draft_m`、`teu_nominal`——姊妹船級的設計值 (`class` 級 provenance)，全級相同。

### 最大持續額定功率 (Maximum Continuous Rating, MCR)

主機可長期連續運轉的最大功率 (kW)。由午報的功率上包絡反推。離群裁剪以 `1.15 × mcr_kw` 為上界。

### 正常持續額定功率 (Normal Continuous Rating, NCR)

日常營運的常用功率，約 **0.85 × MCR**。

### 設計船速 (Design Speed, design_speed_kn)

平靜水面功率曲線轉折點的 STW。多處門檻以它為基準：`valid_flag` 要求 `STW ≥ 0.5 · Vdes`；參考曲線
網格為 0.50–1.05 × Vdes；速度剖面網格為 0.50–1.00 × Vdes。

### 定距螺槳 (Fixed-Pitch Propeller, FPP)

槳葉角度固定、以轉速調節推力。本船隊皆為 FPP，其螺距 (`pitch_m`) 是理論船速 V_th 與滑失計算的
依據。

### 方形係數 (Block Coefficient, Cb)

`Cb = ∇ / (Lpp · B · T)`，反映船型豐瘦。

### 輕載排水量 (Lightship, lightship_t)

空船本身的重量，不含貨/油/壓載。**本欄為估計值**——無法從午報反推。

### 每公分吃水噸數 (Tonnes Per Centimetre, TPC, tpc_t_per_cm)

吃水每變化 1 cm 所對應的排水量變化 (t/cm)。**它驅動排水量回填**（見〈排水量回填〉）。

### 橫向受風面積 (Transverse Area, transverse_area_m2)

水線上迎風投影面積 (m²)，風阻公式的 `A_XV`。**本欄為估計值**——無法從午報反推。

---

## 6. 載況與靜水力

### 排水量 (Displacement, Δ)

船舶排開海水的重量 (t)。午報只有 **68.5%** 的列有此值，其餘由吃水回填。

### 吃水 (Draft)

`fore_draft` / `after_draft` / `mid_draft` (m)。精煉區的 `mean_draft_m` = `mid_draft`，缺值時取
`(fore + after) / 2`（`clean.py:108`）。

### 排水量回填 (Displacement Backfill) 與 `displacement_source`

排水量缺值時由吃水經靜水力近似推估（`clean.py:118`）：

```
Δ = Δ_design + (T − T_design) · 100 · TPC  +  該船殼級的中位數殘差偏移
```

（×100 是公尺→公分。偏移量由該船殼級的實測殘差中位數重新擬合。）

`displacement_source` 欄位記錄該列是 **`measured`（量測）** 還是 **`backfilled`（回填）**。線上
20,938 列中有 **6,665 列是回填的**。⚠️ **`valid_flag` 只採用 `measured` 的列**——回填值不足以支撐
ISO 19030 的擬合。

### 貨重 (Cargo on Board, cargo_on_board)

當日實際載貨重量 (t)，EEOI 的分母因子。

---

## 7. 氣海象環境

午報記錄的氣海象，是 ISO 15016 環境修正與 ISO 19030 有效點過濾的依據。

### 蒲福風級 (Beaufort Scale, wind_scale)

風力強度分級。**本專案的 `valid_flag` 要求 Beaufort ≤ 4**（`filters.py:46`），比 ISO 19030 常見的
≤6 更嚴。

> ⚠️ 這道閘門有一個重要的連鎖後果：**異常偵測只跑在有效點上**，而有效點的風級恆 ≤4，但天氣成因
> 的判定條件是風級 **≥5**——**故 `cause = 'weather'` 永遠不可能出現**。見〈天氣成因（不可達）〉。

### 有義波高 (Significant Wave Height, Hs / sea_height)

海浪中最高 1/3 波高的平均 (m)，STAWAVE-1 浪阻公式的關鍵輸入。

### 湧浪 (Swell, swell_height / swell_direction)

由遠處風場傳來的長週期波，與當地風浪並存但成因不同。

### 十六方位點 (16-point Compass, 0–15) ⚠️

`wind_direction` / `swell_direction` / `sea_direction` **不是角度**，而是 **0–15 的十六方位點**
整數（每點 22.5°）。程式碼以 `compass_to_deg(p) = p × 22.5` 轉換（`physics.py:45`）。**把它當成度數
用會得到完全錯誤的方向。**

### 水深 (Water Depth, water_depth)

m。淺水閘門的輸入（見〈深水門檻〉）。

### 海水溫度 (Sea Water Temperature, sea_water_temp)

°C。午報有此欄，但**本專案未用它做密度/黏度修正**。

---

## 8. 航行與推進

### 對地船速 (Speed Over Ground, SOG / avg_speed)

相對海底的實際航速 (kn)，含海流影響。用於視滑失。

### 對水船速 (Speed Through Water, STW / speed_through_water)

相對水體的航速 (kn)。**是速度損失、真滑失、海軍係數與所有 ISO 指標的基準速度**，也是
`speed_corrected_kn` 的值。

### 航距 (Distance, total_distance)

對地航距 (nm)，是 EEOI / AER 的距離分母，也是合成航跡推進的依據。

### 海流代理 (Current Proxy, diff_stw_sog_slip)

STW 與 SOG 的差值。本專案**沒有**獨立的海流速度/方向欄位；此欄是唯一的海流代理。

### 航行小時 (Steaming Hours, hours_total / hours_full_speed)

`hours_total` 為當日總時數（裁剪上限 24）、`hours_full_speed` 為全速航行時數。
**`valid_flag` 要求 `hours_full_speed ≥ 22`**（`filters.py:45`）——只有近乎整日穩態全速的日子才算數。

### 主機轉速 (Main Engine RPM, me_avg_rpm)

與螺距相乘得理論船速 V_th（滑失計算）。

### 船艏向 (Heading, heading_deg)

**估計值**——真實午報沒有船艏向。精煉區的 `heading_deg` 是合成航跡上該日所在航段的大圓方位角。

### 航次 (Voyage, voyage / voyage_no)

⚠️ **本專案的「航次」是一趟多月的環線 (rotation)，不是港到港的單一航段 (leg)。** 中位數約 71 天 /
19,000 海里。`fact_voyage` 共 300 列（15 船 × 各 17–26 航次）。沒有 `leg` 欄位。

### 計畫天數 / 準點 (planned_days / on_time_flag)

**估計值**（`geography.py:119`）：

```
planned_days = 合成環線路徑長 / (0.85 · design_speed_kn · 24)
on_time_flag = (arrive_day − depart_day + 1) ≤ planned_days
```

分母的 0.85 是假設的服務速度比例。**這是模型，不是排程事實。**

### 節 (Knot, kn) / 海里 (Nautical Mile, nm)

1 節 = 1 海里/小時；1 nm = 1852 m。理論船速公式 `V_th = pitch · RPM · 60 / 1852` 中的 1852 即此。

### 慢速航行 (Slow Steaming)

刻意降低航速以節省燃油與減排。其經濟最適點由 `fact_speed_profile` 求得（見〈經濟航速〉）。

---

## 9. 燃油與機械

### 燃油消耗量 (Fuel Oil Consumption, FOC)

- **`total_consump` → `total_foc_mt`**：全船總油耗 (t/day)，含主機、輔機、鍋爐。CO₂ 與 CII 的來源。
- **`me_consumption` → `me_foc_mt`**：主機油耗 (t/day)。超額油耗與成本模型的來源。

> 本資料集**沒有**輔機 (AE) 與鍋爐 (boiler) 的分項油耗欄位——只有總量與主機量。

### 五種燃油 (Fuel Types)

`HSHFO` · `ULSFO` · `VLSFO` · `LSMGO` · `BIO_HSFO`（`fuel.py:18`），對應午報的五個
`me_fullspeed_consump_*` 欄位。

| | HSHFO | ULSFO | VLSFO | LSMGO | BIO_HSFO |
|---|---|---|---|---|---|
| 低位發熱值 LCV (MJ/kg) | 40.2 | 41.2 | 40.2 | 42.7 | 39.4 |
| 碳因子 C_F (t/t) | 3.114 | 3.151 | 3.151 | 3.206 | 3.114 |

線上實際使用量：HSHFO 10,574 船日 > VLSFO 8,146 > LSMGO 1,256 > BIO_HSFO 467 > ULSFO 182。

> `LCV_MJ_KG` 定義於 `fuel.py:25`，但**目前沒有任何公式引用它**——純文件性質。

### 當日燃油 (Day Fuel Type, fuel_type)

`fact_performance_daily.fuel_type` = 當日五個 `me_fullspeed_consump_*` 中**燒得最多**的那一種
（`fuel.py:87`）；遮蔽日則退回 `predict_fuel_type`。

### 低位發熱值 (Lower Calorific Value, LCV)

單位質量燃油的可用發熱量 (MJ/kg)，越高越耐燒。見上表。

### 加油價 (Bunker Price, price_usd_per_mt)

⚠️ **完全是合成的。** `fuel_price` 表是一條**均值回歸的幾何隨機漫步 (mean-reverting geometric
random walk)**（`fuel.py:48`，種子 42）：基準價 HSHFO 450 / ULSFO 640 / VLSFO 600 / LSMGO 800 /
BIO_HSFO 720 USD/t，日對數報酬標準差 0.012，回歸係數 0.02，上下限為基準價的 0.5×–2.0×。

**本資料湖裡每一個美金數字都源自這張表。** 引用任何 USD 欄位時都必須說明它是模型值。

---

## 10. 汙損與維護行動

### 生物附著 / 船體汙損 (Biofouling)

船體與螺槳附著的海生物與黏泥，使阻力上升、速度損失漸增。**在本專案中它表現為趨勢斜率
(trend slope)，而非單日異常成因**——漸進汙損不會被標成 `fact_anomaly` 的點異常，只會在
`fact_alert` 以 `hull_biofouling` 成因出現（來源 `fouling_model`）。

### 汙損速率 (Fouling Rate, fouling_rate_pct_per_day)

開放週期 (open cycle) 內「速度損失 vs 距上次清潔天數」的 Theil-Sen 斜率 (%/day)
（`recommendation.py:109`）。**注意：它不是成本模型的 β**（見〈最佳清潔時機〉）。

### 四種原子事件 (Atomic Event Types)

來源 `maintenance.csv` 的 77 筆事件含複合型別（如 `UWC+PP`），本專案以 `+` 拆解成 **115 筆原子
事件**：

| `event_type` | 意義 | 重置的時鐘 |
|---|---|---|
| **`UWC`** | 水下船體清潔 (underwater hull cleaning) | 僅船體 |
| **`PP`** | 螺槳拋光 (propeller polishing) | 僅螺槳 |
| **`UWI`** | 水下檢查 (underwater inspection) | **不重置任何時鐘**（純檢查） |
| **`DD`** | 進塢 (dry dock) | 船體 **與** 螺槳 |

`source_event_type` 保留原始複合值，6 種：`PP` · `UWI` · `UWC` · `DD` · `UWI+PP` · `UWC+PP`。
以 `(ship_id, event_day)` 分組即可還原成原本的 77 筆。線上分布：UWI 43、PP 49、UWC 13、DD 10。

### 三個獨立時鐘 (The Three Clocks)

`fact_performance_daily` 上的三個現成欄位（`daily.py:34-35`）——**直接用，不要自己 join 算**：

| 欄位 | 重置事件 |
|---|---|
| `days_since_cleaning` | `UWC` ∪ `DD` |
| `days_since_polish` | `PP` ∪ `DD` |
| `days_since_dry_dock` | `DD` |

### 維修成本與停役 (Maintenance Cost & Downtime)

⚠️ **全為估計值**（`recommendation.py:33`）：

| 事件 | `cost_usd` | `downtime_hours` |
|---|---|---|
| `DD` | 1,400,000 | 380 |
| `UWC` | 90,000 | 18 |
| `PP` | 30,000 | 8 |
| `UWI` | 8,000 | 4 |

**全額成本 (full cost) = `cost_usd` + `downtime_hours` × 1,000 USD/h**。UWC 的全額成本
= 90,000 + 18,000 = **108,000 USD**，即成本模型的 K。

### 維修行動決策表 (Cause→Action Decision Table)

`fact_maintenance_recommendation` 的五種 `action_type`，每一種的**實際**觸發條件
（`recommendation.py:205-324`）：

| `action_type` | 觸發條件 | 門檻 | `source` |
|---|---|---|---|
| `hull_cleaning` | 成本模型收斂（`fact_recommendation.status = 'ok'`） | 8.0 %/day | `fouling_model` |
| `propeller_polishing` | **今日時鐘上的擬合值** `≥ 300`，或外推 365 天內會越過 300 | 300 µm | `uwi` 或 `uwi+anomaly` |
| `propeller_repair` | **不做預測**：擬合值 `≥ 430`、等級 `Poor`、或 `cavitation_found` | 430 µm | `uwi` 或 `uwi+anomaly` |
| `coating_renewal` | 今日時鐘上的擬合值 `≥ 45`，或外推 365 天內越過 | 45 % | `uwi` |
| `engine_inspection` | SFOC 相對基線（序列前 1/3 的中位數）漂移 **≥ 5%** | 5 % | `sfoc_trend` |

> ⚠️ **`current_value` 是「今日時鐘上的擬合值」，不是最新一次檢查的讀數。** 43 個 UWI 原子中有 **31 個**
> 來自來源的複合列 `UWI+PP`——它們記錄的是**拋光前**、正是「所以才要拋光」的那個狀態。把最新讀數當成
> 「現況」，等於在報告一支早已被清理過的螺槳的粗糙度（S12 就因此背了一筆假的 `high` 行動）。最新檢查
> 現在只剩下一個用途：`rationale` 文字裡引用的那個等級。
>
> ⚠️ **狀況等級 (Good/Fair/Poor) 只有 `propeller_repair` 直接讀它**（`Poor` 是損傷證據）。其餘行動走
> **合成的數值欄位**；等級在那裡是**間接**影響——它決定該數值的**成長速率 (rate)**，而不是它的水準
> (level)（見〈UWI 數值訊號〉）。
>
> `source = 'uwi+anomaly'` 的條件是：近 180 天內存在 ≥1 筆 `cause='propeller'` 的異常。
>
> 線上實況：**37 列**，含 `propeller_polishing` 15、`hull_cleaning` 9、`coating_renewal` 8、
> `engine_inspection` 3、`propeller_repair` 2。

### 優先度 (Priority)

由「到期日距最後一天的天數」決定（`recommendation.py:265`）：**逾期 (overdue) → `high`；≤30 天 →
`high`；≤90 天 → `medium`；其餘 → `low`**。

### 逾期天數 (Days Overdue)

`days_overdue`：已經超過最佳清洗日 `T*` 的天數。**逾期的行動一律「今天到期」**——過了 `T*` 之後每多
一天就多燒 `β·u` 的油，沒有任何可以延後的對象，所以唯一站得住腳的到期日就是「最早能真正動工的那一
天」。

> 這裡曾有一個把整個待辦清單顛倒過來的缺陷 (defect)：舊版對逾期船舶改以「8 % 觸發預估日」當到期日，
> 於是全隊逾期最久（558 天）、節省金額最大的 S1 被算成 1,124 天後才到期，落入 `low` 而沉到清單最底。

### 單項預測 (Per-action Forecast)

三項行動取其劣化指標的**穩健斜率**外推，求越過門檻的日子 (`trigger_eta_day`)。斜率 ≤ 0（無惡化趨勢）
或越界日超出 **365 天**視野者，該行動**直接不產生列**——所以「某船沒有某項建議」代表的是「不需要」，
不是資料缺漏。

**斜率一律在「時鐘空間 (clock space)」上擬合**——x 軸是 `days_since_polish` / `days_since_dry_dock`，
不是絕對日期。螺槳不是從下水那天開始變粗糙的，而是從**上一次拋光 (polish)** 開始；對絕對日期擬合等於
把一條直線硬穿過紀錄中的每一次重置 (reset)，擬合到的只是雜訊（舊版 15 艘中有 9 艘因此得到**負的**粗
糙度斜率）。截距則**錨定 (anchored)** 在重置後的已知值（剛拋光的螺槳就是 ~150 µm）——那是物理，不是
需要花一個資料點去估的參數。

**`propeller_repair` 完全不做預測。** 拋光會重置時鐘，硬把粗糙度直線外推「穿過」拋光直到 430 µm，畫
的是一條跨越重置的趨勢線，不是物理。它只在**今天為真的證據**上觸發：數值 (`current ≥ 430`)、真實損傷
等級 `Poor`、或實測到的 `cavitation_found`。

### 維修規劃 / 服務窗口 (Maintenance Planner / Service Window)

把各行動的到期日批次整併（`recommendation.py:577`）：

1. 需進塢的行動（**`coating_renewal`、`propeller_repair`**）以其中**最早的到期日**為錨點，形成一個
   `dry_dock` 窗口。
2. 水下行動（`hull_cleaning`、`propeller_polishing`、`engine_inspection`）**在成本模型判定「併入比自己
   跑一趟便宜」時**才併入該 `dry_dock` 窗口。
3. 未併入者自行以最早到期日成一個 `in_water` 窗口。

輸出 `plan_day`、`plan_service_type ∈ {dry_dock, in_water}` 與 `window_id`。

### 併窗損益兩平 (Batching Break-even)

乾塢 (dry dock) 本來就會重置船體，所以「順道做」的邊際成本是零——但**等待**乾塢要燒油。兩邊都定價，
以 `u` 為原本該動工的日子、`v` 為乾塢日（都以距上次清洗的週期時間計）：

```
A（自己跑一趟，之後乾塢順便重置）= K + α·(v−u) + β·(v−u)²/2
B（延後到乾塢一起做）           =     α·(v−u) + β·(v²−u²)/2
B − A                          = β·u·(v−u) − K        α 與二次項完全對消
```

> **併入的條件：`β·u·(v−u) < K`。** `β·u` 就是今天的超額燒油率，所以這條規則讀起來是：*等待期間多燒的
> 油，比你因此省下的那一趟還便宜。*

`K` 是**省下的那一趟**，不是「這個行動的成本」——`engine_inspection` 根本不需要出一趟（不進塢、不派潛
水員），併入它省下 **$0**，因此永遠不值得為它延後。這是規則自然推出的結果，不需要特例。

⚠ **`u = due_day − last_cleaning_day`，不是 `T*`。** 你不可能回到過去清洗，而全隊 9 艘可建模的船有 6 艘
已經過了 `T*`；若以 `T*` 為錨，整個併窗視窗都落在過去，永遠併不進任何東西。

**無法定價者不延後。** `propeller_polishing` 沒有「每微米多少美元」的係數，硬編一個就是憑空發明物理，
所以它只能**提前**搭順風車、不得延後（`UNPRICED_SLIP_DAYS = 0`）。

### 行動成本與重複計費防護 (action_cost_usd / window_cost_usd)

`propeller_repair` 與 `coating_renewal` **都**需要乾塢；天真地相加會為**同一趟 $1.78M 的塢期收 $3.56M**。

- **`action_cost_usd` 是邊際成本 (marginal)**：一個窗口所需的每一種事件只向**其中一個**行動收費（到期日
  最早者），窗口內其他行動一律 `0.0`。乾塢窗口只收一次 `full_cost('DD')`，併進去的船體清洗是**真的免
  費**——那正是它會被併進去的原因。**任何層級（列／窗口／船／全隊）直接加總都不會重複計費。**
- **`window_cost_usd` / `window_id`**：整趟的成本，**重複寫在該窗口的每一列上**。加總前必須先用
  `window_id` 去重。

於是投資報酬率 (ROI) 就是兩個天真的加總：`Σ net_saving_usd / Σ action_cost_usd`。

*已知限制*：水下窗口是把成員的不同事件成本相加，這是**上界 (upper bound)**——成本模型不知道「清洗與拋光
共用同一次潛水員動員」這回事。

### 維修觸發門檻 (Maintenance Trigger Threshold, MT_TRIGGER_PCT)

**8.0 %** 速度損失（`indicators.py:29`）。它同時驅動 MT 指標、`trigger_eta_day`、`hull_cleaning` 的
門檻、以及 `hull_biofouling` 告警的嚴重度分級。**單一權威常數，全系統共用。**

---

## 11. 水下檢查與船況

`uwi` / `fact_uwi` 共 53 列（43 個 UWI 原子 + 10 個 DD）。**真實的是等級，估計的是數字。**

### 水下檢查 (Underwater Inspection, UWI)

對水下船體與螺槳的檢查。`inspection_type` 只有兩個值：**`UWI`（在水中）** 與 **`DD`（乾塢）**
——**沒有** `diver` / `ROV` 之分。

### 三級狀況等級 (Good / Fair / Poor) ✅ 真實

`propeller_condition`、`hull_coating_condition` 採**真實的三級制**，直接讀自來源維修檔。

> ⚠️ **不是 Rubert A–F 量表。** 本專案沒有 Rubert 量表。程式碼在 `raw/uwi.py:15` 與
> `schema.py:185` 兩處明文否定它。

等級是**稀疏的**（77 筆來源事件中：螺槳 45 筆有評、塗層 26 筆、氣蝕 36 筆），其餘為 null。
`hull_coating_condition` 實際只出現 `Good` / `Fair`——**`Poor` 從未在來源中出現**。

### 氣蝕 (Cavitation, cavitation_found)

`Yes` / `No`。螺槳表面因局部低壓產生氣泡並潰滅，會侵蝕槳葉。

### UWI 數值訊號 (The Four Estimated Signals) ⚠️ 全部是估計值

四個數值欄位都是**合成的**，以真實等級與**該日真實的 14 天移動平均速度損失**為條件抽樣
（`raw/uwi.py`，逐次檢查獨立設種，可重現）：

| 欄位 | 合成方式 |
|---|---|
| `propeller_roughness_um` | 在 `days_since_polish` 上的**飽和成長**：`150 + 410·(1 − e^(−rate·clock/600))`。等級與速度損失決定 `rate`，不決定水準 |
| `coating_breakdown_pct` | 在 `days_since_dry_dock` 上的飽和成長：`2 + 88·(1 − e^(−rate·clock/2600))` |
| `hull_fouling_rating` | `速度損失 × 7 + 抖動(−6, +6)`，夾在 **0–100**。**與等級無關，純由速度損失驅動** |
| `hull_fouling_coverage_pct` | `min(rating × 1.15, 100)`——**是 rating 的確定性函數**，不帶新資訊 |

**等級設定的是「速率」，不是「水準」。** `propeller_condition` 是**損傷**等級——坑蝕的螺槳粗糙得**更
快**——它不是「距上次拋光多久」的讀數。資料本身就說得很清楚：53 次檢查中來源評了 25 個 `Good`，而這些
`Good` 的「距上次拋光天數」橫跨 **114 到 474 天**，與時鐘完全不相關。

舊版用等級決定**抽樣區間**，於是把時鐘覆蓋成了雜訊；更糟的是，把每個 `Good` 夾進 [150, 260) 會讓隱含
斜率上限只剩 ≤ 0.23 µm/day——**全隊沒有任何一艘船能走到 300 µm**，訊號直接消滅。

速率是四個**各自以 1.0 為中心**的因子相乘：每船抽樣的離散度 × 等級係數（Good 0.85 / Fair 1.15 /
Poor 1.45）×（1 + 0.60·(速度損失位置 − ½)）× 抖動。速度損失那一項是**居中的、不是單向抬升**：船慢就
汙損得快 (×1.3)、船乾淨就慢 (×0.7)，而**當天沒有速度損失量測時為中性 (×1.0)**。

⚠️ **時鐘是嚴格的 (strict)。** 檢查與它自己的拋光同一天時（43 個原子中有 31 個如此），時鐘要從**上一次**
拋光起算，不是 0——否則 31 列全部歸零成 150 µm，等於宣稱「每一支被拋光的螺槳在檢查當下都已經是乾淨
的」。`polish_cycle_censored` / `dry_dock_cycle_censored` 標記那些**前面根本沒有重置**的列，它們的時鐘
只是真實週期年齡的**下界 (lower bound)**。

> `hull_fouling_rating` 是 0–100 的尺度，但**它不是 NSTM 評級**，也沒有「≥60 就清潔」這條規則。
> 它只是速度損失的一個線性重述。

### 建議行動 (recommended_action)

`fact_uwi` 自帶的三值建議（`raw/uwi.py:76`），**與 `fact_maintenance_recommendation` 是兩套獨立
邏輯**：

```
if speed_loss_pct >= 8.0 or coating_breakdown_pct >= 45.0:  'clean'
elif propeller_roughness_um >= 300.0:                        'polish'
else:                                                        'none'
```

### 船體汙損類型 (Hull Fouling Type, hull_fouling_type) ⚠️

逗號分隔的清單，取值為 `barnacle`（藤壺）· `slime`（黏泥）· `algae`（藻類）· `tubeworm`（管蟲）·
`calcium`（鈣質）。**順序與空白不一致**（`barnacle,slime` vs `slime, calcium`）——**必須用
`LIKE '%barnacle%'` 比對，絕不可用 `=`。**

---

## 12. 成本與經濟

> **本章每一個數字都是估計值**，因為它們全部下游於合成的加油價。

### 額外燃油成本 (Excess Fuel Cost, excess_cost_usd)

`excess_cost_usd = excess_foc_mt × price_usd_per_mt(當日, 當日燃油)`（`daily.py:122`）。

### 累計額外成本 (Cumulative Excess Cost, cum_excess_cost_usd)

自本汙損週期起累加的額外燃油成本，**`days_since_cleaning` 一下降（發生清潔）就歸零**
（`daily.py:126`）。呈現汙損的「代價曲線」。

### 超額油費歸因 (Excess-cost Attribution) ⚠️ 三者是「可加」不是「拆分」

把燃油代價依物理來源分成三個分量（`daily.py:206`）：

| 分量 | 定義 |
|---|---|
| `excess_cost_fouling_usd` | **等於** `excess_cost_usd`——ISO 19030 速度損失罰則 |
| `excess_cost_weather_usd` | 由 ISO 15016 算出的 ΔP_env 換算成油耗再乘油價 |
| `excess_cost_operational_usd` | 引擎負載偏離最佳點 (80% MCR) 的 SFOC 罰則：`penalty = 0.18 · (load − 0.80)²` |

⚠️ **三者相加會大於 `excess_cost_usd`**——天氣與操作分量是**疊加在**汙損分量之上的額外燃油，不是
把它切三塊。用來說明「速度損失不全是汙損造成的」。

### 效果回復 (Recovery, me_recovery_pct)

`fact_maintenance_event.me_recovery_pct = ME.value / ME.reference_value × 100`——維修後速度損失回復
的百分比，越高代表維修越有效。**這是「這次清潔到底有沒有效」的直接答案，不需要自己做前後視窗
join。**

### 回本天數 (Payback, payback_days)

維修的全額成本以節省的燃油回收所需天數。事件前後 ±30 天平均 `excess_cost_usd` 的差即日節省；視窗
空或節省 ≤ 0 時為 null。

### 最佳清潔時機 (Optimal Cleaning Time, t\* / t_star_days)

使週期平均成本率最小的清潔天數，**僅適用於船體清潔**（`recommendation.py:63-143`）。以開放週期的
每日超額成本率建模：

```
c(t) = α + β·t                    ← Theil-Sen 擬合「每日 excess_cost_usd vs 距上次清潔天數」
J(T) = K/T + α + β·T/2            ← 週期平均成本率
T*   = √(2K / β)                  ← 閉合解
recommended_clean_day = last_cleaning_day + round(T*)
```

⚠️ **關鍵澄清：β 是「成本斜率」(USD/day/day)，不是汙損速率 (%/day)。** 兩者是不同的 Theil-Sen
擬合，不可互換。K = **UWC 的全額成本 = 108,000 USD**（恆為 UWC，不用 DD/PP）。

### 資料不足 (status = 'insufficient_history')

`fact_recommendation.status` 只有兩值。退化為 `insufficient_history` 的條件（線上 **6/15** 艘船）：

1. 開放週期的有效點 **< 30**，或
2. Theil-Sen 擬合失敗，或 **成本斜率 β ≤ 0**（船體沒在惡化 → `√(2K/β)` 無定義）。

**引用 `t_star_days` / `net_saving_usd` 前先檢查 `status`。** 但 `fouling_rate_pct_per_day` 例外——它是
**量測值**，即使成本模型垮掉仍然照報：成本斜率是平的，並不會讓這艘船的汙損速率變成未量測。

### 淨節省 (Net Saving, net_saving_usd) 與其視野

在 T\* 清潔（相對於拖到 8% 觸發門檻才清潔）省下的成本。**僅在 `trigger_eta` 存在且晚於 T\* 時計算**，
否則 null。

⚠️ **計價區間有上限**，並由 `saving_horizon_days` 揭露：`T_end = min(T_觸發, 今日汙損天數 + 365)`。未設
上限時，這一欄會去定價一個遠在所有資料之外的反事實 (counterfactual)——S1 的 8% 觸發點落在週期第 **1,968
天**，比它最後一天的資料還晚 **3.1 年**，而那段外推**就是**它 $3.75M 的頭條數字。誘因還是反的：船體越
平滑 → 觸發越晚 → 「節省」越大。上限套用後 S1 變成 **$1,129,854**，全隊從 ~$13.7M 降到 **~$10.5M**。

**但 `trigger_eta_day` 本身不設上限**——它預測的是一個物理事件，`alerts.py` 也是這樣消費它的；為了讓估值
好看而截斷一個預測，只會讓那一欄說謊。

### 現在就清洗的價值 (saving_if_cleaned_now_usd)

`β·u·365 − K`。**前瞻性 (prospective)** 的那個數字，也是真正回答「這艘船現在該不該清？」的數字——
`net_saving_usd` 是回顧性的，它拿來比較的那個觸發日，對一艘早已逾期的船而言是**沒有人打算走到**的日子。
本欄**可以是負的**（船還在週期前段，今天清不划算），那正是誠實的答案。用它來排序逾期待辦清單。

### 傭租成本 (Charter Cost, charter_usd_per_day)

**估計值 45,000 USD/day**（`optimize.py:23`）。它是時間的代價，不是量測到的船舶諸元。

### 經濟航速 (Economical Speed, recommended_speed_kn)

`fact_speed_profile` 在 0.5–1.0 × 設計船速上取 24 個網格點，求 `usd_per_nm` 的最小值點。

⚠️ **`usd_per_nm` 之所以是凸函數 (convex)、有內部最小值，完全來自每日傭租成本。** 拿掉它，
`fuel_usd_per_nm` 對速度單調遞增，最佳解就退化成「開最慢那一點」。這個結論對租金假設敏感。

---

## 13. 統計與分析方法

> 本層**全部是規則 + 穩健統計**，不使用機器學習 (machine learning)，不使用 SageMaker。

### Theil-Sen 穩健迴歸 (Theil-Sen Estimator)

取所有點對斜率的**中位數**作為趨勢估計（`trends.py:13`），對維修造成的階梯變化與離群值不敏感。
**本專案唯一使用的迴歸方法**，用於：汙損速率、成本率 c(t)、UWI 粗糙度/崩解率外推。

### 穩健 z 分數 (Robust z-score, median / MAD)

異常偵測的**唯一**方法（`anomaly.py:45`）：

```
scale = 1.4826 × MAD(中位數絕對偏差)     # MAD = 0 時退回標準差
scale = max(scale, 下限)                 # 下限: speed_loss 0.5, slip 0.01, sfoc 2.0, excess_foc 0.5
z     = (x − median) / scale
```

⚠️ **這是對該船「全部有效歷史」計算的全域 z，不是滾動視窗 (rolling window)。** 每艘船每個指標至少
需 **20 個點**才評分。

### 異常偵測 (Anomaly Detection)

四個指標各自評分：`speed_loss`（`speed_loss_pct`）· `slip`（`slip_real`）· `sfoc`（`sfoc_g_kwh`）·
`excess_foc`（`excess_foc_mt`）。**只跑在 `valid_flag = true` 的列上。**

- **旗標門檻：`|z| ≥ 3.5`**。同一天多個指標中選 |z| 最大者為 `metric`（驅動指標），故
  `fact_anomaly` 是「每船每異常日一列」。
- **嚴重度分級**（`anomaly.py:94`）：`low` 3.5 ≤ |z| < 4.5 · `medium` 4.5 ≤ |z| < 6.0 ·
  `high` |z| ≥ 6.0。

線上 369 列，驅動指標分布：`excess_foc` 203 · `sfoc` 136 · `slip` 24 · `speed_loss` 6。

### 成因分類 (Cause Classification)

**首中即取 (first-match)** 的規則鏈（`anomaly.py:56`），順序有意義：

1. `|z| ≥ 8.0` → **`sensor`**（大到不像物理，先當感測器問題）
2. `wind_scale ≥ 5` → **`weather`**
3. `metric = 'sfoc'` → **`engine_degradation`**
4. `metric = 'slip'` → **`propeller`**
5. `metric = 'excess_foc'` → `engine_degradation`；`metric = 'speed_loss'` → `propeller`

### 天氣成因（不可達）(The Unreachable `weather` Cause) ⚠️

規則 2 需要 `wind_scale ≥ 5`，但異常只在 `valid_flag` 的列上評分，而 ISO 閘門要求
`wind_scale ≤ 4`。**兩者不相交 → `cause = 'weather'` 在 `fact_anomaly` 與 `fact_alert` 中永遠是
0 列。** 它在列舉型別 (enum) 裡，但在資料裡不存在。

線上驗證：`fact_anomaly` 的成因只有 `engine_degradation` 292 · `sensor` 49 · `propeller` 28。

### 告警事件 (Alert Episode)

`fact_alert` 的粒度：把**同一 (船, 成因)** 的連續 `fact_anomaly` 點異常收斂成一則敘事化事件
（`alerts.py`）。

- **間隔容忍度 (gap tolerance) = 7 天**——相隔超過 7 天視為新事件。
- `status`：`open` / `closed`。**最後出現日在該船最後一天的 30 天內即為 `open`**。
- `peak_z` = 該事件內最大 |z|；`excess_cost_usd` = 事件視窗內 `excess_cost_usd` 的總和。
- 每列附雙語敘事 `message_zh` / `message_en`（f-string 組出，含峰值 z 與估計燃油損失）。

### 船體生物附著告警 (hull_biofouling Alert)

**唯一的趨勢型成因**，不來自點異常，而來自 `fact_recommendation`（`alerts.py:139`）：條件是該船
`status = 'ok'` 且 `fouling_rate_pct_per_day > 0`。

- `peak` = 該週期最後 14 天的平均速度損失
- 嚴重度：`high` ≥ 8.0% · `medium` ≥ 4.8%（= 8.0 × 0.6）· 其餘 `low`
- **`peak_z` 恆為 null**（趨勢沒有 z 分數）、`source = 'fouling_model'`、**恆為 `open`**

線上 6 列。

### 外推 / 越界日 (Extrapolation / crossing_day)

以 Theil-Sen 斜率向未來延伸求越過門檻的日子（`trends.py:29`）。**斜率 ≤ 0 時回傳 null**——沒有惡化
趨勢就沒有觸發預估日。

### 移動平均 (Trailing Mean)

`trends.trailing_mean(series, last_day, window)`——MT 指標（14 天）、生物附著告警（14 天）、UWI 條件化
（14 天）都用它。

---

## 14. 資料與系統概念

### 午報 (Noon Report)

每船每日一筆的船上回報。`noon_report` 表 = `dataset/vt_fd.csv` **逐字落地 (verbatim)**：21,282 列、
42 欄，**含 344 筆重複的 `(ship_id, noon_utc)`**，一列未刪、一格未改。唯二的新增是兩個載入器標記
`masked_flag` / `predict_fuel_type`，它們**保存**了 HIDDEN/PREDICT → null 轉換原本會摧毀的資訊。

### 資料湖 (Data Lake) 與兩區 (Raw / Curated Zone)

Glue 資料庫 `ym_hackathon`，S3 為底、Athena 查詢、JSONL 格式、**20 張表全部未分割**。

- **原始區 (raw zone，6 張)**：`noon_report`、`vessel_master`、`maintenance_event` 是三個**真實來源
  檔的逐字落地**；`reference_curve`、`uwi`、`fuel_price` 是衍生或合成的，不負保存義務。
- **精煉區 (curated zone，14 張)**：所有的**變更**（去重、離群裁剪、排水量回填）與所有的**推導**
  （ISO 15016/19030、CII、地理、經濟）都發生在這裡。

### 事實表 / 維度表 / 彙總表 (fact_ / dim_ / agg_)

- **`fact_`**：逐事件/逐日的量測與指標（`fact_performance_daily` 是分析主幹）。
- **`dim_`**：靜態屬性（`dim_vessel`、`dim_reference_curve`、`dim_port`）。
- **`agg_`**：跨船聚合（`agg_fleet_daily`）。

### 船隊 (Fleet, fleet_id) ⚠️

**船隊就是船殼級**，沒有航線分組維度：

| `fleet_id` | `fleet_name` | 成員 |
|---|---|---|
| `FL-W1` | W1 Class | S1 S2 S3 S4 S5 S6 S7 S8 **S21** |
| `FL-W2` | W2 Class | S9 S10 S11 S12 **S22 S23** |

⚠️ **`agg_fleet_daily` 另有一列 `fleet_id = 'ALL'` 的全船隊彙總。** 它與兩個子船隊**併存於同一張
表**，所以**任何查詢都必須過濾 `fleet_id`**——不過濾就會把 ALL 和它已經包含的兩個子船隊加總在
一起，全部重複計算。

### 訓練船 / 預測船 (role: train / predict)

`role = 'train'` → **S1–S12**（12 艘）；`role = 'predict'` → **S21–S23**（3 艘）。後者的燃油消耗欄位
在特定視窗被遮蔽，是本次任務的預測標的。

### 遮蔽旗標與預測標的 (masked_flag / predict_fuel_type)

- **`masked_flag`**：該列原本含 HIDDEN 或 PREDICT 儲存格（僅 S21–S23）。**做任何油耗統計都要排除**
  （`WHERE NOT masked_flag`）。線上 `fact_performance_daily` 有 370 列。
- **`predict_fuel_type`**：標記為 PREDICT 的那一欄的**欄名**。共 **102 格**：
  **91 個 `ME_FULLSPEED_CONSUMP_HSHFO` + 11 個 `ME_FULLSPEED_CONSUMP_VLSFO`**。這就是交付標的。

### 有效點旗標 (valid_flag) 與資料品質

ISO 19030 的過濾閘門（`filters.py:54`）。全部條件（**皆須通過**）：

1. **非** `masked_flag`
2. STW、`horse_power`、`displacement` 皆有值且非零
3. **`displacement_source = 'measured'`**（回填值不採信）
4. 海軍係數 ∈ **[300, 1300]**
5. `hours_full_speed` **≥ 22** 小時
6. `wind_scale` **≤ 4**（且不得為 null）
7. STW **≥ 0.5 × 設計船速**
8. 排水量 ∈ **[0.5, 1.2] × 設計排水量**
9. 水深 **≥ max(3√(B·T), 2.75·V²/g)**（且不得為 null）

**線上通過率：20,938 列中 4,657 列有效 = 22.2%。** 這個比例低是正常的——ISO 19030 本來就是要嚴到只
留下穩態全速、低風浪、深水、載況正常的日子。**任何速度損失/船體狀況的分析都必須先過這道閘門，
否則畫出來的是天氣，不是船體。**

### 日曆紀元 (Calendar Epoch) ⚠️ 估計值

精煉區的 `report_date` / `event_date` / `inspection_date` 等日曆欄位，由相對日換算而來
（`epoch.py:23`）：

```
EPOCH = 2021-07-01        # 第 0 天
report_date = EPOCH + timedelta(days=noon_utc)
```

跨度為 **2021-07-01 … 2026-06-30**（第 0–1825 天）。⚠️ **這個紀元是假設的**——來源資料沒有日曆，
且此處假設 15 艘船共用同一個第 0 天。日曆欄位可以拿來畫易讀的座標軸，**但不要拿具體日期去下任何
結論**。

### 合成地理 (Synthesized Geography) ⚠️ 估計值

真實午報**沒有**位置、港口與船艏向。精煉區的 `latitude` / `longitude` / `heading_deg` /
`port_from` / `port_to` 全部是合成的（`geography.py`）：每個船殼級有一條固定的環線
（W1 = 亞歐線經麻六甲/蘇伊士，W2 = 跨太平洋線），以該航次**真實的累計航距**沿著折線行走定位。

**真實的距離驅動合成的航跡，而不是反過來。** 但港口與座標仍然是虛構的——**本船隊從未靠泊過
`dim_port` 裡的任何一個港。**

### 資料保存原則 (Preservation)

三個真實來源檔在原始區**逐字保存**：重複列不刪、離群值不改、欄位不動。**所有清理都只發生在精煉
區**，且 `noon_report` 與 `fact_performance_daily` 併存，任何人都可以回頭比對「來源到底怎麼寫的」。
維修事件的原子化亦可逆——以 `(ship_id, event_day)` 分組即完全還原 77 筆來源列。
