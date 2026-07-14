from aws_cdk import (
    Aws,
    CfnOutput,
    Duration,
    RemovalPolicy,
    Stack,
    aws_cognito,
)
from constructs import Construct
from pyhocon import ConfigTree


class YmGenbiAgentAuthStack(Stack):
    """JWT auth for the AgentCore GenBI runtime: a Cognito user pool with a
    machine-to-machine (client_credentials) app client, so the frontend can fetch
    a bearer token from the token endpoint without any user login and call the
    runtime's streaming endpoint directly.

    The runtime itself lives in `YmGenbiAgentRuntimeStack` (see
    agent_runtime_stack.py), which consumes this stack's `user_pool` / `client`
    for its JWT authorizer. Auth is split out because it should (almost) never
    change — redeploying the runtime must not risk recreating the user pool,
    which would rotate the client id/secret the frontend holds.
    """

    def __init__(self, scope: Construct, construct_id: str, conf: ConfigTree, **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)

        # 1. User pool — pure M2M: no self-signup, no hosted-UI users. POC: destroyable.
        pool = aws_cognito.UserPool(
            self,
            'GenbiAgentPool',
            user_pool_name='ym-genbi-agent-auth',
            self_sign_up_enabled=False,
            removal_policy=RemovalPolicy.DESTROY,
        )

        # 2. Domain — required for the /oauth2/token endpoint. Prefix must be
        #    globally unique; account id keeps it collision-free.
        domain = pool.add_domain(
            'GenbiAgentDomain',
            cognito_domain=aws_cognito.CognitoDomainOptions(domain_prefix=f'ym-genbi-{Aws.ACCOUNT_ID}'),
        )

        # 3. Resource server + scope — client_credentials grants require a custom scope.
        invoke_scope = aws_cognito.ResourceServerScope(scope_name='invoke', scope_description='Invoke the GenBI agent')
        resource_server = pool.add_resource_server(
            'GenbiResourceServer',
            identifier='genbi',
            scopes=[invoke_scope],
        )

        # 4. M2M app client — confidential (has a secret), client_credentials only.
        #    Access token stretched to the 24h maximum so the frontend refreshes at
        #    most once a day (fetch a fresh token from /oauth2/token when expired).
        client = pool.add_client(
            'GenbiM2MClient',
            user_pool_client_name='ym-genbi-agent-m2m',
            generate_secret=True,
            auth_flows=aws_cognito.AuthFlow(user_password=False, user_srp=False),
            o_auth=aws_cognito.OAuthSettings(
                flows=aws_cognito.OAuthFlows(client_credentials=True),
                scopes=[aws_cognito.OAuthScope.resource_server(resource_server, invoke_scope)],
            ),
            access_token_validity=Duration.hours(24),
        )

        # Consumed by YmGenbiAgentRuntimeStack for the runtime's JWT authorizer.
        self.user_pool = pool
        self.client = client

        # 5. Outputs — everything needed to wire the runtime authorizer and the frontend.
        #    (The client secret is not a CFN output; fetch it with
        #    `aws cognito-idp describe-user-pool-client`.)
        CfnOutput(self, 'UserPoolId', value=pool.user_pool_id)
        CfnOutput(self, 'ClientId', value=client.user_pool_client_id)
        CfnOutput(
            self,
            'DiscoveryUrl',
            value=f'https://cognito-idp.{Aws.REGION}.amazonaws.com/{pool.user_pool_id}/.well-known/openid-configuration',
        )
        CfnOutput(self, 'TokenEndpoint', value=f'{domain.base_url()}/oauth2/token')
        CfnOutput(self, 'TokenScope', value=f'{resource_server.user_pool_resource_server_id}/invoke')
