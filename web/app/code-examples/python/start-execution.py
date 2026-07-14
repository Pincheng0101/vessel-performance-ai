import os

import requests

user_api_key = os.getenv('LANGFORGE_USER_API_KEY')
application_api_key = os.getenv('LANGFORGE_APPLICATION_API_KEY')
url = '___PLACEHOLDER_BASE_URL___/runtime/start-execution'

payload = ___PLACEHOLDER_PAYLOAD___

headers = {
    'hq-user-api-key': user_api_key,
    'x-api-key': application_api_key,
    'content-type': 'application/json',
}

response = requests.request('POST', url, json=payload, headers=headers)

print(response.text)
