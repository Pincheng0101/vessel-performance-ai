curl --request POST \
  --url ___PLACEHOLDER_BASE_URL___/runtime/get-execution \
  --header "hq-user-api-key: $LANGFORGE_USER_API_KEY" \
  --header "x-api-key: $LANGFORGE_APPLICATION_API_KEY" \
  --header "content-type: application/json" \
  --data '{
    "execution_arn": ""
  }'
