# 船體規格推論 (Vessel Particulars Inference)

從 `dataset/vt_fd.csv` 的 21,282 筆航行日報 (noon report) 反推 15 艘船的船體規格。
輸出檔：`dataset/vessel_master_inferred.csv`（沿用 `doc/skill/vessel_master.md` 的欄位結構）。

## 結論：Yang Ming W 級 14,000 TEU New Panamax 貨櫃船

15 艘船**共用同一船體設計**；W1 / W2 的差別**只在螺旋槳螺距 (propeller pitch)**，船殼、主機完全相同。

| 項目 | 值 | 來源 |
|---|---|---|
| 船型 (vessel type) | 貨櫃船 (container), 14,000 TEU New Panamax | 類比 |
| 全長 (LOA) | 368.0 m | 類比 |
| 垂線間長 (LBP) | 352.0 m | 類比 |
| 船寬 (breadth, moulded) | 51.0 m | 類比 |
| 設計吃水 (design draught) | 14.5 m | 類比 |
| 結構吃水 (scantling draught) | **15.8 m** | **資料** |
| 設計排水量 (displacement @ 14.5 m) | **166,500 t** | **資料** |
| 結構排水量 (displacement @ 15.8 m) | **185,900 t** | **資料** |
| 方形係數 (block coefficient, Cb) @ 設計 / 結構 | **0.624 / 0.640** | **資料** |
| 水線面係數 (waterplane coefficient, Cw) | **0.756** | **資料** |
| 每公分吃水噸數 (TPC) | **139.2 t/cm** | **資料** |
| 載重噸 (deadweight, DWT) | 150,000 t | 類比 |
| 總噸位 (gross tonnage, GT) | ~148,000 | 類比 |
| 最大持續輸出 (SMCR) | **47,700 kW @ ~76 rpm** | **資料** |
| 常用輸出 (NCR, 85 % SMCR) | **40,500 kW** | **資料** |
| 設計船速 (design speed) | **21.5 kn** | **資料** |
| 螺旋槳型式 | 固定螺距槳 (FPP), 5 葉 | 類比 |
| 螺旋槳直徑 (diameter) | 10.0 m（9.6–10.0 m 區間） | 類比 |
| 螺距 (pitch) — W1 槳 | **9.886 m** (P/D 0.989) | **資料** |
| 螺距 (pitch) — W2 槳 | **9.556 m** (P/D 0.956) | **資料** |
| 正投影受風面積 (transverse area, A_XV) | ~1,300 m²（**無法從資料辨識**） | 推估 |

「資料」= 從 `vt_fd.csv` 直接反推；「類比」= 由資料鎖定船級後，取 MAN Energy Solutions
*Propulsion of 14,000 teu container vessels* Table 2 的設計基準船，兩者交叉驗證一致。

---

## 推論過程

### 1. `PROPELLER_SPEED` 不是 RPM — 這是解開螺旋槳的鑰匙

README 標示 `PROPELLER_SPEED` 單位為 RPM，但其中位數為 16.3、與 `SPEED_THROUGH_WATER`
(15.2 kn) 同量級，而 `ME_AVG_RPM` 中位數為 52。實際上它是**螺旋槳理論前進速度 (knots)**，
即 noon report 慣用的 propeller speed = P × n。驗證：

```
滑失率 slip = (PROPELLER_SPEED − STW) / PROPELLER_SPEED × 100
```
與 `FULL_SPD_STW_SLIP` 的中位絕對誤差僅 **0.017 %**，恆等式成立。

因此螺距可逐列直接解出：

```
P [m] = PROPELLER_SPEED × 1852 / (60 × ME_AVG_RPM)
```

結果極為乾淨（每船 MAD < 0.004 m，五年內無漂移）：

- **W1 槳 = 9.886 m**：S1–S8, S21, **S22**
- **W2 槳 = 9.556 m**：S9–S12, S23

### 2. ⚠️ S22 掛的是 W1 的螺旋槳

README 將 S22 歸為 W2，但 S22 全部 1,416 筆紀錄的螺距都是 **9.8863 m**（W1 槳），
前後半段各自穩定，並非漂移或雜訊。**S22 的槳與 W2 群組不同。**

這對預測任務有直接影響：轉速–船速–功率關係由螺距決定，若把 S22 併入 W2 群組共用
螺旋槳特徵，其 RPM↔STW 映射會系統性偏誤。S22 應與 W1 共用螺旋槳參數。
（船殼水動力仍與全隊相同，見下。）

### 3. 船殼：15 艘完全相同

以排水量對平均吃水做迴歸，逐船的 TPC 落在 136.6–141.8 t/cm、Δ@15.8 m 落在
183,300–186,600 t，差異在雜訊範圍內 → **W1 與 W2 是同一船殼**（符合 README「相同設計的姊妹船」）。

全隊合併：

```
TPC = 139.2 t/cm  →  水線面積 Aw = 13,578 m²
Δ(T) 二次擬合  →  Δ(14.5) = 166,500 t ;  Δ(15.8) = 185,900 t
```

吃水分布的 p99.5 = **15.85 m**、p99.9 = 16.00 m → 結構吃水 15.8 m。

`MID_DRAFT` 的 hydrostatic 不變量為 `Cb·L·B = Δ/(ρ·T) = 11,480 m²`；L 與 B 無法單獨從
noon report 分離，需靠船級鎖定。取 LBP 352.0 m × B 51.0 m：

```
Cb(15.8) = 0.640     Cw = 0.756     Cw − Cb = 0.116
```

三者互相自洽（貨櫃船 Cw ≈ Cb + 0.11），確認 L、B 選得對。

### 4. 主機：SMCR 47,700 kW @ 21.5 kn

先確立燃油恆等式（中位比值 = 1.0000，IQR 1.000–1.000，**完全成立**）：

```
ME_CONSUMPTION [MT] = HORSE_POWER [kW] × SFOC [g/kWh] × HOURS / 1e6
```

→ `HORSE_POWER` 確為軸功率 (kW)，這是預測模型的物理骨架。

**注意：`LOAD_PCT` 不可用。** 它與 `HORSE_POWER` 的相關係數只有 0.227，且無論主機出力
5 MW 或 37 MW，`LOAD_PCT` 中位數都停在 42–52 %。它不是 HP/MCR，無法用來反推 MCR。

改由「乾淨水域淨船殼速度–功率曲線」推 SMCR。取全速 ≥22 h、風力 ≤3 級、浪高 ≤1.5 m、
滿載吃水的日子：

```
P_calm = 11.741 × V^2.610      →  V = 21.5 kn 時 P = 35,260 kW
```

依 MAN 慣例，設計船速定義在 NCR（含 15 % 海域裕度 sea margin），且 NCR = 85 % SMCR：

```
NCR  = 35,260 × 1.15 = 40,550 kW
SMCR = 40,550 / 0.85 = 47,700 kW
```

**三項獨立證據交叉驗證**：

1. MAN 論文 21.5 kn 案例的 SMCR = 47,000–47,500 kW → 本文 47,700 kW，差 < 1.5 %。
2. `SFOC` 對 `HORSE_POWER` 的拋物線頂點在 **29,800 kW**（bootstrap 95 % CI 28,360–31,830），
   = 63 % SMCR。MAN 論文明言此級船採 **低負荷調校 (low-load tuning)**，SFOC 最低點正落在
   ~60–65 % 負荷。
3. 實測最大出力 p99.9 = 38,314 kW = **82 % SMCR**、最高轉速 71.5 rpm —— 從未超過 SMCR，
   符合慢速航行 (slow steaming) 的營運模式。

若假設設計速度為 23.5 kn，反推 SMCR = 60,200 kW，與 MAN 該案例的引擎清單及實測出力上限
矛盾 → **設計速度為 21.5 kn**。MAN 論文中 21.5 kn 案例對應 **5 葉槳、直徑 9.6–10.0 m**。

螺旋槳法則 `P = 0.1012 × n³` 在 SMCR 出力下給出 ~76–78 rpm，對應 MAN Fig. 3 的
M3′/M4′ 點（76 rpm, D = 10.0 m），故取 **D = 10.0 m**；P/D = 0.989 (W1) / 0.956 (W2)，
兩者都落在合理設計區間。

### 5. 無法從資料辨識的欄位

- **`transverse_area_m2`（受風面積）**：以視風速平方項對功率殘差迴歸，係數為 **−42 m²**，
  即無可辨識訊號。功率殘差幾乎全由浪高解釋（`SEA_HEIGHT` 447 kW/m、`SWELL_HEIGHT` 577 kW/m），
  風與浪高度共線，無法分離。表中 ~1,300 m² 純為 368 × 51 m 船型的幾何推估，**不要**當作
  資料事實使用。
- **`n_blades`、`diameter_m`、`gross_tonnage`、`build_year`、LOA/LBP/B**：noon report 不含
  幾何資訊，皆由船級類比取得。
- **`THRUST_QUOTIENT` 是衍生欄位**，非獨立量測：`THRUST_QUOTIENT = 1000 × THRUST / HORSE_POWER`
  （相關係數 +1.000，比值 999.9997）。它不含任何額外的螺旋槳幾何資訊。
- **`THRUST`** 滿足 `T·V/P ≈ 0.82`（= η_D/(1−t)），同樣不含直徑資訊 → 直徑無法從資料反解。

---

## 對預測任務的可用結論

1. **S22 用 W1 的螺旋槳**（螺距 9.886 m，非 9.556 m）— 建模時螺旋槳特徵不可依 README 分組。
2. **`ME_CONSUMPTION = HP × SFOC × HOURS / 1e6` 是精確恆等式** — 可用來從 H 類欄位重建 T 類油耗，
   也是全速時數校正的正確作法。
3. **`LOAD_PCT` 是壞欄位**（與功率幾乎不相關），不要當特徵。
4. **`THRUST_QUOTIENT` 與 `THRUST` 對 `HORSE_POWER` 線性相依**，作為特徵會洩漏/共線。
5. 船殼 15 艘相同 → 可跨船 pooling 學船殼汙損效應；只有螺旋槳需分 P1/P2 兩組。

## 參考

- MAN Energy Solutions, *Propulsion of 14,000 teu container vessels* — Table 2（設計基準船）、Fig. 3（21.5 kn 引擎佈局圖）
- [W-class container ship — Wikipedia](https://en.wikipedia.org/wiki/W-class_container_ship)（陽明 W 級 14,000 TEU：LOA 366.4–368 m、寬 51–51.2 m、吃水 15.5–16.03 m、GT 144,651–151,451）
