/**
 * YM GenBI agent — frontend streaming client (no user login).
 *
 * Auth: Cognito client_credentials (M2M). The "login" is an automatic POST to the
 * token endpoint; the access token lasts 24h and is cached + auto-refreshed here,
 * so the user never sees a login screen.
 *
 * NOTE: the client secret is visible to anyone who opens DevTools. Acceptable for
 * the hackathon demo (read-only agent, throwaway account); hide it behind a tiny
 * token-vending endpoint if that ever changes.
 */

const TOKEN_ENDPOINT = 'https://ym-genbi-040115146248.auth.us-west-2.amazoncognito.com/oauth2/token';
const CLIENT_ID = '2ra4sjl7olthsctr37d6h3ro92';
const CLIENT_SECRET = '<fetch with: aws cognito-idp describe-user-pool-client>';
const SCOPE = 'genbi/invoke';

const RUNTIME_ARN = 'arn:aws:bedrock-agentcore:us-west-2:040115146248:runtime/ym_genbi_agent-trkH0f7Lvm';
const INVOKE_URL =
  `https://bedrock-agentcore.us-west-2.amazonaws.com/runtimes/${encodeURIComponent(RUNTIME_ARN)}/invocations?qualifier=DEFAULT`;

// ---- token cache: refresh at most once a day, transparently ----------------
let cached = { token: null, expiresAt: 0 };

async function getToken() {
  if (cached.token && Date.now() < cached.expiresAt - 60_000) return cached.token;
  const res = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'client_credentials',
      client_id: CLIENT_ID,
      client_secret: CLIENT_SECRET,
      scope: SCOPE,
    }),
  });
  // Without this, a failed token call yields access_token=undefined (sent as "Bearer undefined")
  // and expiresAt=NaN — the real Cognito error would surface as an opaque 403 from invoke.
  if (!res.ok) throw new Error(`token request failed: ${res.status} ${await res.text()}`);
  const { access_token, expires_in } = await res.json();
  cached = { token: access_token, expiresAt: Date.now() + expires_in * 1000 };
  return access_token;
}

// ---- streaming invoke: onDelta(text) per chunk, onTool(name) on tool use ----
export async function askAgent(prompt, { onDelta, onTool, sessionId } = {}) {
  const token = await getToken();
  const res = await fetch(INVOKE_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
      // must be ≥33 chars; reuse it across calls to keep conversation context
      'X-Amzn-Bedrock-AgentCore-Runtime-Session-Id':
        sessionId ?? crypto.randomUUID() + crypto.randomUUID(),
    },
    body: JSON.stringify({ prompt }),
  });
  if (!res.ok) throw new Error(`invoke failed: ${res.status} ${await res.text()}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  let full = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    // SSE frames are separated by a blank line; each data line is one chunk
    const frames = buf.split('\n\n');
    buf = frames.pop(); // keep the trailing partial frame
    for (const frame of frames) {
      for (const line of frame.split('\n')) {
        if (!line.startsWith('data: ')) continue;
        const chunk = JSON.parse(line.slice(6)); // yields are JSON-encoded
        if (typeof chunk === 'string') {
          full += chunk;
          onDelta?.(chunk);
        } else if (chunk && chunk.tool) {
          onTool?.(chunk.tool); // e.g. show「查詢資料庫中…」
        } else if (chunk && chunk.error) {
          // the agent (and the runtime) emit {error} frames — surfacing them beats an empty answer
          throw new Error(`agent error: ${chunk.error}`);
        }
      }
    }
  }
  return full;
}

// ---- usage ------------------------------------------------------------------
// import { askAgent } from './frontend-example.js';
// await askAgent('S1 的 slip 趨勢如何？', {
//   onTool: (name) => showSpinner(`使用工具 ${name} 中…`),
//   onDelta: (text) => appendToChatBubble(text),
// });
