import { BrowserRouter as Router, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import './App.css';
import { AgentsPanel } from './components/AgentsPanel';
import { DenseSessionCard } from './components/DenseSessionCard';
import { SessionCard } from './components/SessionCard';
import { UsageBreakdownPanel } from './components/UsageBreakdownPanel';
import CalendarView from './components/CalendarView';
import ScheduledTaskDetail from './components/ScheduledTaskDetail';
import ScheduledTaskEdit from './components/ScheduledTaskEdit';
import OpenClawProxyPage from './components/OpenClawProxyPage';
import { BitOfficeEmbed } from './components/BitOfficeEmbed';
import './components/BitOfficeEmbed.css';
import { useDisplayedSessions } from './hooks/useDisplayedSessions';
import { useSessionsStream } from './hooks/useSessionsStream';
import { useSystemMetrics } from './hooks/useSystemMetrics';
import { formatTokens, formatUsd } from './utils/formatters';
import { useState } from 'react';

function AppContent() {
  const { sessions, usageTotals, connectionStatus } = useSessionsStream();
  const { visibleSessions } = useDisplayedSessions(sessions);
  const { metrics: systemMetrics } = useSystemMetrics();
  const [viewMode, setViewMode] = useState<'normal' | 'dense'>('normal');
  const costPrecision = usageTotals.totals.runningAgents > 0 ? 4 : 2;

  const location = useLocation();
  const isEmbedPage = location.pathname === '/embed';

  return (
    <div className="app">
      {/* 顶部状态栏 */}
      <header className="top-status-bar">
        <div className="brand-block">
          <span className="brand-mark">N</span>
          <div className="brand-copy">
            <h1>Nexus</h1>
            <p>Agent cockpit</p>
          </div>
        </div>
        <div className="status-metrics">
          <div className="metric-box" onClick={() => setViewMode(v => v === 'normal' ? 'dense' : 'normal')} style={{ cursor: 'pointer' }}>
            <span className="metric-label">MODE</span>
            <strong className="metric-value">{viewMode}</strong>
          </div>
          <div className="metric-box">
            <span className="metric-label">ACTIVE</span>
            <strong className="metric-value">{visibleSessions.length}</strong>
          </div>
          <div className="metric-box">
            <span className="metric-label">SOCKET</span>
            <strong className={`metric-value ${connectionStatus === 'connected' ? 'value-success' : ''}`}>{connectionStatus}</strong>
          </div>
          <div className="metric-box">
            <span className="metric-label">CPU</span>
            <strong className="metric-value">{systemMetrics ? `${systemMetrics.cpu.percentage}%` : '...'}</strong>
          </div>
          <div className="metric-box">
            <span className="metric-label">MEMORY</span>
            <strong className="metric-value">{systemMetrics ? `${systemMetrics.memory.percentage}%` : '...'}</strong>
          </div>
          <div className="metric-box">
            <span className="metric-label">TOKENS</span>
            <strong className="metric-value">{formatTokens(usageTotals.totals.totalTokens)}</strong>
          </div>
          <div className="metric-box">
            <span className="metric-label">COST</span>
            <strong className="metric-value">{formatUsd(usageTotals.totals.totalCostUsd, costPrecision)}</strong>
          </div>
        </div>
      </header>

      {/* 左侧导航栏 */}
      <aside className="side-nav">
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
          <NavLink to="/embed" className={({ isActive }) => `route-tab ${isActive ? 'is-active' : ''}`}>
            BIT Office
          </NavLink>
        </nav>
      </aside>

      <main className={`page-content ${isEmbedPage ? 'page-content-full-width' : ''}`}>
        <Routes>
        <Route
          path="/"
          element={
            <>
              <UsageBreakdownPanel usageTotals={usageTotals} />

              {viewMode === 'normal' ? (
                <div className="sessions-grid">
                  {visibleSessions.map((session) => (
                    <SessionCard key={session.sessionId} session={session} />
                  ))}
                </div>
              ) : (
                <div className="sessions-grid-dense">
                  {visibleSessions.map((session) => (
                    <DenseSessionCard key={session.sessionId} session={session} showToolEvents={false} />
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
        <Route path="/embed" element={<BitOfficeEmbed />} />
        </Routes>
      </main>

      {/* Right sidebar - Unified Agents Panel */}
      {!isEmbedPage && <AgentsPanel />}
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