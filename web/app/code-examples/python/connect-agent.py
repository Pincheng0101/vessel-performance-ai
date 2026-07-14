import asyncio
import json
import sys

import websockets

url = '<WS_URL>'
agent_id = '___PLACEHOLDER_AGENT_ID___'
session_id = ''
user_message = 'Hello!'

chunk_buffers = {}


def handle_streaming_event(event):
    event_type = event.get('event_type')
    if event_type == 'content_block_start':
        pass
    elif event_type == 'content_block_delta':
        text = event.get('delta', {}).get('text')
        if text:
            sys.stdout.write(text)
            sys.stdout.flush()
    elif event_type == 'content_block_stop':
        pass


async def main():
    async with websockets.connect(url) as ws:
        await ws.send(
            json.dumps(
                {
                    'action': 'chat',
                    'agent_id': agent_id,
                    'session_id': session_id,
                    'message': {
                        'message_type': 'text',
                        'content': [{'content_block_type': 'text', 'text': user_message}],
                    },
                }
            )
        )

        async for data in ws:
            msg = json.loads(data)

            if msg.get('chunked'):
                chunk_id = msg['chunk_id']
                chunk_index = msg['chunk_index']
                chunk_total = msg['chunk_total']
                if chunk_id not in chunk_buffers:
                    chunk_buffers[chunk_id] = [None] * chunk_total
                chunk_buffers[chunk_id][chunk_index] = msg['payload']
                if any(p is None for p in chunk_buffers[chunk_id]):
                    continue
                msg = json.loads(''.join(chunk_buffers.pop(chunk_id)))

            if msg['response_type'] == 'data':
                handle_streaming_event(msg['event'])


asyncio.run(main())
