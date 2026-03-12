# OpenClaw WebSocket Logging Proxy - Design Document

## Overview

This document outlines the design for an OpenClaw WebSocket logging proxy that implements the "Async Middleware Proxy" pattern as specified in the development manual. The proxy will intercept bidirectional WebSocket traffic between clients and the OpenClaw Gateway (port 18789) while maintaining non-blocking performance.

## Architecture

The proxy will be implemented as an **Async Middleware Proxy** that wraps the native WebSocket connection. This creates a "film" around the connection that intercepts traffic without blocking the heartbeat mechanism.

### Directory Structure
```
nexus/
├── openclaw-proxy/
│   ├── __init__.py
│   ├── proxy.py          # Core OpenClawLogProxy implementation
│   ├── logger.py         # Async logging utilities
│   └── utils.py          # Helper functions
├── server/               # Existing Nexus server
└── client/               # Existing Nexus client
```

## Interface Definition

The proxy implements standard WebSocket methods with logging functionality:

### A. `__aenter__(self)` - Initialization
- Establish connection to Gateway (`ws://127.0.0.1:18789`)
- Open log file `session_{timestamp}.jsonl`
- Write `{"event": "TASK_START", "config": {...}}`
- **Return:** `self` (proxy instance)

### B. `send(self, message)` - Intercept Outgoing Data
- **Input:** `message` (str | dict)
- Serialize to JSON if needed
- Write to log: `{"ts": "...", "event": "SENT", "payload": "..."}`
- Call underlying `ws.send(message)`
- **Non-blocking:** Logging occurs in background

### C. `recv(self)` - Intercept Incoming Data
- Wait for underlying `ws.recv()`
- Parse JSON to extract content
- Generate summary (first 100 chars to avoid blocking)
- Write to log: `{"ts": "...", "event": "RECV", "summary": "...", "full_data": "..."}`
- Return raw data to caller

### D. `__aiter__(self)` - Streaming Compatibility
- Implements async iterator for `async for msg in proxy:` syntax
- Ensures streaming data is also logged
- Maintains compatibility with existing WebSocket code

### E. `__aexit__(self, exc_type, ...)` - Cleanup
- Calculate total duration
- Write: `{"event": "TASK_END", "status": "SUCCESS|ERROR", "duration": ...}`
- Close WebSocket connection
- Close log file

## Data Schema

**Log Format: JSON Lines (.jsonl)**
```json
{"ts": "2026-03-03-09T10:00:01.123Z", "event": "SENT", "payload": "Start task"}
{"ts": "2026-03-09T10:00:02.456Z", "event": "RECV", "summary": "Searching for...", "full_data": {...}}
{"ts": "2026-03-09T10:00:10.789Z", "event": "TASK_END", "status": "SUCCESS", "duration_sec": 9.5}
```

## Implementation Dependencies

- `websockets` - for WebSocket connections
- `aiofiles` - optional, for asynchronous file operations
- Standard library: `json`, `time`, `datetime`, `asyncio`

## Performance Considerations

1. **Non-blocking logging:** All logging operations must be asynchronous to avoid blocking WebSocket heartbeats
2. **Summary generation:** Only string truncation (`text[:100]`) for performance; no LLM calls during communication
3. **File handling:** Use aiofiles or proper async file operations to prevent blocking

## Integration with Nexus

The JSONL logs produced by this proxy can be consumed by Nexus for:
- Real-time session monitoring
- Usage analytics
- Performance tracking
- Debugging and diagnostics

## Usage Example

```python
# Existing business code only requires one-line change:
# OLD: async with websockets.connect("ws://127.0.0.1:18789") as ws:
# NEW: async with OpenClawLogProxy("ws://127.0.0.1:18789") as ws:

async def main():
    uri = "ws://127.0.0.1:18789"
    async with OpenClawLogProxy(uri) as ws:
        # Authentication (automatically logged)
        await ws.send({"cmd": "auth", "token": "xyz"})

        # Business loop (automatically logged with summaries)
        async for msg in ws:
            data = json.loads(msg)
            if data.get("status") == "done":
                break
```

## Error Handling

- All exceptions in the proxy are properly caught and logged
- Connection timeouts and network errors are handled gracefully
- Log files are closed properly even in error scenarios
- Error status is recorded in the final TASK_END event

## Security Considerations

- No sensitive data is leaked in logs beyond what's already sent over WebSocket
- Log files are stored locally with appropriate permissions
- Authentication tokens follow the same logging rules as other messages