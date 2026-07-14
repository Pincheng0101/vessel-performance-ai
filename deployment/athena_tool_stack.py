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

from table.schema import CURATED_TABLES, RAW_TABLES

SSM_PREFIX = '/ym-hackathon'

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
        workgroup_name = athena_conf.get('workgroup_name', 'ym-hackathon')
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

            # All 20 tables are FLAT and UNPARTITIONED. The whole lake is ~4 MB / 21,282
            # noon rows, far below the size where partition pruning pays for its own
            # complexity, so ship_id is an ordinary body column and each table is one
            # JSONL file. No projection, no crawler, no MSCK, no partition predicates.
            zones = {'raw': RAW_TABLES, 'curated': CURATED_TABLES}
            for zone, catalog in zones.items():
                for name, columns in catalog.items():
                    location = f's3://{data_bucket.bucket_name}/{zone}/{name}/'
                    self._glue_table(database, name, columns, location).add_dependency(glue_db)

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
        # /v1 (legacy synthetic catalog) and /v2 (real-dataset catalog) share the
        # Lambda and lifecycle; only the query_type registry differs per version.
        for version in ('v1', 'v2'):
            queries_resource = api.root.add_resource(version).add_resource('queries')
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
            role_name='ym-hackathon-genbi-athena',
            assumed_by=aws_iam.AccountRootPrincipal(),
            description='Assumed by the LangForge GenBI agent athena_client connector to query ym_hackathon.',
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

    def _glue_table(self, database: str, name: str, columns: list[tuple[str, str]], location: str) -> aws_glue.CfnTable:
        """Create one flat, unpartitioned EXTERNAL JSON-SerDe table in the Glue catalog."""
        return aws_glue.CfnTable(
            self,
            f'GlueTable{"".join(part.capitalize() for part in name.split("_"))}',
            catalog_id=self.account,
            database_name=database,
            table_input=aws_glue.CfnTable.TableInputProperty(
                name=name,
                table_type='EXTERNAL_TABLE',
                parameters={'classification': 'json'},
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
