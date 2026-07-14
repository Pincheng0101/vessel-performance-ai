import json

from aws_cdk import (
    BundlingOptions,
    CfnOutput,
    Duration,
    RemovalPolicy,
    Stack,
    aws_apigateway,
    aws_athena,
    aws_dynamodb,
    aws_glue,
    aws_iam,
    aws_lambda,
    aws_s3,
    aws_ssm,
)
from constructs import Construct
from pyhocon import ConfigTree

from ym_datalake.synthetic_data.fleet import IMO_NUMBERS

SSM_PREFIX = '/ym-datalake-poc'

# Raw-zone table schemas: (column_name, glue_type). Column names match the JSONL
# keys emitted by ym_datalake.synthetic_data (openx JsonSerDe maps by name).
_VESSEL_MASTER_COLUMNS = [
    ('imo_number', 'string'),
    ('vessel_name', 'string'),
    ('vessel_type', 'string'),
    ('fleet_id', 'string'),
    ('fleet_name', 'string'),
    ('build_year', 'int'),
    ('lpp_m', 'double'),
    ('breadth_m', 'double'),
    ('design_draft_m', 'double'),
    ('dwt', 'double'),
    ('gross_tonnage', 'double'),
    ('mcr_kw', 'double'),
    ('ncr_kw', 'double'),
    ('design_speed_kn', 'double'),
    ('propeller_type', 'string'),
    ('diameter_m', 'double'),
    ('pitch_m', 'double'),
    ('n_blades', 'int'),
    ('transverse_area_m2', 'double'),
    ('ref_curve_id', 'string'),
    ('last_dry_dock_date', 'string'),
]

_REFERENCE_CURVE_COLUMNS = [
    ('ref_curve_id', 'string'),
    ('imo_number', 'string'),
    ('speed_kn', 'double'),
    ('shaft_power_kw', 'double'),
    ('displacement_ref_mt', 'double'),
]

_UWI_COLUMNS = [
    ('inspection_id', 'string'),
    ('imo_number', 'string'),
    ('inspection_date', 'string'),
    ('inspection_type', 'string'),
    ('hull_fouling_rating', 'int'),
    ('hull_fouling_coverage_pct', 'double'),
    ('propeller_condition', 'string'),
    ('propeller_roughness_um', 'double'),
    ('coating_breakdown_pct', 'double'),
    ('coating_condition', 'string'),
    ('recommended_action', 'string'),
]

_MAINTENANCE_EVENT_COLUMNS = [
    ('event_id', 'string'),
    ('imo_number', 'string'),
    ('event_date', 'string'),
    ('event_type', 'string'),
    ('cost_usd', 'double'),
    ('downtime_hours', 'double'),
    ('location', 'string'),
]

_FUEL_PRICE_COLUMNS = [
    ('date', 'string'),
    ('fuel_type', 'string'),
    ('price_usd_per_mt', 'double'),
]

# noon_report body columns — imo_number and year are partition keys (projection),
# so they are omitted here (the redundant body imo_number key is ignored).
_NOON_REPORT_COLUMNS = [
    ('report_id', 'string'),
    ('vessel_name', 'string'),
    ('report_datetime_utc', 'string'),
    ('voyage_no', 'string'),
    ('leg', 'string'),
    ('port_from', 'string'),
    ('port_to', 'string'),
    ('voyage_phase', 'string'),
    ('latitude', 'double'),
    ('longitude', 'double'),
    ('heading_deg', 'double'),
    ('steaming_hours', 'double'),
    ('distance_og_nm', 'double'),
    ('distance_tw_nm', 'double'),
    ('speed_og_kn', 'double'),
    ('speed_tw_kn', 'double'),
    ('me_rpm', 'double'),
    ('me_shaft_power_kw', 'double'),
    ('me_foc_mt', 'double'),
    ('propeller_pitch_m', 'double'),
    ('fuel_type', 'string'),
    ('fuel_lcv_mj_kg', 'double'),
    ('ae_foc_mt', 'double'),
    ('boiler_foc_mt', 'double'),
    ('total_foc_mt', 'double'),
    ('draft_fore_m', 'double'),
    ('draft_aft_m', 'double'),
    ('mean_draft_m', 'double'),
    ('trim_m', 'double'),
    ('displacement_mt', 'double'),
    ('cargo_weight_mt', 'double'),
    ('condition_flag', 'string'),
    ('wind_speed_kn', 'double'),
    ('wind_dir_deg', 'double'),
    ('beaufort', 'int'),
    ('wave_height_m', 'double'),
    ('wave_dir_deg', 'double'),
    ('wave_period_s', 'double'),
    ('swell_height_m', 'double'),
    ('swell_dir_deg', 'double'),
    ('sea_water_temp_c', 'double'),
    ('air_temp_c', 'double'),
    ('air_pressure_hpa', 'double'),
    ('current_speed_kn', 'double'),
    ('current_dir_deg', 'double'),
    ('sea_water_density_kg_m3', 'double'),
    ('data_source', 'string'),
]

# --- Curated-zone table schemas (M2 ETL output) --------------------------
# imo_number / year / month are partition keys (projection), so they are omitted
# from the body column lists below (the redundant body keys are ignored).
_FACT_PERFORMANCE_DAILY_COLUMNS = [
    ('report_date', 'string'),
    ('vessel_name', 'string'),
    ('voyage_phase', 'string'),
    ('condition_flag', 'string'),
    ('latitude', 'double'),
    ('longitude', 'double'),
    ('port_from', 'string'),
    ('port_to', 'string'),
    ('voyage_no', 'string'),
    ('co2_mt', 'double'),
    ('days_since_cleaning', 'int'),
    ('days_since_dry_dock', 'int'),
    ('days_since_in_water', 'int'),
    ('resistance_wind_kn', 'double'),
    ('resistance_wave_kn', 'double'),
    ('power_corrected_kw', 'double'),
    ('speed_corrected_kn', 'double'),
    ('v_expected_kn', 'double'),
    ('speed_loss_pct', 'double'),
    ('slip_apparent', 'double'),
    ('slip_real', 'double'),
    ('sfoc_g_kwh', 'double'),
    ('admiralty_coef', 'double'),
    ('eeoi', 'double'),
    ('excess_foc_mt', 'double'),
    ('excess_cost_usd', 'double'),
    ('cum_excess_cost_usd', 'double'),
    ('excess_cost_fouling_usd', 'double'),
    ('excess_cost_weather_usd', 'double'),
    ('excess_cost_operational_usd', 'double'),
    ('cii_aer', 'double'),
    ('cii_rating_aer', 'string'),
    ('cii_imo', 'double'),
    ('cii_rating_imo', 'string'),
    ('anomaly_flag', 'boolean'),
    ('anomaly_cause', 'string'),
    ('anomaly_severity', 'string'),
    ('valid_flag', 'boolean'),
]

_FACT_PERFORMANCE_INDICATOR_COLUMNS = [
    ('indicator', 'string'),
    ('period_start', 'string'),
    ('period_end', 'string'),
    ('event_type', 'string'),
    ('event_date', 'string'),
    ('value', 'double'),
    ('reference_value', 'double'),
    ('detail', 'string'),
]

_FACT_UWI_COLUMNS = [
    ('inspection_id', 'string'),
    ('inspection_date', 'string'),
    ('inspection_type', 'string'),
    ('hull_fouling_rating', 'int'),
    ('hull_fouling_coverage_pct', 'double'),
    ('propeller_condition', 'string'),
    ('propeller_roughness_um', 'double'),
    ('coating_breakdown_pct', 'double'),
    ('coating_condition', 'string'),
    ('recommended_action', 'string'),
]

_FACT_MAINTENANCE_EVENT_COLUMNS = [
    ('event_id', 'string'),
    ('event_date', 'string'),
    ('event_type', 'string'),
    ('cost_usd', 'double'),
    ('downtime_hours', 'double'),
    ('location', 'string'),
    ('me_recovery_pct', 'double'),
    ('payback_days', 'double'),
]

_AGG_FLEET_DAILY_COLUMNS = [
    ('fleet_id', 'string'),
    ('report_date', 'string'),
    ('year', 'int'),
    ('month', 'int'),
    ('n_vessels', 'int'),
    ('avg_speed_loss_pct', 'double'),
    ('total_excess_cost_usd', 'double'),
    ('cii_count_a', 'int'),
    ('cii_count_b', 'int'),
    ('cii_count_c', 'int'),
    ('cii_count_d', 'int'),
    ('cii_count_e', 'int'),
    ('n_alerts', 'int'),
]

# imo_number / year / month are partition keys (projection), so they are omitted.
_FACT_ANOMALY_COLUMNS = [
    ('report_date', 'string'),
    ('metric', 'string'),
    ('value', 'double'),
    ('z_score', 'double'),
    ('severity', 'string'),
    ('cause', 'string'),
]

# imo_number is the partition key (projection), so it is omitted here. Early-warning
# alert episodes promoted over fact_anomaly + fact_recommendation (M3, alerts.py).
_FACT_ALERT_COLUMNS = [
    ('alert_id', 'string'),
    ('fleet_id', 'string'),
    ('opened_date', 'string'),
    ('last_seen_date', 'string'),
    ('cause', 'string'),
    ('severity', 'string'),
    ('driver_metric', 'string'),
    ('peak_value', 'double'),
    ('peak_z', 'double'),
    ('excess_cost_usd', 'double'),
    ('recommended_action', 'string'),
    ('status', 'string'),
    ('source', 'string'),
    ('message_zh', 'string'),
    ('message_en', 'string'),
]

_FACT_RECOMMENDATION_COLUMNS = [
    ('imo_number', 'string'),
    ('last_cleaning_date', 'string'),
    ('recommended_clean_date', 'string'),
    ('trigger_eta', 'string'),
    ('t_star_days', 'double'),
    ('fouling_rate_pct_per_day', 'double'),
    ('net_saving_usd', 'double'),
    ('status', 'string'),
]

_FACT_MAINTENANCE_RECOMMENDATION_COLUMNS = [
    ('imo_number', 'string'),
    ('action_type', 'string'),
    ('priority', 'string'),
    ('due_date', 'string'),
    ('rationale', 'string'),
    ('source', 'string'),
    # Per-action analytics (parity with fact_recommendation); nullable.
    ('degradation_rate', 'double'),
    ('degradation_unit', 'string'),
    ('current_value', 'double'),
    ('threshold_value', 'double'),
    ('trigger_eta', 'string'),
    ('t_star_days', 'double'),
    ('net_saving_usd', 'double'),
    # Consolidated planner: the service window this action is batched into.
    ('plan_date', 'string'),
    ('plan_service_type', 'string'),
]

_DIM_PORT_COLUMNS = [
    ('locode', 'string'),
    ('name', 'string'),
    ('lat', 'double'),
    ('lon', 'double'),
    ('is_eu', 'boolean'),
]

# imo_number is the partition key (projection), so it is omitted here. Grain is
# (imo, voyage_no) — one rotation leg incl. its in-port day, with per-voyage economics.
_FACT_VOYAGE_COLUMNS = [
    ('voyage_no', 'string'),
    ('vessel_name', 'string'),
    ('from_port', 'string'),
    ('to_port', 'string'),
    ('depart_date', 'string'),
    ('arrive_date', 'string'),
    ('distance_nm', 'double'),
    ('sea_days', 'int'),
    ('avg_speed_kn', 'double'),
    ('total_foc_mt', 'double'),
    ('fuel_cost_usd', 'double'),
    ('co2_mt', 'double'),
    ('avg_speed_loss_pct', 'double'),
    ('usd_per_nm', 'double'),
    ('on_time_flag', 'boolean'),
    ('planned_eta', 'string'),
]

# imo_number is the partition key (projection), so it is omitted here. Grain is
# (imo, speed_kn) — one speed-grid point per vessel, with the convex usd/nm curve,
# fuel decomposition, and the vessel-level current/economical speed repeated per row.
_FACT_SPEED_PROFILE_COLUMNS = [
    ('speed_kn', 'double'),
    ('shaft_power_kw', 'double'),
    ('foc_mt_per_day', 'double'),
    ('co2_mt_per_day', 'double'),
    ('fuel_usd_per_day', 'double'),
    ('charter_usd_per_day', 'double'),
    ('usd_per_day', 'double'),
    ('usd_per_nm', 'double'),
    ('fuel_usd_per_nm', 'double'),
    ('vessel_name', 'string'),
    ('recommended_speed_kn', 'double'),
    ('current_speed_kn', 'double'),
    ('annual_distance_nm', 'double'),
]

_JSON_SERDE = 'org.openx.data.jsonserde.JsonSerDe'
_TEXT_INPUT_FORMAT = 'org.apache.hadoop.mapred.TextInputFormat'
_HIVE_OUTPUT_FORMAT = 'org.apache.hadoop.hive.ql.io.HiveIgnoreKeyTextOutputFormat'


def _columns(pairs: list[tuple[str, str]]) -> list[aws_glue.CfnTable.ColumnProperty]:
    return [aws_glue.CfnTable.ColumnProperty(name=name, type=col_type) for name, col_type in pairs]


class AthenaToolStack(Stack):
    def __init__(self, scope: Construct, construct_id: str, conf: ConfigTree, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        athena_conf = conf['app']['athena']
        api_conf = conf['app'].get('api', ConfigTree())
        rate = api_conf.get('throttle_rate_limit', 200)
        burst = api_conf.get('throttle_burst_limit', 400)
        database = athena_conf.get('database', '')
        catalog = athena_conf.get('catalog', 'AwsDataCatalog')
        workgroup_name = athena_conf.get('workgroup_name', 'ym-datalake-poc')
        # Source buckets Athena reads FROM. Deploy-specific — fill in conf/<env>.conf.
        source_bucket_arns = list(athena_conf.get('source_bucket_arns', []))

        # 1. Results bucket — Athena writes query output here (POC: auto-cleaned).
        results_bucket = aws_s3.Bucket(
            self,
            'AthenaResultsBucket',
            block_public_access=aws_s3.BlockPublicAccess.BLOCK_ALL,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
            lifecycle_rules=[
                aws_s3.LifecycleRule(prefix='results/', expiration=Duration.days(7)),
            ],
        )

        # 2. WorkGroup — enforces the output location so the Lambda only passes a name.
        workgroup = aws_athena.CfnWorkGroup(
            self,
            'AthenaWorkGroup',
            name=workgroup_name,
            recursive_delete_option=True,
            work_group_configuration=aws_athena.CfnWorkGroup.WorkGroupConfigurationProperty(
                enforce_work_group_configuration=True,
                result_configuration=aws_athena.CfnWorkGroup.ResultConfigurationProperty(
                    output_location=f's3://{results_bucket.bucket_name}/results/',
                ),
            ),
        )

        # 3. Lambda — router.lambda_handler dispatches to the Athena query handler.
        fn = aws_lambda.Function(
            self,
            'AthenaQueryFunction',
            runtime=aws_lambda.Runtime.PYTHON_3_13,
            architecture=aws_lambda.Architecture.ARM_64,
            code=aws_lambda.Code.from_asset(
                'lambda_function/athena_query',
                bundling=BundlingOptions(
                    image=aws_lambda.Runtime.PYTHON_3_13.bundling_image,
                    platform='linux/arm64',
                    command=[
                        'bash',
                        '-c',
                        'pip install -r requirements.txt -t /asset-output && cp -r . /asset-output',
                    ],
                ),
            ),
            handler='router.lambda_handler',
            memory_size=512,
            # Athena polling can exceed the default 30s for larger queries.
            timeout=Duration.seconds(300),
            environment={'SSM_PREFIX': SSM_PREFIX},
        )

        # 4. Runtime config — non-secret Athena settings the Lambda reads at invoke time.
        aws_ssm.StringParameter(
            self,
            'AthenaConfigParameter',
            parameter_name=f'{SSM_PREFIX}/athena-config',
            string_value=json.dumps({'database': database, 'catalog': catalog, 'workgroup': workgroup_name}),
        )

        # 5. IAM.
        workgroup_arn = f'arn:aws:athena:{self.region}:{self.account}:workgroup/{workgroup_name}'
        fn.add_to_role_policy(
            aws_iam.PolicyStatement(
                actions=['athena:StartQueryExecution', 'athena:StopQueryExecution', 'athena:GetWorkGroup'],
                resources=[workgroup_arn],
            )
        )
        fn.add_to_role_policy(
            aws_iam.PolicyStatement(
                # GetQueryExecution/GetQueryResults are not workgroup-scoped by IAM.
                actions=['athena:GetQueryExecution', 'athena:GetQueryResults'],
                resources=['*'],
            )
        )

        # Glue Data Catalog — Athena resolves table/partition metadata here.
        # Scoped to the configured catalog/database; '*' for tables/partitions under it.
        glue_resources = [
            f'arn:aws:glue:{self.region}:{self.account}:catalog',
        ]
        if database:
            glue_resources.extend(
                [
                    f'arn:aws:glue:{self.region}:{self.account}:database/{database}',
                    f'arn:aws:glue:{self.region}:{self.account}:table/{database}/*',
                ]
            )
        else:
            # Template default: no database configured yet. Widen so synth/deploy works;
            # narrow to the specific database once conf/<env>.conf is filled in.
            glue_resources = ['*']
        fn.add_to_role_policy(
            aws_iam.PolicyStatement(
                actions=[
                    'glue:GetCatalog',
                    'glue:GetDatabase',
                    'glue:GetDatabases',
                    'glue:GetTable',
                    'glue:GetTables',
                    'glue:GetPartition',
                    'glue:GetPartitions',
                ],
                resources=glue_resources,
            )
        )

        # Results bucket — Athena writes output; Lambda reads results back.
        results_bucket.grant_read_write(fn)

        # Source data — Athena reads the underlying data using the caller's IAM.
        # Deploy-specific: fill conf.app.athena.source_bucket_arns in conf/<env>.conf.
        if source_bucket_arns:
            fn.add_to_role_policy(
                aws_iam.PolicyStatement(
                    actions=['s3:GetObject', 's3:ListBucket', 's3:GetBucketLocation'],
                    resources=[arn for b in source_bucket_arns for arn in (b, f'{b}/*')],
                )
            )

        # SSM — read the runtime config parameter.
        fn.add_to_role_policy(
            aws_iam.PolicyStatement(
                actions=['ssm:GetParameter'],
                resources=[f'arn:aws:ssm:{self.region}:{self.account}:parameter{SSM_PREFIX}/athena-config'],
            )
        )

        # Ensure the workgroup exists before the function that depends on it.
        fn.node.add_dependency(workgroup)

        # 6. Data lake — raw-zone bucket + Glue database + external tables.
        data_bucket = aws_s3.Bucket(
            self,
            'DataLakeBucket',
            block_public_access=aws_s3.BlockPublicAccess.BLOCK_ALL,
            removal_policy=RemovalPolicy.DESTROY,
            auto_delete_objects=True,
        )
        # Athena reads the raw data using the Lambda's IAM (source data grant).
        data_bucket.grant_read(fn)

        # Glue DB + tables need a database name; skip them if unconfigured
        # (the bucket still deploys, and the Lambda IAM stays widened above).
        glue_db = None
        if database:
            glue_db = aws_glue.CfnDatabase(
                self,
                'GlueDatabase',
                catalog_id=self.account,
                database_input=aws_glue.CfnDatabase.DatabaseInputProperty(name=database),
            )
            fn.node.add_dependency(glue_db)

            raw = f's3://{data_bucket.bucket_name}/raw'
            curated = f's3://{data_bucket.bucket_name}/curated'
            bucket_name = data_bucket.bucket_name
            tables = [
                # Raw zone (M1).
                self._glue_table(database, 'vessel_master', _VESSEL_MASTER_COLUMNS, f'{raw}/vessel_master/'),
                self._glue_table(database, 'reference_curve', _REFERENCE_CURVE_COLUMNS, f'{raw}/reference_curve/'),
                self._glue_table(database, 'uwi', _UWI_COLUMNS, f'{raw}/uwi/'),
                self._glue_table(
                    database, 'maintenance_event', _MAINTENANCE_EVENT_COLUMNS, f'{raw}/maintenance_event/'
                ),
                self._glue_table(database, 'fuel_price', _FUEL_PRICE_COLUMNS, f'{raw}/fuel_price/'),
                self._noon_report_table(database, bucket_name),
                # Curated zone (M2) — flat dimensions + fleet aggregate.
                self._glue_table(database, 'dim_vessel', _VESSEL_MASTER_COLUMNS, f'{curated}/dim_vessel/'),
                self._glue_table(
                    database, 'dim_reference_curve', _REFERENCE_CURVE_COLUMNS, f'{curated}/dim_reference_curve/'
                ),
                self._glue_table(database, 'dim_port', _DIM_PORT_COLUMNS, f'{curated}/dim_port/'),
                self._glue_table(database, 'agg_fleet_daily', _AGG_FLEET_DAILY_COLUMNS, f'{curated}/agg_fleet_daily/'),
                self._glue_table(
                    database, 'fact_recommendation', _FACT_RECOMMENDATION_COLUMNS, f'{curated}/fact_recommendation/'
                ),
                self._glue_table(
                    database,
                    'fact_maintenance_recommendation',
                    _FACT_MAINTENANCE_RECOMMENDATION_COLUMNS,
                    f'{curated}/fact_maintenance_recommendation/',
                ),
                # Curated zone (M2) — partitioned fact tables.
                self._fact_performance_daily_table(database, bucket_name),
                self._curated_by_imo_table(
                    database, 'fact_performance_indicator', _FACT_PERFORMANCE_INDICATOR_COLUMNS, bucket_name
                ),
                self._curated_by_imo_table(database, 'fact_uwi', _FACT_UWI_COLUMNS, bucket_name),
                self._curated_by_imo_table(
                    database, 'fact_maintenance_event', _FACT_MAINTENANCE_EVENT_COLUMNS, bucket_name
                ),
                # Curated zone (M3) — statistical insight fact tables.
                self._curated_by_imo_table(database, 'fact_anomaly', _FACT_ANOMALY_COLUMNS, bucket_name),
                self._curated_by_imo_table(database, 'fact_alert', _FACT_ALERT_COLUMNS, bucket_name),
                # Phase 1 — per-voyage economics (imo projection).
                self._curated_by_imo_table(database, 'fact_voyage', _FACT_VOYAGE_COLUMNS, bucket_name),
                # Phase 2 — bunker/slow-steaming optimizer speed profile (imo projection).
                self._curated_by_imo_table(database, 'fact_speed_profile', _FACT_SPEED_PROFILE_COLUMNS, bucket_name),
            ]
            for table in tables:
                table.add_dependency(glue_db)

        # 7. Async query API (M5) — DynamoDB registry + Lambda + API Gateway.
        # DynamoDB query registry: query_id → exec_id/type/status, TTL auto-cleans.
        registry_table = aws_dynamodb.Table(
            self,
            'QueryRegistryTable',
            partition_key=aws_dynamodb.Attribute(name='query_id', type=aws_dynamodb.AttributeType.STRING),
            billing_mode=aws_dynamodb.BillingMode.PAY_PER_REQUEST,
            time_to_live_attribute='ttl',
            removal_policy=RemovalPolicy.DESTROY,
        )

        # Async Lambda — Powertools REST resolver; each call does a single Athena/DynamoDB
        # round-trip (no in-Lambda polling), so 30s is ample.
        async_fn = aws_lambda.Function(
            self,
            'AsyncQueryApiFunction',
            runtime=aws_lambda.Runtime.PYTHON_3_13,
            architecture=aws_lambda.Architecture.ARM_64,
            code=aws_lambda.Code.from_asset(
                'lambda_function/async_query_api',
                bundling=BundlingOptions(
                    image=aws_lambda.Runtime.PYTHON_3_13.bundling_image,
                    platform='linux/arm64',
                    command=[
                        'bash',
                        '-c',
                        'pip install -r requirements.txt -t /asset-output && cp -r . /asset-output',
                    ],
                ),
            ),
            handler='router.lambda_handler',
            memory_size=512,
            timeout=Duration.seconds(30),
            environment={
                'SSM_PREFIX': SSM_PREFIX,
                'QUERY_TABLE': registry_table.table_name,
                'POWERTOOLS_SERVICE_NAME': 'async-query-api',
            },
        )

        # IAM — mirror the sync Lambda's Athena/Glue/SSM statements, plus S3 + DynamoDB.
        async_fn.add_to_role_policy(
            aws_iam.PolicyStatement(
                actions=['athena:StartQueryExecution', 'athena:StopQueryExecution', 'athena:GetWorkGroup'],
                resources=[workgroup_arn],
            )
        )
        async_fn.add_to_role_policy(
            aws_iam.PolicyStatement(
                actions=['athena:GetQueryExecution', 'athena:GetQueryResults'],
                resources=['*'],
            )
        )
        async_fn.add_to_role_policy(
            aws_iam.PolicyStatement(
                actions=[
                    'glue:GetCatalog',
                    'glue:GetDatabase',
                    'glue:GetDatabases',
                    'glue:GetTable',
                    'glue:GetTables',
                    'glue:GetPartition',
                    'glue:GetPartitions',
                ],
                resources=glue_resources,
            )
        )
        async_fn.add_to_role_policy(
            aws_iam.PolicyStatement(
                actions=['ssm:GetParameter'],
                resources=[f'arn:aws:ssm:{self.region}:{self.account}:parameter{SSM_PREFIX}/athena-config'],
            )
        )
        if source_bucket_arns:
            async_fn.add_to_role_policy(
                aws_iam.PolicyStatement(
                    actions=['s3:GetObject', 's3:ListBucket', 's3:GetBucketLocation'],
                    resources=[arn for b in source_bucket_arns for arn in (b, f'{b}/*')],
                )
            )
        results_bucket.grant_read_write(async_fn)
        data_bucket.grant_read(async_fn)
        registry_table.grant_read_write_data(async_fn)

        async_fn.node.add_dependency(workgroup)
        if glue_db is not None:
            async_fn.node.add_dependency(glue_db)

        # REST API — /v1/* proxied to the Lambda; x-api-key auth; CORS allow-all for the browser.
        api = aws_apigateway.RestApi(
            self,
            'AsyncQueryApi',
            deploy_options=aws_apigateway.StageOptions(stage_name='prod'),
            default_cors_preflight_options=aws_apigateway.CorsOptions(
                allow_origins=aws_apigateway.Cors.ALL_ORIGINS,
                allow_methods=['GET', 'POST', 'OPTIONS'],
                allow_headers=['x-api-key', 'content-type'],
            ),
        )
        integration = aws_apigateway.LambdaIntegration(async_fn, proxy=True)
        queries_resource = api.root.add_resource('v1').add_resource('queries')
        queries_resource.add_method('POST', integration, api_key_required=True)
        query_id_resource = queries_resource.add_resource('{query_id}')
        query_id_resource.add_method('GET', integration, api_key_required=True)
        query_id_resource.add_resource('results').add_method('GET', integration, api_key_required=True)

        # Public docs — Swagger UI + OpenAPI schema served by the Lambda. No API key so a
        # browser can open them directly; the /v1 routes above stay key-protected.
        api.root.add_resource('swagger').add_method('GET', integration, api_key_required=False)
        api.root.add_resource('openapi.json').add_method('GET', integration, api_key_required=False)

        # API key + usage plan — throttled x-api-key for the Dashboard.
        api_key = api.add_api_key('AsyncQueryApiKey')
        usage_plan = api.add_usage_plan(
            'AsyncQueryUsagePlan',
            throttle=aws_apigateway.ThrottleSettings(rate_limit=rate, burst_limit=burst),
        )
        usage_plan.add_api_stage(stage=api.deployment_stage)
        usage_plan.add_api_key(api_key)

        # 7.5 GenBI Athena role — assumed (sts:AssumeRole) by the LangForge GenBI agent's
        # athena_client connector (lfe_resource/connector/ym-datalake-aws-connector.json).
        # Same query grants as the Lambdas above, but trusts the account (the LFE
        # deployment runs in this account) instead of lambda.amazonaws.com.
        genbi_role = aws_iam.Role(
            self,
            'GenBiAthenaRole',
            role_name='ym-datalake-poc-genbi-athena',
            assumed_by=aws_iam.AccountRootPrincipal(),
            description='Assumed by the LangForge GenBI agent athena_client connector to query ym_datalake_poc.',
        )
        genbi_role.add_to_policy(
            aws_iam.PolicyStatement(
                actions=['athena:StartQueryExecution', 'athena:StopQueryExecution', 'athena:GetWorkGroup'],
                resources=[workgroup_arn],
            )
        )
        genbi_role.add_to_policy(
            aws_iam.PolicyStatement(
                actions=['athena:GetQueryExecution', 'athena:GetQueryResults'],
                resources=['*'],
            )
        )
        genbi_role.add_to_policy(
            aws_iam.PolicyStatement(
                actions=[
                    'glue:GetCatalog',
                    'glue:GetDatabase',
                    'glue:GetDatabases',
                    'glue:GetTable',
                    'glue:GetTables',
                    'glue:GetPartition',
                    'glue:GetPartitions',
                ],
                resources=glue_resources,
            )
        )
        if source_bucket_arns:
            genbi_role.add_to_policy(
                aws_iam.PolicyStatement(
                    actions=['s3:GetObject', 's3:ListBucket', 's3:GetBucketLocation'],
                    resources=[arn for b in source_bucket_arns for arn in (b, f'{b}/*')],
                )
            )
        results_bucket.grant_read_write(genbi_role)
        data_bucket.grant_read(genbi_role)

        # 8. Outputs.
        CfnOutput(self, 'AthenaQueryFunctionArn', value=fn.function_arn)
        CfnOutput(self, 'AthenaResultsBucketName', value=results_bucket.bucket_name)
        CfnOutput(self, 'DataLakeBucketName', value=data_bucket.bucket_name)
        CfnOutput(self, 'AsyncQueryApiUrl', value=api.url)
        CfnOutput(self, 'AsyncQueryApiKeyId', value=api_key.key_id)
        CfnOutput(self, 'QueryRegistryTableName', value=registry_table.table_name)
        CfnOutput(self, 'GenBiAthenaRoleName', value=genbi_role.role_name)

    def _glue_table(
        self,
        database: str,
        name: str,
        columns: list[tuple[str, str]],
        location: str,
        *,
        partition_keys: list[tuple[str, str]] | None = None,
        extra_parameters: dict[str, str] | None = None,
    ) -> aws_glue.CfnTable:
        """Create one EXTERNAL JSON-SerDe table in the Glue catalog."""
        parameters = {'classification': 'json'}
        if extra_parameters:
            parameters.update(extra_parameters)
        return aws_glue.CfnTable(
            self,
            f'GlueTable{"".join(part.capitalize() for part in name.split("_"))}',
            catalog_id=self.account,
            database_name=database,
            table_input=aws_glue.CfnTable.TableInputProperty(
                name=name,
                table_type='EXTERNAL_TABLE',
                parameters=parameters,
                partition_keys=_columns(partition_keys) if partition_keys else None,
                storage_descriptor=aws_glue.CfnTable.StorageDescriptorProperty(
                    columns=_columns(columns),
                    location=location,
                    input_format=_TEXT_INPUT_FORMAT,
                    output_format=_HIVE_OUTPUT_FORMAT,
                    serde_info=aws_glue.CfnTable.SerdeInfoProperty(
                        serialization_library=_JSON_SERDE,
                        parameters={'serialization.format': '1'},
                    ),
                ),
            ),
        )

    def _curated_by_imo_table(
        self, database: str, name: str, columns: list[tuple[str, str]], bucket_name: str
    ) -> aws_glue.CfnTable:
        """Curated fact table partitioned by imo_number via partition projection."""
        location = f's3://{bucket_name}/curated/{name}/'
        projection = {
            'projection.enabled': 'true',
            'projection.imo_number.type': 'enum',
            'projection.imo_number.values': ','.join(IMO_NUMBERS),
            'storage.location.template': f's3://{bucket_name}/curated/{name}/imo_number=${{imo_number}}',
        }
        return self._glue_table(
            database,
            name,
            columns,
            location,
            partition_keys=[('imo_number', 'string')],
            extra_parameters=projection,
        )

    def _fact_performance_daily_table(self, database: str, bucket_name: str) -> aws_glue.CfnTable:
        """fact_performance_daily partitioned by imo_number + year + month (projection)."""
        name = 'fact_performance_daily'
        location = f's3://{bucket_name}/curated/{name}/'
        projection = {
            'projection.enabled': 'true',
            'projection.imo_number.type': 'enum',
            'projection.imo_number.values': ','.join(IMO_NUMBERS),
            'projection.year.type': 'integer',
            'projection.year.range': '2021,2026',
            'projection.month.type': 'integer',
            'projection.month.range': '1,12',
            'projection.month.digits': '2',
            'storage.location.template': (
                f's3://{bucket_name}/curated/{name}/imo_number=${{imo_number}}/year=${{year}}/month=${{month}}'
            ),
        }
        return self._glue_table(
            database,
            name,
            _FACT_PERFORMANCE_DAILY_COLUMNS,
            location,
            partition_keys=[('imo_number', 'string'), ('year', 'int'), ('month', 'int')],
            extra_parameters=projection,
        )

    def _noon_report_table(self, database: str, bucket_name: str) -> aws_glue.CfnTable:
        """noon_report partitioned by imo_number + year via partition projection."""
        location = f's3://{bucket_name}/raw/noon_report/'
        projection = {
            'projection.enabled': 'true',
            'projection.imo_number.type': 'enum',
            'projection.imo_number.values': ','.join(IMO_NUMBERS),
            'projection.year.type': 'integer',
            'projection.year.range': '2021,2026',
            'storage.location.template': (
                f's3://{bucket_name}/raw/noon_report/imo_number=${{imo_number}}/year=${{year}}'
            ),
        }
        return self._glue_table(
            database,
            'noon_report',
            _NOON_REPORT_COLUMNS,
            location,
            partition_keys=[('imo_number', 'string'), ('year', 'int')],
            extra_parameters=projection,
        )
