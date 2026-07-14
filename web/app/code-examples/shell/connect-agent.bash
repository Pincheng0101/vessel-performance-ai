websocat '<WS_URL>' \
  --no-close \
  --text <<'EOF'
{"action":"chat","agent_id":"___PLACEHOLDER_AGENT_ID___","session_id":"","message":{"message_type":"text","content":[{"content_block_type":"text","text":"Hello!"}]}}
EOF
