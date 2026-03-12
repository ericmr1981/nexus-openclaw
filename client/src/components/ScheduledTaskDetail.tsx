import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import type { ScheduledTask, TaskExecutionHistory } from '../types/scheduled-tasks';

interface ScheduledTaskDetailProps {
  taskId?: string;
}

const ScheduledTaskDetail: React.FC<ScheduledTaskDetailProps> = ({ taskId: propTaskId }) => {
  const { taskId } = useParams<{ taskId: string }>();
  const effectiveTaskId = propTaskId || taskId;
  const navigate = useNavigate();

  const [task, setTask] = useState<ScheduledTask | null>(null);
  const [history, setHistory] = useState<TaskExecutionHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!effectiveTaskId) {
      setError('No task ID provided');
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch task details
        const taskResponse = await fetch(`/api/scheduled-tasks/${effectiveTaskId}`);
        if (!taskResponse.ok) {
          throw new Error(`Failed to fetch task: ${taskResponse.status} ${taskResponse.statusText}`);
        }
        const taskData = await taskResponse.json();
        setTask(taskData.task);

        // Fetch execution history
        const historyResponse = await fetch(`/api/scheduled-tasks/${effectiveTaskId}/history`);
        if (!historyResponse.ok) {
          throw new Error(`Failed to fetch history: ${historyResponse.status} ${historyResponse.statusText}`);
        }
        const historyData = await historyResponse.json();
        setHistory(historyData.history);

      } catch (err) {
        console.error('Error fetching task details:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [effectiveTaskId]);

  const handleStateChange = async (enabled: boolean) => {
    if (!task) return;

    try {
      const response = await fetch(`/api/scheduled-tasks/${task.id}/state`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      });

      if (!response.ok) {
        throw new Error(`Failed to update task state: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      setTask(result.task);
    } catch (err) {
      console.error('Error updating task state:', err);
      alert(`Failed to update task state: ${err instanceof Error ? err.message : 'An unknown error occurred'}`);
    }
  };

  const handleEdit = () => {
    // Navigate to the edit page for this task
    if (task) {
      navigate(`/scheduled-tasks/${task.id}/edit`);
    }
  };

  const handleDelete = async () => {
    if (!task) return;

    if (!window.confirm(`Are you sure you want to delete task "${task.name}"?`)) {
      return;
    }

    try {
      const response = await fetch(`/api/scheduled-tasks/${task.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error(`Failed to delete task: ${response.status} ${response.statusText}`);
      }

      // Navigate back to calendar after successful deletion
      navigate('/scheduled-tasks');
    } catch (err) {
      console.error('Error deleting task:', err);
      alert(`Failed to delete task: ${err instanceof Error ? err.message : 'An unknown error occurred'}`);
    }
  };

  if (loading) {
    return (
      <div className="task-detail-container">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="space-y-4">
            <div className="h-4 bg-gray-200 rounded w-full"></div>
            <div className="h-4 bg-gray-200 rounded w-5/6"></div>
            <div className="h-4 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="task-detail-container">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Error: </strong>
          <span className="block sm:inline">{error}</span>
        </div>
        <button
          onClick={() => navigate('/scheduled-tasks')}
          className="task-detail-back-btn mt-4"
        >
          Back to Calendar
        </button>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="task-detail-container">
        <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded relative" role="alert">
          <strong className="font-bold">Warning: </strong>
          <span className="block sm:inline">Task not found</span>
        </div>
        <button
          onClick={() => navigate('/scheduled-tasks')}
          className="task-detail-back-btn mt-4"
        >
          Back to Calendar
        </button>
      </div>
    );
  }

  return (
    <div className="task-detail-container">
      <div className="task-detail-header">
        <h1 className="task-detail-title">Task Details</h1>
        <button
          onClick={() => navigate('/scheduled-tasks')}
          className="task-detail-back-btn"
        >
          Back to Calendar
        </button>
      </div>

      <div className="task-detail-content">
        <div className="task-detail-grid">
          <div className="task-info-section">
            <h3>Task Information</h3>

            <div className="task-field">
              <span className="task-field-label">Name</span>
              <p className="task-field-value">{task.name}</p>
            </div>

            <div className="task-field">
              <span className="task-field-label">Status</span>
              <div className="mt-1">
                <span className={`task-status-badge ${
                  task.enabled ? 'task-status-enabled' : 'task-status-disabled'
                }`}>
                  {task.enabled ? 'Enabled' : 'Disabled'}
                </span>
              </div>
            </div>

            <div className="task-field">
              <span className="task-field-label">Next Run</span>
              <p className="task-field-value">
                {task.nextRun ? format(new Date(task.nextRun), 'yyyy-MM-dd HH:mm:ss') : 'Not scheduled'}
              </p>
            </div>

            <div className="task-field">
              <span className="task-field-label">Agent ID</span>
              <p className="task-field-value font-mono">{task.agentId}</p>
            </div>

            <div className="task-field">
              <span className="task-field-label">Model</span>
              <p className="task-field-value">{task.payload?.model || 'Not specified'}</p>
            </div>

            <div className="task-field">
              <span className="task-field-label">Schedule</span>
              <p className="task-field-value font-mono">{task.schedule.expr}</p>
            </div>
          </div>

          <div className="task-actions-section">
            <h3>Actions</h3>
            <div className="task-action-buttons">
              <button
                onClick={() => handleStateChange(!task.enabled)}
                className={`task-action-btn ${task.enabled ? 'disable' : 'enable'}`}
              >
                {task.enabled ? 'Disable Task' : 'Enable Task'}
              </button>

              <button
                onClick={handleEdit}
                className="task-action-btn edit"
              >
                Edit Task
              </button>

              <button
                onClick={handleDelete}
                className="task-action-btn delete"
              >
                Delete Task
              </button>
            </div>
          </div>
        </div>

        <div className="execution-history-section">
          <h3>Recent Executions</h3>

          {history.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="execution-history-table">
                <thead>
                  <tr>
                    <th className="execution-history-th">Run ID</th>
                    <th className="execution-history-th">Created At</th>
                    <th className="execution-history-th">Size</th>
                  </tr>
                </thead>
                <tbody>
                  {history.map((execution) => (
                    <tr key={execution.runId} className="execution-history-tr">
                      <td className="execution-history-td font-mono">
                        {execution.runId.substring(0, 8)}...
                      </td>
                      <td className="execution-history-td">
                        {format(new Date(execution.createdAt), 'yyyy-MM-dd HH:mm:ss')}
                      </td>
                      <td className="execution-history-td">
                        {(execution.size / 1024).toFixed(2)} KB
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              No execution history available
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScheduledTaskDetail;