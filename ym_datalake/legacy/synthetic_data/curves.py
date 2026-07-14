"""Reference speed-power curve — the single shared source of truth (C1).

The clean-hull relation is::

    P = a · V^n · (Δ / Δ_ref)^(2/3)

``a`` and ``n`` come from :class:`~ym_datalake.synthetic_data.fleet.VesselSpec`
(``a`` fitted so ``P(design_speed) = ncr`` at ``Δ_ref = design_displacement``).

Both the forward generator (compute the power a clean hull needs at a given
speed/displacement) and the M2 ETL (invert corrected power back to an expected
clean speed for ISO 19030 speed-loss) MUST use *this* module — sharing the
curve is what makes the injected speed loss recoverable (C13).
"""

from __future__ import annotations

from dataclasses import dataclass

from ym_datalake.synthetic_data.fleet import VesselSpec


@dataclass(frozen=True)
class ReferenceCurve:
    """Per-vessel clean-hull speed-power curve and its inverse."""

    imo_number: str
    ref_curve_id: str
    a: float
    n: float
    delta_ref_mt: float

    def clean_power_kw(self, speed_kn: float, displacement_mt: float) -> float:
        """Shaft power a clean hull needs at ``speed_kn`` and ``displacement_mt``."""
        return self.a * speed_kn**self.n * (displacement_mt / self.delta_ref_mt) ** (2.0 / 3.0)

    def clean_speed_kn(self, power_kw: float, displacement_mt: float) -> float:
        """Inverse: expected clean speed at ``power_kw`` and ``displacement_mt``.

        This is ``f_refcurve`` from §4.3 — the expected speed M2 compares STW
        against to derive percentage speed loss.
        """
        return (power_kw / (self.a * (displacement_mt / self.delta_ref_mt) ** (2.0 / 3.0))) ** (1.0 / self.n)


def build_curve(spec: VesselSpec) -> ReferenceCurve:
    """Build the reference curve for a vessel from its fitted spec coefficients."""
    return ReferenceCurve(
        imo_number=spec.imo_number,
        ref_curve_id=spec.ref_curve_id,
        a=spec.curve_a,
        n=spec.curve_n,
        delta_ref_mt=spec.design_displacement_mt,
    )


def curve_points(spec: VesselSpec, n_points: int = 12) -> list[dict]:
    """Emit ``reference_curve`` sea-trial rows across the vessel's speed range.

    Points span 0.5·V_design → 1.05·V_design at the reference displacement.
    """
    curve = build_curve(spec)
    v_lo, v_hi = 0.5 * spec.design_speed_kn, 1.05 * spec.design_speed_kn
    step = (v_hi - v_lo) / (n_points - 1)
    rows: list[dict] = []
    for i in range(n_points):
        speed = v_lo + step * i
        rows.append(
            {
                'ref_curve_id': spec.ref_curve_id,
                'imo_number': spec.imo_number,
                'speed_kn': speed,
                'shaft_power_kw': curve.clean_power_kw(speed, curve.delta_ref_mt),
                'displacement_ref_mt': curve.delta_ref_mt,
            }
        )
    return rows
