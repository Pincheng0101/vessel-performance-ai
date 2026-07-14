// Central Traditional-Chinese glossary for the fleet dashboard. Hardcoded (the hackathon
// is Chinese-only) but centralized here so a term's explanation stays consistent across
// KPI cards / charts / tables and is easy to tweak in one place. Referenced via
// AppInputTooltip. If bilingual is ever needed, swap these for i18n keys.

const Term = Object.freeze({
  // Fleet KPIs
  fleetSize: '目前監測中的船舶艘數。',
  avgSpeedLoss: '全船隊最新一日的平均速度損失（相同主機功率下，實際船速較乾淨船體基準的下降百分比）；數值越高代表船體／螺槳汙損越嚴重。',
  activeAlerts: '最新一日仍處於開啟狀態且仍被偵測到的預警數，用於快速掌握當前需要關注的風險。',
  openAlertCases: '目前尚未關閉的預警案件總數，包含歷史期間累積且仍 open 的 episodes，反映船隊待追蹤工作量。',
  excessFuelCost: '全船隊最新一日因速度損失而多耗燃油所產生的成本（USD）。',
  savingsPotential: '依各船清潔／維修建議可節省的燃油成本總額（USD）。',

  // Performance
  speedLoss: '相同主機功率下，實際船速較乾淨船體基準的下降百分比：(v_expected − STW) / v_expected × 100。正值＝速度損失＝性能衰退，這是 ISO 19030-2 帶號慣例的反號（該慣例以負值代表衰退），屬 ISO 19030-3 下的宣告性偏離。反映的是船體「與」螺槳的合併效應——ISO 19030 不提供兩者的拆分方法。',
  foulingRate: '速度損失每日增加的百分點（%/day），越高代表汙損越快。',
  threshold: '本儀表板建議執行船體清潔的速度損失行動線（10%），屬營運政策，非 ISO 規定值。ISO 19030 的維修觸發（MT）為 8%，另以琥珀色虛線標示。',
  isoTrigger: 'ISO 19030 維修觸發（Maintenance Trigger, MT）：14 日移動平均速度損失跨越 8% 的門檻，由資料湖逐個汙損週期計算（每個週期最多觸發一次）。ISO 明言四項指標中 MT 的不確定性最高，因其評估期最短。',
  triggerEta: '依現行趨勢，速度損失預計達到門檻的日期。',
  tStar: '使總成本（燃油＋清潔）最小的建議清潔天數。',
  speedPower: '實測船速對主機功率的關係，與乾淨船體基準比較以量化性能衰退。',
  daysSinceDryDock: '自最近一次乾塢（dry-dock）起算的天數。',
  daysSinceInWater: '自最近一次水下船體清潔起算的天數。',

  // Emissions
  cii: '船舶每載重噸·海里的 CO₂ 排放量評級（A–E），A 最佳。此處顯示的是 IMO 規定值（required line）評級：規定值以 2019 年基準線逐年折減（Z% = 5／7／9／11%，對應 2023–2026 年），故同一碳強度在越晚的年份評級越差。C 級以上為合規。',
  aer: '年度效率比：每載重噸·海里的 CO₂ 排放量（gCO₂/dwt·nm），越低越佳。',

  // Alerts / anomalies
  anomaly: '指標偏離預期範圍而被偵測出的事件。',
  severity: '異常事件的嚴重程度分級（high／medium／low）。',
  cause: '異常的推定來源：船體生物附著、主機性能衰退、螺旋槳／海流異常、惡劣海氣象、感測器異常。',
  fleetAlertsTable: '全船隊預警清單：每筆為一段連續異常（或生物附著趨勢）整合而成的事件，含起訖日期、嚴重度、成因與建議行動；點擊任一列可查看該船的個船分析。',
  alertsBySeverity: '全船隊預警依成因分類的數量統計，顏色代表嚴重度組成；用於快速看出哪個成因目前最活躍。',
  highSeverityAlerts: '嚴重度為 high 的預警數；為船隊當前最需優先處理的異常。',
  vesselsWithAlerts: '目前有至少一筆預警的船舶數，占船隊總數的比例。',
  recentAlerts: '近 30 天內新開啟的預警數（以資料期間最新日期為基準）。',

  // Vessel specs
  dwt: '載重噸（Deadweight Tonnage）：船舶可裝載的最大總重量（公噸），含貨物、燃油、淡水等。',
  lpp: '垂線間長（Length Between Perpendiculars）：船艏艉垂線間的船長（m），常用於船體性能計算。',
  breadth: '船寬（Breadth）：船舶的最大寬度（m）。',
  mcr: '最大持續輸出功率（Maximum Continuous Rating）：主機可長期連續運轉的最大功率（kW）。',
  designSpeed: '設計船速（Design Speed）：船舶於設計工況下的服務航速（kn）。',

  // Vessel deep-dive
  alertsFeed: '此船的預警清單：每筆為一段連續異常（或生物附著趨勢）整合而成的事件，含起訖日期、嚴重度、成因與建議行動。',
  vesselSpeedLossTrend: '此船每日速度損失的長期趨勢；含維修事件標記、ISO 19030 維修觸發線（8%）與本儀表板的清潔行動線（10%），以及依汙損速率外推至預測觸發日的趨勢線。趨勢線僅擬合於通過 ISO 篩選的實測值。灰點為未通過篩選的日子，滑鼠移入可查看被排除的原因。',
  causeDiagnostics: '推論層（非 ISO 19030 輸出）。ISO 19030 量測的是船體「與」螺槳的合併效應，並未提供拆分兩者的方法；本面板在 ISO 之上疊加一層推論，依四個訊號——速度損失（船體＋螺槳合計）、實際滑失（螺旋槳）、SFOC（主機）與超額油耗——各自對基準的偏離與近 30 天異常數，推測衰退較可能的來源。每格附信心水準（高／中／低），依佐證訊號是否一致、樣本數與距上次重置天數而定。此結果不得作為 ISO 19030 的直接輸出對外引用。',
  maintenanceRec: '整合汙損模型、異常偵測與水下檢查所產生的建議維修行動；每項含優先度、建議到期日、預估淨節省與作業方式（水下／乾塢），依優先度與節省金額排序。',
  uwiInspection: '歷次水下檢查（在水檢查 UWI／乾塢 DD）結果：船體汙損等級（0–100）與覆蓋率、螺旋槳狀況（良好／尚可／不佳）與粗糙度、塗層劣化與狀況，以及建議動作。作為統計診斷與維修建議的實體佐證。',
  ciiTrend: '此船 CII AER 與 IMO 碳強度數值（gCO₂/dwt·nm）隨時間的變化；圖上的 A–E 標記各自對應所在那條線於該段期間的 CII 評級，圓點填色代表評級，外框顏色代表所屬線別（灰藍色 AER、紫色 IMO）。C 級以上為合規；連續三年 D 或單年 E 須提出改善計畫。',
  speedPowerScatter: '實測「船速對主機功率」散點，依距上次清潔天數上色，並與乾淨船體參考曲線比較；曲線越往右上偏移代表汙損越嚴重。',
  anomalyTimeline: '各成因的異常 episode 時間軸；橫條越長代表持續越久，顏色代表嚴重度。',

  // Cost
  netSaving: '節省的燃油成本扣除清潔成本後的淨值（USD）。',
  excessCost: '每日超額燃油成本＝相對乾淨船體、平穩海況多耗的燃油 × 油價，拆解為三個來源並加總：船體＋螺槳汙損（最大且可經由清潔／拋光改善；此項由速度損失導出，ISO 19030 不拆分船體與螺槳，故兩者合計）、天氣／海況（季節性、多不可控）、操作（航速／裝載等）。KPI 為近 30 天平均的每日成本（與營運總覽同口徑）；圖為各來源每日金額的 30 天移動平均堆疊。',

  // Maintenance
  serviceType: '維修窗口是否需進乾塢（含塗層更新或螺旋槳修理），其餘可於水下施作。',
  nextMaintenance: '規劃器將各行動的到期日批次成服務窗口後，最早一個窗口的日期與內容。',

  // Maintenance planner (fleet-wide; definitions aligned with the PoC's Planner.js / glossary.js)
  dryDockWindow: '需進乾塢施作（塗層更新或螺旋槳修理）的服務窗口數；乾塢須上架，是排程與預算中最受限的事件。',
  maintenanceGantt: '每艘船的維修服務窗口排程；同船同日同服務型態的行動會合併成一個窗口。長條顏色代表服務型態（乾塢／水下），深淺代表優先度；長條長度為乾塢 12 天／水下 2 天的示意工期，非實際量測。',
  savingByQuarter: '依服務窗口的計畫日期分季彙總淨節省，並依服務型態（乾塢／水下）堆疊，呈現船隊維修效益的季度分布。非經濟型行動（如主機檢查）無淨節省，計為 0。',
  maintenanceBacklog: '所有船舶的待辦維修行動，依淨節省由高到低排序；點擊任一列可查看該船的個船分析。',
  maintenanceAction: '建議的維修項目：船體清潔、螺旋槳拋光／修理、船體塗層更新、主機檢查。',

  // Executive
  ciiARated: '以 IMO 規定值（required line）評級計，A 級船舶占全隊的比例（%）；越高代表船隊碳強度表現越好。合規風險另看 D／E 級：連續三年 D 級或單年 E 級須提出矯正行動計畫（corrective action plan）。',
  savingsByShip: '各船的清潔／維修建議淨節省（USD），由高到低排序；僅列出目前有建議的船舶。',

  // Fleet overview
  fleetTable: '每艘船的當前狀態：速度損失與趨勢、距上次乾塢／水下清潔天數、近 30 日異常數，以及下一項維修建議。',
  speedLossDistribution: '全船隊各船當前速度損失的分布。',

  // Speed optimizer (definitions aligned with the PoC's Optimizer.js / glossary.js)
  speedCostCurve: '單位航距總成本（usd/nm，含燃油與每日租金）對航速的凸曲線；租金（時間成本）使曲線呈凸形，故存在內部的經濟航速最小值──若無租金項，燃油成本將隨航速單調遞增，最省即最慢，屬退化解。',
  currentSpeed: '此船近期的代表性實際營運航速，作為航速優化模型的比較基準；並非設計船速，也不是下方「排程試算」推算出的排程航速。',
  economicSpeed: '使單位航距總成本（usd/nm，含燃油與每日租金）最小的航速；即凸曲線的內部最小值，約為設計航速的 60–70%。',
  speedOptimizerSaving: '刻意以低於設計航速航行以降低燃油消耗（減速航行）：本船以經濟航速全年運行、相對目前航速可節省的燃油＋租金成本，依年化航距推算。與清潔／維修建議所稱的「淨節省」來自不同模型（船體清潔最佳服務間隔），兩者無法直接比較或相加。',
  speedOptimizerCo2: '假設全年以經濟航速取代目前航速航行，依燃油消耗曲線估算的年 CO₂ 減量（公噸）。',
  scheduleSpeed: '依輸入的航距與天數推算的必要平均航速（航距 ÷（天數 × 24））；用以檢視趕船期是否被迫高於經濟航速。',
  scheduleVoyageSaving: '以輸入的航距為準：主要數字為改採排程航速（相對目前航速）可節省的燃油＋租金成本，是此航程實際可行的節省金額；下方另列若能改採經濟航速的可省金額作為理論上限對照。與上方「本船年省」的差別在於此二者皆為單一航次、非年化。',
  dailyCostBreakdown: '每日燃油成本（隨航速遞增）與每日租金成本（固定，隨速度變化僅影響其攤提的距離）隨航速變化的堆疊；兩者相加即為每日總成本。',
  fuelEmissionCurve: '每日燃油消耗量與 CO₂ 排放量隨航速變化的曲線；降速可同時降低油耗與排放。',

  // Data coverage — ISO 19030 requires this to be a first-class displayed metric, not a footnote.
  dataCoverage: '通過 ISO 19030 篩選、可用於計算速度損失的日數占此船總回報日數的比例。ISO 的篩選極為嚴格（實務上常剔除 80–95% 的原始資料，本資料湖全隊為 78%），覆蓋率低代表指標建立在很少的樣本上，須連同數值一併判讀。',

  // Fleet map
  fleetMap: '全船隊最新一日的船位，虛線為兩港之間的規劃航線。點選任一船舶進入個船分析。船位取自最新一日的回報；速度損失則取自最新一個「通過 ISO 19030 篩選」的日子——兩者通常不是同一天，故色點標示的是該船最近一次可信的船體狀態，滑鼠移入可查看該讀數的日期與距今天數。',
});

// fact_performance_daily.reject_reason → why the ISO 19030 gate dropped that day. The gate
// drops ~78% of the fleet's days, and being able to say *which* gate dropped a given one is
// the core value of an ISO 19030 dashboard (doc/iso-19030.md), not a footnote. Keys are the
// values ym_datalake/etl/curated/filters.py emits — one per gate, in its evaluation order.
const RejectReason = Object.freeze({
  masked: '遮蔽資料：S21–S23 的預測窗口沒有主機資料可供篩選。',
  missing_propulsion: '推進資料缺漏：功率、船速或排水量在清洗後不存在或非正值。',
  displacement_backfilled: '排水量為吃水回填的推估值，非實測；推估值會使速度損失的散布加倍（9.76 pp vs 4.95 pp）。',
  admiralty: '船速／功率組合不符物理：Admiralty 係數落在 300–1300 之外（單看各欄都合理，成對則不可能）。',
  not_full_speed: '全速時數不足 22 小時，不構成穩態點。',
  beaufort: '風力超過蒲福 4 級，或未記錄風級（未設限的天氣日不能稱為穩態）。',
  low_speed: '船速低於設計船速的一半，基準曲線在此為外插。',
  displacement_band: '排水量超出基準曲線的擬合區間（設計排水量的 0.5–1.2 倍）。',
  shallow_water: '淺水效應：水深不足，阻力上升會偽裝成船體汙損。',
});

// Chart / section titles — centralized so labels stay consistent across the dashboard.
const Title = Object.freeze({
  ciiDistribution: 'CII rating distribution',
  ciiTrend: 'CII rating trend',
  fleetSpeedLossTrend: 'Fleet speed-loss trend',
  savingsPotential: 'Savings potential',
  fleetTable: 'Fleet vessels',
  speedLossDistribution: 'Speed-loss distribution',

  // Vessel deep-dive
  alerts: 'Alerts',
  vesselSpeedLossTrend: 'Speed-loss trend',
  vesselCiiTrend: 'CII AER / IMO trend',
  excessCost: 'Excess fuel cost',
  causeDiagnostics: 'Cause diagnostics',
  uwiInspection: 'Underwater inspection',
  maintenanceRec: 'Recommended actions',
  speedPower: 'Speed–power',
  anomalyTimeline: 'Anomaly episodes',

  // Speed optimizer
  speedCostCurve: 'Speed–cost curve',
  scheduleWhatIf: '排程試算器',
  dailyCostBreakdown: 'Daily cost breakdown',
  fuelEmissionCurve: 'Fuel & emissions vs speed',

  // Maintenance planner
  maintenanceGantt: 'Maintenance schedule',
  savingByQuarter: 'Net saving by quarter',
  maintenanceBacklog: 'Maintenance backlog',

  // Fleet alerts
  alertsBySeverity: 'Alerts by cause',
  fleetAlertsTable: 'Fleet alerts',
});

export {
  RejectReason,
  Term,
  Title,
};
