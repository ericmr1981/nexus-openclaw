# OpenClaw WebSocket Logging Proxy

A Python library that acts as an async middleware proxy for OpenClaw WebSocket connections, intercepting and logging all bidirectional traffic while maintaining non-blocking performance.

## Overview

The OpenClawLogProxy class implements the Async Middleware Proxy pattern to wrap WebSocket connections. It maintains full compatibility with standard WebSocket interfaces while automatically logging all communication to JSONL files.

## Features

- Async context manager protocol (`async with` support)
- Non-blocking logging to prevent interference with WebSocket heartbeats
- Structured JSONL logging format with timestamps
- Summary generation for received messages (first 100 characters)
- Proper error handling and duration tracking
- Automatic log file management with timestamped names

## Installation

```bash
pip install openclaw-proxy
```

## Usage

```python
from openclaw_proxy.proxy import OpenClawLogProxy

async def main():
    uri = "ws://127.0.0.1:18789"  # OpenClaw Gateway
    async with OpenClawLogProxy(uri, log_dir="./logs") as ws:
        # Send messages (automatically logged)
        await ws.send({"cmd": "auth", "token": "your_token"})

        # Receive messages (automatically logged with summaries)
        async for msg in ws:
            data = json.loads(msg)
            if data.get("status") == "done":
                break

# Run the async function
import asyncio
asyncio.run(main())
```

## Logging Format

All communications are logged to JSONL files with the format:
```json
{"ts": "2026-03-09T10:00:01.123", "event": "SENT", "payload": "message content"}
{"ts": "2026-03-09T10:00:02.456", "event": "RECV", "summary": "first 100 chars...", "full_data": {...}}
{"ts": "2026-03-09T10:00:10.789", "event": "TASK_END", "status": "SUCCESS", "duration_sec": 9.5}
```

## Architecture

- `proxy.py`: Core OpenClawLogProxy implementation with async context manager
- `logger.py`: Async logging utilities for non-blocking file operations
- `utils.py`: Utility functions for data sanitization and processing

## License

MIT
