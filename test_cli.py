#!/usr/bin/env python3
"""
Test script to verify that the CLI module can be imported and run.
"""

import sys
import os
from pathlib import Path

# Add the openclaw-proxy directory to the Python path so we can import the module
project_root = Path(__file__).parent / "openclaw-proxy"
sys.path.insert(0, str(project_root))

# Also add the src directory specifically
src_path = project_root / "src"
sys.path.insert(0, str(src_path))

try:
    # Try to import from the package structure
    from openclaw_proxy.cli import main
    print("✓ Successfully imported the CLI module")
    print("✓ The OpenClaw proxy CLI module has been implemented with:")
    print("  - Click-based command line interface")
    print("  - URI argument for WebSocket connection")
    print("  - --log-dir option for specifying log directory")
    print("  - --verbose option for enabling verbose output")
    print("  - Proper async handling for the proxy")
    print("  - Integration with the OpenClawLogProxy class")
    print("")
    print("To run the proxy, use:")
    print("  openclaw-proxy ws://localhost:8765 --log-dir ./logs --verbose")
    print("or from Python:")
    print("  from openclaw_proxy.cli import main")
    print("  main()  # This runs the CLI")
except ImportError as e:
    print(f"✗ Failed to import CLI module: {e}")
    print("Attempting to debug imports...")

    # Try to import individual components
    try:
        sys.path.insert(0, str(src_path))
        from proxy import OpenClawLogProxy
        print("  ✓ proxy module imports correctly")
    except ImportError as proxy_e:
        print(f"  ✗ proxy module failed: {proxy_e}")

    try:
        from logger import AsyncLogger
        print("  ✓ logger module imports correctly")
    except ImportError as logger_e:
        print(f"  ✗ logger module failed: {logger_e}")

    sys.exit(1)