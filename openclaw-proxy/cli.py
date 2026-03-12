# openclaw-proxy/cli.py
"""Command-line interface for OpenClaw WebSocket logging proxy"""

import asyncio
import click
import json
from pathlib import Path
try:
    from .proxy import OpenClawLogProxy
except ImportError:
    # For direct execution
    from proxy import OpenClawLogProxy


@click.command()
@click.argument('uri')
@click.option('--log-dir', default='./logs', help='Directory to store log files')
@click.option('--token', default=None, help='Authentication token for OpenClaw Gateway')
@click.option('--verbose', '-v', is_flag=True, help='Enable verbose output')
def main(uri, log_dir, token, verbose):
    """
    OpenClaw WebSocket logging proxy.

    Connect to a WebSocket URI and log all traffic to JSONL files.
    """
    if verbose:
        click.echo(f"Connecting to {uri}")
        click.echo(f"Logging to {log_dir}")
        if token:
            click.echo("Using custom authentication token")

    # Create log directory
    Path(log_dir).mkdir(parents=True, exist_ok=True)

    # Run the proxy
    try:
        asyncio.run(run_proxy(uri, log_dir, token, verbose))
    except KeyboardInterrupt:
        click.echo("\nProxy stopped by user.")
    except Exception as e:
        click.echo(f"Error: {e}", err=True)


async def run_proxy(uri, log_dir, token, verbose):
    """Run the proxy asynchronously."""
    proxy = OpenClawLogProxy(uri, log_dir=log_dir, token=token)

    # Note: LOG_FILE is output by proxy.py via stderr, not here

    async with proxy as ws:
        if verbose:
            click.echo(f"Connected to {uri}")
            click.echo("Authenticated with OpenClaw Gateway")
            click.echo("Logging WebSocket traffic. Press Ctrl+C to stop.")

        # Simple echo loop - in real usage, this would be application-specific
        async for message in ws:
            if verbose:
                try:
                    data = json.loads(message)
                    click.echo(f"Received: {data}")
                except json.JSONDecodeError:
                    click.echo(f"Received: {message}")


def run_proxy_standalone(uri, log_dir, verbose=False):
    """Function to run the proxy without command-line interface."""
    return asyncio.run(run_proxy(uri, log_dir, verbose))


if __name__ == '__main__':
    main()