import os

import aws_cdk
from pyhocon import ConfigFactory

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

AthenaToolStack(app, 'AthenaToolStack', conf=conf, env=env)
YmDatalakeUiStack(app, 'YmDatalakeUiStack', conf=conf, env=env)

app.synth()
