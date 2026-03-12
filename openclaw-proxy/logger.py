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