import { useEffect, useState } from 'react';
import './AgentsPanel.css';

export interface AgentStatus {
  agentId: string;
  status: 'working' | 'idle' | 'offline';
  statusColor: 'green' | 'yellow' | 'gray' | 'red';
  sessionCount: number;
  fullPath?: string;
}

export interface AgentCategory {
  key: string;
  title: string;
  agents: AgentStatus[];
  defaultExpanded?: boolean;
}

export interface AgentsResponse {
  categories: AgentCategory[];
  totalAgents: number;
}

export function AgentsPanel() {
  const [data, setData] = useState<AgentsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});

  useEffect(() => {
    fetchAgents();
    const interval = setInterval(fetchAgents, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchAgents = async () => {
    try {
      const response = await fetch('/api/agents');
      const result = await response.json();
      setData(result);

      // Initialize expanded state from defaultExpanded
      if (result.categories) {
        setExpandedSections(prev => {
          const next = { ...prev };
          for (const cat of result.categories) {
            if (!(cat.key in next)) {
              next[cat.key] = cat.defaultExpanded ?? false;
            }
          }
          return next;
        });
      }
    } catch (error) {
      console.error('Failed to fetch agents:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'working':
        return 'Working';
      case 'idle':
        return 'Idle';
      case 'offline':
        return 'Offline';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <aside className="agents-panel">
        <div className="agents-empty">Loading...</div>
      </aside>
    );
  }

  return (
    <aside className="agents-panel">
      <div className="agents-panel-header">
        <h3>Agents</h3>
        <span className="agent-count">{data?.totalAgents || 0}</span>
      </div>

      <div className="agents-list">
        {data?.categories.map((category) => {
          const isExpanded = expandedSections[category.key] ?? category.defaultExpanded ?? false;

          return (
            <div key={category.key} className="agent-category">
              <button
                className="category-header"
                onClick={() => toggleSection(category.key)}
                aria-expanded={isExpanded}
              >
                <div className="category-title">
                  <span className="category-name">{category.title}</span>
                  <span className="category-badge">{category.agents.length}</span>
                </div>
                <span className={`category-chevron ${isExpanded ? 'expanded' : ''}`}>
                  ▶
                </span>
              </button>

              {isExpanded && (
                <div className="category-content">
                  {category.agents.length === 0 ? (
                    <div className="agent-empty">No agents</div>
                  ) : (
                    category.agents.map((agent) => (
                      <div
                        key={agent.agentId}
                        className="agent-item"
                        title={agent.fullPath || undefined}
                      >
                        <div className="agent-info">
                          <span className="agent-name" title={agent.agentId}>
                            {agent.agentId}
                          </span>
                          {agent.sessionCount > 0 && (
                            <span className="agent-sessions">
                              {agent.sessionCount}
                            </span>
                          )}
                        </div>
                        <div className="agent-status-row">
                          <span className={`status-label status-${agent.statusColor}`}>
                            {getStatusLabel(agent.status)}
                          </span>
                          <span className={`status-dot status-${agent.statusColor}`} />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="agents-legend">
        <div className="legend-item">
          <span className="legend-dot status-green" />
          <span>Working</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot status-yellow" />
          <span>Idle</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot status-gray" />
          <span>Offline</span>
        </div>
        <div className="legend-item">
          <span className="legend-dot status-red" />
          <span>Busy</span>
        </div>
      </div>
    </aside>
  );
}
