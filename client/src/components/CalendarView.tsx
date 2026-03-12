import { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, getDay, parseISO } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { Link } from 'react-router-dom';


interface TaskOccurrence {
  taskId: string;
  taskName: string;
  enabled: boolean;
  runTime: string; // ISO date
}

interface CalendarDay {
  date: Date;
  isCurrentMonth: boolean;
  isToday: boolean;
  occurrences: TaskOccurrence[];
}

const CalendarView: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<'week' | 'month'>('month');
  const [occurrencesByDate, setOccurrencesByDate] = useState<Map<string, TaskOccurrence[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);

        // Calculate date range based on current view
        const startDate = view === 'month'
          ? startOfMonth(currentDate).toISOString()
          : startOfWeek(currentDate, { weekStartsOn: 1 }).toISOString();
        const endDate = view === 'month'
          ? endOfMonth(currentDate).toISOString()
          : endOfWeek(currentDate, { weekStartsOn: 1 }).toISOString();

        const response = await fetch('/api/scheduled-tasks/calendar-range', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate,
            endDate,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch tasks: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        const tasks = result.tasks || [];

        // Build occurrences by date
        const byDate = new Map<string, TaskOccurrence[]>();

        for (const task of tasks) {
          const occurrences = task.occurrences || (task.nextRun ? [task.nextRun] : []);

          for (const runTime of occurrences) {
            const dateKey = format(parseISO(runTime), 'yyyy-MM-dd');

            if (!byDate.has(dateKey)) {
              byDate.set(dateKey, []);
            }

            byDate.get(dateKey)!.push({
              taskId: task.id,
              taskName: task.name,
              enabled: task.enabled,
              runTime,
            });
          }
        }

        setOccurrencesByDate(byDate);
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
        setError(error instanceof Error ? error.message : 'Failed to load tasks');
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, [currentDate, view]);

  const getDaysInMonth = (date: Date): CalendarDay[] => {
    const start = startOfWeek(startOfMonth(date), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(date), { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    const today = new Date();

    return days.map(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      return {
        date: day,
        isCurrentMonth: isSameMonth(day, date),
        isToday: isSameDay(day, today),
        occurrences: occurrencesByDate.get(dateKey) || [],
      };
    });
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    if (view === 'month') {
      setCurrentDate(prev => direction === 'next' ? addMonths(prev, 1) : subMonths(prev, 1));
    } else {
      setCurrentDate(prev => direction === 'next' ? addDays(prev, 7) : addDays(prev, -7));
    }
  };

  const goToToday = () => setCurrentDate(new Date());
  const daysInMonth = getDaysInMonth(currentDate);

  const weekDays = eachDayOfInterval({
    start: startOfWeek(currentDate, { weekStartsOn: 1 }),
    end: endOfWeek(currentDate, { weekStartsOn: 1 })
  });

  if (loading) {
    return <div className="calendar-container"><div className="animate-pulse">Loading...</div></div>;
  }

  if (error) {
    return <div className="calendar-container"><div className="error">{error}</div></div>;
  }

  return (
    <div className="calendar-container calendar-theme-command">
      <div className="calendar-header">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div className="flex items-center space-x-3">
            <button onClick={() => navigateDate('prev')} className="calendar-nav-btn">←</button>
            <button onClick={goToToday} className="calendar-today-btn">TODAY</button>
            <button onClick={() => navigateDate('next')} className="calendar-nav-btn">→</button>
            <h2 className="calendar-title">
              {view === 'month' ? `${format(currentDate, 'yyyy 年 MM 月', { locale: zhCN })}` : `${format(currentDate, 'yyyy 年 MM 月', { locale: zhCN })} 第${format(currentDate, 'w', { locale: zhCN })}周`}
            </h2>
          </div>
          <div className="view-toggle-buttons">
            <button className={`view-toggle-btn ${view === 'week' ? 'active' : ''}`} onClick={() => setView('week')}>WEEK</button>
            <button className={`view-toggle-btn ${view === 'month' ? 'active' : ''}`} onClick={() => setView('month')}>MONTH</button>
          </div>
        </div>
      </div>

      {view === 'month' && (
        <div className="calendar-grid calendar-month-view-gc">
          {/* Top weekday headers */}
          <div className="calendar-weekday-header">
            <div className="calendar-weekday-header-cell"></div>
            {['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'].map((day) => (
              <div key={day} className="calendar-weekday-header-cell">{day}</div>
            ))}
          </div>

          {/* Calendar days grid */}
          <div className="calendar-grid-body">
            {daysInMonth.map((day) => {
              const dayOfWeek = getDay(day.date);
              const isWeekendDay = dayOfWeek === 0 || dayOfWeek === 6;
              
              return (
                <div
                  key={day.date.toISOString()}
                  className={`calendar-day-gc ${!day.isCurrentMonth ? 'outside-month' : ''} ${day.isToday ? 'today' : ''} ${isWeekendDay ? 'weekend' : ''}`}
                >
                  <div className="calendar-day-number-gc">
                    <span className={`day-number-gc ${day.isToday ? 'today' : ''} ${isWeekendDay ? 'weekend' : ''}`}>
                      {format(day.date, 'd')}
                    </span>
                  </div>
                  <div className="calendar-day-events-gc">
                    {day.occurrences.map((occ, idx) => (
                      <Link
                        key={`${occ.taskId}-${idx}`}
                        to={`/scheduled-tasks/${occ.taskId}`}
                        className={`calendar-event-gc ${occ.enabled ? 'enabled' : 'disabled'}`}
                        title={`${occ.taskName} (${occ.enabled ? 'Enabled' : 'Disabled'})`}
                      >
                        <span className="event-time-gc">{format(parseISO(occ.runTime), 'HH:mm')}</span>
                        <span className="event-title-gc">{occ.taskName}</span>
                      </Link>
                    ))}
                    {day.occurrences.length > 4 && <div className="calendar-event-more-gc">+{day.occurrences.length - 4} more</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {view === 'week' && (
        <div className="calendar-grid">
          <div className="calendar-grid-header">
            {weekDays.map(day => (
              <div key={day.toString()} className="calendar-grid-day-header">
                <div className="font-medium text-gray-700">{format(day, 'EEE', { locale: zhCN })}</div>
                <div className={`${isSameDay(day, new Date()) ? 'text-blue-600 font-bold' : 'text-gray-900'}`}>{format(day, 'd')}</div>
              </div>
            ))}
          </div>
          <div className="calendar-grid-body">
            {weekDays.map(day => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayOccurrences = occurrencesByDate.get(dateKey) || [];
              
              return (
                <div key={day.toString()} className="calendar-day">
                  <div className="calendar-day-tasks">
                    {dayOccurrences.map((occ, idx) => (
                      <Link key={`${occ.taskId}-${idx}`} to={`/scheduled-tasks/${occ.taskId}`} className={`calendar-task ${occ.enabled ? 'enabled' : 'disabled'}`}>
                        <div className="font-medium truncate">{occ.taskName}</div>
                        <div className="text-xs opacity-75">{format(parseISO(occ.runTime), 'HH:mm')}</div>
                      </Link>
                    ))}
                    {dayOccurrences.length === 0 && <div className="text-xs text-gray-400 italic p-2 text-center">No tasks</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CalendarView;
