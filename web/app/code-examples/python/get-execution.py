import requests
import os

user_api_key = os.getenv("LANGFORGE_USER_API_KEY")
application_api_key = os.getenv("LANGFORGE_APPLICATION_API_KEY")
url = "___PLACEHOLDER_BASE_URL___/runtime/get-execution"

payload = {
  "execution_arn": "",
}

headers = {
  "hq-user-api-key": user_api_key,
  "x-api-key": application_api_key,
  "content-type": "application/json",
}

response = requests.request("POST", url, json=payload, headers=headers)

print(response.text)
