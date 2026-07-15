# 評估指標 — 燃油消耗分數如何計算

*背景：`ym_datalake/ml_york/evaluation/` 為燃油消耗預測器評分。真正的任務是為 S21–S23 三艘船上
102 個 `PREDICT` cell 預測 `ME_FULLSPEED_CONSUMP_*`（MT/day），這些 cell 並不帶有在地的真值。為了
在預測器實際看到那些 cell 之前就替它評分，這套 harness 會執行一個合成的 10-fold 遮罩式 holdout：每
個 fold 會在一批互不重疊的*已標註* row 上把 target 抹掉（模擬真實的 `PREDICT` row），由預測器作答，
接著 `scoring` 拿這些答案對照仍保留在全域 feature frame 中的真值來評分。*

> 本文說明 `evaluate` CLI 印出的**六項指標**以及**如何判讀這個分數**。它不是 fold 生成過程的逐步
> 導覽。指標的數學位於 `evaluation/scoring.py::fold_metrics`；CLI 表格位於
> `evaluation/__main__.py::_cmd_evaluate`。

---

## 評分的對象是什麼

每個 cell 以 **`(ship, day, fuel_short)`** 作為 key — 例如 `('S21', '450', 'HSHFO')`。對每個 key 有
三樣東西匯集在一起：

- **真值（Truth）** — `target_me_fs_consump`（MT/day），從*全域* `etl/vt_fd_features.csv` 中已標註
  （未遮罩）的 row 讀取。它**絕不**從某個 fold 遮罩後的 `eval.csv` 讀取，因此預測器無法看到它正被評
  分的那個答案 — 不會有洩漏（leakage）。
- **預期的 cell（Expected cells）** — 該 fold 的 `eval.csv` 中每個 `is_predict` row 的
  `(ship, day, fuel_short)` key。這些就是預測器被要求填答的 cell。
- **答案（Answer）** — 每個 cell 一個 `predicted_value`（MT/day），來自 README 格式的答案檔
  （`ship_id,day,fuel_type,predicted_value`）。`fuel_type` 可以是完整的
  `ME_FULLSPEED_CONSUMP_HSHFO` 或簡短的 `HSHFO`；兩者都會正規化成同一個 key。空白的
  `predicted_value` 對該 cell 視為**未作答**。

PREDICT 日是乾淨的穩態點（全速航行 ≥22 h、風力 ≤ 4 Bft、當日單一燃油），因此每個 cell 恰有一個非零
的真值。

---

## 主角指標：`precision`

`precision` 是**容差內命中率**：在帶有真值的 predict cell 中，預測值落在相對誤差帶內的比例。

```
precision = correct / scored
```

一個 cell 被視為 **correct** 若且唯若

```
|pred − true| / true ≤ tol          (default tol = 0.05, i.e. ±5 %)
```

容差由 `--tolerance` 設定（預設 `0.05`）。相對誤差以 **`true` 作為分母**，在這裡是安全的，因為單一燃
油的 PREDICT 日總是 `true > 0`。

> **這是容差內的準確率，不是分類的 precision。** 儘管名字相同，這裡並沒有 true/false positive。此處
> 的 `precision` 回答的是「我的預測中有多少比例落在真值的 ±5 % 之內？」 — 與分類器的 TP/(TP+FP) 毫
> 無關係。

---

## 已作答 cell 上的誤差指標

除了命中率之外，另有五項誤差指標概括*已作答的預測偏離多遠*。設已作答的 cell 為那些同時具有真值與
（非空白）答案的 predict cell，並令 `n_a` 為其數量：

| 指標 | 公式 | 單位 | 判讀為 |
|---|---|---|---|
| `mae` | `(1/n_a) · Σ abs(pred − true)` | MT/day | 平均絕對偏差 |
| `rmse` | `sqrt( (1/n_a) · Σ (pred − true)² )` | MT/day | 類似 MAE 但**對大偏差懲罰更重** |
| `mape` | `(1/n_a) · Σ abs(pred − true) / true` | 比例 | 平均**相對**偏差（0.04 = 4 %） |
| `one_minus_mape` | `1 − mape` | 比例 | `mape` 的越高越好分數形式 |
| `r2` | `1 − Σ(pred − true)² / Σ(true − mean)²` | 比例 | 已解釋的真值變異數比例（≤1） |

`mae`/`rmse` 以 target 自身的單位表示（MT/day）；`mape` 是無因次的。`rmse ≥ mae` 恆成立，兩者的差
距隨誤差的變異數而擴大 — 大 `rmse` 搭配小 `mae` 意味著少數幾個 cell 偏得很離譜。`one_minus_mape` 存
在的唯一目的是讓 dashboard 能把每個欄位都當成「越大越好」；當 `mape > 1`（平均偏離超過 100 %）時它
**可以變成負值**。`r2` 即決定係數 (coefficient of determination, R²)，其值**上限為 1**（完美擬
合）；當預測對真值變異數的解釋能力**不如**直接猜平均值時會**變成負值**；單一已作答 cell 時為 `nan`
（單點的變異數為零，沒有東西可解釋）。

---

## 分母的不對稱性（關鍵的微妙之處）

`precision` 與誤差指標**並非除以同一個東西**，而這是刻意設計的。

- **`precision` 的分母 = `scored`** — *每一個*帶有真值的 predict cell，**包含你未作答的 cell**。未作
  答的 cell 被計為一次未命中（`n_missing`）並拖低 `precision`：它不算 correct，卻仍留在分母中。
- **`mae` / `rmse` / `mape` / `r2` 的分母 = 僅限已作答的 cell**（`n_a = scored − n_missing`）。沒有
  答案的 cell 對這些總和**不貢獻任何項**（對 `r2` 的變異數也不貢獻）。

由此帶來的後果：**空白答案會拉沉 `precision`，卻永遠碰不到誤差指標。** 你無法靠只作答容易的 cell、把
困難的留白來美化你的 MAE/RMSE/MAPE — 那種策略只會反過來把 `precision` 弄垮。要嘛全部作答，要嘛在這
個主角數字上付出代價。

真值在全域 frame 中缺失的 cell 會**兩者皆跳過**（並發出警告），且不計入任何一邊；在格式良好的 fold
上這不應該發生。

---

## 判讀 CLI 輸出

`python -m ym_datalake.ml_york.evaluation evaluate …` 每個 fold 印一列，最後印一段 footer：

```
fold      n  miss       precision  one_minus_mape             mae            rmse              r2            mape
-----------------------------------------------------------------------------------------------------------------
   1     11     0        0.727273        0.958000        3.500000        5.200000        0.912000        0.042000
   ...
-----------------------------------------------------------------------------------------------------------------
precision  avg=0.731000  min=0.636364  max=0.900000  (tol=0.05)
   mae avg=3.480000   rmse avg=5.150000   r2 avg=0.905000   mape avg=0.043000
```

判讀這個範例列：

- **`fold 1`** — fold 索引（1…N）。
- **`n = 11`** — `scored`：此 fold 中帶有真值的 predict cell。
- **`miss = 0`** — `n_missing`：這 `n` 個之中有多少被留白未作答。此處任何非零值都會直接拖累該 fold
  的 `precision`。
- **`precision = 0.727273`** — 11 個答案中有 8 個落在 ±5 % 之內。
- **`one_minus_mape … r2 … mape`** — 上一節提到的誤差區塊，計算範圍為已作答的 cell（`r2` 位於
  `rmse` 與 `mape` 之間）。

**footer 就是最終判定**：`avg` 是**跨 fold** 的平均 `precision` — harness 給該預測器的單一數字分數。
`min`/`max` 顯示分布範圍（低 `min` 標示出模型處理不佳的某個 fold），`tol` 則回顯這些命中率是在哪個誤
差帶下計算的。**第二行 footer** 印出誤差區塊的跨 fold 平均值 — `mae`、`rmse`、`r2`、`mape` — 讓平均
誤差與主角命中率並列（平均值計算時會忽略 `nan` 的 fold）。

---

## 一個完整範例

取自 `tests/unit/…/evaluation/test_scoring.py::test_jittered_answers_match_hand_calc` — 三個 cell、
`tol = 0.05`、全部作答：

| cell | true | pred | rel. error | within ±5 %? |
|---|---|---|---|---|
| HSHFO | 100 | 110 | 0.10 | no |
| VLSFO | 200 | 200 | 0.00 | yes |
| LSMGO | 50 | 51 | 0.02 | yes |

- `precision = 2 / 3 ≈ 0.6667` — VLSFO 與 LSMGO 落在誤差帶內，HSHFO 沒有。
- `mae = (10 + 0 + 1) / 3 = 11/3 ≈ 3.6667` MT/day。
- `rmse = sqrt((100 + 0 + 1) / 3) ≈ 5.8023` MT/day — 高於 `mae`，被那 10 MT 的 HSHFO 偏差拉高。
- `mape = (0.10 + 0.00 + 0.02) / 3 = 0.04`（4 %）。
- `one_minus_mape = 1 − 0.04 = 0.96`。
- `r2 = 1 − 101 / 11666.67 ≈ 0.9913` — `ss_res = 10² + 0² + 1² = 101`，對比真值 `[100, 200, 50]` 的
  離散程度（`ss_tot ≈ 11666.67`），因此預測幾乎完整解釋了這份變異數。

因為三個 cell 全部作答，`n_missing = 0`，誤差指標涵蓋的三個 cell 與 `precision` 相同。若改把 LSMGO
的答案留白，`precision` 會掉到 `1/3`（該空白計為一次未命中），而 `mae`/`rmse`/`mape` 則只會在剩下兩
個已作答的 cell 上重新計算。
