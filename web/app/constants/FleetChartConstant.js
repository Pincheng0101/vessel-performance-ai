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

// Planner service window type (v1 plan_service_type). in_water reuses the steel-blue series
// color (not the teal pinned to hull_biofouling above) so "underwater work" reads as blue,
// not teal/green. hull_cleaning/propeller_polishing/engine_inspection are the v2
// vessel_maintenance_recommendation action_type values (doc/api_v2.md §3.11) — hull_cleaning
// reuses in_water's blue since both are underwater hull work.
const ServiceTypeColor = Object.freeze({
  dry_dock: CategoricalPalette[4],
  in_water: CategoricalPalette[1],
  hull_cleaning: CategoricalPalette[1],
  propeller_polishing: CategoricalPalette[4],
  engine_inspection: CategoricalPalette[0],
});

// Speed-loss color bands (mirror the deep-dive gauge: threshold 10%, amber from 6%).
// Shaped as ECharts visualMap pieces so a map/scatter can both color and legend by them.
const SpeedLossThreshold = 10;
const SpeedLossBand = Object.freeze([
  { lt: 0, label: 'n/a', color: '#cbd5e1' },
  { gte: 0, lt: 6, label: '< 6%', color: SemanticRamp.good },
  { gte: 6, lt: SpeedLossThreshold, label: '6–10%', color: SemanticRamp.warning },
  { gte: SpeedLossThreshold, label: '≥ 10%', color: SemanticRamp.critical },
]);

export {
  CategoricalPalette,
  CauseColor,
  CiiColor,
  FallbackColor,
  Font,
  SemanticRamp,
  ServiceTypeColor,
  SeverityColor,
  SpeedLossBand,
  SpeedLossColor,
  SpeedLossThreshold,
};
