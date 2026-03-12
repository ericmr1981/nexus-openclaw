# openclaw-proxy/proxy.py
import asyncio
import websockets
import json
from datetime import datetime
import os
from pathlib import Path
import aiofiles
try:
    from .logger import AsyncLogger
    from .utils import sanitize_log_data, truncate_for_summary, ensure_json_serializable
except ImportError:
    # For running as standalone script
    import sys
    sys.path.insert(0, '.')
    from logger import AsyncLogger
    from utils import sanitize_log_data, truncate_for_summary, ensure_json_serializable


# Default token from OpenClaw configuration (can be overridden)
DEFAULT_TOKEN = "fd1c17fa9248e8063d232fdb740cdf3cda6def736e3c9e35"


class OpenClawLogProxy:
    """
    An async middleware proxy that intercepts WebSocket traffic
    between clients and OpenClaw Gateway, logging all communication.
    Includes authentication support.
    """
    def __init__(self, uri, log_dir=None, token=None):
        self.uri = uri
        self.token = token or DEFAULT_TOKEN
        self.ws = None
        self.log_dir = Path(log_dir or "./logs")
        # Create log directory if it doesn't exist
        self.log_dir.mkdir(parents=True, exist_ok=True)
        # Create log file path in constructor so it's available immediately
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
        log_filename = f"session_{timestamp}.jsonl"
        self.log_file = self.log_dir / log_filename
        self.start_time = None
        self.logger = None
        self.authenticated = False

        # Output log file path immediately so parent process can capture it
        # This must happen before any async operations
        import sys
        sys.stderr.write(f"LOG_FILE:{self.log_file}\n")
        sys.stderr.flush()

    async def _authenticate(self, challenge_data):
        """
        Authenticate with the OpenClaw Gateway.
        According to the protocol, we need to send a connect request with auth in params.
        """
        import uuid

        # Get the nonce from the challenge
        payload = challenge_data.get('payload', {})
        nonce = payload.get('nonce')
        ts = payload.get('ts')
        if not nonce:
            raise ValueError("No nonce found in challenge")

        # Create connect request with auth (as per protocol spec)
        # The auth should be in params.auth, not a separate message
        # Use valid client ID and mode from GATEWAY_CLIENT_IDS and GATEWAY_CLIENT_MODES
        connect_request = {
            "type": "req",
            "id": str(uuid.uuid4()),
            "method": "connect",
            "params": {
                "minProtocol": 3,
                "maxProtocol": 3,
                "client": {
                    "id": "cli",
                    "version": "1.2.3",
                    "platform": "macos",
                    "mode": "cli"
                },
                "role": "operator",
                "scopes": ["operator.read", "operator.write"],
                "caps": [],
                "commands": [],
                "permissions": {},
                "auth": {
                    "token": self.token
                },
                "locale": "en-US",
                "userAgent": "openclaw-cli/1.2.3"
            }
        }

        # Log the auth attempt
        await self.logger.log_event("AUTH_REQUEST", {
            "nonce": nonce,
            "timestamp": ts,
            "request_id": connect_request["id"]
        })

        # Send connect request
        await self.ws.send(json.dumps(connect_request))

        # Wait for response
        return True

    async def __aenter__(self):
        # Log file path is already set in constructor (self.log_file) and was output to stderr

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

        # Handle authentication
        try:
            # Wait for challenge
            auth_response = await asyncio.wait_for(self.ws.recv(), timeout=10)
            auth_data = json.loads(auth_response)

            if auth_data.get('event') == 'connect.challenge':
                # Authenticate with the gateway
                await self._authenticate(auth_data)

                # Wait for auth result - response format is {type: "res", id: "...", ok: true/false, ...}
                result = await asyncio.wait_for(self.ws.recv(), timeout=10)
                result_data = json.loads(result)

                # Check for successful response
                if result_data.get('ok') == True:
                    self.authenticated = True
                    await self.logger.log_event("AUTH_SUCCESS", {
                        "message": "Successfully authenticated with OpenClaw Gateway"
                    })
                else:
                    error_info = result_data.get('error', {})
                    error_msg = error_info.get('message') if error_info else str(result_data)
                    raise Exception(f"Authentication failed: {error_msg}")
            else:
                # Already authenticated or no auth required
                self.authenticated = True
        except asyncio.TimeoutError:
            raise Exception("Authentication timeout - no response from gateway")
        except Exception as e:
            await self.logger.log_event("AUTH_ERROR", {
                "error": str(e)
            })
            raise

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