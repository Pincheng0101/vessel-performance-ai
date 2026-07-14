import pytest
from aws_lambda_powertools.event_handler.exceptions import BadRequestError
from queries import render


class TestRender:
    def test_fleet_overview_no_dates(self):
        sql, binds = render('fleet_overview', {})
        assert 'FROM agg_fleet_daily' in sql
        # agg_fleet_daily grain is (fleet, day); default fleet_id 'ALL' selects the rollup.
        assert 'WHERE fleet_id = ?' in sql
        assert 'report_date BETWEEN' not in sql
        assert sql.rstrip().endswith('ORDER BY report_date')
        assert binds == ['ALL']

    def test_fleet_overview_date_range(self):
        sql, binds = render('fleet_overview', {'start_date': '2026-01-01', 'end_date': '2026-06-30'})
        assert 'WHERE fleet_id = ? AND report_date BETWEEN ? AND ?' in sql
        assert binds == ['ALL', '2026-01-01', '2026-06-30']

    def test_fleet_overview_start_only(self):
        sql, binds = render('fleet_overview', {'start_date': '2026-01-01'})
        assert 'WHERE fleet_id = ? AND report_date >= ?' in sql
        assert binds == ['ALL', '2026-01-01']

    def test_fleet_overview_end_only(self):
        sql, binds = render('fleet_overview', {'end_date': '2026-06-30'})
        assert 'WHERE fleet_id = ? AND report_date <= ?' in sql
        assert binds == ['ALL', '2026-06-30']

    def test_fleet_overview_fleet_id(self):
        sql, binds = render('fleet_overview', {'fleet_id': 'FL-AE'})
        assert 'WHERE fleet_id = ?' in sql
        assert binds == ['FL-AE']

    def test_fleet_overview_bad_fleet_id_raises(self):
        with pytest.raises(BadRequestError):
            render('fleet_overview', {'fleet_id': 'fl-lower'})

    def test_vessel_speed_loss_imo_and_dates(self):
        sql, binds = render(
            'vessel_speed_loss',
            {'imo_number': '9700006', 'start_date': '2026-01-01', 'end_date': '2026-06-30'},
        )
        assert 'FROM fact_performance_daily WHERE imo_number = ?' in sql
        assert 'AND report_date BETWEEN ? AND ?' in sql
        assert sql.rstrip().endswith('ORDER BY report_date')
        # imo bind precedes the date binds (matches ? order).
        assert binds == ['9700006', '2026-01-01', '2026-06-30']

    def test_vessel_speed_loss_imo_only(self):
        sql, binds = render('vessel_speed_loss', {'imo_number': '9700006'})
        assert 'BETWEEN' not in sql
        assert binds == ['9700006']

    def test_vessel_metrics_imo_and_dates(self):
        sql, binds = render(
            'vessel_metrics',
            {'imo_number': '9700006', 'start_date': '2026-01-01', 'end_date': '2026-06-30'},
        )
        assert 'FROM fact_performance_daily WHERE imo_number = ?' in sql
        assert 'AND report_date BETWEEN ? AND ?' in sql
        # full metric set the deep-dive panels need (incl. the Phase-4 attribution split).
        for col in (
            'slip_real',
            'sfoc_g_kwh',
            'admiralty_coef',
            'cum_excess_cost_usd',
            'excess_cost_fouling_usd',
            'excess_cost_weather_usd',
            'excess_cost_operational_usd',
            'cii_aer',
            'valid_flag',
        ):
            assert col in sql
        assert sql.rstrip().endswith('ORDER BY report_date')
        assert binds == ['9700006', '2026-01-01', '2026-06-30']

    def test_vessel_metrics_imo_only(self):
        sql, binds = render('vessel_metrics', {'imo_number': '9700006'})
        assert 'BETWEEN' not in sql
        assert binds == ['9700006']

    def test_fleet_vessels(self):
        sql, binds = render('fleet_vessels', {})
        assert 'FROM dim_vessel' in sql
        assert 'WHERE' not in sql
        # roster carries the fleet grouping so the dropdown can filter client-side.
        assert 'fleet_id' in sql and 'fleet_name' in sql
        assert sql.rstrip().endswith('ORDER BY imo_number')
        assert binds == []

    def test_fleet_vessels_extra_param_rejected(self):
        with pytest.raises(BadRequestError):
            render('fleet_vessels', {'imo_number': '9700006'})

    def test_fleet_list(self):
        sql, binds = render('fleet_list', {})
        assert 'SELECT DISTINCT fleet_id, fleet_name FROM dim_vessel' in sql
        assert sql.rstrip().endswith('ORDER BY fleet_id')
        assert binds == []

    def test_fleet_alerts_defaults(self):
        sql, binds = render('fleet_alerts', {})
        assert 'FROM fact_alert WHERE status = ?' in sql
        assert 'fleet_id' not in sql.split('WHERE', 1)[1]  # no fleet filter for ALL
        assert 'AND severity' not in sql
        assert sql.rstrip().endswith('ORDER BY last_seen_date DESC')
        assert binds == ['open']

    def test_fleet_alerts_fleet_and_severity(self):
        sql, binds = render('fleet_alerts', {'fleet_id': 'FL-TP', 'severity': 'high'})
        assert 'AND fleet_id = ?' in sql
        assert 'AND severity = ?' in sql
        assert binds == ['open', 'FL-TP', 'high']

    def test_fleet_alerts_bad_severity_rejected(self):
        with pytest.raises(BadRequestError):
            render('fleet_alerts', {'severity': 'critical'})

    def test_vessel_alerts(self):
        sql, binds = render('vessel_alerts', {'imo_number': '9700006'})
        assert 'FROM fact_alert WHERE imo_number = ?' in sql
        assert sql.rstrip().endswith('ORDER BY last_seen_date DESC')
        for col in ('cause', 'severity', 'opened_date', 'last_seen_date', 'message_zh', 'recommended_action'):
            assert col in sql
        assert binds == ['9700006']

    def test_vessel_speed_power_union(self):
        sql, binds = render('vessel_speed_power', {'imo_number': '9700006'})
        assert 'UNION ALL' in sql
        assert 'FROM fact_performance_daily' in sql
        assert 'FROM dim_reference_curve' in sql
        assert sql.count('?') == 2
        assert binds == ['9700006', '9700006']

    def test_vessel_anomalies(self):
        sql, binds = render('vessel_anomalies', {'imo_number': '9700006'})
        assert 'FROM fact_anomaly WHERE imo_number = ?' in sql
        assert binds == ['9700006']

    def test_vessel_maintenance_effect(self):
        sql, binds = render('vessel_maintenance_effect', {'imo_number': '9700006'})
        assert 'FROM fact_maintenance_event WHERE imo_number = ?' in sql
        assert binds == ['9700006']

    def test_vessel_recommendation(self):
        sql, binds = render('vessel_recommendation', {'imo_number': '9700006'})
        assert 'FROM fact_recommendation WHERE imo_number = ?' in sql
        assert binds == ['9700006']

    def test_vessel_maintenance_recommendation(self):
        sql, binds = render('vessel_maintenance_recommendation', {'imo_number': '9700006'})
        assert 'FROM fact_maintenance_recommendation WHERE imo_number = ?' in sql
        # grouped by planner window (plan_date), then priority (high→medium→low), then action_type.
        assert 'ORDER BY plan_date, CASE priority' in sql
        # per-action analytics strip columns (parity with fact_recommendation) + planner window tags.
        for col in (
            'degradation_rate',
            'degradation_unit',
            'current_value',
            'threshold_value',
            'trigger_eta',
            't_star_days',
            'net_saving_usd',
            'plan_date',
            'plan_service_type',
        ):
            assert col in sql
        assert binds == ['9700006']

    def test_vessel_maintenance_recommendation_missing_imo_raises(self):
        with pytest.raises(BadRequestError):
            render('vessel_maintenance_recommendation', {})

    def test_fleet_maintenance_recommendation(self):
        sql, binds = render('fleet_maintenance_recommendation', {})
        # fleet-wide backlog: no imo filter, imo_number in SELECT, LEFT JOIN median event cost.
        assert 'FROM fact_maintenance_recommendation r' in sql
        assert 'imo_number' in sql
        assert 'WHERE imo_number' not in sql
        assert 'LEFT JOIN' in sql and 'fact_maintenance_event' in sql
        assert 'est_cost_usd' in sql
        # engine_inspection remaps to the engine_overhaul event cost in the join ON.
        assert "CASE r.action_type WHEN 'engine_inspection'" in sql
        # pre-grouped by planner window, then priority rank, then action_type.
        assert 'ORDER BY r.plan_date' in sql
        for col in (
            'action_type',
            'priority',
            'due_date',
            'net_saving_usd',
            'plan_date',
            'plan_service_type',
        ):
            assert col in sql
        assert binds == []

    def test_fleet_maintenance_recommendation_extra_param_rejected(self):
        with pytest.raises(BadRequestError):
            render('fleet_maintenance_recommendation', {'imo_number': '9700006'})

    def test_vessel_uwi(self):
        sql, binds = render('vessel_uwi', {'imo_number': '9700006'})
        assert 'FROM fact_uwi WHERE imo_number = ?' in sql
        assert sql.rstrip().endswith('ORDER BY inspection_date')
        for col in (
            'propeller_condition',
            'propeller_roughness_um',
            'coating_breakdown_pct',
            'coating_condition',
            'hull_fouling_rating',
        ):
            assert col in sql
        assert binds == ['9700006']

    def test_vessel_uwi_extra_param_rejected(self):
        with pytest.raises(BadRequestError):
            render('vessel_uwi', {'imo_number': '9700006', 'evil': "'; DROP TABLE x --"})

    def test_vessel_track_imo_only(self):
        sql, binds = render('vessel_track', {'imo_number': '9700006'})
        assert 'FROM fact_performance_daily WHERE imo_number = ?' in sql
        for col in ('latitude', 'longitude', 'speed_loss_pct', 'cii_rating_aer', 'port_from', 'port_to'):
            assert col in sql
        assert 'BETWEEN' not in sql
        assert sql.rstrip().endswith('ORDER BY report_date')
        assert binds == ['9700006']

    def test_vessel_track_date_range(self):
        sql, binds = render(
            'vessel_track', {'imo_number': '9700006', 'start_date': '2026-01-01', 'end_date': '2026-06-30'}
        )
        assert 'AND report_date BETWEEN ? AND ?' in sql
        assert binds == ['9700006', '2026-01-01', '2026-06-30']

    def test_vessel_track_extra_param_rejected(self):
        with pytest.raises(BadRequestError):
            render('vessel_track', {'imo_number': '9700006', 'evil': "'; DROP TABLE x --"})

    def test_vessel_voyages(self):
        sql, binds = render('vessel_voyages', {'imo_number': '9700006'})
        assert 'FROM fact_voyage WHERE imo_number = ?' in sql
        for col in (
            'from_port',
            'to_port',
            'distance_nm',
            'sea_days',
            'avg_speed_kn',
            'fuel_cost_usd',
            'usd_per_nm',
            'on_time_flag',
            'planned_eta',
        ):
            assert col in sql
        assert sql.rstrip().endswith('ORDER BY depart_date')
        assert binds == ['9700006']

    def test_vessel_voyages_missing_imo_raises(self):
        with pytest.raises(BadRequestError):
            render('vessel_voyages', {})

    def test_vessel_speed_profile(self):
        sql, binds = render('vessel_speed_profile', {'imo_number': '9700006'})
        assert 'FROM fact_speed_profile WHERE imo_number = ?' in sql
        # convex usd/nm curve + fuel decomposition + vessel-level current/economical speed.
        for col in (
            'speed_kn',
            'usd_per_nm',
            'fuel_usd_per_nm',
            'recommended_speed_kn',
            'current_speed_kn',
            'annual_distance_nm',
        ):
            assert col in sql
        assert sql.rstrip().endswith('ORDER BY speed_kn')
        assert binds == ['9700006']

    def test_vessel_speed_profile_missing_imo_raises(self):
        with pytest.raises(BadRequestError):
            render('vessel_speed_profile', {})

    def test_vessel_speed_profile_extra_param_rejected(self):
        with pytest.raises(BadRequestError):
            render('vessel_speed_profile', {'imo_number': '9700006', 'evil': "'; DROP TABLE x --"})

    def test_fleet_positions_latest_row_per_vessel(self):
        sql, binds = render('fleet_positions', {})
        assert 'FROM fact_performance_daily' in sql
        # first window query: newest row per imo (report_date DESC → chronological).
        assert 'row_number() OVER (PARTITION BY imo_number ORDER BY report_date DESC)' in sql
        assert 'WHERE rn = 1' in sql
        for col in ('imo_number', 'latitude', 'longitude', 'speed_loss_pct', 'cii_rating_aer'):
            assert col in sql
        assert sql.rstrip().endswith('ORDER BY imo_number')
        assert binds == []

    def test_fleet_positions_extra_param_rejected(self):
        with pytest.raises(BadRequestError):
            render('fleet_positions', {'imo_number': '9700006'})

    def test_new_query_types_registered(self):
        from queries import QUERY_TYPES

        assert {
            'vessel_track',
            'vessel_voyages',
            'vessel_speed_profile',
            'fleet_positions',
            'fleet_maintenance_recommendation',
        } <= set(QUERY_TYPES)

    def test_unknown_query_type_raises(self):
        with pytest.raises(BadRequestError):
            render('vessel_report', {})

    def test_missing_imo_raises(self):
        with pytest.raises(BadRequestError):
            render('vessel_recommendation', {})

    def test_bad_imo_number_raises(self):
        with pytest.raises(BadRequestError):
            render('vessel_recommendation', {'imo_number': '123'})

    def test_bad_date_raises(self):
        with pytest.raises(BadRequestError):
            render('vessel_speed_loss', {'imo_number': '9700006', 'start_date': '2026/01/01'})

    def test_extra_param_rejected(self):
        with pytest.raises(BadRequestError):
            render('vessel_recommendation', {'imo_number': '9700006', 'evil': "'; DROP TABLE x --"})


class TestRealDataRender:
    """v2 real-dataset catalog over vt_fd / maintenance (old type names, ship_id + day axis)."""

    @staticmethod
    def _render(query_type, params):
        from queries import QUERY_TYPES_V2

        return render(query_type, params, QUERY_TYPES_V2)

    def test_fleet_vessels_roster(self):
        sql, binds = self._render('fleet_vessels', {})
        assert 'FROM vt_fd' in sql
        assert 'GROUP BY ship_id' in sql
        for col in ('n_rows', 'first_day', 'last_day', 'n_predict', 'n_masked'):
            assert col in sql
        assert sql.rstrip().endswith('ORDER BY ship_id')
        assert binds == []

    def test_vessel_metrics_day_range(self):
        sql, binds = self._render('vessel_metrics', {'ship_id': 'S21', 'start_day': 100, 'end_day': 200})
        assert 'FROM vt_fd WHERE ship_id = ?' in sql
        assert 'AND noon_utc BETWEEN CAST(? AS integer) AND CAST(? AS integer)' in sql
        for col in (
            'speed_through_water',
            'me_avg_rpm',
            'horse_power',
            'me_fullspeed_consump_hshfo',
            'me_fullspeed_consump_bio_hsfo',
            'hours_full_speed',
            'masked_flag',
            'predict_fuel_type',
        ):
            assert col in sql
        assert sql.rstrip().endswith('ORDER BY noon_utc')
        assert binds == ['S21', '100', '200']

    def test_vessel_metrics_ship_only(self):
        sql, binds = self._render('vessel_metrics', {'ship_id': 'S1'})
        assert 'BETWEEN' not in sql
        assert binds == ['S1']

    def test_vessel_metrics_start_only(self):
        sql, binds = self._render('vessel_metrics', {'ship_id': 'S1', 'start_day': 50})
        assert 'AND noon_utc >= CAST(? AS integer)' in sql
        assert binds == ['S1', '50']

    def test_vessel_metrics_bad_ship_raises(self):
        for bad in ('S0', 'S13', 'S24', '9700006', 's1'):
            with pytest.raises(BadRequestError):
                self._render('vessel_metrics', {'ship_id': bad})

    def test_vessel_metrics_negative_day_raises(self):
        with pytest.raises(BadRequestError):
            self._render('vessel_metrics', {'ship_id': 'S1', 'start_day': -1})

    def test_vessel_maintenance_effect(self):
        sql, binds = self._render('vessel_maintenance_effect', {'ship_id': 'S3'})
        assert 'FROM maintenance WHERE ship_id = ?' in sql
        for col in ('event_day', 'event_type', 'propeller_condition', 'hull_fouling_type', 'cavitation_found'):
            assert col in sql
        assert sql.rstrip().endswith('ORDER BY event_day')
        assert binds == ['S3']

    def test_predict_targets_all_ships(self):
        sql, binds = self._render('predict_targets', {})
        assert 'FROM vt_fd WHERE predict_fuel_type IS NOT NULL' in sql
        assert sql.rstrip().endswith('ORDER BY ship_id, noon_utc')
        assert binds == []

    def test_predict_targets_one_ship(self):
        sql, binds = self._render('predict_targets', {'ship_id': 'S22'})
        assert 'predict_fuel_type IS NOT NULL AND ship_id = ?' in sql
        assert binds == ['S22']

    def test_vessel_speed_power(self):
        sql, binds = self._render('vessel_speed_power', {'ship_id': 'S9'})
        assert 'FROM vt_fd WHERE ship_id = ?' in sql
        assert 'horse_power IS NOT NULL' in sql
        assert 'speed_through_water IS NOT NULL' in sql
        assert binds == ['S9']

    def test_fleet_overview_day_aggregate(self):
        sql, binds = self._render('fleet_overview', {'start_day': 0, 'end_day': 30})
        assert 'FROM vt_fd' in sql
        assert 'GROUP BY noon_utc' in sql
        assert 'WHERE noon_utc BETWEEN CAST(? AS integer) AND CAST(? AS integer)' in sql
        assert sql.rstrip().endswith('ORDER BY noon_utc')
        assert binds == ['0', '30']

    def test_v2_registry_names(self):
        from queries import QUERY_TYPES, QUERY_TYPES_V2

        assert set(QUERY_TYPES_V2) == {
            'fleet_overview',
            'fleet_vessels',
            'vessel_metrics',
            'vessel_speed_power',
            'vessel_maintenance_effect',
            'predict_targets',
        }
        # v1 registry carries only the 18 legacy synthetic types.
        assert len(QUERY_TYPES) == 18
        assert 'predict_targets' not in QUERY_TYPES

    def test_v2_unknown_type_lists_v2_names(self):
        with pytest.raises(BadRequestError):
            self._render('ship_daily', {'ship_id': 'S1'})

    def test_v1_render_does_not_know_v2_semantics(self):
        # Same name, different registry: v1 fleet_overview rejects day params.
        with pytest.raises(BadRequestError):
            render('fleet_overview', {'start_day': 0})
