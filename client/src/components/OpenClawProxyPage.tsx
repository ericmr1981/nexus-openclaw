import React, { useState, useEffect } from 'react';
import { useSessionsStream } from '../hooks/useSessionsStream';

interface OpenClawLogEntry {
  ts: string;
  event: string;
  payload?: any;
  summary?: string;
  full_data?: any;
  duration_sec?: number;
  status?: string;
}

// Extract model from message params
const getModel = (data: any): string => {
  if (!data) return '';
  const params = data.params || {};
  // Check various locations where model might be specified
  if (params.model) return params.model;
  if (params.models && params.models[0]) return params.models[0];
  if (params.messages && params.messages[0]?.model) return params.messages[0].model;
  if (data.model) return data.model;
  return '';
};

// Extract token count from messages
const getTokenInfo = (data: any): string => {
  if (!data) return '';
  const params = data.params || {};

  // Input tokens
  if (params.inputTokens) return `in:${params.inputTokens}`;
  if (params.tokens?.input) return `in:${params.tokens.input}`;

  // Output tokens
  if (params.outputTokens) return `out:${params.outputTokens}`;
  if (params.tokens?.output) return `out:${params.tokens.output}`;

  // Message count as proxy for tokens
  if (params.messages) {
    const count = Array.isArray(params.messages) ? params.messages.length : 0;
    if (count > 0) return `${count} msgs`;
  }

  return '';
};

// Helper to extract message type from payload
const getMessageType = (log: OpenClawLogEntry): string => {
  const data = log.payload || log.full_data || {};

  // Check for different message formats
  if (data.type === 'req') return data.method || 'req';
  if (data.type === 'res') return data.ok ? '✓' : '✗';
  if (data.type === 'push') return data.event || 'push';

  return log.event;
};

// Helper to extract summary from payload (minimal version)
const getMessageSummary = (log: OpenClawLogEntry): string => {
  const data = log.payload || log.full_data || {};

  // If there's a pre-computed summary, use it
  if (log.summary) return log.summary;

  // Extract from different message formats - keep minimal
  if (data.type === 'req') {
    const params = data.params || {};
    const parts: string[] = [];

    // Add command
    if (params.command) parts.push(params.command);

    // Add model
    const model = getModel(data);
    if (model) parts.push(model);

    // Add token/message info
    const tokens = getTokenInfo(data);
    if (tokens) parts.push(tokens);

    return parts.join(' ');
  }

  if (data.type === 'res') {
    const parts: string[] = [];

    if (data.ok) {
      // For successful responses, show token usage if available
      const tokens = getTokenInfo(data);
      parts.push('ok');
      if (tokens) parts.push(tokens);
    } else {
      parts.push(`err: ${data.error?.message || 'unknown'}`);
    }
    return parts.join(' ');
  }

  // For auth/task events - keep minimal
  if (log.event === 'AUTH_SUCCESS') return 'ok';
  if (log.event === 'AUTH_ERROR') return data.error;
  if (log.event === 'TASK_END') return `${log.status === 'SUCCESS' ? '✓' : '✗'} ${log.duration_sec?.toFixed(0)}s`;

  return '';
};

// Helper to get direction icon and color
const getMessageDirection = (event: string): { icon: string; color: string; label: string } => {
  switch (event) {
    case 'SENT':
      return { icon: '→', color: '#22c55e', label: 'Sent' };
    case 'RECV':
      return { icon: '←', color: '#3b82f6', label: 'Recv' };
    case 'AUTH_REQUEST':
    case 'AUTH_SUCCESS':
    case 'AUTH_ERROR':
      return { icon: '🔐', color: '#a855f7', label: 'Auth' };
    case 'TASK_START':
    case 'TASK_END':
      return { icon: '◆', color: '#6b7280', label: 'Task' };
    default:
      return { icon: '•', color: '#9ca3af', label: event };
  }
};

// Component for a single log entry (minimal version)
const LogEntry: React.FC<{ log: OpenClawLogEntry }> = ({ log }) => {
  const [expanded, setExpanded] = useState(false);

  const direction = getMessageDirection(log.event);
  const messageType = getMessageType(log);
  const summary = getMessageSummary(log);

  const hasPayload = log.payload || log.full_data;

  return (
    <div
      className="log-entry"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '3px 6px',
        borderRadius: '2px',
        fontSize: '11px',
        fontFamily: 'monospace'
      }}
    >
      {/* Direction indicator */}
      <span style={{ color: direction.color, fontWeight: 'bold', minWidth: '16px' }}>
        {direction.icon}
      </span>

      {/* Event type badge */}
      <span style={{
        padding: '1px 4px',
        borderRadius: '2px',
        backgroundColor: direction.color,
        color: 'white',
        fontSize: '9px',
        fontWeight: '600',
        textTransform: 'uppercase'
      }}>
        {log.event}
      </span>

      {/* Message type */}
      <span style={{ color: '#374151', fontWeight: 500 }}>
        {messageType}
      </span>

      {/* Summary */}
      {summary && (
        <span style={{ color: '#6b7280' }}>
          {summary}
        </span>
      )}

      {/* Expand toggle */}
      {hasPayload && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: 'none',
            border: 'none',
            color: '#9ca3af',
            fontSize: '9px',
            cursor: 'pointer',
            padding: '0 4px',
            marginLeft: 'auto'
          }}
        >
          {expanded ? '▲' : '▼'}
        </button>
      )}

      {/* Expanded payload */}
      {expanded && hasPayload && (
        <pre style={{
          width: '100%',
          margin: '4px 0 0',
          padding: '4px',
          backgroundColor: '#1f2937',
          color: '#e5e7eb',
          borderRadius: '2px',
          fontSize: '10px',
          overflow: 'auto',
          maxHeight: '150px'
        }}>
          {JSON.stringify(log.payload || log.full_data, null, 2)}
        </pre>
      )}
    </div>
  );
};

const OpenClawProxyPage: React.FC = () => {
  const { sessions } = useSessionsStream(); // Get available sessions
  const [selectedAgent, setSelectedAgent] = useState<string>('');
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [logs, setLogs] = useState<OpenClawLogEntry[]>([]);
  const [logFilePath, setLogFilePath] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  // Filter OpenClaw sessions - include any session with 'openclaw' in tool name or that is from OpenClaw
  // Also include sessions with 'openclaw' in agentId or sessionId
  const openclawSessions = Array.from(sessions.values()).filter(session =>
    session.tool?.toLowerCase().includes('openclaw') ||
    session.tool?.toLowerCase() === 'openclaw' ||
    session.name?.toLowerCase().includes('openclaw') ||
    session.sessionId?.toLowerCase().includes('openclaw') ||
    (session.agentId && session.agentId.toLowerCase().includes('openclaw'))
  );

  // For debugging: show all sessions to help diagnose what's available
  const allSessions = Array.from(sessions.values());

  // Toggle recording
  const toggleRecording = async () => {
    if (!selectedAgent) {
      setError('Please select an agent first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isRecording) {
        // Stop recording
        const response = await fetch('/api/openclaw-proxy/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ sessionId: selectedAgent }),
        });

        if (response.ok) {
          setIsRecording(false);
          setLogFilePath('');
          setLogs([]); // Clear logs when stopping
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to stop recording');
        }
      } else {
        // Start recording
        const response = await fetch('/api/openclaw-proxy/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: selectedAgent,
            logDir: './logs' // This could be configurable
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setLogFilePath(data.logFile);
          setIsRecording(true);
        } else {
          const errorData = await response.json();
          setError(errorData.error || 'Failed to start recording');
        }
      }
    } catch (error) {
      console.error('Error toggling recording:', error);
      // Show more detailed error message
      const errorMessage = error instanceof Error ? error.message : String(error);
      setError(`Network error: ${errorMessage}`);
    } finally {
      setLoading(false);
    }
  };

  // Load logs when log file path changes or periodically when recording
  useEffect(() => {
    if (!logFilePath) return;

    const loadLogs = async () => {
      try {
        const response = await fetch(`/api/openclaw-proxy/logs?path=${encodeURIComponent(logFilePath)}`);
        if (response.ok) {
          const result = await response.json();
          if (result.logs) {
            setLogs(result.logs);
          }
        }
      } catch (error) {
        console.error('Error loading logs:', error);
      }
    };

    // Poll for updates every 2 seconds when recording
    const interval = isRecording ? setInterval(loadLogs, 2000) : null;
    loadLogs(); // Initial load

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [logFilePath, isRecording]);

  // Update recording status when component mounts/unmounts
  useEffect(() => {
    const checkRecordingStatus = async () => {
      try {
        const response = await fetch('/api/openclaw-proxy/status');
        if (response.ok) {
          const data = await response.json();
          if (data.activeProxies && data.activeProxies.length > 0) {
            // If there's an active proxy, set the recording state
            const activeProxy = data.activeProxies[0]; // Could be improved to handle multiple
            setIsRecording(true);
            setSelectedAgent(activeProxy.sessionId);
            setLogFilePath(activeProxy.logFile);
          }
        }
      } catch (error) {
        console.error('Error checking recording status:', error);
      }
    };

    checkRecordingStatus();
  }, []);

  return (
    <div className="openclaw-proxy-page">
      <div className="page-header">
        <h1>OpenClaw WebSocket Proxy</h1>
        <p>Monitor and record OpenClaw WebSocket traffic in real-time</p>
      </div>

      <div className="control-panel">
        <div className="form-group">
          <label htmlFor="agent-select">Select OpenClaw Agent:</label>
          <select
            id="agent-select"
            value={selectedAgent}
            onChange={(e) => {
              setSelectedAgent(e.target.value);
              setError(''); // Clear error when changing selection
            }}
            className="form-control"
            disabled={loading}
          >
            <option value="">-- Select an OpenClaw agent --</option>
            {openclawSessions.length > 0 ? (
              openclawSessions.map((session) => (
                <option key={session.sessionId} value={session.sessionId}>
                  {session.tool?.toUpperCase()}: {session.agentId || session.name || session.sessionId}
                  {session.model && ` (${session.model})`}
                </option>
              ))
            ) : (
              <option value="" disabled>
                No OpenClaw sessions available
              </option>
            )}
          </select>
          {/* Debug info: show all sessions for troubleshooting */}
          {allSessions.length > 0 && (
            <details style={{ marginTop: '8px', fontSize: '12px' }}>
              <summary>Debug: All sessions ({allSessions.length})</summary>
              <ul style={{ paddingLeft: '20px', margin: '4px 0' }}>
                {allSessions.slice(0, 10).map((session) => (
                  <li key={session.sessionId}>
                    {session.tool}: {session.agentId || 'no agentId'} - {session.name || session.sessionId}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>

        <div className="form-group">
          <button
            onClick={toggleRecording}
            className={`btn ${isRecording ? 'btn-danger' : 'btn-success'}`}
            disabled={!selectedAgent || loading}
          >
            {loading ? 'Processing...' : isRecording ? '⏹️ Stop Recording' : '⏺️ Start Recording'}
          </button>
        </div>

        {error && (
          <div className="error-message">
            <p style={{ color: 'red' }}>{error}</p>
          </div>
        )}

        {logFilePath && (
          <div className="log-path-info">
            <small>Log file: {logFilePath}</small>
          </div>
        )}
      </div>

      <div className="logs-display">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <h2>Live Logs</h2>
          {logs.length > 0 && (
            <div style={{ fontSize: '11px', color: '#6b7280' }}>
              {logs.length} {isRecording && <span style={{ color: '#22c55e' }}>●</span>}
            </div>
          )}
        </div>
        <div className="logs-container">
          {logs.length > 0 ? (
            <div className="logs-list" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {logs.slice(-50).map((log, index) => (
                <LogEntry key={`${log.ts}-${index}`} log={log} />
              ))}
            </div>
          ) : (
            <div className="empty-logs">
              {isRecording ? (
                <p>Waiting for logs...</p>
              ) : (
                'Select an agent and start recording'
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpenClawProxyPage;