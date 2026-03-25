import { useEffect, useMemo, useRef, useState } from 'react';
import type { Session } from '../types/nexus';

type RenderableSession = Session & { state: 'active' | 'idle' };

function isRenderableSession(session: Session): session is RenderableSession {
  return session.state === 'active' || session.state === 'idle';
}

export type SessionSortMode = 'activity' | 'name';

export function useDisplayedSessions(
  sessions: Map<string, Session>,
  sortMode: SessionSortMode = 'name',
  pinnedAgents: string[] = []
) {
  const [displayedSessionIds, setDisplayedSessionIds] = useState<Set<string>>(new Set());
  const queueRef = useRef<Session[]>([]);
  const previousSessionsRef = useRef<Map<string, Session>>(new Map());

  useEffect(() => {
    const previousSessions = previousSessionsRef.current;

    const renderableSessions: RenderableSession[] = [];
    const renderableIds = new Set<string>();

    sessions.forEach((session) => {
      if (!isRenderableSession(session)) return;
      renderableSessions.push(session);
      renderableIds.add(session.sessionId);
    });

    const sessionsToQueue: Session[] = [];
    renderableSessions.forEach((session) => {
      if (!previousSessions.has(session.sessionId)) {
        sessionsToQueue.push(session);
      }
    });
    // Queue order only affects how new cards fade in. Keep it stable to reduce UI jumping.
    sessionsToQueue.sort((a, b) => a.name.localeCompare(b.name) || (a.lastModified - b.lastModified));

    if (sessionsToQueue.length > 0) {
      queueRef.current.push(...sessionsToQueue);
    }

    queueRef.current = queueRef.current.filter((session) => renderableIds.has(session.sessionId));

    setDisplayedSessionIds((prev) => {
      let changed = false;
      const next = new Set<string>();

      prev.forEach((sessionId) => {
        if (renderableIds.has(sessionId)) {
          next.add(sessionId);
        } else {
          changed = true;
        }
      });

      return changed ? next : prev;
    });

    previousSessionsRef.current = new Map(sessions);
  }, [sessions]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (queueRef.current.length > 0) {
        const session = queueRef.current.shift();
        if (!session) return;
        setDisplayedSessionIds((prev) => {
          if (prev.has(session.sessionId)) return prev;
          return new Set([...prev, session.sessionId]);
        });
      }
    }, 150);

    return () => window.clearInterval(interval);
  }, []);

  const visibleSessions = useMemo(() => {
    const base = Array.from(sessions.values())
      .filter(isRenderableSession)
      .filter((session) => displayedSessionIds.has(session.sessionId));

    const stateOrder = { active: 0, idle: 1 } as const;
    const pinned = new Set(pinnedAgents.map((s) => s.trim()).filter(Boolean));

    const pinCompare = (a: Session, b: Session) => {
      const ap = pinned.has(a.agentId || '') ? 0 : 1;
      const bp = pinned.has(b.agentId || '') ? 0 : 1;
      return ap - bp;
    };

    if (sortMode === 'activity') {
      return base.sort((a, b) => {
        const pin = pinCompare(a, b);
        if (pin !== 0) return pin;

        const activityCompare = b.lastModified - a.lastModified;
        if (activityCompare !== 0) return activityCompare;

        const stateCompare = stateOrder[a.state] - stateOrder[b.state];
        if (stateCompare !== 0) return stateCompare;

        return a.name.localeCompare(b.name);
      });
    }

    // Default: stable, readable ordering (prevents cards from constantly jumping)
    return base.sort((a, b) => {
      const pin = pinCompare(a, b);
      if (pin !== 0) return pin;

      const stateCompare = stateOrder[a.state] - stateOrder[b.state];
      if (stateCompare !== 0) return stateCompare;

      const nameCompare = a.name.localeCompare(b.name);
      if (nameCompare !== 0) return nameCompare;

      return b.lastModified - a.lastModified;
    });
  }, [displayedSessionIds, sessions, sortMode, pinnedAgents.join('|')]);

  return {
    visibleSessions
  };
}
