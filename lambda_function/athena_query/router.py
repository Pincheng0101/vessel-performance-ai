import query_handler


def lambda_handler(event, context):
    action = event.get('action')
    payload = {k: v for k, v in event.items() if k != 'action'}
    if action == 'run_query':
        return query_handler.handle(payload)
    raise ValueError(f'Unsupported action: {action}')
