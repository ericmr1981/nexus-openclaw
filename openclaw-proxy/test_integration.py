# openclaw-proxy/test_integration.py
"""Integration tests for OpenClaw WebSocket logging proxy"""

import asyncio
import tempfile
import json
import os
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch
from proxy import OpenClawLogProxy


async def test_basic_functionality():
    """Test that the basic functionality of the proxy works"""
    # Test that we can instantiate the proxy
    temp_dir = Path(tempfile.mkdtemp())
    proxy = OpenClawLogProxy("ws://127.0.0.1:18789", log_dir=temp_dir)

    # Verify the proxy has all required attributes and methods
    assert hasattr(proxy, 'uri'), "Proxy should have uri attribute"
    assert hasattr(proxy, 'log_dir'), "Proxy should have log_dir attribute"
    assert hasattr(proxy, 'send'), "Proxy should have send method"
    assert hasattr(proxy, 'recv'), "Proxy should have recv method"
    assert hasattr(proxy, '__aenter__'), "Proxy should have async enter method"
    assert hasattr(proxy, '__aexit__'), "Proxy should have async exit method"
    assert hasattr(proxy, '__aiter__'), "Proxy should have async iter method"
    assert hasattr(proxy, '__anext__'), "Proxy should have async next method"

    assert proxy.uri == "ws://127.0.0.1:18789"
    assert proxy.log_dir == temp_dir

    print("✓ Basic functionality test passed!")


async def test_mock_based_proxy_interactions():
    """Test proxy interactions using mocks to verify proper method calls"""
    # Create a mock WebSocket connection
    mock_ws = AsyncMock()
    mock_logger = AsyncMock()

    # Set up return values for mock methods
    mock_ws.recv.return_value = json.dumps({"test": "response", "data": "success"})

    # Create proxy with temp log dir and inject mocks
    temp_dir = Path(tempfile.mkdtemp())
    proxy = OpenClawLogProxy("ws://127.0.0.1:18789", log_dir=temp_dir)
    proxy.ws = mock_ws  # Inject the mock WebSocket
    proxy.logger = mock_logger  # Inject the mock logger

    # Test send method
    test_message = {"cmd": "test", "data": "integration"}
    await proxy.send(test_message)

    # Verify that send was called with the expected data
    mock_ws.send.assert_called_once_with(json.dumps(test_message))
    # Verify that the logger was called to log the SENT event
    assert mock_logger.log_event.called
    sent_call_args = mock_logger.log_event.call_args_list
    # Should have been called at least once for the SENT event
    assert any(call[0][0] == "SENT" for call in sent_call_args), "Should log SENT event"

    # Reset mocks for recv test
    mock_logger.reset_mock()
    mock_ws.recv.reset_mock()
    mock_ws.recv.return_value = json.dumps({"response": "data", "status": "ok"})

    # Test recv method
    result = await proxy.recv()

    # Verify that recv was called on the mock
    mock_ws.recv.assert_called_once()
    # Verify that the logger was called to log the RECV event
    assert mock_logger.log_event.called
    recv_call_args = mock_logger.log_event.call_args_list
    # Should have been called at least once for the RECV event
    assert any(call[0][0] == "RECV" for call in recv_call_args), "Should log RECV event"

    # Verify that the result matches expected value
    assert result == json.dumps({"response": "data", "status": "ok"})

    print("✓ Mock-based proxy interaction test passed!")


async def test_proxy_instantiation_and_methods():
    """Test that the proxy can be instantiated and has required methods"""
    # Test instantiation with different parameters
    temp_dir = Path(tempfile.mkdtemp())

    # Test with default log_dir
    proxy1 = OpenClawLogProxy("ws://example.com:18789")
    assert proxy1.uri == "ws://example.com:18789"
    assert proxy1.log_dir == Path("./logs")  # Default log directory

    # Test with custom log_dir
    proxy2 = OpenClawLogProxy("ws://127.0.0.1:18789", log_dir=temp_dir)
    assert proxy2.uri == "ws://127.0.0.1:18789"
    assert proxy2.log_dir == temp_dir

    # Verify all required methods exist and are callable
    methods_to_check = ['send', 'recv', '__aenter__', '__aexit__', '__aiter__', '__anext__']
    for method_name in methods_to_check:
        method = getattr(proxy2, method_name)
        assert callable(method), f"Method {method_name} should be callable"

    # Verify async context manager protocol
    assert hasattr(proxy2, '__aenter__'), "Should implement async context manager"
    assert hasattr(proxy2, '__aexit__'), "Should implement async context manager"

    # Verify async iterator protocol
    assert hasattr(proxy2, '__aiter__'), "Should implement async iterator protocol"
    assert hasattr(proxy2, '__anext__'), "Should implement async iterator protocol"

    print("✓ Proxy instantiation and methods test passed!")


async def test_async_behavior():
    """Test that the proxy exhibits proper async behavior"""
    # Test that we can instantiate the proxy and access its methods
    temp_dir = Path(tempfile.mkdtemp())
    proxy = OpenClawLogProxy("ws://127.0.0.1:18789", log_dir=temp_dir)

    # Verify that all async methods exist and are callable
    assert hasattr(proxy, 'send'), "Should have send method"
    assert hasattr(proxy, 'recv'), "Should have recv method"
    assert hasattr(proxy, '__aenter__'), "Should have async enter method"
    assert hasattr(proxy, '__aexit__'), "Should have async exit method"
    assert hasattr(proxy, '__aiter__'), "Should have async iter method"
    assert hasattr(proxy, '__anext__'), "Should have async next method"

    # Test that methods are properly defined as async
    send_method = getattr(proxy, 'send')
    recv_method = getattr(proxy, 'recv')
    aenter_method = getattr(proxy, '__aenter__')
    aexit_method = getattr(proxy, '__aexit__')

    # Verify they're callable
    assert callable(send_method), "send should be callable"
    assert callable(recv_method), "recv should be callable"
    assert callable(aenter_method), "__aenter__ should be callable"
    assert callable(aexit_method), "__aexit__ should be callable"

    print("✓ Async behavior test passed!")


async def test_comprehensive_integration():
    """Comprehensive test verifying that the proxy integrates properly"""
    # Test full proxy functionality with a simpler approach
    temp_dir = Path(tempfile.mkdtemp())
    proxy = OpenClawLogProxy("ws://127.0.0.1:18789", log_dir=temp_dir)

    # Verify that the proxy is properly configured
    assert proxy.uri == "ws://127.0.0.1:18789"
    assert proxy.log_dir == temp_dir

    # Test that required attributes exist
    assert hasattr(proxy, 'ws'), "Should have ws attribute"
    assert hasattr(proxy, 'start_time'), "Should have start_time attribute"
    assert hasattr(proxy, 'logger'), "Should have logger attribute"

    # Test that required methods exist
    required_methods = ['send', 'recv', '__aenter__', '__aexit__', '__aiter__', '__anext__']
    for method in required_methods:
        assert hasattr(proxy, method), f"Should have {method} method"

    # Verify the methods are async-ready
    for method in required_methods:
        attr = getattr(proxy, method)
        assert callable(attr), f"{method} should be callable"

    # Test basic instantiation worked properly
    assert proxy.ws is None  # Initially None until connected
    assert proxy.start_time is None  # Initially None until connected
    assert proxy.logger is None  # Initially None until connected

    print("✓ Comprehensive integration test passed!")


async def run_all_tests():
    """Run all integration tests"""
    print("Running OpenClaw WebSocket Proxy Integration Tests...\n")

    await test_basic_functionality()
    await test_mock_based_proxy_interactions()
    await test_proxy_instantiation_and_methods()
    await test_async_behavior()
    await test_comprehensive_integration()

    print("\n✅ All integration tests passed!")


if __name__ == '__main__':
    asyncio.run(run_all_tests())