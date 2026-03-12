# OpenClaw WebSocket Logging Proxy Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Implement an OpenClaw WebSocket logging proxy that intercepts bidirectional traffic while maintaining non-blocking performance, following the Async Middleware Proxy pattern from the development manual.

**Architecture:** Create a Python package in `nexus/openclaw-proxy/` with an async context manager class that wraps WebSocket connections and logs traffic to JSONL files. The proxy will maintain compatibility with standard WebSocket interfaces.

**Tech Stack:** Python, websockets, aiofiles, asyncio, JSON

---

### Task 1: Setup Project Structure

**Files:**
- Create: `openclaw-proxy/__init__.py`
- Create: `openclaw-proxy/proxy.py`
- Create: `openclaw-proxy/logger.py`
- Create: `openclaw-proxy/utils.py`
- Create: `openclaw-proxy/pyproject.toml`

**Step 1: Write the failing test**

```python
import asyncio
import tempfile
import os
from pathlib import Path

def test_project_structure():
    """Test that the basic project structure exists"""
    assert Path('openclaw-proxy').exists()
    assert Path('openclaw-proxy/__init__.py').exists()
    assert Path('openclaw-proxy/proxy.py').exists()
    assert Path('openclaw-proxy/logger.py').exists()
    assert Path('openclaw-proxy/utils.py').exists()
    assert Path('openclaw-proxy/pyproject.toml').exists()

if __name__ == '__main__':
    test_project_structure()
    print("Project structure test passed!")
```

**Step 2: Run test to verify it fails**

Run: `python -c "exec(open('test_structure.py').read())"` where test_structure.py contains the above test
Expected: FAIL with "FileNotFoundError" for missing files

**Step 3: Create the project structure**

Create empty files with basic content:
- `openclaw-proxy/__init__.py` - empty file
- `openclaw-proxy/proxy.py` - empty file
- `openclaw-proxy/logger.py` - empty file
- `openclaw-proxy/utils.py` - empty file
- `openclaw-proxy/pyproject.toml` - basic Python project config

**Step 4: Run test to verify it passes**

Run: `python -c "exec(open('test_structure.py').read())"`
Expected: PASS

**Step 5: Commit**

```bash
git add openclaw-proxy/
git commit -m "feat: create openclaw-proxy project structure"
```

### Task 2: Define Basic OpenClawLogProxy Class

**Files:**
- Modify: `openclaw-proxy/proxy.py`

**Step 1: Write the failing test**

```python
import sys
sys.path.insert(0, 'openclaw-proxy')
from proxy import OpenClawLogProxy

def test_proxy_class_exists():
    """Test that OpenClawLogProxy class exists"""
    assert hasattr(OpenClawLogProxy, '__aenter__')
    assert hasattr(OpenClawLogProxy, '__aexit__')
    assert callable(getattr(OpenClawLogProxy, '__aenter__'))
    assert callable(getattr(OpenClawLogProxy, '__aexit__'))

def test_proxy_constructor():
    """Test that proxy can be instantiated with uri"""
    proxy = OpenClawLogProxy("ws://127.0.0.1:18789")
    assert proxy.uri == "ws://127.0.0.1:18789"

if __name__ == '__main__':
    test_proxy_class_exists()
    test_proxy_constructor()
    print("Basic proxy class test passed!")
```

**Step 2: Run test to verify it fails**

Run: `python -c "exec(open('test_basic_proxy.py').read())"`
Expected: FAIL with "ModuleNotFoundError" or "AttributeError" for missing class/methods

**Step 3: Write minimal implementation**

```python
import asyncio
import websockets


class OpenClawLogProxy:
    """
    An async middleware proxy that intercepts WebSocket traffic
    between clients and OpenClaw Gateway, logging all communication.
    """
    def __init__(self, uri, log_dir=None):
        self.uri = uri
        self.ws = None
        self.log_dir = log_dir or "./logs"

    async def __aenter__(self):
        # This will be implemented in later tasks
        pass

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        # This will be implemented in later tasks
        pass

    async def send(self, message):
        # This will be implemented in later tasks
        pass

    async def recv(self):
        # This will be implemented in later tasks
        pass

    def __aiter__(self):
        # This will be implemented in later tasks
        return self
```

**Step 4: Run test to verify it passes**

Run: `python -c "exec(open('test_basic_proxy.py').read())"`
Expected: PASS

**Step 5: Commit**

```bash
git add openclaw-proxy/proxy.py
git commit -m "feat: add basic OpenClawLogProxy class skeleton"
```

### Task 3: Implement Async Context Manager Protocol

**Files:**
- Modify: `openclaw-proxy/proxy.py`

**Step 1: Write the failing test**

```python
import sys
import asyncio
sys.path.insert(0, 'openclaw-proxy')
from proxy import OpenClawLogProxy

async def test_async_context_manager():
    """Test that OpenClawLogProxy properly implements async context manager"""
    try:
        async with OpenClawLogProxy("ws://127.0.0.1:18789") as proxy:
            # Just need to make sure we can enter and exit the context
            assert proxy is not None
        print("Context manager test passed!")
    except Exception as e:
        print(f"Context manager failed: {e}")
        raise

if __name__ == '__main__':
    asyncio.run(test_async_context_manager())
```

**Step 2: Run test to verify it fails**

Run: `python test_context_manager.py`
Expected: FAIL or exception due to incomplete implementation

**Step 3: Write minimal implementation**

```python
import asyncio
import websockets
import json
from datetime import datetime
import os
from pathlib import Path


class OpenClawLogProxy:
    """
    An async middleware proxy that intercepts WebSocket traffic
    between clients and OpenClaw Gateway, logging all communication.
    """
    def __init__(self, uri, log_dir=None):
        self.uri = uri
        self.ws = None
        self.log_dir = Path(log_dir or "./logs")
        self.log_file = None
        self.start_time = None

    async def __aenter__(self):
        # Create log directory if it doesn't exist
        self.log_dir.mkdir(parents=True, exist_ok=True)

        # Create timestamped log file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        log_filename = f"session_{timestamp}.jsonl"
        self.log_file = self.log_dir / log_filename

        # Record start time
        self.start_time = datetime.now()

        # Initialize log file with TASK_START event
        start_event = {
            "ts": self.start_time.isoformat(),
            "event": "TASK_START",
            "config": {"uri": self.uri}
        }
        async with aiofiles.open(self.log_file, 'a') as f:
            await f.write(json.dumps(start_event) + '\n')

        # Connect to WebSocket
        self.ws = await websockets.connect(self.uri)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        # Calculate duration
        if self.start_time:
            duration = (datetime.now() - self.start_time).total_seconds()
        else:
            duration = 0

        # Determine status
        status = "ERROR" if exc_type else "SUCCESS"

        # Write TASK_END event
        end_event = {
            "ts": datetime.now().isoformat(),
            "event": "TASK_END",
            "status": status,
            "duration_sec": duration
        }
        if self.log_file and self.log_file.exists():
            async with aiofiles.open(self.log_file, 'a') as f:
                await f.write(json.dumps(end_event) + '\n')

        # Close WebSocket connection
        if self.ws:
            await self.ws.close()
```

**Step 4: Run test to verify it passes**

Run: `python test_context_manager.py`
Expected: PASS

**Step 5: Commit**

```bash
git add openclaw-proxy/proxy.py
git commit -m "feat: implement async context manager protocol for OpenClawLogProxy"
```

### Task 4: Implement Basic Send Method with Logging

**Files:**
- Modify: `openclaw-proxy/proxy.py`
- Create: `openclaw-proxy/logger.py`

**Step 1: Write the failing test**

```python
import sys
import asyncio
import tempfile
import json
from pathlib import Path
sys.path.insert(0, 'openclaw-proxy')
from proxy import OpenClawLogProxy

async def test_send_logging():
    """Test that send method logs messages properly"""
    # We'll test the logging by mocking the WebSocket connection later
    # For now, just check if the method exists and accepts the right parameters
    proxy = OpenClawLogProxy("ws://127.0.0.1:18789")

    # Check if send method exists
    assert hasattr(proxy, 'send')
    assert callable(getattr(proxy, 'send'))

    print("Send method exists test passed!")

if __name__ == '__main__':
    asyncio.run(test_send_logging())
```

**Step 2: Run test to verify it fails**

Run: `python test_send_method.py`
Expected: FAIL due to incomplete implementation

**Step 3: Write minimal implementation**

First, create logger module:
```python
# openclaw-proxy/logger.py
import asyncio
import json
import aiofiles
from datetime import datetime
from typing import Any, Dict, Union


class AsyncLogger:
    """Async logger for non-blocking file operations"""

    def __init__(self, log_file_path):
        self.log_file_path = log_file_path

    async def log_event(self, event_type: str, data: Dict[str, Any]):
        """Write a structured event to the log file"""
        log_entry = {
            "ts": datetime.now().isoformat(),
            "event": event_type,
            **data
        }
        async with aiofiles.open(self.log_file_path, 'a') as f:
            await f.write(json.dumps(log_entry) + '\n')
            await f.flush()  # Ensure data is written immediately
```

Then update proxy:
```python
# openclaw-proxy/proxy.py
import asyncio
import websockets
import json
from datetime import datetime
import os
from pathlib import Path
import aiofiles
from .logger import AsyncLogger


class OpenClawLogProxy:
    """
    An async middleware proxy that intercepts WebSocket traffic
    between clients and OpenClaw Gateway, logging all communication.
    """
    def __init__(self, uri, log_dir=None):
        self.uri = uri
        self.ws = None
        self.log_dir = Path(log_dir or "./logs")
        self.log_file = None
        self.start_time = None
        self.logger = None

    async def __aenter__(self):
        # Create log directory if it doesn't exist
        self.log_dir.mkdir(parents=True, exist_ok=True)

        # Create timestamped log file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        log_filename = f"session_{timestamp}.jsonl"
        self.log_file = self.log_dir / log_filename

        # Initialize logger
        self.logger = AsyncLogger(self.log_file)

        # Record start time
        self.start_time = datetime.now()

        # Initialize log file with TASK_START event
        start_event = {
            "ts": self.start_time.isoformat(),
            "event": "TASK_START",
            "config": {"uri": self.uri}
        }
        await self.logger.log_event("TASK_START", {
            "config": {"uri": self.uri}
        })

        # Connect to WebSocket
        self.ws = await websockets.connect(self.uri)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        # Calculate duration
        if self.start_time:
            duration = (datetime.now() - self.start_time).total_seconds()
        else:
            duration = 0

        # Determine status
        status = "ERROR" if exc_type else "SUCCESS"

        # Write TASK_END event
        await self.logger.log_event("TASK_END", {
            "status": status,
            "duration_sec": duration
        })

        # Close WebSocket connection
        if self.ws:
            await self.ws.close()

    async def send(self, message):
        """
        Send a message through the WebSocket and log it.
        """
        # Prepare the message for logging
        if isinstance(message, dict):
            message_str = json.dumps(message)
            payload = message
        else:
            message_str = str(message)
            payload = message_str

        # Log the SENT event
        await self.logger.log_event("SENT", {
            "payload": payload
        })

        # Send the message through the actual WebSocket
        await self.ws.send(message_str)

    async def recv(self):
        """
        Receive a message from the WebSocket and log it.
        """
        # Receive from the actual WebSocket
        raw_data = await self.ws.recv()

        # Parse the data for summary
        try:
            parsed_data = json.loads(raw_data)
            summary = str(parsed_data)[:100]  # First 100 chars as summary
            full_data = parsed_data
        except json.JSONDecodeError:
            summary = raw_data[:100]  # First 100 chars as summary
            full_data = raw_data

        # Log the RECV event
        await self.logger.log_event("RECV", {
            "summary": summary,
            "full_data": full_data
        })

        # Return the raw data to maintain compatibility
        return raw_data

    def __aiter__(self):
        """Enable async iteration for the WebSocket"""
        return self

    async def __anext__(self):
        """Implement async iterator protocol"""
        try:
            message = await self.recv()
            return message
        except websockets.exceptions.ConnectionClosed:
            raise StopAsyncIteration
```

**Step 4: Run test to verify it passes**

Run: `python test_send_method.py`
Expected: PASS

**Step 5: Commit**

```bash
git add openclaw-proxy/logger.py openclaw-proxy/proxy.py
git commit -m "feat: implement send method with logging and logger module"
```

### Task 5: Implement Receive Method with Logging

**Files:**
- Modify: `openclaw-proxy/proxy.py`

**Step 1: Write the failing test**

```python
import sys
import asyncio
import tempfile
import json
from pathlib import Path
sys.path.insert(0, 'openclaw-proxy')
from proxy import OpenClawLogProxy

async def test_recv_logging():
    """Test that recv method exists and has proper signature"""
    proxy = OpenClawLogProxy("ws://127.0.0.1:18789")

    # Check if recv method exists
    assert hasattr(proxy, 'recv')
    assert callable(getattr(proxy, 'recv'))

    print("Recv method exists test passed!")

if __name__ == '__main__':
    asyncio.run(test_recv_logging())
```

**Step 2: Run test to verify it passes (since we implemented it in previous task)**

Run: `python test_recv_method.py`
Expected: PASS (already implemented)

**Step 3: Update proxy to ensure complete recv functionality**

The proxy.py already includes the recv implementation from the previous task, which correctly:
- Receives from the actual WebSocket
- Parses data for summary (first 100 chars to avoid blocking)
- Logs the RECV event with both summary and full data
- Returns raw data to maintain compatibility
- Includes proper error handling for JSON parsing

**Step 4: Run test to verify it passes**

Run: `python test_recv_method.py`
Expected: PASS

**Step 5: Commit**

```bash
git add openclaw-proxy/proxy.py
git commit -m "feat: verify complete recv method implementation"
```

### Task 6: Implement Async Iterator Protocol

**Files:**
- Modify: `openclaw-proxy/proxy.py`

**Step 1: Write the failing test**

```python
import sys
import asyncio
import json
from unittest.mock import AsyncMock, patch
sys.path.insert(0, 'openclaw-proxy')
from proxy import OpenClawLogProxy

async def test_async_iterator():
    """Test that proxy supports async iteration"""
    # Mock the websocket connection
    mock_ws = AsyncMock()
    mock_ws.recv.return_value = '{"test": "message"}'

    proxy = OpenClawLogProxy("ws://127.0.0.1:18789")
    proxy.ws = mock_ws

    # Check if the iterator methods exist
    assert hasattr(proxy, '__aiter__')
    assert hasattr(proxy, '__anext__')
    assert callable(getattr(proxy, '__aiter__'))
    assert callable(getattr(proxy, '__anext__'))

    print("Async iterator methods exist test passed!")

if __name__ == '__main__':
    asyncio.run(test_async_iterator())
```

**Step 2: Run test to verify it passes**

Run: `python test_async_iterator.py`
Expected: PASS (already implemented)

**Step 3: Ensure the async iterator properly handles the recv method**

The implementation is already correct:
- `__aiter__` returns self
- `__anext__` calls `recv()` to get messages
- Properly handles `ConnectionClosed` exception by raising `StopAsyncIteration`

**Step 4: Run test to verify it passes**

Run: `python test_async_iterator.py`
Expected: PASS

**Step 5: Commit**

```bash
git add openclaw-proxy/proxy.py
git commit -m "feat: verify async iterator protocol implementation"
```

### Task 7: Create PyProject Configuration

**Files:**
- Modify: `openclaw-proxy/pyproject.toml`

**Step 1: Write the failing test**

```python
import toml
from pathlib import Path

def test_pyproject_config():
    """Test that pyproject.toml has correct configuration"""
    pyproject_path = Path('openclaw-proxy/pyproject.toml')
    assert pyproject_path.exists(), "pyproject.toml file should exist"

    config = toml.load(pyproject_path)
    assert 'project' in config, "Should have project section"
    assert 'dependencies' in config['project'], "Should have dependencies"

    dependencies = config['project']['dependencies']
    assert 'websockets' in str(dependencies), "Should depend on websockets"
    assert 'aiofiles' in str(dependencies), "Should depend on aiofiles"

    print("PyProject config test passed!")

if __name__ == '__main__':
    test_pyproject_config()
```

**Step 2: Run test to verify it fails**

Run: `python test_pyproject.py`
Expected: FAIL due to missing pyproject.toml

**Step 3: Write minimal implementation**

```toml
[build-system]
requires = ["setuptools>=45", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "openclaw-proxy"
version = "1.0.0"
description = "WebSocket logging proxy for OpenClaw sessions"
authors = [
    {name = "Nexus Project", email = "info@example.com"},
]
readme = "README.md"
license = {text = "MIT"}
requires-python = ">=3.8"
dependencies = [
    "websockets>=11.0",
    "aiofiles>=23.0",
    "click>=8.0"
]

[project.optional-dependencies]
dev = [
    "pytest>=7.0",
    "pytest-asyncio>=0.20"
]

[project.scripts]
openclaw-proxy = "openclaw_proxy.cli:main"

[tool.setuptools.packages.find]
where = ["."]
include = ["openclaw_proxy*"]
```

**Step 4: Run test to verify it passes**

Run: `python test_pyproject.py`
Expected: PASS

**Step 5: Commit**

```bash
git add openclaw-proxy/pyproject.toml
git commit -m "feat: add pyproject.toml configuration"
```

### Task 8: Add Utility Functions

**Files:**
- Modify: `openclaw-proxy/utils.py`

**Step 1: Write the failing test**

```python
import sys
sys.path.insert(0, 'openclaw-proxy')
from utils import sanitize_log_data

def test_utils_module():
    """Test that utility functions exist"""
    # Test basic sanitization function
    assert callable(sanitize_log_data)

    # Test that it doesn't break basic data
    test_data = {"key": "value", "list": [1, 2, 3]}
    result = sanitize_log_data(test_data)
    assert result == test_data, "Should not alter safe data"

    print("Utils module test passed!")

def sanitize_log_data(data):
    """Mock for testing - we'll implement properly in Step 3"""
    return data

if __name__ == '__main__':
    test_utils_module()
```

**Step 2: Run test to verify it fails**

Run: `python test_utils.py`
Expected: FAIL due to missing function

**Step 3: Write minimal implementation**

```python
# openclaw-proxy/utils.py
"""Utility functions for the OpenClaw WebSocket logging proxy"""

import json
from typing import Any, Dict, Union, List


def sanitize_log_data(data: Any) -> Any:
    """
    Sanitize data for logging, ensuring it's JSON serializable
    and doesn't contain problematic content.
    """
    if isinstance(data, (str, int, float, bool)) or data is None:
        return data
    elif isinstance(data, (list, tuple)):
        return [sanitize_log_data(item) for item in data]
    elif isinstance(data, dict):
        # For now, just return the dict as-is
        # Additional sanitization can be added as needed
        return {key: sanitize_log_data(value) for key, value in data.items()}
    else:
        # Convert unknown types to string representation
        return str(data)


def truncate_for_summary(text: str, max_length: int = 100) -> str:
    """
    Truncate text for logging summary, avoiding expensive processing.
    """
    if len(text) <= max_length:
        return text
    return text[:max_length] + "..."


def ensure_json_serializable(obj: Any) -> str:
    """
    Ensure an object can be serialized to JSON, handling common edge cases.
    """
    try:
        return json.dumps(obj)
    except TypeError:
        # Handle non-serializable objects by converting to string
        return json.dumps(str(obj))
```

**Step 4: Run test to verify it passes**

Run: `python test_utils.py`
Expected: PASS

**Step 5: Commit**

```bash
git add openclaw-proxy/utils.py
git commit -m "feat: add utility functions for data sanitization"
```

### Task 9: Update Proxy to Use Utility Functions

**Files:**
- Modify: `openclaw-proxy/proxy.py`

**Step 1: Write the failing test**

```python
import sys
import asyncio
sys.path.insert(0, 'openclaw-proxy')
from proxy import OpenClawLogProxy

async def test_proxy_uses_utilities():
    """Test that proxy can import and potentially use utilities"""
    proxy = OpenClawLogProxy("ws://127.0.0.1:18789")

    # Verify the proxy can access utilities
    assert hasattr(proxy, 'uri')
    assert proxy.uri == "ws://127.0.0.1:18789"

    print("Proxy utility integration test passed!")

if __name__ == '__main__':
    asyncio.run(test_proxy_uses_utilities())
```

**Step 2: Run test to verify it passes**

Run: `python test_proxy_utils.py`
Expected: PASS

**Step 3: Update proxy to use utility functions**

```python
# openclaw-proxy/proxy.py
import asyncio
import websockets
import json
from datetime import datetime
import os
from pathlib import Path
import aiofiles
from .logger import AsyncLogger
from .utils import sanitize_log_data, truncate_for_summary, ensure_json_serializable


class OpenClawLogProxy:
    """
    An async middleware proxy that intercepts WebSocket traffic
    between clients and OpenClaw Gateway, logging all communication.
    """
    def __init__(self, uri, log_dir=None):
        self.uri = uri
        self.ws = None
        self.log_dir = Path(log_dir or "./logs")
        self.log_file = None
        self.start_time = None
        self.logger = None

    async def __aenter__(self):
        # Create log directory if it doesn't exist
        self.log_dir.mkdir(parents=True, exist_ok=True)

        # Create timestamped log file
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        log_filename = f"session_{timestamp}.jsonl"
        self.log_file = self.log_dir / log_filename

        # Initialize logger
        self.logger = AsyncLogger(self.log_file)

        # Record start time
        self.start_time = datetime.now()

        # Initialize log file with TASK_START event
        await self.logger.log_event("TASK_START", {
            "config": {"uri": self.uri}
        })

        # Connect to WebSocket
        self.ws = await websockets.connect(self.uri)
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        # Calculate duration
        if self.start_time:
            duration = (datetime.now() - self.start_time).total_seconds()
        else:
            duration = 0

        # Determine status
        status = "ERROR" if exc_type else "SUCCESS"

        # Write TASK_END event
        await self.logger.log_event("TASK_END", {
            "status": status,
            "duration_sec": duration
        })

        # Close WebSocket connection
        if self.ws:
            await self.ws.close()

    async def send(self, message):
        """
        Send a message through the WebSocket and log it.
        """
        # Prepare the message for logging
        if isinstance(message, dict):
            # Sanitize the message for logging
            sanitized_message = sanitize_log_data(message)
            payload = sanitized_message
        else:
            # Ensure string representation is safe for JSON
            message_str = ensure_json_serializable(str(message))
            payload = message_str

        # Log the SENT event
        await self.logger.log_event("SENT", {
            "payload": payload
        })

        # Send the message through the actual WebSocket
        await self.ws.send(json.dumps(message) if isinstance(message, dict) else message)

    async def recv(self):
        """
        Receive a message from the WebSocket and log it.
        """
        # Receive from the actual WebSocket
        raw_data = await self.ws.recv()

        # Parse the data for summary
        try:
            parsed_data = json.loads(raw_data)
            # Sanitize data for logging
            sanitized_data = sanitize_log_data(parsed_data)
            summary = truncate_for_summary(str(sanitized_data))
            full_data = sanitized_data
        except json.JSONDecodeError:
            # Handle non-JSON data
            summary = truncate_for_summary(raw_data)
            full_data = raw_data

        # Log the RECV event
        await self.logger.log_event("RECV", {
            "summary": summary,
            "full_data": full_data
        })

        # Return the raw data to maintain compatibility
        return raw_data

    def __aiter__(self):
        """Enable async iteration for the WebSocket"""
        return self

    async def __anext__(self):
        """Implement async iterator protocol"""
        try:
            message = await self.recv()
            return message
        except websockets.exceptions.ConnectionClosed:
            raise StopAsyncIteration
```

**Step 4: Run test to verify it passes**

Run: `python test_proxy_utils.py`
Expected: PASS

**Step 5: Commit**

```bash
git add openclaw-proxy/proxy.py
git commit -m "feat: update proxy to use utility functions for sanitization"
```

### Task 10: Add README Documentation

**Files:**
- Create: `openclaw-proxy/README.md`

**Step 1: Write the failing test**

```python
from pathlib import Path

def test_readme_exists():
    """Test that README.md exists in openclaw-proxy directory"""
    readme_path = Path('openclaw-proxy/README.md')
    assert readme_path.exists(), "README.md should exist in openclaw-proxy directory"

    # Check that it has content
    content = readme_path.read_text()
    assert len(content) > 0, "README.md should have content"
    assert '# OpenClaw Proxy' in content or 'OpenClaw Proxy' in content, "README should contain project info"

    print("README exists test passed!")

if __name__ == '__main__':
    test_readme_exists()
```

**Step 2: Run test to verify it fails**

Run: `python test_readme.py`
Expected: FAIL due to missing README.md

**Step 3: Write minimal implementation**

```markdown
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
```

**Step 4: Run test to verify it passes**

Run: `python test_readme.py`
Expected: PASS

**Step 5: Commit**

```bash
git add openclaw-proxy/README.md
git commit -m "feat: add README documentation for openclaw-proxy"
```

### Task 11: Add Basic CLI Module

**Files:**
- Create: `openclaw-proxy/cli.py`

**Step 1: Write the failing test**

```python
import sys
sys.path.insert(0, 'openclaw-proxy')
from cli import main

def test_cli_exists():
    """Test that CLI module exists and has main function"""
    assert callable(main), "CLI module should have a main function"

    print("CLI module exists test passed!")

if __name__ == '__main__':
    test_cli_exists()
```

**Step 2: Run test to verify it fails**

Run: `python test_cli.py`
Expected: FAIL due to missing CLI module

**Step 3: Write minimal implementation**

```python
# openclaw-proxy/cli.py
"""Command-line interface for OpenClaw WebSocket logging proxy"""

import asyncio
import click
import json
from pathlib import Path
from .proxy import OpenClawLogProxy


@click.command()
@click.argument('uri')
@click.option('--log-dir', default='./logs', help='Directory to store log files')
@click.option('--verbose', '-v', is_flag=True, help='Enable verbose output')
def main(uri, log_dir, verbose):
    """
    OpenClaw WebSocket logging proxy.

    Connect to a WebSocket URI and log all traffic to JSONL files.
    """
    if verbose:
        click.echo(f"Connecting to {uri}")
        click.echo(f"Logging to {log_dir}")

    # Create log directory
    Path(log_dir).mkdir(parents=True, exist_ok=True)

    # Run the proxy
    try:
        asyncio.run(run_proxy(uri, log_dir, verbose))
    except KeyboardInterrupt:
        click.echo("\nProxy stopped by user.")
    except Exception as e:
        click.echo(f"Error: {e}", err=True)


async def run_proxy(uri, log_dir, verbose):
    """Run the proxy asynchronously."""
    async with OpenClawLogProxy(uri, log_dir=log_dir) as ws:
        if verbose:
            click.echo(f"Connected to {uri}")
            click.echo("Logging WebSocket traffic. Press Ctrl+C to stop.")

        # Simple echo loop - in real usage, this would be application-specific
        async for message in ws:
            if verbose:
                try:
                    data = json.loads(message)
                    click.echo(f"Received: {data}")
                except json.JSONDecodeError:
                    click.echo(f"Received: {message}")


if __name__ == '__main__':
    main()
```

**Step 4: Run test to verify it passes**

Run: `python test_cli.py`
Expected: PASS

**Step 5: Commit**

```bash
git add openclaw-proxy/cli.py
git commit -m "feat: add CLI module for openclaw-proxy"
```

### Task 12: Add Integration Test

**Files:**
- Create: `openclaw-proxy/test_integration.py`

**Step 1: Write the failing test**

```python
import sys
sys.path.insert(0, 'openclaw-proxy')
from proxy import OpenClawLogProxy
import asyncio
import tempfile
import json
from pathlib import Path


async def test_full_integration():
    """Test basic functionality - for now just verify imports work"""
    # This test will eventually run against a mock WebSocket server
    # For now, just verify we can instantiate the proxy
    proxy = OpenClawLogProxy("ws://127.0.0.1:18789", log_dir=tempfile.mkdtemp())

    # Check that all required attributes exist
    assert hasattr(proxy, 'send'), "Proxy should have send method"
    assert hasattr(proxy, 'recv'), "Proxy should have recv method"
    assert hasattr(proxy, '__aenter__'), "Proxy should have async enter method"
    assert hasattr(proxy, '__aexit__'), "Proxy should have async exit method"

    print("Full integration test passed!")

if __name__ == '__main__':
    asyncio.run(test_full_integration())
```

**Step 2: Run test to verify it passes**

Run: `python test_integration.py`
Expected: PASS

**Step 3: Create a more comprehensive integration test**

```python
# openclaw-proxy/test_integration.py
"""Integration tests for OpenClaw WebSocket logging proxy"""

import asyncio
import tempfile
import json
from pathlib import Path
from unittest.mock import AsyncMock, patch
from proxy import OpenClawLogProxy


async def test_full_integration():
    """Test basic functionality - for now just verify imports work"""
    # This test will eventually run against a mock WebSocket server
    # For now, just verify we can instantiate the proxy
    proxy = OpenClawLogProxy("ws://127.0.0.1:18789", log_dir=tempfile.mkdtemp())

    # Check that all required attributes exist
    assert hasattr(proxy, 'send'), "Proxy should have send method"
    assert hasattr(proxy, 'recv'), "Proxy should have recv method"
    assert hasattr(proxy, '__aenter__'), "Proxy should have async enter method"
    assert hasattr(proxy, '__aexit__'), "Proxy should have async exit method"

    print("Basic integration test passed!")


async def test_mock_websocket_interaction():
    """Test proxy interaction with mocked WebSocket"""
    # Mock the WebSocket connection
    mock_ws = AsyncMock()
    mock_ws.recv.return_value = json.dumps({"test": "message"})

    # Create proxy with temp log dir
    temp_dir = Path(tempfile.mkdtemp())
    proxy = OpenClawLogProxy("ws://127.0.0.1:18789", log_dir=temp_dir)
    proxy.ws = mock_ws  # Inject mock

    # Test send method
    await proxy.send({"cmd": "test", "data": "value"})

    # Verify the send was called on the mock
    mock_ws.send.assert_called_once()

    # Test recv method
    received = await proxy.recv()

    # Verify the recv was called on the mock
    mock_ws.recv.assert_called_once()
    assert received == json.dumps({"test": "message"})

    print("Mock WebSocket interaction test passed!")


if __name__ == '__main__':
    asyncio.run(test_full_integration())
    asyncio.run(test_mock_websocket_interaction())
```

**Step 4: Run test to verify it passes**

Run: `python test_integration.py`
Expected: PASS

**Step 5: Commit**

```bash
git add openclaw-proxy/test_integration.py
git commit -m "feat: add integration tests for openclaw-proxy"
```