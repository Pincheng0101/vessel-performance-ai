from aws_cdk import (
    Aws,
    BundlingOptions,
    CfnOutput,
    DockerImage,
    Stack,
    aws_bedrockagentcore,
    aws_cognito,
    aws_iam,
    aws_s3_assets,
)
from constructs import Construct
from pyhocon import ConfigTree


class YmGenbiAgentRuntimeStack(Stack):
    """The Bedrock AgentCore GenBI runtime (direct code deploy): the `agentcore/`
    sources + linux/arm64 deps are bundled into a zip asset — no container
    registry involved — plus the execution role (Bedrock invoke + the same
    Athena/Glue/S3 query surface as the data-lake stack's Lambdas).

    JWT auth comes from `YmGenbiAgentAuthStack` (user pool + M2M client passed in).

    Updating the agent = edit `agentcore/agent.py` / `skill.md` and `cdk deploy`
    this stack — the asset hash change rolls the runtime with no interruption and
    never touches the auth stack.
    """

    def __init__(
        self,
        scope: Construct,
        construct_id: str,
        conf: ConfigTree,
        user_pool: aws_cognito.IUserPool,
        client: aws_cognito.IUserPoolClient,
        **kwargs,
    ) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # 1. Agent code asset — zip of agent.py + skill.md + arm64 deps, built in a
        #    Docker bundling container (AgentCore code deploy requires linux/arm64
        #    wheels inside the zip; nothing is pip-installed at runtime).
        code_asset = aws_s3_assets.Asset(
            self,
            'GenbiAgentCode',
            path='agentcore',
            exclude=['.venv', '__pycache__', '.bedrock_agentcore.yaml', 'test.html', 'frontend-example.js'],
            bundling=BundlingOptions(
                image=DockerImage.from_registry('python:3.13-slim'),
                platform='linux/arm64',
                command=[
                    'bash',
                    '-c',
                    'pip install -q -r requirements.txt -t /asset-output && cp agent.py skill.md /asset-output/',
                ],
            ),
        )

        # 2. Execution role — assumed by the AgentCore service (scoped to this
        #    account's runtimes). Grants: observability, Bedrock model invocation,
        #    AgentCore workload identity, and the Athena/Glue/S3 query surface.
        athena_conf = conf.get_config('app.athena')
        database = athena_conf.get_string('database')
        workgroup = athena_conf.get_string('workgroup_name')
        datalake_bucket = conf.get_string('app.datalake.bucket_name', '')

        role = aws_iam.Role(
            self,
            'GenbiRuntimeRole',
            assumed_by=aws_iam.ServicePrincipal(
                'bedrock-agentcore.amazonaws.com',
                conditions={
                    'StringEquals': {'aws:SourceAccount': Aws.ACCOUNT_ID},
                    'ArnLike': {'aws:SourceArn': f'arn:aws:bedrock-agentcore:{Aws.REGION}:{Aws.ACCOUNT_ID}:*'},
                },
            ),
            description='Execution role for the ym_genbi_agent AgentCore runtime.',
        )
        code_asset.grant_read(role)
        role.add_to_policy(
            aws_iam.PolicyStatement(
                sid='Observability',
                actions=[
                    'logs:CreateLogGroup',
                    'logs:CreateLogStream',
                    'logs:PutLogEvents',
                    'logs:DescribeLogStreams',
                    'logs:DescribeLogGroups',
                    'xray:PutTraceSegments',
                    'xray:PutTelemetryRecords',
                    'xray:GetSamplingRules',
                    'xray:GetSamplingTargets',
                    'cloudwatch:PutMetricData',
                ],
                resources=['*'],
            )
        )
        role.add_to_policy(
            aws_iam.PolicyStatement(
                sid='BedrockModelInvocation',
                actions=['bedrock:InvokeModel', 'bedrock:InvokeModelWithResponseStream'],
                resources=['arn:aws:bedrock:*::foundation-model/*', 'arn:aws:bedrock:*:*:inference-profile/*'],
            )
        )
        role.add_to_policy(
            aws_iam.PolicyStatement(
                sid='AgentCoreWorkloadIdentity',
                actions=[
                    'bedrock-agentcore:CreateWorkloadIdentity',
                    'bedrock-agentcore:GetWorkloadAccessToken',
                    'bedrock-agentcore:GetWorkloadAccessTokenForJWT',
                    'bedrock-agentcore:GetWorkloadAccessTokenForUserId',
                ],
                resources=[
                    f'arn:aws:bedrock-agentcore:{Aws.REGION}:{Aws.ACCOUNT_ID}:workload-identity-directory/default',
                    f'arn:aws:bedrock-agentcore:{Aws.REGION}:{Aws.ACCOUNT_ID}:workload-identity-directory/default/workload-identity/*',
                ],
            )
        )
        role.add_to_policy(
            aws_iam.PolicyStatement(
                sid='AthenaQuery',
                actions=[
                    'athena:StartQueryExecution',
                    'athena:GetQueryExecution',
                    'athena:GetQueryResults',
                    'athena:StopQueryExecution',
                    'athena:GetWorkGroup',
                ],
                resources=[f'arn:aws:athena:{Aws.REGION}:{Aws.ACCOUNT_ID}:workgroup/{workgroup}'],
            )
        )
        role.add_to_policy(
            aws_iam.PolicyStatement(
                sid='GlueCatalogRead',
                actions=[
                    'glue:GetDatabase',
                    'glue:GetDatabases',
                    'glue:GetTable',
                    'glue:GetTables',
                    'glue:GetPartition',
                    'glue:GetPartitions',
                    'glue:BatchGetPartition',
                ],
                resources=[
                    f'arn:aws:glue:{Aws.REGION}:{Aws.ACCOUNT_ID}:catalog',
                    f'arn:aws:glue:{Aws.REGION}:{Aws.ACCOUNT_ID}:database/{database}',
                    f'arn:aws:glue:{Aws.REGION}:{Aws.ACCOUNT_ID}:table/{database}/*',
                ],
            )
        )
        if datalake_bucket:
            role.add_to_policy(
                aws_iam.PolicyStatement(
                    sid='DataLakeRead',
                    actions=['s3:GetObject', 's3:ListBucket', 's3:GetBucketLocation'],
                    resources=[f'arn:aws:s3:::{datalake_bucket}', f'arn:aws:s3:::{datalake_bucket}/*'],
                )
            )
        role.add_to_policy(
            aws_iam.PolicyStatement(
                sid='AthenaResultsReadWrite',
                actions=[
                    's3:GetObject',
                    's3:PutObject',
                    's3:ListBucket',
                    's3:GetBucketLocation',
                    's3:AbortMultipartUpload',
                    's3:ListMultipartUploadParts',
                ],
                resources=[
                    'arn:aws:s3:::ymhackathonathenatoolstac-athenaresultsbucket*',
                    'arn:aws:s3:::ymhackathonathenatoolstac-athenaresultsbucket*/*',
                ],
            )
        )

        # 3. The runtime — direct code deploy, HTTP protocol, public egress, and the
        #    Cognito M2M client as the only allowed JWT client.
        runtime = aws_bedrockagentcore.CfnRuntime(
            self,
            'GenbiRuntime',
            agent_runtime_name='ym_genbi_agent',
            description='YangMing vessel-performance GenBI agent (text-to-SQL over the ym_hackathon Athena lake).',
            agent_runtime_artifact=aws_bedrockagentcore.CfnRuntime.AgentRuntimeArtifactProperty(
                code_configuration=aws_bedrockagentcore.CfnRuntime.CodeConfigurationProperty(
                    code=aws_bedrockagentcore.CfnRuntime.CodeProperty(
                        s3=aws_bedrockagentcore.CfnRuntime.S3LocationProperty(
                            bucket=code_asset.s3_bucket_name,
                            prefix=code_asset.s3_object_key,
                        )
                    ),
                    entry_point=['agent.py'],
                    runtime='PYTHON_3_13',
                )
            ),
            role_arn=role.role_arn,
            network_configuration=aws_bedrockagentcore.CfnRuntime.NetworkConfigurationProperty(network_mode='PUBLIC'),
            protocol_configuration='HTTP',
            authorizer_configuration=aws_bedrockagentcore.CfnRuntime.AuthorizerConfigurationProperty(
                custom_jwt_authorizer=aws_bedrockagentcore.CfnRuntime.CustomJWTAuthorizerConfigurationProperty(
                    discovery_url=f'https://cognito-idp.{Aws.REGION}.amazonaws.com/{user_pool.user_pool_id}/.well-known/openid-configuration',
                    allowed_clients=[client.user_pool_client_id],
                )
            ),
            environment_variables={
                'ATHENA_DATABASE': database,
                'ATHENA_WORKGROUP': workgroup,
            },
        )

        CfnOutput(self, 'RuntimeArn', value=runtime.attr_agent_runtime_arn)
        CfnOutput(self, 'RuntimeId', value=runtime.attr_agent_runtime_id)
