"""``curated.clean`` — the one module allowed to mutate the real data.

Three structural problems land here (duplicates, gross outliers, a 68.5 % displacement fill)
and the order in which they are handled is itself a contract: clip first, so an impossible
row cannot win a dedupe tie-break.
"""

from __future__ import annotations

import pytest

from ym_datalake.etl.curated import clean


def _hydrostatic(draft_m: float, vessel: dict) -> float:
    """The docstring's TPC line: delta_design + (T - T_design) . 100 . TPC."""
    return vessel['displacement_design_t'] + (draft_m - vessel['design_draft_m']) * 100.0 * vessel['tpc_t_per_cm']


def test_a_day_holds_twenty_four_hours():
    """Pinned, not referenced: the clamp tests below use this constant, so they would follow
    it anywhere. The source's 42.5-hour row is the reason the clamp exists."""
    assert clean.HOURS_IN_DAY == 24.0


class TestClipRow:
    """Cells are nulled *cell-wise*, not dropped row-wise: the rest of the row is usually fine."""

    def test_impossible_power_is_nulled(self, noon_row, vessel):
        # The source really does carry 671,576 kW against a 47,700 kW MCR.
        assert clean.clip_row(noon_row(horse_power=671_576.0), vessel)['horse_power'] is None

    def test_power_within_the_mcr_headroom_survives(self, noon_row, vessel):
        ceiling = vessel['mcr_kw'] * 1.15
        assert clean.clip_row(noon_row(horse_power=ceiling), vessel)['horse_power'] == ceiling
        assert clean.clip_row(noon_row(horse_power=ceiling * 1.01), vessel)['horse_power'] is None

    @pytest.mark.parametrize('sfoc', [100.0, 95_056.0])
    def test_sfoc_outside_the_band_is_nulled(self, noon_row, vessel, sfoc):
        assert clean.clip_row(noon_row(sfoc=sfoc), vessel)['sfoc'] is None

    def test_a_plausible_sfoc_survives(self, noon_row, vessel):
        assert clean.clip_row(noon_row(sfoc=170.0), vessel)['sfoc'] == 170.0

    def test_impossible_displacement_is_nulled(self, noon_row, vessel):
        assert clean.clip_row(noon_row(displacement=1_622_300.0), vessel)['displacement'] is None

    @pytest.mark.parametrize('column', ['hours_total', 'hours_full_speed'])
    def test_hours_are_clamped_to_24_not_nulled(self, noon_row, vessel, column):
        """A 42.5-hour day is a noon-to-noon bookkeeping artefact — the day still happened."""
        clipped = clean.clip_row(noon_row(**{column: 42.5}), vessel)
        assert clipped[column] == clean.HOURS_IN_DAY

    def test_a_normal_day_keeps_its_hours(self, noon_row, vessel):
        assert clean.clip_row(noon_row(hours_total=18.0), vessel)['hours_total'] == 18.0

    def test_the_input_row_is_not_mutated(self, noon_row, vessel):
        row = noon_row(horse_power=671_576.0, hours_total=42.5)
        clipped = clean.clip_row(row, vessel)
        assert row['horse_power'] == 671_576.0
        assert row['hours_total'] == 42.5
        assert clipped is not row


class TestMeanDraft:
    def test_the_mid_draft_wins_when_the_sensor_gave_one(self, noon_row):
        row = noon_row(mid_draft=13.0, fore_draft=10.0, after_draft=20.0)
        assert clean.mean_draft_m(row) == 13.0

    def test_falls_back_to_the_fore_aft_mean(self, noon_row):
        row = noon_row(mid_draft=None, fore_draft=10.0, after_draft=20.0)
        assert clean.mean_draft_m(row) == 15.0

    @pytest.mark.parametrize(('fore', 'aft'), [(10.0, None), (None, 20.0), (None, None)])
    def test_none_when_no_draft_can_be_formed(self, noon_row, fore, aft):
        row = noon_row(mid_draft=None, fore_draft=fore, after_draft=aft)
        assert clean.mean_draft_m(row) is None


class TestDisplacementOffsets:
    """The design TPC line reads ~3 % high against the reported displacements, so the bias is
    *measured* per hull class rather than assumed away — with a median, not a mean."""

    def test_the_offset_is_the_median_residual_of_the_hull_class(self, noon_row, vessel):
        vessels = {'S1': vessel}
        rows = [noon_row(mid_draft=14.5, displacement=_hydrostatic(14.5, vessel) + r) for r in (100.0, 200.0, 5000.0)]
        offsets = clean.fit_displacement_offsets(rows, vessels)
        assert offsets['W1'] == pytest.approx(200.0)  # not 1766.7, the mean the outlier would drag

    @pytest.mark.parametrize(
        'missing',
        [
            {'displacement': None},
            {'mid_draft': None, 'fore_draft': None, 'after_draft': None},
        ],
        ids=['no displacement', 'no draft'],
    )
    def test_rows_without_both_a_draft_and_a_displacement_are_skipped(self, noon_row, vessel, missing):
        vessels = {'S1': vessel}
        good = noon_row(mid_draft=14.5, displacement=_hydrostatic(14.5, vessel) + 300.0)
        # Its residual would be 9,999 t — but it is missing a leg, so it never reaches the fit.
        skipped = noon_row(**{'mid_draft': 14.5, 'displacement': _hydrostatic(14.5, vessel) + 9999.0, **missing})
        offsets = clean.fit_displacement_offsets([good, skipped], vessels)
        assert offsets['W1'] == pytest.approx(300.0)

    def test_a_hull_class_with_no_usable_row_gets_no_offset(self, noon_row, vessel):
        rows = [noon_row(displacement=None)]
        assert clean.fit_displacement_offsets(rows, {'S1': vessel}) == {}


class TestBackfillDisplacement:
    def test_a_measured_displacement_passes_straight_through(self, noon_row, vessel):
        row = noon_row(displacement=170_000.0)
        assert clean.backfill_displacement(row, vessel, {'W1': 500.0}) == (170_000.0, 'measured')

    def test_a_missing_displacement_is_estimated_off_the_tpc_line_plus_the_class_offset(self, noon_row, vessel):
        row = noon_row(displacement=None, mid_draft=15.0)
        value, source = clean.backfill_displacement(row, vessel, {'W1': -500.0})
        assert value == pytest.approx(_hydrostatic(15.0, vessel) - 500.0)
        assert source == 'backfilled'

    def test_an_unfitted_hull_class_falls_back_to_a_zero_offset(self, noon_row, vessel):
        row = noon_row(displacement=None, mid_draft=15.0)
        value, _source = clean.backfill_displacement(row, vessel, {})
        assert value == pytest.approx(_hydrostatic(15.0, vessel))

    def test_no_draft_no_estimate(self, noon_row, vessel):
        row = noon_row(displacement=None, mid_draft=None, fore_draft=None, after_draft=None)
        assert clean.backfill_displacement(row, vessel, {'W1': 500.0}) == (None, None)


class TestDedupe:
    def test_the_more_filled_row_wins(self, noon_row):
        thin = noon_row(horse_power=25_000.0)
        fat = noon_row(horse_power=25_000.0, sfoc=170.0, me_slip=5.0, total_consump=90.0)
        assert clean.dedupe([fat, thin]) == [fat]
        assert clean.dedupe([thin, fat]) == [fat]  # order of arrival must not decide it

    def test_an_equal_fill_is_tie_broken_on_the_longer_day(self, noon_row):
        short = noon_row(horse_power=25_000.0, hours_total=12.0)
        long = noon_row(horse_power=25_000.0, hours_total=24.0)
        assert clean.dedupe([short, long]) == [long]

    def test_distinct_vessel_days_all_survive_and_come_out_sorted(self, noon_row):
        rows = [
            noon_row(ship_id='S2', noon_utc=1),
            noon_row(ship_id='S1', noon_utc=5),
            noon_row(ship_id='S1', noon_utc=2),
        ]
        assert [(r['ship_id'], r['noon_utc']) for r in clean.dedupe(rows)] == [('S1', 2), ('S1', 5), ('S2', 1)]


class TestClean:
    def test_clipping_runs_before_dedupe(self, noon_row, vessel):
        """The outlier row carries *more* filled cells than its twin — but they are impossible
        cells. Dedupe on raw fill and the junk row wins the day; clip first and it loses."""
        outlier = noon_row(
            horse_power=671_576.0,
            load_pct=516.0,
            sfoc=95_056.0,
            me_slip=-1048.0,
            thrust=1000.0,
            thrust_quotient=0.2,
        )
        sound = noon_row(horse_power=25_000.0, sfoc=170.0, me_slip=5.0, thrust=1200.0)
        assert clean._fill_score(outlier) > clean._fill_score(sound)  # before clipping

        kept = clean.clean([outlier, sound], {'S1': vessel})
        assert len(kept) == 1
        assert kept[0]['horse_power'] == 25_000.0

    def test_clean_adds_the_two_derived_columns(self, noon_row, vessel):
        row = noon_row(displacement=None, mid_draft=15.0)
        kept = clean.clean([row], {'S1': vessel})[0]
        assert kept['mean_draft_m'] == 15.0
        assert kept['displacement_source'] == 'backfilled'
        assert kept['displacement'] is not None

    def test_a_measured_day_stays_measured(self, noon_row, vessel):
        kept = clean.clean([noon_row()], {'S1': vessel})[0]
        assert kept['displacement_source'] == 'measured'
        assert kept['displacement'] == 166_500.0
