#!/usr/bin/env bash
# Regenerate web/.env from the deployed GenBI stacks. The auth stack has
# RemovalPolicy.DESTROY, so recreating it rotates the Cognito client secret and
# the copilot chat starts failing the token request with an opaque 400.
set -euo pipefail

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
export AWS_PROFILE="${AWS_PROFILE:-ym-hackathon}"
auth_stack="${AUTH_STACK:-YmHackathonGenbiAgentAuthStack}"
runtime_stack="${RUNTIME_STACK:-YmHackathonGenbiAgentRuntimeStack}"
region="${AWS_REGION:-us-west-2}"

out() {
    aws cloudformation describe-stacks --stack-name "$1" --region "$region" \
        --query "Stacks[0].Outputs[?OutputKey=='$2'].OutputValue" --output text
}

require() {
    if [ -z "$2" ] || [ "$2" = 'None' ]; then
        echo "error: $1 is empty — check stack outputs for $auth_stack / $runtime_stack" >&2
        exit 1
    fi
}

runtime_arn="$(out "$runtime_stack" RuntimeArn)"
token_endpoint="$(out "$auth_stack" TokenEndpoint)"
client_id="$(out "$auth_stack" ClientId)"
user_pool_id="$(out "$auth_stack" UserPoolId)"
token_scope="$(out "$auth_stack" TokenScope)"

require RuntimeArn "$runtime_arn"
require TokenEndpoint "$token_endpoint"
require ClientId "$client_id"
require UserPoolId "$user_pool_id"
require TokenScope "$token_scope"

client_secret="$(aws cognito-idp describe-user-pool-client --region "$region" \
    --user-pool-id "$user_pool_id" --client-id "$client_id" \
    --query 'UserPoolClient.ClientSecret' --output text)"
require ClientSecret "$client_secret"

echo "AGENTCORE_RUNTIME_ARN=$runtime_arn"
echo "AGENTCORE_REGION=$region"
echo "AGENTCORE_TOKEN_ENDPOINT=$token_endpoint"
echo "AGENTCORE_CLIENT_ID=$client_id"
echo 'AGENTCORE_CLIENT_SECRET=<redacted>'
echo "AGENTCORE_TOKEN_SCOPE=$token_scope"

env_file="$repo_root/web/.env"
if [ -f "$env_file" ]; then
    cp "$env_file" "$env_file.bak"
    echo "backed up existing .env to web/.env.bak"
fi

cat > "$env_file" <<EOF
AGENTCORE_RUNTIME_ARN=$runtime_arn
AGENTCORE_REGION=$region
AGENTCORE_TOKEN_ENDPOINT=$token_endpoint
AGENTCORE_CLIENT_ID=$client_id
AGENTCORE_CLIENT_SECRET=$client_secret
AGENTCORE_TOKEN_SCOPE=$token_scope
EOF
chmod 600 "$env_file"
echo "wrote $env_file"

# Body goes in via stdin so the secret never appears in `ps` output.
status="$(printf 'grant_type=client_credentials&client_id=%s&client_secret=%s&scope=%s' \
    "$client_id" "$client_secret" "$token_scope" \
    | curl -s -o /dev/null -w '%{http_code}' -X POST "$token_endpoint" \
        -H 'content-type: application/x-www-form-urlencoded' --data-binary @-)"
echo "token endpoint check: HTTP $status"
[ "$status" = '200' ] || exit 1
