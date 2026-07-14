# 航運術語辭典 (Shipping & Vessel-Performance Terminology)

本檔是本專案的**單一權威術語辭典 (single source of truth for terminology)**。專案為陽明海運
(Yang Ming) AI 船舶效能分析概念驗證 (Proof of Concept，POC)：以合成的午報 (Noon Report) 與
水下檢查 (Underwater Inspection，UWI) 資料為輸入，套用 ISO 15016 / ISO 19030 國際標準公式，
再疊加異常偵測 (anomaly detection)、碳強度指標 (CII) 與維修最佳化，最後落地為 Athena 資料表與
Web 儀表板 (Dashboard)。

本辭典收錄**領域術語與方法**。門檻值與係數（如維修觸發 8%、CII 係數 a=1984）在相關術語內順帶
說明，不單獨列內部程式常數名。每則術語以 `中文 (英文)` 標題呈現，附解說、關鍵公式、單位與判讀。
數值以程式碼實作為權威值；若敘事文稿與程式碼不一致（如維修觸發門檻），一律以程式碼值為準並註明。

> 相關文件：資料字典見 `doc/table-schema-zh.md`；ETL 方法見 `doc/curated-dataset.md`（M2）與
> `doc/insights.md`（M3）；整體規格見 `doc/poc-spec.md`；儀表板雙語 hint 見 `web/glossary.js`。

---

## 目錄 (Table of Contents)

1. [法規與標準](#1-法規與標準) — IMO、ISO 15016/19030、MARPOL、MEPC.352/353/354(78)、Z%、Rubert、NSTM、UN/LOCODE
2. [碳排放與能效指標](#2-碳排放與能效指標) — CII、AER、EEOI、CO₂、碳因子 C_F、SFOC
3. [船體與螺槳性能指標](#3-船體與螺槳性能指標) — 速度損失、期望船速、滑失、海軍係數、速度–功率曲線、ISP/DDP/MT/ME、超額油耗
4. [物理與環境修正](#4-物理與環境修正) — 附加阻力、風阻 R_AA、浪阻 R_AW、環境功率 ΔP_env、排水量換算、推進效率、淺水/密度修正
5. [船舶規格與尺寸](#5-船舶規格與尺寸) — DWT、GT、Lpp、船寬、設計吃水、MCR/NCR、設計船速、螺槳、方形係數、輕載排水量、TEU、船級
6. [載況與靜水力](#6-載況與靜水力) — 排水量、吃水、俯仰差、載貨/壓載、貨重、質量平衡、靜水力表
7. [氣海象環境](#7-氣海象環境) — 蒲福風級、有義波高、湧浪、風、海流、海水密度、海溫/氣溫/氣壓、迎浪
8. [航行與推進](#8-航行與推進) — SOG、STW、對地/對水距離、航行小時、主機轉速、船艏向、航次/航段、節、海里、慢速航行
9. [燃油與機械](#9-燃油與機械) — FOC、主機/輔機/鍋爐、HFO/VLSFO/LSMGO/MGO、洗滌器、LCV、加油價
10. [汙損與維護行動](#10-汙損與維護行動) — 生物附著、汙損速率、距上次清潔天數、進塢、船體清潔、螺槳拋光/修理、塗層更新、主機檢查、成因→行動決策表、單項預測、維修規劃/服務窗口、維修觸發門檻
11. [水下檢查與船況](#11-水下檢查與船況) — UWI、潛水員/ROV、船體汙損等級、覆蓋率、螺槳狀況、螺槳粗糙度、塗層狀況
12. [成本與經濟](#12-成本與經濟) — 額外油費、累計額外成本、超額油費歸因（汙損／天氣／操作分量）、潛在節省、淨節省、燃油代價、回本天數、效果回復、最佳清潔時機 t\*
13. [統計與分析方法](#13-統計與分析方法) — Theil-Sen、Huber、分段迴歸、EWMA、滾動/MAD z、IQR、IsolationForest、bootstrap CI、相關係數、precision/recall、殘差/基線、外推、趨勢、告警事件
14. [資料與系統概念](#14-資料與系統概念) — 午報、資料湖、raw/curated zone、fact_/dim_/agg_ 表、營運船隊、地面實況、閉環可還原性、一致性檢查 C1–C14、資料品質、儀表板三頁

---

## 1. 法規與標準

國際海事組織與 ISO 標準界定了本專案指標的計算方法與合規參照。

### 國際海事組織 (International Maritime Organization, IMO)

聯合國轄下負責船舶安全與海洋環境保護的專門機構。制定 MARPOL 公約與其下 MEPC 決議，是 CII、EEXI
等能效法規的來源。IMO 亦為每艘船核發終生不變的 7 位數識別號（見〈IMO 船舶識別號〉）。

### IMO 船舶識別號 (IMO Number)

國際海事組織核發的船舶唯一識別碼，終生不變、不隨改名或轉籍變動。本專案以合成的 7 位數 IMO
`9700001`–`9700009` 作為 9 艘示範船隊的主鍵與 Athena 分割鍵 (partition key)。

### 防止船舶污染國際公約 (MARPOL)

International Convention for the Prevention of Pollution from Ships，IMO 的核心環保公約。其
附則六 (Annex VI) 規範船舶大氣排放，是 CII 碳強度法規的母法脈絡；MEPC 系列決議即在此框架下通過。

### 海洋環境保護委員會決議 (MEPC.352/353/354(78))

Marine Environment Protection Committee 通過的 CII 技術決議：**MEPC.352(78)** 定 CII 計算方法、
**MEPC.353(78)** 定各船型參照線係數 `a, c`、**MEPC.354(78)** 定 A–E 評級的 dd 邊界向量。本專案
貨櫃船 (container ship) 採其公告值（見〈CII 參照線〉、〈dd 評級邊界向量〉）。

### ISO 15016 船舶試航速度功率修正標準 (ISO 15016)

規範如何把「受環境干擾的量測值」修正到「參考條件」，以取得可比較的**修正功率 (corrected power)**
與**修正船速 (corrected speed)**。修正項含風阻、波浪附加阻力、水溫/密度、淺水與排水量換算。本專案
於 ETL 階段 S3 套用（見〈第 4 章 物理與環境修正〉）。

### ISO 19030 船體與螺槳性能量測標準 (ISO 19030)

規範以「百分比速度損失 (percentage speed loss)」量化船體與螺槳性能衰退的國際標準，並定義 ISP /
DDP / MT / ME 等週期指標。它同時提供資料過濾準則（穩態、深水、低風浪），本專案以 `valid_flag`
落實（見〈valid_flag 有效點旗標〉）。

### CII 碳強度法規 (Carbon Intensity Indicator regulation)

IMO 自 2023 年起對 5,000 GT 以上船舶施行的營運碳強度規範：每年計算達成值 (attained CII)，對照
逐年折減的 required 線，給予 A–E 評級（D 連續三年或 E 須提出矯正計畫）。方法細節見〈第 2 章〉。

### 逐年折減率 (Reduction Factor, Z%)

required 線相對基準參照線的逐年加嚴百分比：`required = (1 − Z%) · CII_ref`。本專案貨櫃船採
IMO 公告時程 **2023→5、2024→7、2025→9、2026→11 (%)**。Z% 越大代表合規門檻越嚴。

### 魯伯特量表 (Rubert Scale)

螺槳與船體表面粗糙度的標準比對量表，等級 **A–F**（A 最光滑/最佳、F 最粗糙/最差）。UWI 以此評定
`propeller_condition`：E/F 建議螺槳修理 (propeller repair)、C/D 建議螺槳拋光 (propeller polishing)。

### NSTM 船體汙損評級 (Naval Ships' Technical Manual rating)

美國海軍技術手冊定義的船體生物附著分級法，本專案量化為 **0–100** 的 `hull_fouling_rating`
（越高越髒），≥60 建議船體清潔 (hull cleaning)。見〈船體汙損等級〉。

### UN/LOCODE 聯合國港口代碼 (UN/LOCODE)

United Nations Code for Trade and Transport Locations，5 碼的港口/地點代碼（前 2 碼國家、後 3
碼地點，如 `KRPUS` = 韓國釜山、`NLRTM` = 荷蘭鹿特丹）。午報的 `port_from`/`port_to` 採此格式。

---

## 2. 碳排放與能效指標

衡量單位運輸的 CO₂ 排放與燃油效率；CII 為法規指標，EEOI/SFOC 為營運與機械指標。

### 碳強度指標 (Carbon Intensity Indicator, CII)

船舶每載重噸·海里的 CO₂ 排放量評級 (A–E)，A 最佳。屬年度指標，本專案逐船×年計算後**廣播
(broadcast)** 至該年每一天的資料列。貨櫃船以容量 = 載重噸 (DWT)，故 AER 與完整 IMO 達成值數值
相同，只差在評級參照線（見〈CII 評級（AER 基準）〉與〈CII 評級（IMO 折減線）〉）。

### CII 達成值 (Attained CII)

實際營運算出的碳強度：`attained = Σ_year(total_foc · C_F) · 1e6 / (DWT · Σ_year distance_og)`，
單位 gCO₂/dwt·nm。分子為全年各燃油油耗×碳因子的 CO₂ 總量，分母為載重噸×全年對地航距。

### CII 參照線 (CII Reference Line, CII_ref)

評級基準：`CII_ref = a · DWT^(−c)`，貨櫃船 **a = 1984、c = 0.489**（MEPC.353）。船越大單位碳強度
基準越低。`cii_rating_aer` 即以此線評級。

### CII 評級（AER 基準）(cii_aer)

以年度效率比 (AER) 對**基準參照線 CII_ref** 評出的 A–E 等級，不含逐年折減。

### CII 評級（IMO 折減線）(cii_imo)

以達成值對**該年折減後的 required 線**評出的 A–E 等級：`required = (1 − Z%) · CII_ref`。因逐年
折減，同一達成值在後續年份評級會逐步變差。

### dd 評級邊界向量 (dd Vector)

把「達成值 / required」比值切成 A–E 五級的邊界乘數，貨櫃船為 **(0.83, 0.94, 1.07, 1.19)**
（MEPC.354）。比值 <0.83·required 為 A，>1.19·required 為 E，其間依序 B/C/D。

### 年度效率比 (Annual Efficiency Ratio, AER)

每載重噸·海里的 CO₂ 排放量 (gCO₂/dwt·nm)，越低越佳。以 DWT 作分母容量，是 CII 的簡化算法；貨櫃船
的 AER 達成值與完整 IMO 達成值相同。

### 能效營運指標 (Energy Efficiency Operational Indicator, EEOI)

每**貨噸**·海里的 CO₂ 排放量：`eeoi = co2 · 1e6 / (cargo · distance_og)`，單位 gCO₂/t·nm。以實際
載貨量為分母，反映真實運輸效率；壓載 (ballast) 或零貨量日為 null。與 AER 差異在於分母用貨重而非
載重噸。

### 二氧化碳排放量 (CO₂ Emissions, co2_mt)

由油耗換算的日排放：`co2_mt = total_foc · C_F[fuel]`（噸）。是 CII/EEOI 的分子來源，靠港
(in-port) 日亦有值。

### 碳因子 (Carbon Factor, C_F)

每噸燃油完全燃燒的 CO₂ 排放係數 (tCO₂/t)：**HFO 3.114、VLSFO 3.151、MGO/LSMGO 3.206**。含碳量越高
係數越大，故輕質餾出油 (MGO) 反而略高。

### 主機燃油消耗率 (Specific Fuel Oil Consumption, SFOC)

每產生 1 kWh 軸功率所耗燃油克數：`sfoc = me_foc · 1e6 / (me_power · hours)`，單位 g/kWh，越低越
省油。是引擎狀態指標——**速度損失未升但 SFOC 升→研判引擎劣化 (engine degradation)**（見〈成因分類〉）。

---

## 3. 船體與螺槳性能指標

ISO 19030 核心指標：以修正後的可比條件量化船體/螺槳性能衰退。**速度損失正值 = 效能衰退**（同功率下
比乾淨船體慢），數值越大越糟，維修後應階梯下降——全系統一致採此正負號慣例。

### 速度損失 (Speed Loss, speed_loss_pct)

相同（修正）主機功率下，實際船速較乾淨船體基準的下降百分比，主因船體/螺槳汙損：
`speed_loss_pct = (v_expected − STW) / v_expected × 100`（+ = 劣化）。是本專案主指標，趨勢圖、門檻
線、成本模型皆以它為核心。

### 期望船速 / 乾淨船速 (Expected / Clean-hull Speed, v_expected_kn)

在**修正功率**下由乾淨船體速度–功率曲線求得的應有船速：`v_expected = curve.clean_speed_kn
(power_corrected, Δ)`。它是速度損失的比較基準；實際對水船速 (STW) 低於它即為損失。

### 螺槳滑失率 (Propeller Slip, slip)

理論航距與實際航距的差異百分比：先由螺距與轉速求理論船速 `V_th = pitch · RPM · 60 / 1852`（kn），
再 `slip = (V_th − V) / V_th`。**視滑失 (apparent slip)** 用對地船速 (SOG)、**真滑失 (real slip)**
用對水船速 (STW)。上升多因螺槳汙損/受損或海流；真滑失突升是螺槳異常的主要判據。

### 海軍係數 (Admiralty Coefficient, admiralty_coef)

簡易船體推進效率基準：`C_A = Δ^(2/3) · STW³ / P_S`（Δ=排水量、P_S=主機功率）。**數值下降代表船體/
螺槳汙損加劇**，可與速度損失互相佐證。

### 速度–功率曲線 (Speed–Power Curve)

實測船速對主機功率的關係，與乾淨船體基準曲線比較以量化性能衰退；散點相對基準線右移即代表劣化。
基準曲線形如 `P = a · V^n`（指數 n≈3.5–4.2），排水量修正為 `P ∝ Δ^(2/3)`。每船一組海試
(sea trial) 基準點存於 `dim_reference_curve`。

### 在役性能指標 (In-service Performance, ISP)

ISO 19030 週期指標：各汙損週期的平均速度損失相對**首週期**的落差，衡量在航長期劣化。長格式
(long format) 存於 `fact_performance_indicator`，`value`=該週期平均、`reference_value`=首週期平均。

### 進塢性能指標 (Dry-docking Performance, DDP)

進塢 (dry dock) 前後各 **±45 天**視窗的平均速度損失對比（後 vs 前），衡量塢修效益。`value`=進塢後
45 天平均、`reference_value`=進塢前 45 天平均。

### 維修觸發 (Maintenance Trigger, MT)

速度損失的 **14 天移動平均**首次越過觸發門檻（本專案 **8%**）的日期，用於預警。`value`=8.0（門檻）、
`event_date`=越界日。門檻值權威來源見〈維修觸發門檻〉。

### 維修效益 (Maintenance Effect, ME)

單一維修事件前後（各 **±30 天**）的平均速度損失落差（前 − 後，+ = 已恢復），驗證維修成效。
`me_recovery_pct = ME.value / ME.reference_value × 100`；與成本並列可得回本天數 (payback)。

### 超額油耗 (Excess Fuel Oil Consumption, excess_foc_mt)

汙損造成的每日多耗燃油：`excess_foc = me_foc · [1 − (1 − s)^n]`（實作式，s = speed_loss/100、
n = 曲線指數）。等價於以乾淨油耗表示的 `FOC_clean · [(1/(1−s))^n − 1]`（規格 §4.4）。是成本模型與
維修時機最佳化的輸入。

---

## 4. 物理與環境修正

ISO 15016 的修正邏輯：把量測功率扣除環境附加阻力所耗的功率，還原到可比的參考條件。本專案 ETL 反推
產生器的完全相同前向物理，使植入的速度損失可還原（閉環 C13）。

### 附加阻力 (Added Resistance)

相對於平靜水面試航條件，風、浪、淺水、密度等環境因素額外造成的船體阻力。ISO 15016 修正即在扣除
其對應功率，取得修正功率。

### 風阻 (Wind Resistance, R_AA / resistance_wind_kn)

由相對風在水線上受風面積產生的縱向阻力，以 Blendermann / STA-JIP 風阻係數集計算：
`R_AA = ½·ρ_air·C_AA(ψ)·A_XV·V_WR² − ½·ρ_air·C_AA(0)·A_XV·V_G²`（ψ=相對風向、A_XV=橫向受風面積、
V_WR=相對風速）。單位 kN，靠港日為 null。

### 波浪附加阻力 (Added Wave Resistance, R_AW / resistance_wave_kn)

波浪造成的額外阻力，本專案採 **STAWAVE-1** 迎浪近似：
`R_AWL = (1/16)·ρ_sw·g·H_s²·B·√(B/L_BWL)`（H_s=有義波高、B=船寬、L_BWL=水線長）。單位 kN。

### 修正功率 / 修正船速 (Corrected Power / Speed, power_corrected_kw / speed_corrected_kn)

扣除環境附加功率後的可比值：`power_corrected = me_shaft_power_kw − ΔP_env`；`speed_corrected =
speed_tw_kn`（STW，海流已在對水基準中移除）。修正功率是求期望船速的輸入。

### 環境附加功率 (Environmental Power, ΔP_env)

風阻與浪阻換算所需的額外軸功率總和：`ΔP_env = 風(Blendermann) + 浪(STAWAVE-1 迎浪)` 附加功率，
約占總功率 10–20%。需要午報的船艏向 (heading) 才能重建其分量。

### 排水量換算 (Displacement Correction)

把不同載況的功率/船速換算到參考排水量：`P ∝ Δ^(2/3)`。ISO 19030 的 valid_flag 亦要求排水量落在
基準曲線適用範圍 `Δ ∈ [0.5, 1.2]·Δ_ref`。

### 推進效率 (Propulsion Efficiency, η)

主機軸功率轉換為有效推進力的效率，受船體/螺槳汙損影響而下降。海軍係數與速度損失即為其外顯代理指標。

### 淺水修正 / 密度修正 (Shallow-water / Density Correction)

水深不足時（Lackenby / Schlichting 法）與海水密度/黏度偏離參考值時對阻力所做的修正。本專案午報無
水深欄位，淺水修正為 N/A；密度/水溫修正則依 `sea_water_density`/`sea_water_temp` 進行。

---

## 5. 船舶規格與尺寸

`vessel_master` / `dim_vessel` 記錄的每船靜態規格，是效能計算的縮放基準。本專案船隊橫跨常見貨櫃
船級。

### 載重噸 (Deadweight Tonnage, DWT)

船舶可裝載的最大總重量（公噸），含貨物、燃油、淡水、備品等。貨櫃船以 DWT 作為 CII 的容量
(capacity)，故 AER 與 IMO 達成值一致。

### 總噸位 (Gross Tonnage, GT)

船舶內部容積的無因次量度，CII 法規適用門檻（5,000 GT 以上）以此界定，與載重噸不同。

### 垂線間長 (Length Between Perpendiculars, Lpp)

船艏艉垂線間的船長 (m)，常用於船體性能與波浪阻力計算（如 STAWAVE-1 的水線長）。

### 船寬 (Breadth / Moulded Breadth, B)

船舶的最大模寬 (m)，波浪附加阻力公式中的 `B`。

### 設計吃水 (Design Draft)

設計工況下的吃水深度 (m)，對應設計排水量與設計船速的基準載況。

### 最大持續額定功率 (Maximum Continuous Rating, MCR)

主機可長期連續運轉的最大功率 (kW)，是主機能力上限與各船級縮放的基準。

### 正常持續額定功率 (Normal Continuous Rating, NCR)

日常營運的常用續航功率，約 **0.85·MCR**，對應設計船速的巡航點。

### 設計船速 (Design Speed, Vdes)

船舶於設計工況下的合約/服務航速 (kn)。ISO 19030 的低速過濾以 `STW ≥ 0.5·Vdes` 為門檻。

### 定距螺槳 (Fixed-Pitch Propeller, FPP)

槳葉角度固定、以轉速調節推力的螺槳型式。本專案船隊皆為 FPP，其螺距 (pitch)、直徑 (diameter)、
槳葉數 (n_blades) 為固定規格，是計算理論船速 V_th 與滑失的依據。

### 方形係數 (Block Coefficient, Cb)

船體水下體積相對外接長方體 (Lpp×B×吃水) 的比值 `Cb = ∇ / (Lpp·B·T)`，反映船型豐瘦；貨櫃船
Cb 偏低（船型較瘦長）以利高速。

### 輕載排水量 (Lightship)

空船本身（船體、機械、固定設備）的重量，不含貨物/燃油/壓載。質量平衡中：
`排水量 Δ = lightship + 貨重 + 壓載 + 燃油 + 備品`。

### 設計排水量 (Design Displacement, Δ_ref)

基準速度–功率曲線所對應的參考排水量 (t)。實際排水量偏離時以 `P ∝ Δ^(2/3)` 換算。

### 標準貨櫃當量 (Twenty-foot Equivalent Unit, TEU)

以 20 呎貨櫃為基準的裝載量單位，用於描述貨櫃船規模（如 YM WELLNESS 約 11,000 TEU）。

### 船級 (Vessel Class)

貨櫃船依尺度分級：**支線型 (Feeder) → Feedermax → 巴拿馬極限型 (Panamax) → 後巴拿馬型
(Post-Panamax) → 新巴拿馬型 (Neo-Panamax) → 超大型 (Ultra Large Container Vessel, ULCV)**。本
專案 9 艘示範船涵蓋各級，深入探討對象 **YM WELLNESS** 為 Neo-Panamax。

---

## 6. 載況與靜水力

描述船舶當日的裝載狀態與吃水；載況決定排水量，進而影響功率需求與各項修正。

### 排水量 (Displacement, Δ)

船舶排開海水的重量，等於全船總重 (t)。由平均吃水經靜水力近似換算，並需滿足質量平衡
`Δ = lightship + cargo + ballast + fuel + stores`（一致性規則 C5）。

### 吃水 (Draft)

船體浸入水中的深度 (m)：分**艏吃水 (draft_fore)**、**艉吃水 (draft_aft)**、**平均吃水
(mean_draft = (艏+艉)/2)**。是查靜水力表求排水量的輸入。

### 俯仰差 (Trim)

艉吃水減艏吃水：`trim = draft_aft − draft_fore`（m）。正值為艉傾 (by the stern)，影響阻力與推進
效率。

### 載貨 / 壓載 (Laden / Ballast, condition_flag)

**laden**=載貨航行、**ballast**=空載壓載航行。壓載或零貨量日 EEOI 無意義而為 null。

### 貨重 (Cargo Weight, cargo_weight_mt)

當日實際載貨重量 (t)，質量平衡的組成之一，也是 EEOI 的分母因子。

### 質量平衡 (Mass Balance)

排水量須等於各重量組成之和（見〈排水量〉公式），確保合成資料的載況物理自洽（C5）。

### 靜水力表 (Hydrostatic Table)

船舶在各吃水下的排水量、浮心、每公分排水噸等靜水力參數對照表；本專案以近似關係由平均吃水換算
排水量。

---

## 7. 氣海象環境

午報記錄的氣象與海象，是 ISO 15016 環境修正與 ISO 19030 有效點過濾（風浪過大剔除）的依據。

### 蒲福風級 (Beaufort Scale, beaufort)

以整數 0–12 描述風力強度的分級，與風速及波高相關 (C11)。ISO 19030 有效點過濾要求 **Beaufort ≤ 6**；
異常偵測則以 **Beaufort ≥ 7** 作為海況異常 (weather) 的直接信號。

### 有義波高 (Significant Wave Height, Hs / wave_height_m)

海浪中最高 1/3 波高的平均 (m)，STAWAVE-1 浪阻公式的關鍵輸入 `H_s`；波高與蒲福風級正相關。

### 湧浪 (Swell)

由遠處風場傳來、與當地風不同步的長週期波（`swell_height_m`/`swell_dir_deg`），與當地風浪並存但
成因不同。

### 風速 / 風向 (Wind Speed / Direction)

真風速 (kn) 與風向 (°)。與船速合成為相對風 (V_WR)，決定風阻大小與方向。

### 海流 (Current, current_speed_kn / current_dir_deg)

水體流動 (kn/°)。對地船速與對水船速之差即海流投影分量：`SOG ≈ STW + 海流投影`（C4）。ISO 修正
以 STW 為對水基準，海流已內含其中。

### 海水密度 (Sea Water Density, sea_water_density_kg_m3)

海水單位體積質量 (kg/m³，約 1025–1028)，隨溫鹽變化；影響浮力（排水量）與阻力的密度修正。

### 海溫 / 氣溫 / 氣壓 (Sea/Air Temperature, Air Pressure)

`sea_water_temp_c`、`air_temp_c`（°C）與 `air_pressure_hpa`（hPa）。海溫影響海水密度/黏度與雷諾數
(Reynolds) 修正；氣壓/氣溫為氣象背景。

### 迎浪 (Head Sea)

波浪主要來自船艏方向的海況。STAWAVE-1 為迎浪近似法，於此條件下對波浪附加阻力估計最具代表性。

---

## 8. 航行與推進

描述船舶當日的移動與主機運轉；對地/對水的區分是滑失與海流一致性的基礎。

### 對地船速 (Speed Over Ground, SOG / speed_og_kn)

相對海底（GPS）的實際航速 (kn)，含海流影響。用於視滑失 (apparent slip) 與對地航距。

### 對水船速 (Speed Through Water, STW / speed_tw_kn)

相對水體（速度計）的航速 (kn)，是速度損失與真滑失的基準，也是 ISO 修正後的 `speed_corrected_kn`。

### 對地航距 / 對水航距 (Distance Over Ground / Through Water)

`distance_og_nm ≈ SOG · steaming_hours`、`distance_tw_nm ≈ STW · steaming_hours`（海里，C3）。對地
航距為 EEOI/AER 的距離分母。

### 航行小時 (Steaming Hours)

當日主機推進航行的時數（航行中約 24、靠港 0），是油耗/航距換算的時間基準。

### 主機轉速 (Main Engine RPM, me_rpm)

主機每分鐘轉數，與螺距相乘得理論船速 V_th（滑失計算，C7）。

### 船艏向 (Heading, heading_deg)

船艏指向的方位角 (°)。ETL 需要它把風/浪分解到船體縱向以重建環境修正；缺此欄則無法還原
風/浪功率。

### 航次 / 航段 (Voyage / Leg)

`voyage_no`=航次編號、`leg`=航段（`<起>-<訖>` 港對）。用於把逐日午報歸屬到航程脈絡。

### 節 (Knot, kn)

航速單位，1 節 = 1 海里/小時 ≈ 1.852 km/h。

### 海里 (Nautical Mile, nm)

航海距離單位，1 nm ≈ 1.852 km。理論船速換算 `V_th = pitch·RPM·60/1852` 中的 1852 即 1 nm 的公尺數。

### 慢速航行 (Slow Steaming)

刻意降低航速以節省燃油與減排的營運策略；降速使單位油耗與碳強度下降，是 CII 合規的常見手段。

---

## 9. 燃油與機械

午報的燃油與各機種油耗，是能量平衡、碳排與成本計算的來源。

### 燃油消耗量 (Fuel Oil Consumption, FOC)

每日耗油量 (t)，分**主機 (me_foc)**、**輔機 (ae_foc)**、**鍋爐 (boiler_foc)**，總和為
`total_foc = me + ae + boiler`（C8）。能量平衡：`me_foc ≈ P_shaft · SFOC · hours / 1e6`（C2）。

### 主機 / 輔機 / 鍋爐 (Main Engine / Auxiliary Engine / Boiler)

**主機 (ME)** 提供推進軸功率、**輔機 (AE)** 供船上電力、**鍋爐 (boiler)** 供蒸氣加熱。三者油耗
分別計量，僅主機油耗用於速度損失/SFOC 等推進指標。

### 燃油種類 (Fuel Types: HFO / VLSFO / LSMGO / MGO)

- **HFO**（Heavy Fuel Oil，重燃油）：高硫，須配洗滌器 (scrubber) 使用；C_F 3.114、LCV 40.2。
- **VLSFO**（Very Low Sulphur Fuel Oil，超低硫燃油）：海上主要用油；C_F 3.151、LCV 41.0。
- **LSMGO / MGO**（(Low Sulphur) Marine Gas Oil，船用輕柴油）：靠港/管制區用油；C_F 3.206、LCV 42.7。

### 洗滌器 (Scrubber)

廢氣清洗系統，使船舶得以續用高硫 HFO 而符合硫排放上限。本專案船隊 `9700003`、`9700009` 於海上
用 HFO 即因配有洗滌器。

### 低位發熱值 (Lower Calorific Value, LCV, fuel_lcv_mj_kg)

單位質量燃油的可用發熱量 (MJ/kg)，越高越耐燒。可由 `功率 = me_foc · LCV / SFOC` 反推軸功率。各
燃油值見〈燃油種類〉。

### 加油價 (Bunker Price, price_usd_per_mt)

各燃油每噸價格 (USD/t) 的時間序列（`fuel_price` 表）。以 `(date, fuel_type)` 聯結，為額外油耗
定價，是超額油費與維修成本效益的輸入。

---

## 10. 汙損與維護行動

汙損隨時間累積使速度損失上升，維修事件將其重置；成因→行動決策表由 UWI 與異常成因推導每船的維修
行動。

### 生物附著 / 船體汙損 (Biofouling / Fouling)

船體與螺槳附著的海生物與黏泥，使阻力上升、速度損失漸增。**生物附著在本專案中表現為趨勢斜率
(fouling rate)，而非點異常成因**——漸進汙損以分段斜率呈現，不會被標成單日 anomaly。

### 汙損速率 (Fouling Rate, fouling_rate_pct_per_day)

速度損失每日增加的百分點 (%/day)，即開放週期 (open cycle) 速度損失 vs 距上次清潔天數的 Theil-Sen
斜率。越高代表汙損越快，是最佳清潔時機 t\* 成本模型的關鍵斜率 β 來源。

### 距上次清潔天數 (Days Since Cleaning, days_since_cleaning)

自最近一次船體清潔或進塢起算的天數（聯集時鐘 (union clock)）。**只有 `hull_cleaning ∪ dry_dock` 會重置
此時鐘**，拋光/塗層/螺槳修理不會。是汙損趨勢迴歸的橫軸。等於 `min(days_since_dry_dock,
days_since_in_water)`，即以下兩個獨立時鐘的較小值。

### 距上次乾塢天數 (Days Since Dry-dock, days_since_dry_dock)

自最近一次乾塢 (dry-dock) 起算的天數；**只有 `dry_dock` 會重置此時鐘**。首週期錨定於視窗起點。

### 距上次水下清潔天數 (Days Since In-water Cleaning, days_since_in_water)

自最近一次水下船體清潔 (in-water hull cleaning，即 `hull_cleaning`) 起算的天數；**只有 `hull_cleaning`
會重置此時鐘**。首週期錨定於視窗起點。

### 進塢 (Dry Dock)

船舶進乾塢做大修，含全面船體清潔、塗層更新與螺槳處理，是最徹底的汙損重置事件（每 2.5–5 年）。塢修
效益以 DDP 指標衡量。

### 船體清潔 (Hull Cleaning)

在水下或塢內清除船體附著物以回復速度，重置汙損時鐘（每 6–12 月）。其成本最佳時機由汙損成本模型
求 t\*（見〈最佳清潔時機〉）。

### 螺槳拋光 (Propeller Polishing)

打磨螺槳表面以降低粗糙度、回復推進效率。UWI 判 `propeller_condition ∈ {C,D}`、
`propeller_roughness_um > 300` 或有螺槳異常時建議（優先度 medium）。不重置汙損時鐘。

### 螺槳修理 (Propeller Repair)

修復螺槳的實體損傷（如葉緣受損）。UWI 判 `propeller_condition ∈ {E,F}` 或高嚴重度螺槳異常時建議
（優先度 high，並抑制拋光建議）。

### 塗層更新 (Coating Renewal)

重新塗覆船體防汙塗層 (antifouling coating)。UWI 判 `coating_condition = poor` 時建議（優先度
medium）。

### 主機檢查 (Engine Inspection)

主機的檢查/檢修。近 **180 天**內出現引擎劣化 (engine_degradation) 異常 ≥1 時建議（≥2→high，
否則 medium）。

### 維修事件 (Maintenance Event)

`maintenance_event` 記錄的維修/事件，型別含 `hull_cleaning`、`propeller_polishing`、`dry_dock`、
`coating_renewal`、`propeller_repair`。附現金成本與停役時數。

### 停役時數 (Downtime, downtime_hours)

維修導致的停航時數。**事件全額成本 = cost_usd + downtime_hours · $1000/h**，用於回本天數與 t\* 的
清潔成本 K。

### 成因→行動決策表 (Cause→Action Decision Table)

由**最新 UWI 狀況 + 近 180 天異常成因 + 汙損成本模型**推導每船維修行動的規則表（`recommend_actions`），
輸出 `fact_maintenance_recommendation`（粒度：船×行動，附優先度、到期日、佐證、證據來源
source ∈ {uwi, anomaly, fouling_model, uwi+anomaly}）。某船若無待辦則無任何列，代表維修進度良好。

### 單項預測 (Per-action Forecast)

針對每一維修行動，取其劣化指標對距重置天數 (days-since-reset) 的 Theil-Sen 穩健斜率外推，預測何時
越過該行動的門檻值以設定 `due_date`：螺槳拋光粗糙度 → 300 µm、螺槳修理 → 430 µm、塗層更新崩解率
→ 45%、主機檢查 SFOC → +5%。斜率非正或點數不足時，`due_date` 退回依優先度設定的預估窗口，而非
留白。

### 維修規劃 / 服務窗口 (Maintenance Planner / Service Window)

把各行動各自預測的 `due_date` 批次整併為船舶「下一次維修窗口」的統籌規劃層：以
**`_PLAN_BATCH_DAYS = 60`** 天為容差，貪婪 (greedy) 兩段批次——先將需進塢行動（塗層更新、螺槳修理）
依最早到期日分批成 dry_dock 窗口（進塢為強制錨點，窗口日期恆取該批最早進塢到期日，不提前）；再將
水下行動（船體清潔、螺槳拋光、主機檢查）併入鄰近的 dry_dock 窗口，未併入者自成 in_water 窗口。每列
輸出 `plan_date`（窗口日期）與 `plan_service_type` ∈ {`dry_dock`, `in_water`}。

### 維修觸發門檻 (Maintenance Trigger Threshold, MT_TRIGGER_PCT)

驅動 MT 指標與 `trigger_eta` 的速度損失門檻。**程式碼權威值為 8%**（`periods.MT_TRIGGER_PCT = 8.0`）；
規格 §5.5 與部分 WELLNESS 敘述寫作約 10%——以 8% 為實際資料值，約 10% 僅為文字敘述。

---

## 11. 水下檢查與船況

UWI（`uwi` / `fact_uwi`）以事件型記錄船體與螺槳的實地狀況，佐證異常成因並觸發維修建議。

### 水下檢查 (Underwater Inspection, UWI)

由潛水員或載具對水下船體與螺槳進行的檢查，記錄汙損等級、覆蓋率、螺槳狀況/粗糙度與塗層狀況，並給
建議行動 (`none`/`polish`/`clean`)。與真實汙損狀態正相關（一致性規則 C10）。

### 潛水員 / 遙控載具 (Diver / ROV)

檢查執行方式 `inspection_type ∈ {diver, ROV, UWI}`：**diver** 為潛水員、**ROV**
(Remotely Operated Vehicle) 為遙控水下載具。

### 船體汙損等級 (Hull Fouling Rating, hull_fouling_rating)

水下檢查判定的船體汙損程度 **0–100**（NSTM 量表，越高越髒）。**≥60 建議船體清潔**（優先度 medium、
source=uwi）。

### 船體汙損覆蓋率 (Hull Fouling Coverage, hull_fouling_coverage_pct)

船體被附著物覆蓋的面積百分比 (%)，與汙損等級並列描述附著範圍。

### 螺槳狀況 (Propeller Condition, propeller_condition)

Rubert 量表 **A–F**（A 最佳、F 最差）：**E/F 建議螺槳修理、C/D 建議拋光**。是螺槳維修行動的主要
判據。

### 螺槳粗糙度 (Propeller Roughness, propeller_roughness_um)

螺槳表面粗糙度 (µm)，越高摩擦阻力越大。**>300 µm 觸發拋光建議**。

### 塗層狀況 (Coating Condition, coating_condition)

船體防汙塗層評級 `good`/`fair`/`poor`：**poor 建議塗層更新**（優先度 medium）。

---

## 12. 成本與經濟

把汙損與維修轉換為金額，支撐清潔時機與維修投資決策。

### 額外燃油成本 (Excess Fuel Cost, excess_cost_usd)

因速度損失多耗燃油產生的每日成本：`excess_cost = excess_foc × fuel_price(date, fuel_type)`（USD）。

### 累計額外成本 (Cumulative Excess Cost, cum_excess_cost_usd)

自本汙損週期起累加的額外燃油成本（USD），呈現汙損「代價曲線」，是清潔急迫性的直觀依據。

### 潛在節省 (Savings Potential, savings_potential)

依各船清潔建議可節省的燃油成本總額 (USD)，用於船隊層級的資源排程。

### 淨節省 (Net Saving, net_saving_usd)

在最佳時機 t\* 清潔（相對於拖到觸發門檻才清潔）所省下的成本：
`net_saving = ∫_{T*}^{trigger} (c(t) − J*) dt`（USD）。僅在 trigger ETA 存在且晚於 T\* 時計算，
否則 null。

### 燃油代價 (Fuel Penalty)

汙損導致的額外燃油消耗與其累計成本的統稱，對應超額油耗與累計額外成本曲線。

### 超額油費歸因 (Excess-cost Attribution)

將每個航行日的燃油代價 (fuel penalty) 依物理來源拆解為三個可加 (additive) 分量：船體汙損
(fouling)、天氣 (weather)、操作 (operational)。汙損分量等於既有的額外燃油成本
(`excess_cost_usd`)；天氣與操作為在其之上的額外燃油，故三者堆疊的總額大於 `excess_cost_usd`。
深潛 (deep-dive) 頁以堆疊面積圖呈現，用來釐清「速度損失非全屬汙損」的爭議。

### 汙損分量 (Fouling Component, excess_cost_fouling_usd)

燃油代價中歸因於船體與螺槳汙損增阻的部分（USD），數值上等於 ISO 19030 速度損失罰則
`excess_cost_usd`。

### 天氣分量 (Weather Component, excess_cost_weather_usd)

燃油代價中歸因於風、浪環境增阻的部分（USD）：由 ISO 15016 修正移除的增阻功率
`dp_env_kw = resistance_to_power_kw((resistance_wind_kn + resistance_wave_kn)·1000, STW)`
換算燃油後乘當日油價。

### 操作分量 (Operational Component, excess_cost_operational_usd)

燃油代價中歸因於引擎負載 (engine load) 偏離最佳效率點（約 80% MCR）的 SFOC 罰則（USD）：
`me_foc · p/(1+p) × price`，`p = 0.18·(load−0.80)²`，`load = me_power/mcr`；鏡射生成器
`_sfoc` 的負載 U 形曲線。

### 回本天數 (Payback, payback_days)

維修成本以節省燃油回收所需的天數：`payback = 事件全額成本 / 每日超額成本節省`（比較事件前後 ±30 天
的平均 `excess_cost_usd`）。視窗空或節省 ≤ 0 時為 null。

### 效果回復 (Recovery, me_recovery_pct)

維修後速度損失回復的百分比：`me_recovery_pct = (前 − 後)/前 × 100`，越高代表維修越有效（見〈維修
效益 ME〉）。

### 最佳清潔時機 (Optimal Cleaning Time, t\* / t_star_days)

使週期平均成本率最小的建議清潔天數，僅適用於船體清潔。以開放週期的每日超額成本率
`c(t) = α + β·t` 建模，週期成本率 `J(T) = K/T + α + β·T/2`，閉合解 **`T* = √(2K/β)`**；
`recommended_clean_date = last_cleaning + round(T*)`。K = 船體清潔全額成本中位數（無清潔史時退回
船隊中位數）。退化條件（<30 定價點、β ≤ 0、CI 跨 0、無 K）→ `status = insufficient_history`。

---

## 13. 統計與分析方法

M3 統計層以穩健迴歸建趨勢基線，再對殘差偵測點異常並分類成因；全程規則+統計，不使用 SageMaker。

### Theil-Sen 穩健迴歸 (Theil-Sen Estimator)

取所有點對斜率中位數的趨勢估計 `slope = median pairwise slope`，對維護造成的階梯變化不敏感。本專案
用於汙損率趨勢與超額成本率 `c(t)` 的擬合。

### Huber 迴歸 (Huber Regressor)

對離群值較不敏感的穩健迴歸法。規格 §5.1 列為趨勢法之一，但**實作僅採 Theil-Sen**（此為對規格的
偏離，已於 `insights.md` 註明）。

### 分段迴歸 (Piecewise Regression)

以維修事件（`hull_cleaning ∪ dry_dock` 重置點）切段，各汙損週期各自擬合斜率與截距，形成
`Segment`；斜率即該週期的汙損率。

### EWMA 管制圖 (Exponentially Weighted Moving Average Control Chart)

指數加權移動平均管制圖（λ=0.3、L=3），對持續性偏移敏感。本專案以固定目標 EWMA 偵測引擎劣化
（SFOC 殘差，下限 0.045）與螺槳汙損（真滑失殘差，下限 0.025）——一段劣化步階會整段維持失控。

### 滾動 / MAD z 分數 (Rolling / MAD z-score)

以移動視窗（W=30 天）計算的修正 z 分數（改用中位數絕對偏差 MAD 而非標準差，較耐離群）。門檻
modified-z ≥ 4.5 觸發滾動異常。

### 四分位距 (Interquartile Range, IQR)

`IQR = Q3 − Q1`。粗大離群偵測界為 `Q1 − 3·IQR … Q3 + 3·IQR`，落於界外即標記（用於 speed_loss/
slip/sfoc）。

### 孤立森林 (Isolation Forest)

以隨機切分「孤立」離群點的無監督 ML（scikit-learn，200 棵樹、`contamination='auto'`、需 ≥20 點）。
本專案僅在全域殘差 z ≥ 3.5 佐證時才採信其標記，以壓低誤報。

### 自助抽樣信賴區間 (Bootstrap Confidence Interval)

以 100 次有種子的重抽樣估斜率的 2.5/97.5 百分位作為信賴區間（僅開放週期計算）。若斜率 CI 跨越 0，
成本模型視為退化不建議。

### 相關係數 (Spearman / Pearson Correlation)

**Pearson** 衡量線性相關、**Spearman** 衡量單調（秩）相關。用於佐證成因，如速度損失與距上次清潔
天數、蒲福風級與波高的相關性。

### 精確率 / 召回率 (Precision / Recall)

**precision** = 標記為異常中確為真的比例、**recall** = 真異常中被抓到的比例。C14 驗收要求偵測
recall ≥ 0.70、precision ≥ 0.60，成因準確率 ≥ 0.75。

### 殘差 / 基線 (Residual / Baseline)

**基線 (baseline)** 為趨勢擬合給出的每日期望值（speed_loss 用分段線、sfoc/slip 用週期穩健中位數）；
**殘差 (residual)** 為觀測減基線。異常偵測對殘差評分，使漸進汙損不被誤判為點異常。

### 標準分數 (z-score)

觀測值偏離常態的標準差倍數，絕對值越大越異常。`fact_anomaly.z_score` 採全域 MAD 殘差 z。

### 異常 / 嚴重度 / 成因 (Anomaly / Severity / Cause)

- **異常 (anomaly)**：指標偏離預期而被偵測的單日事件（`fact_anomaly` 每筆一列）。
- **成因 (cause)**：`{engine_degradation, propeller, weather, sensor}`，以首中即取 (first-match)
  規則分類（不含 biofouling——它是趨勢斜率）。
- **嚴重度 (severity)**：`low`/`medium`/`high`，依各成因的殘差帶分級。

### 告警事件 (Alert Episode)

`fact_alert` 的粒度單位：把同一成因 (cause) 的連續 `fact_anomaly` 點異常收斂成一則敘事化事件，間隔
容忍度 (gap tolerance) **7 天**（`_GAP_DAYS`）——超過此間隔視為新事件。記錄開啟日 (opened_date)、
最近出現日 (last_seen_date)、峰值嚴重度/|z|、峰值驅動指標與窗口內估計燃油損失。另納入**船體生物
附著 (hull_biofouling)**——唯一的趨勢型成因（不會是點異常），源自汙損成本模型（正汙損率 + 觸發
預估日 trigger ETA）佐以近 14 天平均速度損失 vs 維修觸發門檻。共 **5 種成因**：
`engine_degradation`、`propeller`、`weather`、`sensor`、`hull_biofouling`。每列附雙語敘事
`message_zh`/`message_en`、建議行動與 `status='open'`。

### 外推 (Extrapolation)

依現有趨勢向未來延伸的預測，用於估計觸發預估日 (trigger ETA)——把開放週期的速度損失線外推到門檻
（斜率 ≤ 0 則無 ETA）。

### 趨勢 (Trend)

速度損失隨時間的斜率；上升 (↑) 代表持續惡化。Dashboard 以趨勢線 + 95% 區間 + 外推虛線呈現。

---

## 14. 資料與系統概念

資料流與資料表的組織方式，及貫穿全案的一致性與品質概念。

### 午報 (Noon Report)

每船每日一筆的船上回報（`noon_report`），含航程、航行/推進、燃油、載況、氣海象五群欄位，是效能
分析的核心來源。本專案為合成資料。

### 資料湖 (Data Lake)

以 S3 為底、Athena 查詢的分區資料存放區（`ym_hackathon`）。分兩區：raw 與 curated。

### 原始區 / 精煉區 (Raw Zone / Curated Zone)

- **原始區 (raw zone，M1)**：合成產生器落地的原始 JSONL（午報、UWI、維修事件、船舶主檔、參考
  曲線、油價）。
- **精煉區 (curated zone，M2+M3)**：ETL 套 ISO 15016/19030 + 統計後的分析事實表，以
  `imo_number/year/month` 分割並上傳 S3。

### 事實表 / 維度表 / 彙總表 (fact_ / dim_ / agg_ Tables)

- **fact_**：事實表，逐事件/逐日的量測與指標（如 `fact_performance_daily`、`fact_anomaly`）。
- **dim_**：維度表，靜態屬性（如 `dim_vessel`、`dim_reference_curve`）。
- **agg_**：彙總表，跨船/跨日聚合（如 `agg_fleet_daily`）。

### 營運船隊 (Operational Fleet)

`dim_vessel.fleet_id`/`fleet_name` 定義的航線分組維度：**FL-IA**（Intra-Asia，亞洲區間）、
**FL-TP**（Trans-Pacific，跨太平洋）、**FL-AE**（Asia-Europe，亞歐）各轄 3 艘船；另有 **`ALL`**
全船隊彙總（非實際航線分組，供跨船隊比較）。是 `agg_fleet_daily` 的分組粒度（fleet × day，3 個
子船隊 + `ALL` 共 4 組），也是 Dashboard 船隊篩選器 (fleet picker) 的來源。

### 地面實況 (Ground Truth)

產生器植入的真實汙損軌跡等（`tmp/truth/`），**永不上傳或編目**，僅供閉環驗證 (C13/C14) 比對；ETL
本身從不讀取，以模擬正式環境中無真值可用。

### 閉環可還原性 (Closed-loop Recoverability, C13)

ETL 反推產生器的完全相同前向物理，套 ISO 15016/19030 後還原的速度損失須與植入真值誤差在容忍區內
（偏差 ≤ 0.2 pp、平均 ≤ 0.8 pp、≥98% 點在 2 pp 內）。是「資料可被公式驗證」的核心驗收。

### 一致性檢查 (Consistency Checks, C1–C14)

合成資料須恆成立的物理/邏輯關係：**C1–C13** 為 M1 產生一致性（速度-功率、能量平衡、航距、對地/對水、
排水量-吃水、俯仰、滑失、碳排、汙損單調性、UWI 佐證、氣海象相關、量測=真值+雜訊、可還原性）；
**C14** 為 M3 統計層驗收（偵測 recall/precision、成因準確率、嚴重度、建議與維修效益合理性）。

### 資料品質 / 有效點旗標 (Data Quality / valid_flag)

**valid_flag** 為 ISO 19030 過濾閘門：`at_sea 且航行中 且 STW ≥ 0.5·Vdes 且 Beaufort ≤ 6 且
Δ ∈ [0.5, 1.2]·Δ_ref 且推進欄位有限/為正`。**資料品質 (data quality)** 即通過過濾的有效點占比，
Dashboard 以此透明化 ISO 19030 篩選。（注意：異常偵測跑在更廣的殘差集上，不限 valid 點，以免海況
異常被 Beaufort≤6 閘門結構性遮蔽。）

### 儀表板三頁 (Dashboard: Fleet Overview / Vessel Deep-dive / Alerts)

- **船隊總覽 (Fleet Overview)**：KPI 卡、船隊表/熱力矩陣、地圖、分布與排行（源：`agg_fleet_daily`、
  `dim_vessel`、`fact_recommendation`）。
- **個船深入 (Vessel Deep-dive)**：以 YM WELLNESS 示範速度損失趨勢、速度-功率散點、修正瀑布圖、
  滑失/SFOC/海軍係數、油耗與累積超額油費、異常時間軸、維修效益、維修建議與最新水下檢查。
- **異常預警 (Alerts)**：全船隊 active alert 清單（源：`fact_anomaly` + `fact_recommendation`）。
