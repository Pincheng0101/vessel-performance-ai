# 演算法與模型總覽 (Algorithm & Model Catalog)

本文件彙整本專案中**每一個**機器學習 (machine learning)、統計 (statistical)、規則式 (rule-based)、
作業研究最佳化 (operations-research optimization)、物理 (physics) 與生成式 (generative) 方法 —— 說明
每個方法**位於何處**(檔案 · 函式 · 行號)以及**為何**如此選擇。對應英文版:
[`algorithm.md`](./algorithm.md)。

方法論原先散落於 `insights.md`、`poc-spec.md §5`、`glossary.md §13` 及各模組的行內註解 (docstring);本
文件將其整合於一處。

---

## 1. 總覽 (Overview)

**整套技術堆疊 (stack) 僅依賴 numpy、全部手工實作。** 每一項統計量 —— Theil-Sen 斜率、中位數絕對偏差
(MAD) z 分數 (z-score)、指數加權移動平均 (EWMA) 管制圖 (control chart)、皮爾森 (Pearson) / 斯皮爾曼
(Spearman) 相關、自助法 (bootstrap) 信賴區間 (confidence interval, CI) —— 皆直接以 `numpy` 實作。全專案
只有**一個**現成估計器 (estimator):

- 來自 **scikit-learn** 的 `IsolationForest`(孤立森林)—— 唯一的非監督式 (unsupervised) 模型,僅作為
  z 分數閘門後方的多變量 (multivariate) 尾端離群值 (tail outlier) 總攔截器使用。

前端圖表在瀏覽器端以 **D3.js** 自行計算趨勢/直方圖 (Theil-Sen、普通最小平方 (OLS) 斜率、`d3.bin`)。

```
# pyproject.toml —— 僅在 dev group;Lambda 執行環境不含任何數值函式庫
numpy
scikit-learn
```

專案中**沒有 SageMaker、沒有深度學習 (deep learning)、沒有梯度提升 (gradient boosting)、沒有 K-means /
DBSCAN 分群 (clustering)、沒有 ARIMA / statsmodels、沒有 scipy、沒有 pandas**。此設計刻意採用*規則 +
穩健統計 (robust statistics)*:一個必須能解釋每一個警示、能在精簡 Lambda 內執行、且可被稽核 (auditable)
的概念驗證 (proof of concept, POC)。

程式碼所在位置:

| 領域 | 位置 |
| --- | --- |
| M2 物理 / ISO 修正與指標 | `ym_datalake/etl/corrections.py`、`indicators.py`、`filters.py` |
| M3 統計(趨勢、異常、CII、期間、警示、建議) | `ym_datalake/etl/` |
| 前向 (forward) / 生成式模型(合成資料) | `ym_datalake/synthetic_data/` |
| 驗證(相關性與偵測閘門) | `ym_datalake/etl/validate.py`、`synthetic_data/validate.py` |
| 前端計算 (D3) | `web/charts/`、`web/components/` |

---

## 2. 總表 (Summary table)

共 47 項技術,一項一列。類型 ∈ {ML, Statistical, Rule-based, OR-optimization, Physics, Generative}。
各列依記載其細節的章節(§3–§12)分組。

| # | 技術 | 類型 | 位置 | 選用理由 |
| --- | --- | --- | --- | --- |
| 1 | 孤立森林 (Isolation Forest) | ML | `etl/anomaly.py:167` `_iforest_tail` | 非監督多變量尾端離群值總攔截器,置於 z≥3.5 閘門之後 |
| 2 | Theil-Sen 斜率 | Statistical | `etl/trends.py:38` `_theil_sen` | 成對斜率中位數 → 汙損率,對清潔階躍不敏感 |
| 3 | 穩健直線(斜率+截距) | Statistical | `etl/trends.py:61` `robust_line` | Theil-Sen 斜率 + 中位數截距,共用趨勢原語 |
| 4 | 自助法 95% 信賴區間 | Statistical | `etl/trends.py:48` `_bootstrap_ci` | 100 次固定種子重抽 → 斜率不確定性帶 |
| 5 | 分段回歸 (segmented regression) | Statistical | `etl/trends.py:83` `fit_segments` | 於清潔/乾塢重置點切分,各週期獨立擬合 |
| 6 | 門檻跨越外推 | Statistical | `etl/trends.py:154` `extrapolate` | 將開放週期直線外推至目標% → 到期日 / RUL |
| 7 | `np.polyfit` 一階 | Statistical | `synthetic_data/validate.py:242` | 斜率方向/單調性檢查(僅驗證) |
| 8 | 前端 Theil-Sen | Statistical | `web/charts/speedLossTrend.js:10` `theilSen` | 瀏覽器端同一穩健斜率,供趨勢圖使用 |
| 9 | EWMA 管制圖 | Statistical | `etl/anomaly.py:97,106` `_ewma`/`_sustained_oob` | 固定目標 EWMA(λ=0.3, L=3)→ 持續性引擎/螺槳階躍 |
| 10 | 滾動修正 z(Iglewicz-Hoaglin) | Statistical | `etl/anomaly.py:83` `_rolling_z` | 視窗化 MAD z(W=30, z≥4.5)偵測局部單點尖峰 |
| 11 | 全域 MAD z | Statistical | `etl/anomaly.py:59,67` `_mad_scale`/`_global_z` | 1.4826·MAD 穩健 σ → 標準化殘差尺度 |
| 12 | 風速對蒲福殘差 z | Statistical | `etl/anomaly.py:71` `_wind_residual_z` | 中位比值 B^1.5 擬合 → 風速感測器異常 |
| 13 | IQR / Tukey 粗差閘門 | Statistical | `etl/anomaly.py:161` `_iqr_gross` | 3×IQR 圍籬 → 穩健單點粗差離群值 |
| 14 | 頂十分位波高百分位閘門 | Statistical | `etl/anomaly.py:235` | 第 90 百分位波高才認定為天氣驅動的速損尖峰 |
| 15 | 偵測器 OR 融合 | Rule-based | `etl/anomaly.py:270,273` | 所有偵測器 + 蒲福≥7 的布林 OR → 每 (imo,date) 一旗標 |
| 16 | 首中因果鏈 + 連續長度 | Rule-based | `etl/anomaly.py:301,174` `_classify`/`_run_lengths` | 優先序串接 感測器→天氣→引擎→螺槳→退回 |
| 17 | 嚴重度分級 | Rule-based | `etl/anomaly.py:326,191` `_severity`/`_severity_from` | 將殘差量值對映 低/中/高 |
| 18 | CII A–E 評級 | Rule-based | `etl/cii.py:30` `_rating` | IMO 法規 dd 向量分級,作用於達成/要求比值 |
| 19 | Rubert / 塗層分級 | Rule-based | `synthetic_data/fouling.py:67,78` | 粗糙度→Rubert 等級,破損→塗層狀態 |
| 20 | ISO 19030 有效點過濾 | Rule-based | `etl/filters.py:29` `is_valid` | 蒲福≤6 + 航速/排水量帶 → 僅穩態點 |
| 21 | 封閉解最佳服務間隔 t* | OR-optimization | `etl/recommendation.py:218,212` `_optimal_service`/`_net_saving` | t*=√(2K/β)、J*、淨節省積分,用於船體清潔 |
| 22 | 成本率擬合(α+βt) | Statistical | `etl/recommendation.py:132` `fit_cost_rate` | 穩健擬合超額成本率 → 最佳化所需之 β |
| 23 | 逐行動 RUL 預測 | Statistical | `etl/recommendation.py:348,365,639` | 對各退化訊號穩健擬合 + 門檻跨越 |
| 24 | 係數經濟學 | OR-optimization | `etl/recommendation.py:409` `_coefficient_economics` | 對每個非船體行動重用 t* 模型 |
| 25 | 貪婪時間視窗批次 | OR-optimization | `etl/recommendation.py:758,778` `_batch_by_due`/`plan_maintenance` | 將分散到期日聚成 60 天服務視窗 |
| 26 | 優先度 / 到期上限視野 | Rule-based | `etl/recommendation.py:335` `_due_or_horizon` | 退回到期日,確保建議恆不為 null |
| 27 | 回收期 | OR-optimization | `etl/recommendation.py:121` `_payback_days` | 事件成本 ÷ 每日節省 → 回收天數 |
| 28 | 間隔容忍事件分組 | Rule-based | `etl/alerts.py:121` `_split_episodes` | 遲滯:同因異常於間隔 > 7 天處切分 |
| 29 | 峰值嚴重度 | Rule-based | `etl/alerts.py:68` `_peak_severity` | 事件嚴重度 = 成員中最嚴重者 |
| 30 | 生物附著趨勢警示 | Rule-based | `etl/alerts.py:207,188` `_biofouling_alert`/`_trailing_speed_loss` | 尾隨 14 天均值 + 觸發臨近度 → 主動警示 |
| 31 | 事件成本中位數彙總 | Statistical | `etl/recommendation.py:76` `_median_event_cost` | 各事件型別的穩健中央成本 K |
| 32 | ISO 19030 期間指標 | Statistical | `etl/periods.py:70,138` `build_indicators` | ISP/DDP/ME 恢復 + MT 尾隨均值 8% 跨越 |
| 33 | 船隊 group-by 彙總 | Statistical | `etl/compute.py:246` `_agg_row` | ALL + 3 個靜態船隊(組態分組,非分群) |
| 34 | 前端 OLS 趨勢箭頭斜率 | Statistical | `web/components/FleetOverview.js:13` `slopeOf` | 對最近 30 筆做最小平方斜率,供趨勢箭頭 |
| 35 | `d3.bin` 直方圖 | Statistical | `web/charts/histogram.js:14` | 等寬分箱,供分布圖 |
| 36 | 皮爾森相關 | Statistical | `synthetic_data/validate.py:76` `_pearson` | 線性佐證注入的關係 |
| 37 | 斯皮爾曼等級相關 | Statistical | `synthetic_data/validate.py:86,94` `_ranks`/`_spearman` | 單調佐證(UWI↔汙損、退化↔時間) |
| 38 | 混淆矩陣精確率/召回率 | Statistical | `etl/validate.py:128,139` `_check_detection`/`_check_causes` | 偵測與逐因召回/精確驗收閘門 |
| 39 | ISO 15016 風/浪功率修正 | Physics | `etl/corrections.py:22` `wind_wave_correction` | Blendermann C_AA=0.9 + STAWAVE-1 迎浪 → 扣除環境功率 |
| 40 | 冪律速度-功率曲線 + 反解 | Physics | `synthetic_data/curves.py:33,37` | P=a·V^n·(Δ/Δ_ref)^(2/3) 前向/反向共用關係 |
| 41 | ISO 19030 績效指標 | Physics | `etl/indicators.py:14–65` | 速損 / 滑失 / SFOC / 海軍係數 / EEOI / 超額油耗 |
| 42 | 含重置階躍的線性汙損軌跡 | Generative | `synthetic_data/fouling.py:288` `fouling_state` | 於清潔處重置的分段線性 UWI 成長 |
| 43 | 獨立退化程序 | Generative | `synthetic_data/fouling.py:87` `degradation_rates` | 螺槳粗糙、塗層、SFOC 漂移為各自時鐘 |
| 44 | 負載相依 SFOC U 形 | Generative | `synthetic_data/generate.py:168` `_sfoc` | ETL 之後除去的凸形 SFOC(load) |
| 45 | 高斯隨機漫步燃油價格 | Generative | `synthetic_data/datasets.py:58` `build_fuel_price` | 逐燃油每日隨機漫步含下限 |
| 46 | 季節諧波 + 雜訊海氣象 | Generative | `synthetic_data/environment.py:28` `generate_environment` | 蒲福 v=0.836·B^1.5 風、季節波/流 |
| 47 | 標記異常注入 + 感測器雜訊 | Generative | `synthetic_data/noise.py:38` `build_anomaly_plan` | 真實標記異常 + 有界雜訊,供偵測器評分 |

---

## 3. 機器學習 (Machine learning)

### 孤立森林 (Isolation Forest) —— 尾端離群值總攔截器
- **類型:** ML(非監督)· 全庫*唯一*的 scikit-learn 估計器。
- **位置:** `etl/anomaly.py:167` `_iforest_tail`(於 `:250` 呼叫)。
- **內容:** 在 5 特徵標準化殘差矩陣上執行
  `IsolationForest(n_estimators=200, contamination='auto', random_state=0, n_jobs=1)` —— 該矩陣為
  `speed_loss`、`slip`、`sfoc`、`excess_foc` 的全域 MAD z 分數加上蒲福 (Beaufort) z(`etl/anomaly.py:250`)。
  回傳 `-1`(離群)列。有效點少於 20 時跳過。
- **理由:** 針對性偵測器(引擎/螺槳/瞬時異常/天氣)精確率高,但對殘差通道的異常*聯合*組態無感。孤立
  森林是針對這些多變量尾端、便宜且種子穩定的總攔截器。它刻意加**閘門**:唯有當某標準化殘差同時越過
  `_IFOREST_Z = 3.5`(`etl/anomaly.py:270`)時,孤立森林命中才成為旗標 —— 模型從不獨自觸發,只作佐證,
  不作裁決。

---

## 4. 穩健回歸與趨勢 (Robust regression & trend, `etl/trends.py`)

整層趨勢皆為 **Theil-Sen**,原因是汙損序列含清潔造成的突兀階躍,會拉扯 OLS 直線;斜率中位數估計器則忽
略之。

### Theil-Sen 斜率
- **類型:** Statistical。**位置:** `etl/trends.py:38` `_theil_sen`。
- **內容:** 所有相異橫座標成對斜率 `(yⱼ−yᵢ)/(tⱼ−tᵢ)` 的中位數(O(n²), n≤~600)。
- **理由:** 跨趨勢、預測與深潛分析重用的汙損率(%/天)估計器。對 OLS/Huber 會抹平的重置不連續具穩健性。

### 穩健直線(斜率 + 截距)
- **類型:** Statistical。**位置:** `etl/trends.py:61` `robust_line`。
- **內容:** Theil-Sen 斜率 + `median(y − slope·t)` 截距;可選配自助法 CI。
- **理由:** 所有趨勢使用者呼叫的共用 `(slope, intercept, ci_lo, ci_hi)` 原語。

### 自助法 95% 信賴區間
- **類型:** Statistical。**位置:** `etl/trends.py:48` `_bootstrap_ci`。
- **內容:** `_BOOTSTRAP = 100` 次固定種子有放回重抽,重跑 Theil-Sen;CI = 斜率分布的 2.5/97.5 百分位。
  少於 5 點時退化為點估計。
- **理由:** 為汙損率給出不確定性帶;僅對開放週期計算(重抽是昂貴環節),使下游可拒斥非正斜率的趨勢。

### 分段回歸 (segmented regression)
- **類型:** Statistical。**位置:** `etl/trends.py:83` `fit_segments`。
- **內容:** 於每個清潔/乾塢重置點切分速損對天數序列,各段獨立穩健擬合;僅最後(開放)段附自助法 CI。
- **理由:** 每個維修週期都是新的汙損時鐘 —— 跨重置擬合單一全域直線毫無意義。切分點是*已知*事件,故不需
  任何自動變點偵測。

### 門檻跨越外推
- **類型:** Statistical。**位置:** `etl/trends.py:154` `extrapolate`。
- **內容:** 在開放週期直線上解 `days = (target% − intercept) / slope` 並加上最後清潔日;斜率 ≤ 0 時回傳
  `None`。
- **理由:** 將擬合出的汙損率轉為建議與警示層使用的到期日 / 剩餘使用壽命 (remaining useful life, RUL)。

### `np.polyfit` 一階(僅驗證)
- **類型:** Statistical。**位置:** `synthetic_data/validate.py:242`。
- **內容:** 普通最小平方 (ordinary least squares, OLS) 一階斜率。
- **理由:** 全庫*唯一*的 OLS,純粹用來斷言合成序列走向正確。不在生產路徑上(生產用 Theil-Sen)。

### 前端 Theil-Sen
- **類型:** Statistical。**位置:** `web/charts/speedLossTrend.js:10` `theilSen`。
- **內容:** 斜率中位數估計器的 JavaScript 重實作(以 D3 排序)。
- **理由:** 速損趨勢圖在瀏覽器端自繪穩健趨勢 + 虛線外推,方法與伺服器一致,使線條與 `fouling_rate` 相符。

---

## 5. 管制圖與異常偵測 (Control charts & anomaly detection, `etl/anomaly.py`)

四個*針對性*高精確偵測器加三個通用總攔截器,融合成每 `(imo, date)` 一個旗標。因殘差重尾 (heavy-tailed),
所有尺度皆為穩健(基於 MAD)。

### 固定目標 EWMA 管制圖
- **類型:** Statistical。**位置:** `etl/anomaly.py:97` `_ewma`、`:106` `_sustained_oob`。
- **內容:** 中心化殘差的 EWMA,λ=0.3,管制界限 L·σ,其中 σ = MAD·√(λ/(2−λ)),L=3;當 EWMA 超過界限
  *且*越過門檻下限(引擎 0.045、螺槳 0.025)時判為越界。
- **理由:** 偵測*持續性*水平移位 —— 引擎 SFOC 階躍或螺槳滑失平台 —— 單點偵測器與自適應滾動視窗會將其重新
  中心化而看不見。採固定目標(非自適應)正是讓持續階躍在整個視窗內可見的關鍵。

### 滾動修正 z(Iglewicz-Hoaglin)
- **類型:** Statistical。**位置:** `etl/anomaly.py:83` `_rolling_z`。
- **內容:** 尾隨視窗 W=30 上的修正 z 分數 `0.6745·(r − median)/MAD`;`z ≥ 4.5` 觸發。
- **理由:** 捕捉相對近期行為的*局部*單點尖峰,此處全域尺度會過鬆。用 MAD(非 σ)使視窗自身的離群值不致
  膨脹門檻。

### 全域 MAD z 分數
- **類型:** Statistical。**位置:** `etl/anomaly.py:59` `_mad_scale`、`:67` `_global_z`。
- **內容:** 穩健 σ = `1.4826·MAD`(退化時退回標準差);`_global_z` = `(r − median)/σ`。
- **理由:** 其他每個偵測器與分類器讀取的標準化殘差尺度 —— 「此殘差是多少個穩健標準差」的共同貨幣。

### 風速對蒲福殘差 z
- **類型:** Statistical。**位置:** `etl/anomaly.py:71` `_wind_residual_z`。
- **內容:** 以中位比值擬合 wind ≈ a·Beaufort^1.5,再取殘差的全域 MAD z。
- **理由:** 隔離*風速感測器異常* —— 與海況不一致的風速讀值 —— ISO 指標對此無感,因風修正會將其吸收。僅在
  蒲福 < 7 時計數(以免真正惡劣天氣被誤標)。

### IQR / Tukey 粗差閘門
- **類型:** Statistical。**位置:** `etl/anomaly.py:161` `_iqr_gross`。
- **內容:** 殘差上的 Tukey 3×四分位距 (interquartile range, IQR) 圍籬。
- **理由:** 穩健單點粗差閘門,僅施於速損/滑失/SFOC(超額油耗殘差受汙損偏斜、易過度標記)。

### 頂十分位波高百分位閘門
- **類型:** Statistical。**位置:** `etl/anomaly.py:235`。
- **內容:** `wave ≥ 該船波高序列的第 90 百分位`。
- **理由:** 唯有海況確實位於頂十分位時,才將速損尖峰認定為*天氣驅動* —— 以資料驅動門檻取代寫死的波高值。

### 偵測器 OR 融合
- **類型:** Rule-based。**位置:** `etl/anomaly.py:270,273`。
- **內容:** `flag = engine | propeller | glitch | (rolling-z≥4.5) | (IForest & global-z≥3.5) | gross`,
  再 `flag |= Beaufort ≥ 7`。
- **理由:** 以聯集確保不遺漏任何偵測器的正例;通用總攔截器(滾動 z、孤立森林、IQR)在收緊的閘門下運行,
  針對性者則用各自門檻。惡劣天氣(蒲福 ≥ 7 —— 產生器的異常加成)直接標記。

---

## 6. 規則式分類與評級 (Rule-based classification & rating)

### 首中因果鏈 + 連續長度
- **類型:** Rule-based。**位置:** `etl/anomaly.py:301` `_classify`、`:174` `_run_lengths`。
- **內容:** 以首中方式評估的優先序串接:**sensor**(孤立粗差尖峰,連續 ≤ 1)→ **weather**(蒲福 ≥ 7 或
  伴頂十分位波高的速損尖峰)→ **engine_degradation**(SFOC 階躍、速損平坦)→ **propeller**(真實滑失
  主導)→ 依主導殘差通道退回。`_run_lengths` 給出各旗標的連續天數(孤立尖峰為感測器;持續者為真實退化)。
- **理由:** 可解釋的決策清單,對每個旗標指派單一物理成因 —— 正是混淆矩陣驗證(§10)所評分的性質。

### 嚴重度分級
- **類型:** Rule-based。**位置:** `etl/anomaly.py:326` `_severity`、`:191` `_severity_from`。
- **內容:** 依逐因門檻將殘差量值對映 低/中/高(天氣 → 中、感測器 → 高、引擎/螺槳依殘差大小分級)。
- **理由:** 嚴重度追蹤產生器注入的量值,使下游警示能為事件排序而無需重推物理。

### CII A–E 評級
- **類型:** Rule-based(法規)。**位置:** `etl/cii.py:30` `_rating`。
- **內容:** IMO 碳強度指標 (Carbon Intensity Indicator, CII) 字母評級 —— 作用於達成/要求比值的
  `_DD_VECTOR=(0.83,0.94,1.07,1.19)` 邊界、參考線 `a·Capacity^−c`,以及逐年折減因子 `_Z_BY_YEAR`
  (`etl/cii.py:20,22`)。
- **理由:** 原封不動編碼 IMO 法規分級;它是*對固定法規常數的查表*,而非學習模型。

### Rubert / 塗層分級
- **類型:** Rule-based。**位置:** `synthetic_data/fouling.py:67` `_rubert_from_roughness`、`:78`
  `_coating_from_breakdown`。
- **內容:** 以固定邊界將螺槳粗糙度(µm)對映為 Rubert A–F 等級,將塗層破損(%)對映為 良/中/差。
- **理由:** 供合成真實值與 UWI 顯示使用的領域標準狀態分級。

### ISO 19030 有效點過濾
- **類型:** Rule-based。**位置:** `etl/filters.py:29` `is_valid`。
- **內容:** 僅保留速度-功率曲線適用的穩態海上點 —— 欄位有限值、航速高於下限、蒲福 ≤ 6、排水量在帶內。
- **理由:** ISO 19030 速損僅在過濾後的點上有意義;此判定為所有下游統計把關。

---

## 7. 作業研究最佳化與建議 (OR-optimization & recommendation, `etl/recommendation.py`)

### 封閉解最佳服務間隔
- **類型:** OR-optimization。**位置:** `etl/recommendation.py:218` `_optimal_service`、`:212`
  `_net_saving`。
- **內容:** 在每日超額成本 `c(t)=α+βt` 與事件成本 `K` 下,最小化平均成本的間隔為 `t* = √(2K/β)`,最佳
  成本率 `J* = K/t* + α + βt*/2`,而於 `t*` 服務相對等到觸發的淨節省為積分 `∫(c(t)−J*)dt`。
- **理由:** 教科書式的年齡更換 (age-replacement) 最佳解、封閉形式 —— 無需求解器、完全可解釋,並直接得出建議
  的船體清潔日與其金額節省。

### 成本率擬合(α + βt)
- **類型:** Statistical。**位置:** `etl/recommendation.py:132` `fit_cost_rate`。
- **內容:** 對每日超額成本序列穩健擬合直線,回傳 `(α, β)` 與 CI。
- **理由:** 提供最佳間隔公式所需的 `β`(成本加速度);採穩健,使少數雜訊日不致扭曲經濟計算。

### 逐行動 RUL 預測
- **類型:** Statistical。**位置:** `etl/recommendation.py:348` `_robust_fit`、`:365` `_forecast_cross`、
  `:639` `_engine_action`。
- **內容:** 對每個非船體行動,於其專屬重置時鐘上穩健擬合其專屬退化訊號並外推至該行動門檻 —— 螺槳粗糙度
  (300/430 µm)、塗層破損(45%)、引擎 SFOC 漂移(+5%)。
- **理由:** 每個維修行動都自其*自身*物理訊號得到資料驅動的到期日,而非單一通用船體模型。

### 係數經濟學
- **類型:** OR-optimization。**位置:** `etl/recommendation.py:409` `_coefficient_economics`。
- **內容:** 以該行動的重置到預測視野,對每個行動重用 `t*`/淨節省模型。
- **理由:** 同一封閉解最佳化,一致地推廣至船體清潔以外。

### 貪婪時間視窗批次
- **類型:** OR-optimization(近似分群)。**位置:** `etl/recommendation.py:758` `_batch_by_due`、`:778`
  `plan_maintenance`。
- **內容:** 將依到期排序的行動貪婪分組為 `_PLAN_BATCH_DAYS = 60` 天視窗(在最早未指派行動處開視窗,吸納容
  忍內全部);乾塢感知的兩趟先批乾塢行動,再將在水行動併入最近的乾塢視窗。
- **理由:** 將分散的逐行動到期日聚成單一「下次維修日」,使靠港不被切碎 —— 這是排程啟發式 (heuristic),非
  學習型分群模型。

### 優先度 / 到期上限視野
- **類型:** Rule-based。**位置:** `etl/recommendation.py:335` `_due_or_horizon`。
- **內容:** 當訊號無法外推時,退回優先度視野(high +30 天、medium +90 天),使 `due_date` 恆不為 null。
- **理由:** 依規格 §5.5 保證每列建議都帶日期。

### 回收期
- **類型:** OR-optimization。**位置:** `etl/recommendation.py:121` `_payback_days`。
- **內容:** 事件成本 ÷ 估計每日節省 → 回收天數。
- **理由:** 每則建議旁顯示的簡單經濟量尺。

---

## 8. 警示事件 (Alert episodes, `etl/alerts.py`)

### 間隔容忍事件分組(遲滯)
- **類型:** Rule-based。**位置:** `etl/alerts.py:121` `_split_episodes`。
- **內容:** 將同因異常依日期排序,於間隔超過 `_GAP_DAYS = 7` 處切成事件 (episode)。
- **理由:** 將一連串每日旗標塌縮成單一警示事件並帶首/末見日 —— 遲滯 (hysteresis) 使短暫中斷不致將事件碎裂
  為雜訊。

### 峰值嚴重度
- **類型:** Rule-based。**位置:** `etl/alerts.py:68` `_peak_severity`。
- **內容:** 事件嚴重度取其成員中最嚴重者。
- **理由:** 事件的急迫度等同其最嚴重的一天。

### 生物附著趨勢警示
- **類型:** Rule-based。**位置:** `etl/alerts.py:207` `_biofouling_alert`、`:188` `_trailing_speed_loss`。
- **內容:** 結合尾隨 14 天均值速損與對維修觸發的臨近度,發出主動生物附著 (biofouling) 警示。
- **理由:** 在硬觸發*之前*預警,採平滑訊號使單一尖峰不致觸發。

---

## 9. 彙總與穩健統計 (Aggregation & robust statistics)

### 事件成本中位數彙總
- **類型:** Statistical。**位置:** `etl/recommendation.py:76` `_median_event_cost`。
- **內容:** 對某型別歷史事件取成本中位數 → 最佳化所用的 `K`。
- **理由:** 用中位數(非平均)使單張離群發票不致扭曲服務經濟。

### ISO 19030 期間指標
- **類型:** Statistical。**位置:** `etl/periods.py:70,138` `build_indicators`。
- **內容:** ISP(在役績效,逐週期平均速損對第一週期)、DDP(乾塢績效,前後視窗)、ME(維修事件恢復),
  以及 MT(14 天尾隨均值速損首次跨越維修觸發之日,`MT_TRIGGER_PCT = 8.0`)。
- **理由:** ISO 19030 績效期間彙總統計量;MT 採尾隨均值,使雜訊單日無法觸發。

### 船隊 group-by 彙總
- **類型:** Statistical。**位置:** `etl/compute.py:246` `_agg_row`;船隊組態 `synthetic_data/fleet.py:117`
  `FLEETS`。
- **內容:** 將每日船舶列彙總為 `ALL` 加 3 個具名船隊(Intra-Asia、Trans-Pacific、Asia-Europe)。
- **理由:** 船隊分組是*靜態組態*,非分群演算法 —— 分組鍵來自 `FLEETS`,而非資料。

### 前端 OLS 趨勢箭頭斜率
- **類型:** Statistical。**位置:** `web/components/FleetOverview.js:13` `slopeOf`。
- **內容:** 對某指標最近 30 列的封閉解最小平方斜率。
- **理由:** 驅動船隊表中的上升/下降/持平趨勢箭頭;此處 OLS 足夠,因為它只是粗略方向指示,非速率估計。

### `d3.bin` 直方圖
- **類型:** Statistical。**位置:** `web/charts/histogram.js:14`。
- **內容:** 等寬分箱(`d3.bin`,預設 12 箱)。
- **理由:** 儀表板的分布圖。

---

## 10. 相關性與驗證 (Correlation & validation)

### 皮爾森相關
- **類型:** Statistical。**位置:** `synthetic_data/validate.py:76` `_pearson`。
- **內容:** 手工實作的線性相關係數。
- **理由:** 對照容差佐證注入的*線性*關係(蒲福↔波/風、溫度↔密度)。

### 斯皮爾曼等級相關
- **類型:** Statistical。**位置:** `synthetic_data/validate.py:86` `_ranks`、`:94` `_spearman`。
- **內容:** 對等級 (rank) 施皮爾森。
- **理由:** 佐證未必線性的*單調*關係(UWI 評級↔汙損、退化↔時間)。

### 混淆矩陣精確率/召回率
- **類型:** Statistical。**位置:** `etl/validate.py:128` `_check_detection`、`:139` `_check_causes`。
- **內容:** 建立偵測混淆矩陣 (confusion matrix)(TP/FP/FN)與逐因混淆矩陣,再以召回率 (recall)/精確率
  (precision) 與逐因召回門檻把關。
- **理由:** 證明異常管線能還原注入真實值的驗收準則(規格 §9 M3)。

---

## 11. ISO 物理 —— 確定性(非 ML,如實標示)

以下為 ISO 標準的封閉解物理。它們是**確定性 (deterministic)** 的 —— 無擬合、無學習 —— 但因是統計所倚
的分析核心,故一併收錄。

### ISO 15016 風 + 浪功率修正
- **類型:** Physics。**位置:** `etl/corrections.py:22` `wind_wave_correction`;核心於
  `synthetic_data/physics.py`。
- **內容:** 由風(Blendermann 阻力 `C_AA = 0.9`)與浪(STAWAVE-1 迎浪因子 `0.5·(1−cos Δθ)`)算出附加阻力,
  轉為自實測軸功率扣除的環境功率項。
- **理由:** 自功率訊號移除天氣,使殘差反映船體而非海況 —— 且採用與產生器注入*相同*的係數,這正是使損失可
  還原的關鍵。

### 冪律速度-功率曲線 + 分析反解
- **類型:** Physics。**位置:** `synthetic_data/curves.py:33` `clean_power_kw`、`:37` `clean_speed_kn`。
- **內容:** 淨船體關係 `P = a·Vⁿ·(Δ/Δ_ref)^(2/3)` 及其封閉解反函式 `V = (P / (a·(Δ/Δ_ref)^(2/3)))^(1/n)`。
- **理由:** 單一共用真實來源 —— 前向產生器由航速算功率,M2 ETL 將修正後功率反解為 ISO 19030 速損所需的預期
  淨速度。共用同一曲線正是使注入速損可還原的關鍵。

### ISO 19030 績效指標
- **類型:** Physics。**位置:** `etl/indicators.py:14–65`。
- **內容:** 速損(`:19`)、視在/真實滑失(`:30`)、SFOC(`:39`)、海軍係數 (Admiralty coefficient)(`:44`)、
  EEOI(`:49`)、超額油耗(`:57`)、超額成本(`:65`)、CO₂(`:14`)。
- **理由:** 下游每項統計所分析的確定性 ISO 19030 / 營運關鍵指標 (KPI)。

---

## 12. 合成生成式 / 前向模型 (Synthetic generative / forward models, `synthetic_data/`)

生成側產出帶*已知*真實值的標記資料,使 ETL 的偵測器與相關性可被評分。

### 含重置階躍的線性汙損軌跡
- **類型:** Generative。**位置:** `synthetic_data/fouling.py:288` `fouling_state`。
- **內容:** 於每次清潔階躍回基線的分段線性 UWI/汙損成長。
- **理由:** 該重置結構正是分段回歸(§4)所設計要還原的對象。

### 獨立退化程序
- **類型:** Generative。**位置:** `synthetic_data/fouling.py:87` `degradation_rates`。
- **內容:** 逐船的螺槳粗糙度(µm/天)、塗層破損(%/天)、引擎 SFOC 漂移(/天)各自速率,各於自身重置時鐘上
  (C15–C17)。
- **理由:** 去耦訊號,使逐行動 RUL 預測(§7)能逐一訊號驗證。

### 負載相依 SFOC U 形
- **類型:** Generative。**位置:** `synthetic_data/generate.py:168` `_sfoc`。
- **內容:** `sfoc = sfoc_base·(1 + 0.18·(load − 0.80)²)` —— 偏離高效負載點的凸形懲罰。
- **理由:** ETL 的*負載感知* SFOC 偵測器除去的真實負載相依性,以將真正引擎階躍與負載效應區隔。

### 高斯隨機漫步燃油價格
- **類型:** Generative。**位置:** `synthetic_data/datasets.py:58` `build_fuel_price`。
- **內容:** 逐燃油每日隨機漫步 (random walk) `price += N(0, vol)`,以 150 USD/mt 為下限。
- **理由:** 在無真實市場資料下,為成本模型提供合理的價格波動。

### 季節諧波 + 雜訊海氣象
- **類型:** Generative。**位置:** `synthetic_data/environment.py:28` `generate_environment`。
- **內容:** 蒲福驅動風 `v = 0.836·B^1.5`(WMO)、季節諧波波高、伽瑪 (gamma) 海流,皆帶有界雜訊。
- **理由:** 相關的天氣,其蒲福↔波/風關係由皮爾森檢查(§10)確認,並於稍後由 ISO 15016 修正移除。

### 標記異常注入 + 有界感測器雜訊
- **類型:** Generative。**位置:** `synthetic_data/noise.py:38` `build_anomaly_plan`。
- **內容:** 以已知成因/嚴重度與注入參數,標記真實異常(引擎階躍、螺槳抬升、感測器瞬時異常、天氣),外加有界
  乘性感測器雜訊(首因勝出標記)。
- **理由:** 提供混淆矩陣驗證(§10)對偵測器評分所需的標記真實值。

---

## 13. 明顯未採用 (Notably absent)

刻意**未**使用 —— 本設計是規則 + 穩健統計,而非學習型模型:

- **無深度學習**(無 TensorFlow / PyTorch / Keras)。
- **無梯度提升**(無 XGBoost / LightGBM / CatBoost)。
- **無 K-means / DBSCAN / 階層式分群** —— 「船隊分組」是靜態組態(`FLEETS`),「批次」是貪婪時間視窗啟發式。
- **無 ARIMA / statsmodels / 指數平滑預測** —— 趨勢採 Theil-Sen + 線性外推。
- **無卡爾曼濾波 (Kalman filter) / 狀態空間平滑。**
- **無 LOWESS / Savitzky-Golay 平滑** —— 平滑僅有 EWMA 與尾隨均值。
- **無自動變點偵測 (change-point detection)(CUSUM / PELT / BOCPD)** —— 分段邊界來自*已知*的清潔/乾塢事件,
  非偵測而得。
- **無 pandas / scipy** —— 一切皆 numpy 加上唯一的 sklearn 估計器。
- **無 SageMaker 或任何託管 ML 服務。**

---

## 14. 規格與實作差異 (Spec-vs-impl deviations)

兩處實作偏離書面規格(`insights.md` 已註記):

1. **趨勢估計器。** `poc-spec.md §5.1` 稱「穩健回歸(Huber / Theil-Sen)」;實作**僅 Theil-Sen**
   (`etl/trends.py:38`)—— 程式中不存在 Huber 估計器。
2. **維修觸發門檻。** 程式於 **8%** 觸發(`etl/periods.py:27` `MT_TRIGGER_PCT = 8.0`),而 `§5.5` 敘述與前端
   圖表預設用 **10%**(`web/charts/speedLossTrend.js:32` `threshold ?? 10`)。因此伺服器端統計與前端參考線使用
   不同門檻。
