import os

import aws_cdk
import cdk_nag
from pyhocon import ConfigFactory

from deployment.agent_auth_stack import YmGenbiAgentAuthStack
from deployment.agent_runtime_stack import YmGenbiAgentRuntimeStack
from deployment.athena_tool_stack import AthenaToolStack
from deployment.ui_stack import YmDatalakeUiStack

app = aws_cdk.App()

app_env = app.node.try_get_context('env')
if not app_env:
    raise ValueError(
        "Missing required CDK context 'env'. Pass it via `cdk ... -c env=<env>` (e.g., `cdk deploy -c env=dev`)."
    )
conf = ConfigFactory.parse_file(f'conf/{app_env}.conf')

env = aws_cdk.Environment(
    account=os.environ.get('CDK_DEPLOY_ACCOUNT', os.environ.get('CDK_DEFAULT_ACCOUNT')),
    region=os.environ.get('CDK_DEPLOY_REGION', os.environ.get('CDK_DEFAULT_REGION')),
)

project_name = conf.get_string('app.project_name')

athena_stack = AthenaToolStack(app, f'{project_name}AthenaToolStack', conf=conf, env=env)
ui_stack = YmDatalakeUiStack(app, f'{project_name}UiStack', conf=conf, env=env)
auth_stack = YmGenbiAgentAuthStack(app, f'{project_name}GenbiAgentAuthStack', conf=conf, env=env)
runtime_stack = YmGenbiAgentRuntimeStack(
    app,
    f'{project_name}GenbiAgentRuntimeStack',
    conf=conf,
    user_pool=auth_stack.user_pool,
    client=auth_stack.client,
    env=env,
)

# cdk-nag: AWS Solutions rule pack. Violations surface as synth errors/warnings.
# Real fixes are applied in the stacks (e.g. enforce_ssl on every bucket); the
# remaining findings are accepted hackathon-POC tradeoffs, suppressed here with
# reasons so the check stays a meaningful gate for anything new.
aws_cdk.Aspects.of(app).add(cdk_nag.AwsSolutionsChecks())

_POC_SUPPRESSIONS = [
    {
        'id': 'AwsSolutions-IAM5',
        'reason': 'Wildcards are deliberately scoped: S3 object wildcards from grant_read/grant_write, '
        'Glue table/* within one database, Bedrock foundation-model/inference-profile ARNs (regional '
        'wildcards are how model invocation is granted), and X-Ray/CloudWatch which only support *.',
    },
    {
        'id': 'AwsSolutions-IAM4',
        'reason': 'AWSLambdaBasicExecutionRole is the CDK default for Lambda log delivery; acceptable for the POC.',
    },
    {'id': 'AwsSolutions-S1', 'reason': 'S3 server-access logging is out of scope for the hackathon POC.'},
    {
        'id': 'AwsSolutions-APIG1',
        'reason': 'API access logging is out of scope for the POC; CloudWatch Lambda logs cover debugging.',
    },
    {
        'id': 'AwsSolutions-APIG2',
        'reason': 'Request validation is enforced in the Lambda with pydantic discriminated unions.',
    },
    {'id': 'AwsSolutions-APIG3', 'reason': 'No WAF for the POC demo API.'},
    {
        'id': 'AwsSolutions-APIG4',
        'reason': 'The demo API is deliberately secured with an API key + usage-plan throttle only.',
    },
    {'id': 'AwsSolutions-APIG6', 'reason': 'Stage-level CloudWatch method logging is out of scope for the POC.'},
    {
        'id': 'AwsSolutions-COG4',
        'reason': 'API-key auth by design; the GenBI agent path uses a Cognito JWT authorizer instead.',
    },
    {
        'id': 'AwsSolutions-L1',
        'reason': 'The flagged functions are CDK-managed custom resources (auto-delete-objects/log-retention); '
        'their runtime is owned by aws-cdk-lib.',
    },
    {'id': 'AwsSolutions-DDB3', 'reason': 'Point-in-time recovery is unnecessary for ephemeral POC query state.'},
]

_AUTH_SUPPRESSIONS = [
    {
        'id': 'AwsSolutions-COG1',
        'reason': 'Machine-to-machine (client_credentials) pool: no human users, no passwords to police.',
    },
    {'id': 'AwsSolutions-COG2', 'reason': 'M2M pool — MFA does not apply to client_credentials flows.'},
    {'id': 'AwsSolutions-COG8', 'reason': 'Plus-tier threat protection is unnecessary for a userless M2M pool.'},
]

_UI_SUPPRESSIONS = [
    {'id': 'AwsSolutions-CFR1', 'reason': 'No geo restriction for the demo dashboard.'},
    {'id': 'AwsSolutions-CFR2', 'reason': 'No WAF for the demo dashboard.'},
    {'id': 'AwsSolutions-CFR3', 'reason': 'CloudFront access logging is out of scope for the POC.'},
    {
        'id': 'AwsSolutions-CFR4',
        'reason': 'Default *.cloudfront.net certificate: the TLS minimum cannot be raised without a custom domain.',
    },
]

cdk_nag.NagSuppressions.add_stack_suppressions(athena_stack, _POC_SUPPRESSIONS)
cdk_nag.NagSuppressions.add_stack_suppressions(ui_stack, _POC_SUPPRESSIONS + _UI_SUPPRESSIONS)
cdk_nag.NagSuppressions.add_stack_suppressions(auth_stack, _AUTH_SUPPRESSIONS)
cdk_nag.NagSuppressions.add_stack_suppressions(runtime_stack, _POC_SUPPRESSIONS)

app.synth()
