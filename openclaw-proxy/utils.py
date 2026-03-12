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