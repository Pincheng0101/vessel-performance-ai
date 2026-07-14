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
  speedLoss: '相同主機功率下，實際船速較乾淨船體基準的下降百分比；主因船體／螺槳汙損。',
  foulingRate: '速度損失每日增加的百分點（%/day），越高代表汙損越快。',
  threshold: '觸發船體清潔建議的速度損失上限（%）。',
  triggerEta: '依現行趨勢，速度損失預計達到門檻的日期。',
  tStar: '使總成本（燃油＋清潔）最小的建議清潔天數。',
  speedPower: '實測船速對主機功率的關係，與乾淨船體基準比較以量化性能衰退。',
  daysSinceDryDock: '自最近一次乾塢（dry-dock）起算的天數。',
  daysSinceInWater: '自最近一次水下船體清潔起算的天數。',

  // Emissions
  cii: '船舶每載重噸·海里的 CO₂ 排放量評級（A–E），A 最佳。',
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
  vesselSpeedLossTrend: '此船每日速度損失的長期趨勢；含維修事件標記、10% 清潔門檻，以及依汙損速率外推至預測觸發日的趨勢線。',
  causeDiagnostics: '整合滑失、SFOC 與 Admiralty efficiency index，判斷速度損失較可能來自船體髒污、螺旋槳／海流、主機效率或天氣／感測資料。',
  maintenanceRec: '整合汙損模型、異常偵測與水下檢查所產生的建議維修行動；每項含優先度、建議到期日、預估淨節省與作業方式（水下／乾塢），依優先度與節省金額排序。',
  uwiInspection: '歷次水下檢查（潛水員／ROV）結果：船體汙損等級（0–100）與覆蓋率、螺旋槳 Rubert 等級（A 佳→E 差）與粗糙度、塗層劣化與狀況，以及建議動作。作為統計診斷與維修建議的實體佐證。',
  ciiTrend: '此船 CII AER 與 IMO 碳強度數值（gCO₂/dwt·nm）隨時間的變化；圖上的 A–E 標記各自對應所在那條線於該段期間的 CII 評級，圓點填色代表評級，外框顏色代表所屬線別（灰藍色 AER、紫色 IMO）。C 級以上為合規；連續三年 D 或單年 E 須提出改善計畫。',
  speedPowerScatter: '實測「船速對主機功率」散點，依距上次清潔天數上色，並與乾淨船體參考曲線比較；曲線越往右上偏移代表汙損越嚴重。',
  anomalyTimeline: '各成因的異常 episode 時間軸；橫條越長代表持續越久，顏色代表嚴重度。',

  // Cost
  netSaving: '節省的燃油成本扣除清潔成本後的淨值（USD）。',
  excessCost: '每日超額燃油成本＝相對乾淨船體、平穩海況多耗的燃油 × 油價，拆解為三個來源並加總：船體汙損（最大且可經由清潔改善）、天氣／海況（季節性、多不可控）、操作（航速／裝載等）。KPI 為近 30 天平均的每日成本（與營運總覽同口徑）；圖為各來源每日金額的 30 天移動平均堆疊。',

  // Maintenance
  serviceType: '維修窗口是否需進乾塢（含塗層更新或螺旋槳修理），其餘可於水下施作。',
  nextMaintenance: '規劃器將各行動的到期日批次成服務窗口後，最早一個窗口的日期與內容。',

  // Maintenance planner (fleet-wide; definitions aligned with the PoC's Planner.js / glossary.js)
  capex: '維修行動的指示性成本估算：取歷史對應維護事件成本的中位數；主機檢查以主機大修（engine overhaul）成本估算，可能高估純檢查費用。',
  dryDockWindow: '需進乾塢施作（塗層更新或螺旋槳修理）的服務窗口數；乾塢須上架，是排程與預算中最受限的事件。',
  maintenanceRoi: '淨節省除以資本支出的倍數；≥1× 代表可回收成本。淨節省為空（非經濟型行動，如主機檢查）者不計入 ROI，於待辦清單排序時置底。',
  maintenanceGantt: '每艘船的維修服務窗口排程；同船同日同服務型態的行動會合併成一個窗口。長條顏色代表服務型態（乾塢／水下），深淺代表優先度；長條長度為乾塢 12 天／水下 2 天的示意工期，非實際量測。',
  capexCashflow: '依服務窗口的計畫日期分季彙總指示性資本支出，並依服務型態（乾塢／水下）堆疊，呈現船隊維修預算的季度分布。',
  maintenanceBacklog: '所有船舶的待辦維修行動，依 ROI（淨節省 ÷ 資本支出）由高到低排序；點擊任一列可查看該船的個船分析。',
  maintenanceAction: '建議的維修項目：船體清潔、螺旋槳拋光／修理、船體塗層更新、主機檢查。',

  // Executive
  ciiRisk: 'D 或 E 級船舶占全隊的比例（%）；越高代表越多船碳效不佳。',
  savingsRealized: '超額油費從歷史高點回落的金額，作為已實現節省的估計值（USD）。',

  // Fleet overview
  fleetTable: '每艘船的當前狀態：速度損失、趨勢、CII 評級、距上次乾塢／水下清潔天數、近 30 日異常數、下次維修與淨節省。',
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

  // Fleet map
  fleetMap: '全船隊最新一日的船位，虛線為兩港之間的規劃航線。點選任一船舶進入個船分析。',
});

// Chart / section titles — centralized so labels stay consistent across the dashboard.
const Title = Object.freeze({
  ciiDistribution: 'CII rating distribution',
  ciiTrend: 'CII rating trend',
  fleetSpeedLossTrend: 'Fleet speed-loss trend',
  savingsCaptured: 'Savings captured',
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
  capexCashflow: 'Capex by quarter',
  maintenanceBacklog: 'Maintenance backlog',

  // Fleet alerts
  alertsBySeverity: 'Alerts by cause',
  fleetAlertsTable: 'Fleet alerts',
});

export {
  Term,
  Title,
};
