// Colors + font for the fleet-performance dashboard charts (ECharts). Semantic colors
// (CII / severity / speed-loss) all sample from one green→red ramp so the same risk
// level always reads as the same color across charts. The categorical palette is a
// five-hue cool family echoing the brand purple, deliberately kept out of the
// green/amber/red hues the semantic ramp uses so a chart never confuses "category" with
// "severity". Both sets are tuned so adjacent entries stay visually distinct even when
// placed side by side (legends, stacked KPI cards).

const Font = Object.freeze({
  FAMILY: 'Roboto, sans-serif',
});

const FallbackColor = '#94a3b8';

// Semantic ramp: good → fair → warning → poor → critical. CII (5 grades), severity
// (3 grades) and speed-loss bands (3 grades) all derive from this single ramp instead
// of each hardcoding their own hex values. warning/poor/critical run more saturated than
// good/fair on purpose — risk should read as more visually urgent than a calm baseline.
const SemanticRamp = Object.freeze({
  good: '#3a9c51',
  fair: '#779f41',
  warning: '#e2af36',
  poor: '#e5712e',
  critical: '#dd382d',
});

// Five-hue cool categorical family for series that carry no inherent meaning (chart
// series, anomaly causes, service type). Index 2 (teal) and index 3 (blue) are pushed to
// opposite ends of the lightness range on purpose — they're stacked directly against each
// other in the excess-cost breakdown, and a big lightness step is what actually separates
// adjacent bands in a filled area chart (color alone, no border, washes out).
const CategoricalPalette = Object.freeze([
  '#8a6cd0', '#5e8bc9', '#21837a', '#64a8d8', '#be8c60',
]);

const SpeedLossColor = CategoricalPalette[1];

// Anomaly cause → color (pinned so lanes read consistently across charts). hull_biofouling
// is a trend-only alert cause (never a point anomaly), pinned to teal to match the PoC.
const CauseColor = Object.freeze({
  engine_degradation: CategoricalPalette[0],
  propeller: CategoricalPalette[1],
  weather: CategoricalPalette[3],
  sensor: CategoricalPalette[4],
  hull_biofouling: CategoricalPalette[2],
});

// CII rating A–E, sampled from the semantic ramp (A best → E worst).
const CiiColor = Object.freeze({
  A: SemanticRamp.good,
  B: SemanticRamp.fair,
  C: SemanticRamp.warning,
  D: SemanticRamp.poor,
  E: SemanticRamp.critical,
});

const SeverityColor = Object.freeze({
  high: SemanticRamp.critical,
  medium: SemanticRamp.warning,
  low: FallbackColor,
});

// Maintenance planner: both the service window (plan_service_type) and the action
// (action_type) of fact_maintenance_recommendation. in_water reuses the steel-blue series color
// (not the teal pinned to hull_biofouling above) so "underwater work" reads as blue, not
// teal/green; hull_cleaning shares it since both are underwater hull work. Propeller work
// (polishing / repair) and coating renewal likewise share their action's family color — the
// pairs never appear as adjacent series, so the repeat costs no legibility.
const ServiceTypeColor = Object.freeze({
  dry_dock: CategoricalPalette[4],
  in_water: CategoricalPalette[1],
  hull_cleaning: CategoricalPalette[1],
  propeller_polishing: CategoricalPalette[4],
  propeller_repair: CategoricalPalette[4],
  coating_renewal: CategoricalPalette[2],
  engine_inspection: CategoricalPalette[0],
});

// Two speed-loss lines, and they are NOT the same line — the dashboard used to draw only the
// second and label it "threshold", which quietly hid the one the data actually computes.
//
// - SpeedLossIsoTrigger (8%) is the ISO 19030 **maintenance trigger** (MT). It is the number
//   the lake itself evaluates: ym_datalake/etl/curated/indicators.py MT_TRIGGER_PCT, which
//   emits an MT indicator row the day a hull cycle's 14-day trailing mean crosses it. Nothing
//   enforces the two staying equal — keep them in sync by hand, or the chart draws a trigger
//   the data never fires on.
// - SpeedLossThreshold (10%) is this dashboard's **action** line: the speed loss at which a
//   cleaning is recommended. It is an operator policy, not an ISO quantity.
//
// Two triggers is defensible. Two *undeclared* triggers is not — so both are rendered, each
// labelled for what it is.
const SpeedLossIsoTrigger = 8;
const SpeedLossThreshold = 10;

// fact_alert.driver_metric icon, one dictionary shared by every list that scans alerts by metric
// (Fleet Alerts table, the notification bell, the vessel deep-dive's own alert feed). Each metric
// gets its own glyph — sfoc used to share mdi-engine with the engine_inspection *action* below,
// and slip used to share mdi-fan with the propeller_* actions, so the same icon meant a diagnostic
// reading in one list and a physical maintenance job in another.
const MetricIcon = Object.freeze({
  speed_loss: 'mdi-speedometer-slow',
  sfoc: 'mdi-gauge',
  // No propeller glyph exists in @mdi/font — slip is reported as a %, hence percent-outline.
  slip: 'mdi-percent-outline',
  excess_foc: 'mdi-gas-station',
});

// fact_maintenance_recommendation.action_type icon, shared by the maintenance planner, the
// notification bell, and the vessel deep-dive's recommendation list. propeller_polishing and
// propeller_repair used to both be mdi-fan — indistinguishable in a list meant to be scanned by
// icon — repair now gets its own (mdi-fan-alert, already how the vessel deep-dive drew it before
// this file existed).
const ActionIcon = Object.freeze({
  hull_cleaning: 'mdi-spray-bottle',
  propeller_polishing: 'mdi-fan',
  propeller_repair: 'mdi-fan-alert',
  coating_renewal: 'mdi-format-paint',
  engine_inspection: 'mdi-engine',
});

export {
  ActionIcon,
  CategoricalPalette,
  CauseColor,
  CiiColor,
  FallbackColor,
  Font,
  MetricIcon,
  SemanticRamp,
  ServiceTypeColor,
  SeverityColor,
  SpeedLossColor,
  SpeedLossIsoTrigger,
  SpeedLossThreshold,
};
