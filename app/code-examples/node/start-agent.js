import fetch from 'node-fetch';

const user_api_key = process.env.LANGFORGE_USER_API_KEY;
const application_api_key = process.env.LANGFORGE_APPLICATION_API_KEY;
const url = '___PLACEHOLDER_BASE_URL___/runtime/start-agent';

const options = {
  method: 'POST',
  headers: {
    'hq-user-api-key': user_api_key,
    'x-api-key': application_api_key,
    'content-type': 'application/json',
  },
  body: JSON.stringify(___PLACEHOLDER_PAYLOAD___),
};

const response = await (await fetch(url, options)).json();

console.log(response);
