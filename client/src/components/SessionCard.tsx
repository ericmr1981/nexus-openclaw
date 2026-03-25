import { useEffect, useRef, useState } from 'react';
import { TOOL_CONFIG } from '../constants/tools';
import type { Session } from '../types/nexus';
import { getMessageKind } from '../utils/message-kind';
import { MarkdownLite } from './MarkdownLite';
import { ToolEvent } from './ToolEvent';

interface SessionCardProps {
  session: Session;
  pinnedAgents?: string[];
  onTogglePin?: (agentId: string) => void;
  showToolEvents?: boolean;
}

type MessageViewMode = 'all' | 'messages' | 'operations' | 'memory';

// Check if content is memory-related
const isMemoryRelated = (content: string): boolean => {
  const lower = content.toLowerCase();
  return lower.includes('memory_') ||
         lower.includes('memory:') ||
         lower.includes('[memory') ||
         lower.includes('memories');
};

// Format timestampMs to readable time string with 12-hour format
const formatTime = (timestampMs?: number): string => {
  if (!timestampMs) return '';
  const date = new Date(timestampMs);
  let hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12; // Convert to 12-hour format
  return `${hours}:${minutes} ${ampm}`;
};

// Note: showToolEvents prop is deprecated; viewMode now controls filtering
export function SessionCard({ session, pinnedAgents = [], onTogglePin }: SessionCardProps) {
  const toolConfig = TOOL_CONFIG[session.tool] || TOOL_CONFIG['claude-code'];
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [followTail, setFollowTail] = useState(true);
  const [hasNewSincePause, setHasNewSincePause] = useState(false);
  const lastSeenModifiedRef = useRef<number>(session.lastModified);
  const [isEntering, setIsEntering] = useState(true);
  const [viewMode, setViewMode] = useState<MessageViewMode>('all');

  // Debug logging for OpenClaw sessions
  if (session.tool === 'openclaw') {
    const shouldShowMeta = !!(session.agentId || session.model);
    console.log('[SessionCard DEBUG] OpenClaw session:', {
      sessionId: session.sessionId?.substring(0, 8),
      agentId: session.agentId,
      model: session.model,
      agentIdType: typeof session.agentId,
      modelType: typeof session.model,
      shouldShowMeta,
      agentIdTruthy: !!session.agentId,
      modelTruthy: !!session.model
    });
  }

  const shouldShowMeta = !!(session.agentId || session.model);
  console.log('[SessionCard DEBUG] shouldShowMeta:', shouldShowMeta, 'for', session.sessionId?.substring(0, 8));

  // Helper to extract timestamp from OpenClaw message content
  const extractTimestampFromContent = (content: string): number | null => {
    console.log('[extractTimestampFromContent] Input length:', content.length);

    // Try different timestamp patterns
    const patterns = [
      /"timestamp"[^"]*"([^"]+)"/,  // "timestamp": "Sun 2026-03-15 23:18 GMT+8"
      /"ts"[^"]*"([^"]+)"/,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match && match[1]) {
        const tsStr = match[1];
        console.log('[extractTimestampFromContent] Found timestamp string:', tsStr);

        // Try direct parse first
        let ts = Date.parse(tsStr);
        console.log('[extractTimestampFromContent] Date.parse result:', ts);

        if (ts) return ts;

        // Try to parse "Sun 2026-03-15 23:18 GMT+8" format
        const dateMatch = tsStr.match(/(\w+)\s+(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
        console.log('[extractTimestampFromContent] Regex match:', dateMatch);

        if (dateMatch) {
          const [, , year, month, day, hour, minute] = dateMatch;
          console.log('[extractTimestampFromContent] Parsed:', { year, month, day, hour, minute });
          const parsed = new Date(`${year}-${month}-${day}T${hour}:${minute}:00`);
          console.log('[extractTimestampFromContent] Final timestamp:', parsed.getTime());
          if (parsed.getTime()) return parsed.getTime();
        }
      }
    }
    console.log('[extractTimestampFromContent] No timestamp found');
    return null;
  };

  // Helper to extract clean text from OpenClaw message
  const extractCleanText = (content: string): string => {
    const lines = content.split('\n');
    const cleanLines: string[] = [];
    let inCodeBlock = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (trimmed === '```json' || trimmed === '```') {
        inCodeBlock = !inCodeBlock;
        continue;
      }

      if (inCodeBlock) continue;

      if (trimmed.includes('<relevant-memories>') || trimmed.includes('[UNTRUSTED DATA')) continue;
      if (trimmed.includes('</relevant-memories>') || trimmed.includes('[END UNTRUSTED DATA]')) continue;

      if (trimmed.startsWith('sent') && trimmed.length < 10) continue;
      if (trimmed.startsWith('received') && trimmed.length < 15) continue;
      if (trimmed.includes('Conversation info')) continue;
      if (trimmed.includes('(untrusted metadata)')) continue;
      if (trimmed.startsWith('Sender (untrusted')) continue;
      if (trimmed === 'json' || trimmed === '`') continue;
      if (trimmed.startsWith('{') && trimmed.endsWith('}')) continue;
      if (trimmed.startsWith('"message_id"') || trimmed.startsWith('"sender_id"') ||
          trimmed.startsWith('"sender"') || trimmed.startsWith('"timestamp"') ||
          trimmed.startsWith('"label"') || trimmed.startsWith('"id"') || trimmed.startsWith('"name"')) continue;
      if (trimmed.startsWith('[other:agent:') || trimmed.startsWith('[fact:agent:')) continue;
      if (trimmed.includes('%, vector+BM25')) continue;
      if (trimmed.startsWith('Keywords:') || trimmed.startsWith('Session Key:') ||
          trimmed.startsWith('Session:') || trimmed.startsWith('Agent:') ||
          trimmed.startsWith('Source:') || trimmed.startsWith('Memory Type:')) continue;
      if (trimmed === '{' || trimmed === '}' || trimmed === ',') continue;

      if (trimmed && trimmed.length > 0) {
        cleanLines.push(trimmed);
      }
    }

    return cleanLines.join('\n').trim();
  };

  // For OpenClaw, preprocess messages: extract clean text and timestamp for TEXT messages only
  // Tool events (non-text) are kept as-is so "All Info" filter works correctly
  const processedMessages = session.tool === 'openclaw'
    ? (() => {
        const seen = new Map<string, { text: string; timestampMs: number | undefined }>();
        const textResults: Array<{ role: string; content: string; timestampMs?: number }> = [];
        const toolEvents: typeof session.messages = [];

        console.log('[OpenClaw Processing] Starting with', session.messages.length, 'messages');

        for (const message of session.messages) {
          const kind = getMessageKind(message.content);

          // Tool events are kept as-is (not deduplicated, not cleaned)
          if (kind !== 'text') {
            toolEvents.push(message);
            continue;
          }

          const cleanText = extractCleanText(message.content);
          if (!cleanText) {
            console.log('[OpenClaw Processing] Skipped empty message');
            continue;
          }

          // Extract timestamp from message or content
          let ts = message.timestampMs;
          if (!ts) {
            ts = extractTimestampFromContent(message.content) || undefined;
          }
          console.log('[OpenClaw Processing] Message timestamp:', ts, 'from role:', message.role);

          // Deduplicate by clean text - keep the one with latest timestamp
          const existing = seen.get(cleanText);
          if (existing) {
            if (ts && (!existing.timestampMs || ts > existing.timestampMs)) {
              console.log('[OpenClaw Processing] Updating timestamp for duplicate message');
              seen.set(cleanText, { text: cleanText, timestampMs: ts });
            }
          } else {
            console.log('[OpenClaw Processing] Adding new message with timestamp:', ts);
            seen.set(cleanText, { text: cleanText, timestampMs: ts });
          }
        }

        // Convert text messages map back to array preserving order
        for (const message of session.messages) {
          if (getMessageKind(message.content) !== 'text') continue;

          const cleanText = extractCleanText(message.content);
          const entry = seen.get(cleanText);
          if (entry) {
            textResults.push({
              role: message.role,
              content: entry.text,
              timestampMs: entry.timestampMs
            });
            seen.delete(cleanText); // Only add once
          }
        }

        // Combine text messages and tool events, preserving original order
        const result = [...textResults, ...toolEvents];
        console.log('[OpenClaw Processing] Final result:', result.length, 'messages (', textResults.length, 'text +', toolEvents.length, 'tool events)');

        return result;
      })()
    : session.messages;

  const visibleMessages = processedMessages
    .filter((message) => (message.content || '').trim().length > 0)
    .filter((message) => {
      const kind = getMessageKind(message.content);
      const isMemory = isMemoryRelated(message.content);
      if (viewMode === 'all') return true;
      if (viewMode === 'messages') return kind === 'text';
      if (viewMode === 'operations') return kind !== 'text' && !isMemory;
      if (viewMode === 'memory') return isMemory;
      return true;
    });

  const hiddenToolEventCount = session.messages.filter((message) => (message.content || '').trim().length > 0 && getMessageKind(message.content) !== 'text').length;
  const hiddenNonMemoryCount = session.messages.filter((message) => {
    const content = message.content || '';
    return content.trim().length > 0 &&
           getMessageKind(content) !== 'text' &&
           !isMemoryRelated(content);
  }).length;
  const memoryCount = session.messages.filter((message) => (message.content || '').trim().length > 0 && isMemoryRelated(message.content)).length;

  useEffect(() => {
    const timer = window.setTimeout(() => setIsEntering(false), 400);
    return () => window.clearTimeout(timer);
  }, []);

  const isNearBottom = () => {
    const el = messagesContainerRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < 80;
  };

  useEffect(() => {
    // When streaming updates arrive, message count may not change, but lastModified will.
    // FollowTail keeps the view pinned to the newest content unless the user scrolls up.
    if (!followTail) return;

    setHasNewSincePause(false);
    lastSeenModifiedRef.current = session.lastModified;
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [followTail, session.lastModified, visibleMessages.length, viewMode]);

  useEffect(() => {
    // If user paused (scrolled up), and new data arrives, show a subtle indicator.
    if (followTail) return;
    if (session.lastModified > lastSeenModifiedRef.current) {
      setHasNewSincePause(true);
    }
  }, [followTail, session.lastModified]);

  const cardClass = `session-card ${isEntering ? 'card-entering' : ''} ${session.state === 'active' ? 'card-active' : ''} ${session.state === 'cooling' ? 'card-exiting' : ''}`;

  return (
    <div
      className={cardClass}
      style={{
        borderColor: session.state === 'active' ? toolConfig.borderColor : undefined
      }}
    >
      {/* Header - always shown */}
      <div className="session-header">
        <span className="session-tool" style={{ color: toolConfig.color }}>
          {toolConfig.label}
        </span>
        <span className="session-name">{session.name}</span>
        {(session.agentId || session.model) && (
          <span className="session-meta">
            {session.agentId && <span className="session-meta-badge">{session.agentId}</span>}
            {session.model && <span className="session-meta-badge">{session.model}</span>}
          </span>
        )}
        <span className={`session-state state-${session.state}`}>{session.state.toUpperCase()}</span>
        {session.agentId && (
          <button
            className={`pin-btn ${pinnedAgents.includes(session.agentId) ? 'is-pinned' : ''}`}
            onClick={() => onTogglePin?.(session.agentId!)}
            title={pinnedAgents.includes(session.agentId) ? 'Unpin this agent' : 'Pin this agent'}
          >
            {pinnedAgents.includes(session.agentId) ? 'PINNED' : 'PIN'}
          </button>
        )}
        <button
          className={`follow-btn ${followTail ? 'is-following' : 'is-paused'} ${hasNewSincePause ? 'has-new' : ''}`}
          onClick={() => {
            setFollowTail(true);
            setHasNewSincePause(false);
            lastSeenModifiedRef.current = session.lastModified;
            window.requestAnimationFrame(() => {
              messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
            });
          }}
          title={followTail ? 'Following newest output (auto-scroll)' : (hasNewSincePause ? 'New output arrived (click to jump to latest)' : 'Paused (scroll up to read; click to follow newest)')}
        >
          {followTail ? 'FOLLOW' : (hasNewSincePause ? 'NEW' : 'PAUSED')}
        </button>
      </div>

      <div
        className="messages"
        ref={messagesContainerRef}
        onScroll={() => {
          if (isNearBottom()) {
            // Auto-resume following when the user scrolls back to the bottom.
            if (!followTail) {
              setFollowTail(true);
              setHasNewSincePause(false);
              lastSeenModifiedRef.current = session.lastModified;
            }
          } else {
            // Stop auto-follow when the user scrolls up.
            if (followTail) {
              setFollowTail(false);
              lastSeenModifiedRef.current = session.lastModified;
            }
          }
        }}
      >
        {visibleMessages.map((message, idx) => {
          const timeStr = formatTime(message.timestampMs);
          const isTextMessage = getMessageKind(message.content) === 'text';

          // Debug: log OpenClaw message structure
          if (session.tool === 'openclaw' && idx < 3) {
            console.log('[OpenClaw Message]', {
              idx,
              role: message.role,
              hasTimestamp: !!message.timestampMs,
              timeStr,
              contentPreview: message.content.substring(0, 80)
            });
          }

          return (
            <div key={idx} className={`message message-${message.role}`}>
              {isTextMessage ? (
                <>
                  <div className="message-header">
                    {message.role === 'user' ? (
                      <span className="message-label">sent</span>
                    ) : (
                      <>
                        <span className="message-label">received</span>
                        {timeStr && <span className="message-time">{timeStr}</span>}
                      </>
                    )}
                  </div>
                  <div className="message-content">
                    <MarkdownLite content={message.content} />
                  </div>
                </>
              ) : (
                <ToolEvent content={message.content} />
              )}
            </div>
          );
        })}
        {visibleMessages.length === 0 && hiddenToolEventCount > 0 && viewMode !== 'messages' && viewMode !== 'memory' && (
          <div className="message message-assistant">
            <div className="message-role">Info</div>
            <div className="message-content">
              {viewMode === 'operations'
                ? `Showing ${hiddenNonMemoryCount} tool events (${memoryCount} memory events in Memory tab).`
                : `No text messages yet. Enable Tool events to view ${hiddenToolEventCount} tool events.`
              }
            </div>
          </div>
        )}
        {visibleMessages.length === 0 && viewMode === 'memory' && (
          <div className="message message-assistant">
            <div className="message-role">Info</div>
            <div className="message-content">
              {memoryCount > 0
                ? `No memory operations found in current filter.`
                : `No memory operations in this session.`
              }
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* View mode filter buttons - always visible for easy switching */}
      <div className="session-card-filters">
        <button
          className={`filter-btn ${viewMode === 'all' ? 'active' : ''}`}
          onClick={() => setViewMode('all')}
          title="Show all information"
        >
          All Info
        </button>
        <button
          className={`filter-btn ${viewMode === 'messages' ? 'active' : ''}`}
          onClick={() => setViewMode('messages')}
          title="Show only sent/received messages"
        >
          Messages
        </button>
        <button
          className={`filter-btn ${viewMode === 'operations' ? 'active' : ''}`}
          onClick={() => setViewMode('operations')}
          title="Show only agent operations"
        >
          Operations
        </button>
        <button
          className={`filter-btn ${viewMode === 'memory' ? 'active' : ''}`}
          onClick={() => setViewMode('memory')}
          title="Show only memory operations"
        >
          Memory {memoryCount > 0 && `(${memoryCount})`}
        </button>
      </div>
    </div>
  );
}
