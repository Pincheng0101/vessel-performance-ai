"""Fleet definition — the 9-vessel container fleet spanning Feeder→ULCV.

STDLIB ONLY: this module is imported by ``deployment/athena_tool_stack.py`` at
``cdk synth`` time (for ``IMO_NUMBERS``), so it must not import numpy or any
generator-only dependency.

Specs are §3.1 representative values scaled per vessel class. Two derived
quantities are precomputed here (plain arithmetic, no numpy) so the rest of the
generator and the reference-curve builder share one source of truth:

- ``design_displacement_mt`` — Δ at design draft via a box hydrostatic
  approximation ``Δ = ρ_sw · Cb · Lpp · B · T`` (the reference displacement for
  the speed-power curve, C1/C5).
- ``curve_a`` — the speed-power coefficient fitted so that ``P(design_speed) ≈
  ncr`` at the reference displacement: ``a = ncr / design_speed**curve_n``.
- ``lightship_mt`` — ``design_displacement − dwt`` (closes the C5 mass balance).
"""

from dataclasses import dataclass, field

# Reference seawater density (t/m^3) used for the hydrostatic approximation and
# as the curve reference condition. Matches physics.RHO_SW_REF_KG_M3 / 1000.
_RHO_SW_REF_T_M3 = 1.025


@dataclass(frozen=True)
class VesselSpec:
    """Static particulars for one vessel (dimension row + physics constants)."""

    imo_number: str
    vessel_name: str
    vessel_class: str
    teu: int
    lpp_m: float
    breadth_m: float
    design_draft_m: float
    dwt: float
    gross_tonnage: float
    mcr_kw: float
    ncr_kw: float
    design_speed_kn: float
    propeller_type: str
    propeller_diameter_m: float
    propeller_pitch_m: float
    n_blades: int
    transverse_area_m2: float
    build_year: int
    ref_curve_id: str
    block_coefficient: float
    curve_n: float
    fleet_id: str
    fleet_name: str
    # §2 charter/hire rate (USD/day) — the per-vessel time cost that makes the
    # bunker optimizer's usd_per_nm curve convex (fuel-only would be degenerate).
    # Static particular, one value per hull; consumed by ``etl/optimize.py`` and
    # never mapped into ``dim_vessel`` (``datasets.build_vessel_master`` is explicit).
    charter_usd_per_day: float
    # Derived (computed in __post_init__ — frozen, so set via object.__setattr__).
    design_displacement_mt: float = field(default=0.0)
    lightship_mt: float = field(default=0.0)
    curve_a: float = field(default=0.0)

    def __post_init__(self) -> None:
        delta_ref = _RHO_SW_REF_T_M3 * self.block_coefficient * self.lpp_m * self.breadth_m * self.design_draft_m
        object.__setattr__(self, 'design_displacement_mt', delta_ref)
        object.__setattr__(self, 'lightship_mt', delta_ref - self.dwt)
        object.__setattr__(self, 'curve_a', self.ncr_kw / (self.design_speed_kn**self.curve_n))


def _spec(
    imo: str,
    name: str,
    vessel_class: str,
    teu: int,
    lpp: float,
    breadth: float,
    draft: float,
    dwt: float,
    gt: float,
    mcr: float,
    vdes: float,
    prop_dia: float,
    pitch: float,
    blades: int,
    a_xv: float,
    build_year: int,
    cb: float,
    curve_n: float,
    ncr_frac: float = 0.85,
    *,
    fleet_id: str,
    charter_usd_per_day: float,
) -> VesselSpec:
    return VesselSpec(
        imo_number=imo,
        vessel_name=name,
        vessel_class=vessel_class,
        teu=teu,
        lpp_m=lpp,
        breadth_m=breadth,
        design_draft_m=draft,
        dwt=dwt,
        gross_tonnage=gt,
        mcr_kw=mcr,
        ncr_kw=round(mcr * ncr_frac),
        design_speed_kn=vdes,
        propeller_type='FPP',
        propeller_diameter_m=prop_dia,
        propeller_pitch_m=pitch,
        n_blades=blades,
        transverse_area_m2=a_xv,
        build_year=build_year,
        ref_curve_id=f'RC-{imo}',
        block_coefficient=cb,
        curve_n=curve_n,
        fleet_id=fleet_id,
        fleet_name=FLEETS[fleet_id],
        charter_usd_per_day=charter_usd_per_day,
    )


# §21 operational fleet groupings (illustrative). WELLNESS (9700006) stays the
# Dashboard deep-dive vessel; `'ALL'` is a synthetic all-fleet rollup, not listed here.
FLEETS: dict[str, str] = {
    'FL-IA': 'Intra-Asia',
    'FL-TP': 'Trans-Pacific',
    'FL-AE': 'Asia-Europe',
}


# Fleet ordered so YM WELLNESS (the Dashboard deep-dive) lands on IMO 9700006.
FLEET: list[VesselSpec] = [
    _spec(
        '9700001',
        'YM HARMONY',
        'Feeder',
        1100,
        150.0,
        23.0,
        8.5,
        13500,
        9500,
        9000,
        18.0,
        5.0,
        4.5,
        4,
        700.0,
        2012,
        0.66,
        3.7,
        fleet_id='FL-IA',
        charter_usd_per_day=15000.0,
    ),
    _spec(
        '9700002',
        'YM ENLIGHTEN',
        'Feedermax',
        2500,
        200.0,
        30.0,
        11.0,
        33000,
        26000,
        21000,
        21.0,
        6.5,
        5.8,
        4,
        1100.0,
        2014,
        0.66,
        3.8,
        fleet_id='FL-IA',
        charter_usd_per_day=31500.0,
    ),
    _spec(
        '9700003',
        'YM PLENTY',
        'Panamax',
        4500,
        260.0,
        32.2,
        12.5,
        58000,
        46000,
        36000,
        24.0,
        7.8,
        6.5,
        5,
        1500.0,
        2010,
        0.65,
        3.9,
        fleet_id='FL-IA',
        charter_usd_per_day=38000.0,
    ),
    _spec(
        '9700004',
        'YM PROSPER',
        'Panamax',
        4600,
        262.0,
        32.2,
        12.6,
        59000,
        46500,
        36500,
        24.0,
        7.8,
        6.6,
        5,
        1520.0,
        2013,
        0.65,
        3.9,
        fleet_id='FL-TP',
        charter_usd_per_day=59000.0,
    ),
    _spec(
        '9700005',
        'YM EXCELLENCE',
        'Post-Panamax',
        8500,
        300.0,
        43.0,
        14.5,
        101000,
        90000,
        55000,
        24.5,
        8.8,
        7.2,
        6,
        2200.0,
        2015,
        0.66,
        4.0,
        fleet_id='FL-TP',
        charter_usd_per_day=72000.0,
    ),
    _spec(
        '9700006',
        'YM WELLNESS',
        'Neo-Panamax',
        11000,
        330.0,
        48.0,
        15.5,
        128000,
        113000,
        62000,
        23.0,
        9.2,
        8.0,
        6,
        2800.0,
        2016,
        0.67,
        4.0,
        fleet_id='FL-AE',
        charter_usd_per_day=101000.0,
    ),
    _spec(
        '9700007',
        'YM WARRANTY',
        'Neo-Panamax',
        11000,
        331.0,
        48.2,
        15.5,
        128500,
        113500,
        62000,
        23.0,
        9.2,
        8.0,
        6,
        2820.0,
        2018,
        0.67,
        4.0,
        fleet_id='FL-AE',
        charter_usd_per_day=98000.0,
    ),
    _spec(
        '9700008',
        'YM TRIUMPH',
        'Post-Panamax',
        8600,
        301.0,
        43.0,
        14.6,
        102000,
        90500,
        55500,
        24.5,
        8.8,
        7.2,
        6,
        2220.0,
        2017,
        0.66,
        4.0,
        fleet_id='FL-TP',
        charter_usd_per_day=74000.0,
    ),
    _spec(
        '9700009',
        'YM TITAN',
        'ULCV',
        20000,
        400.0,
        59.0,
        16.0,
        197000,
        200000,
        75000,
        22.5,
        10.0,
        8.5,
        6,
        4000.0,
        2019,
        0.68,
        4.1,
        fleet_id='FL-AE',
        charter_usd_per_day=54000.0,
    ),
]

IMO_NUMBERS: list[str] = [v.imo_number for v in FLEET]

# Star of the YM WELLNESS storyline (§3.2 C9/C10 engineered fouling arc).
WELLNESS_IMO = '9700006'

_BY_IMO = {v.imo_number: v for v in FLEET}


def get_vessel(imo_number: str) -> VesselSpec:
    """Return the spec for ``imo_number`` (KeyError if unknown)."""
    return _BY_IMO[imo_number]
