import { BrowserRouter as Router, Routes, Route, NavLink } from 'react-router-dom';
import './App.css';
import { DenseSessionCard } from './components/DenseSessionCard';
import { HeaderMetrics } from './components/HeaderMetrics';
import { SessionCard } from './components/SessionCard';
import { UsageBreakdownPanel } from './components/UsageBreakdownPanel';
import CalendarView from './components/CalendarView';
import ScheduledTaskDetail from './components/ScheduledTaskDetail';
import ScheduledTaskEdit from './components/ScheduledTaskEdit';
import OpenClawProxyPage from './components/OpenClawProxyPage';
import { useDisplayedSessions } from './hooks/useDisplayedSessions';
import { useSessionsStream } from './hooks/useSessionsStream';
import { useThemeMode } from './hooks/useThemeMode';
import { useSystemMetrics } from './hooks/useSystemMetrics';
import type { ViewMode } from './types/nexus';
import { useState } from 'react';

function AppContent() {
  const { sessions, usageTotals, connectionStatus } = useSessionsStream();
  const { theme, handleThemeTogglePointerDown, handleThemeToggleChange } = useThemeMode();
  const { visibleSessions } = useDisplayedSessions(sessions);
  const { metrics: systemMetrics } = useSystemMetrics();
  const [showToolEvents, setShowToolEvents] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('normal');

  return (
    <div className="app">
      <header className="page-nav-shell">
        <div className="page-nav">
          <div className="brand-block">
            <span className="brand-mark">N</span>
            <div className="brand-copy">
              <h1>Nexus Console</h1>
              <p>Agent orchestration cockpit</p>
            </div>
          </div>
          <nav className="route-tabs" aria-label="Primary">
            <NavLink to="/" end className={({ isActive }) => `route-tab ${isActive ? 'is-active' : ''}`}>
              Sessions
            </NavLink>
            <NavLink to="/scheduled-tasks" className={({ isActive }) => `route-tab ${isActive ? 'is-active' : ''}`}>
              Scheduled Tasks
            </NavLink>
            <NavLink to="/openclaw-proxy" className={({ isActive }) => `route-tab ${isActive ? 'is-active' : ''}`}>
              OpenClaw Proxy
            </NavLink>
          </nav>
          <div className="header-mini-metrics">
            <div>
              <span>Active</span>
              <strong>{visibleSessions.length}</strong>
            </div>
            <div>
              <span>Socket</span>
              <strong>{connectionStatus}</strong>
            </div>
            <div>
              <span>CPU</span>
              <strong>{systemMetrics ? `${systemMetrics.cpu.percentage}%` : '...'}</strong>
            </div>
            <div>
              <span>Memory</span>
              <strong>{systemMetrics ? `${systemMetrics.memory.percentage}%` : '...'}</strong>
            </div>
            <div>
              <span>Mode</span>
              <strong>{viewMode}</strong>
            </div>
          </div>
        </div>
      </header>

      <main className="page-content">
        <Routes>
        <Route
          path="/"
          element={
            <>
              <HeaderMetrics
                theme={theme}
                usageTotals={usageTotals}
                connectionStatus={connectionStatus}
                showToolEvents={showToolEvents}
                viewMode={viewMode}
                onThemeTogglePointerDown={handleThemeTogglePointerDown}
                onThemeToggleChange={handleThemeToggleChange}
                onShowToolEventsChange={setShowToolEvents}
                onViewModeChange={setViewMode}
              />

              <UsageBreakdownPanel usageTotals={usageTotals} />

              {viewMode === 'normal' ? (
                <div className="sessions-grid">
                  {visibleSessions.map((session) => (
                    <SessionCard key={session.sessionId} session={session} showToolEvents={showToolEvents} />
                  ))}
                </div>
              ) : (
                <div className="sessions-grid-dense">
                  {visibleSessions.map((session) => (
                    <DenseSessionCard key={session.sessionId} session={session} showToolEvents={showToolEvents} />
                  ))}
                </div>
              )}

              {visibleSessions.length === 0 && connectionStatus === 'connected' && (
                <div className="empty-state">
                  <p>No active sessions</p>
                  <p className="hint">Open a Claude Code, Codex, or OpenClaw session to see it here</p>
                </div>
              )}
            </>
          }
        />
        <Route path="/scheduled-tasks" element={<CalendarView />} />
        <Route path="/scheduled-tasks/:taskId" element={<ScheduledTaskDetail />} />
        <Route path="/scheduled-tasks/:taskId/edit" element={<ScheduledTaskEdit />} />
        <Route path="/openclaw-proxy" element={<OpenClawProxyPage />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AppContent />
    </Router>
  );
}

export default App;
