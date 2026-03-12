import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import type { ScheduledTask } from '../types/scheduled-tasks';

interface ScheduledTaskEditProps {
  taskId?: string;
}

const ScheduledTaskEdit: React.FC<ScheduledTaskEditProps> = ({ taskId: propTaskId }) => {
  const { taskId } = useParams<{ taskId: string }>();
  const effectiveTaskId = propTaskId || taskId;
  const navigate = useNavigate();

  const [task, setTask] = useState<ScheduledTask | null>(null);
  const [formData, setFormData] = useState<Partial<ScheduledTask>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    if (!effectiveTaskId) {
      setError('No task ID provided');
      setLoading(false);
      return;
    }

    const fetchTask = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/scheduled-tasks/${effectiveTaskId}`);

        if (!response.ok) {
          throw new Error(`Failed to fetch task: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        const taskData = result.task;

        setTask(taskData);
        setFormData({
          name: taskData.name,
          enabled: taskData.enabled,
          schedule: taskData.schedule,
          payload: taskData.payload,
          agentId: taskData.agentId
        });
      } catch (err) {
        console.error('Error fetching task:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchTask();
  }, [effectiveTaskId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;

    if (type === 'checkbox') {
      const checkbox = e.target as HTMLInputElement;
      setFormData(prev => ({ ...prev, [name]: checkbox.checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleScheduleChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      schedule: {
        ...(prev.schedule || {}),
        [field]: value
      } as ScheduledTask['schedule']
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const response = await fetch(`/api/scheduled-tasks/${effectiveTaskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        throw new Error(`Failed to update task: ${response.status} ${response.statusText}`);
      }

      setSaveSuccess(true);

      // Redirect to task detail after a brief delay
      setTimeout(() => {
        navigate(`/scheduled-tasks/${effectiveTaskId}`);
      }, 1500);
    } catch (err) {
      console.error('Error updating task:', err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    }
  };

  if (loading) {
    return (
      <div className="task-edit-container">
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
      <div className="task-edit-container">
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
      <div className="task-edit-container">
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
    <div className="task-edit-container">
      <div className="task-detail-header">
        <h1 className="task-detail-title">Edit Task</h1>
        <button
          onClick={() => navigate(-1)} // Go back to previous page
          className="task-detail-back-btn"
        >
          Cancel
        </button>
      </div>

      {saveSuccess && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Success: </strong>
          <span className="block sm:inline">Task updated successfully!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="task-edit-form">
        <div className="task-edit-grid">
          <div className="task-info-section">
            <h3>Task Information</h3>

            <div className="task-field">
              <label htmlFor="name" className="task-field-label">Name</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name || ''}
                onChange={handleChange}
                className="task-field-input"
                required
              />
            </div>

            <div className="task-field">
              <label className="task-field-label">Status</label>
              <div className="mt-2">
                <label className="inline-flex items-center">
                  <input
                    type="checkbox"
                    name="enabled"
                    checked={formData.enabled || false}
                    onChange={(e) => handleChange(e)}
                    className="form-checkbox h-4 w-4 text-blue-600"
                  />
                  <span className="ml-2">Enabled</span>
                </label>
              </div>
            </div>

            <div className="task-field">
              <label htmlFor="agentId" className="task-field-label">Agent ID</label>
              <input
                type="text"
                id="agentId"
                name="agentId"
                value={formData.agentId || ''}
                onChange={handleChange}
                className="task-field-input"
              />
            </div>

            <div className="task-field">
              <label className="task-field-label">Schedule Type</label>
              <select
                value={formData.schedule?.kind || ''}
                onChange={(e) => handleScheduleChange('kind', e.target.value)}
                className="task-field-input"
              >
                <option value="cron">Cron</option>
                <option value="at">At</option>
                <option value="every">Every</option>
              </select>
            </div>

            {formData.schedule?.kind === 'cron' && (
              <div className="task-field">
                <label htmlFor="cronExpr" className="task-field-label">Cron Expression</label>
                <input
                  type="text"
                  id="cronExpr"
                  value={formData.schedule?.expr || ''}
                  onChange={(e) => handleScheduleChange('expr', e.target.value)}
                  className="task-field-input"
                  placeholder="e.g., 0 3 * * *"
                />
              </div>
            )}

            {formData.schedule?.kind === 'at' && (
              <div className="task-field">
                <label htmlFor="atTime" className="task-field-label">At Time (ISO)</label>
                <input
                  type="datetime-local"
                  id="atTime"
                  value={formData.schedule?.at ? new Date(formData.schedule.at).toISOString().slice(0, 16) : ''}
                  onChange={(e) => handleScheduleChange('at', e.target.value)}
                  className="task-field-input"
                />
              </div>
            )}

            {formData.schedule?.kind === 'every' && (
              <>
                <div className="task-field">
                  <label htmlFor="everyMs" className="task-field-label">Interval (ms)</label>
                  <input
                    type="number"
                    id="everyMs"
                    value={formData.schedule?.everyMs || ''}
                    onChange={(e) => handleScheduleChange('everyMs', e.target.value)}
                    className="task-field-input"
                    placeholder="e.g., 1800000 (30 minutes)"
                  />
                </div>
                <div className="task-field">
                  <label htmlFor="anchorMs" className="task-field-label">Anchor Time (ms)</label>
                  <input
                    type="number"
                    id="anchorMs"
                    value={formData.schedule?.anchorMs || ''}
                    onChange={(e) => handleScheduleChange('anchorMs', e.target.value)}
                    className="task-field-input"
                    placeholder="e.g., 1772616600000"
                  />
                </div>
              </>
            )}

            <div className="task-field">
              <label htmlFor="timezone" className="task-field-label">Timezone</label>
              <input
                type="text"
                id="timezone"
                value={formData.schedule?.tz || ''}
                onChange={(e) => handleScheduleChange('tz', e.target.value)}
                className="task-field-input"
                placeholder="e.g., Asia/Shanghai"
              />
            </div>
          </div>

          <div className="task-payload-section">
            <h3>Payload Configuration</h3>

            <div className="task-field">
              <label htmlFor="model" className="task-field-label">Model</label>
              <input
                type="text"
                id="model"
                value={formData.payload?.model || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  payload: {
                    ...(prev.payload || {}),
                    model: e.target.value
                  }
                }))}
                className="task-field-input"
                placeholder="e.g., Aliyuncs/qwen3.5-plus"
              />
            </div>

            <div className="task-field">
              <label htmlFor="message" className="task-field-label">Message/Task Description</label>
              <textarea
                id="message"
                value={formData.payload?.message || ''}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  payload: {
                    ...(prev.payload || {}),
                    message: e.target.value
                  }
                }))}
                className="task-field-textarea"
                rows={8}
                placeholder="Task description goes here..."
              />
            </div>
          </div>
        </div>

        <div className="task-edit-actions">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="task-action-btn cancel"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="task-action-btn save"
          >
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
};

export default ScheduledTaskEdit;