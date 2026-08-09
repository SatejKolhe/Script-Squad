import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useTaskTimer } from '../hooks/useTaskTimer';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  pointerWithin,
  rectIntersection,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api } from '../contexts/AuthContext';
import Modal, { ConfirmModal } from '../components/Modal';
import toast from 'react-hot-toast';
import { format, isPast, isToday } from 'date-fns';
import { io } from 'socket.io-client';
import './ProjectDetail.css';

const COLUMNS = [
  { id: 'todo', label: 'Todo', color: '#64748b' },
  { id: 'inprogress', label: 'In Progress', color: '#2563eb' },
  { id: 'done', label: 'Done', color: '#10b981' },
];

const PRIORITY_OPTIONS = [
  { value: 'high', label: 'High' },
  { value: 'medium', label: 'Medium' },
  { value: 'low', label: 'Low' },
];

const defaultTaskForm = {
  title: '', description: '', priority: 'medium', dueDate: '', status: 'todo', isPrivate: true,
};

// --- Format ms as HH:MM:SS clock ---
function formatMsClock(ms) {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const hours   = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const pad = (n) => String(n).padStart(2, '0');
  if (hours > 0) return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
  return `${pad(minutes)}:${pad(seconds)}`;
}

// --- Project-level live time aggregator ---
function ProjectTimePanel({ tasks }) {
  const inProgressTasks = tasks.filter((t) => t.status === 'inprogress');
  const [totalMs, setTotalMs] = useState(0);

  useEffect(() => {
    const compute = () => {
      let ms = 0;
      for (const t of tasks) {
        ms += t.totalTimeSpent || 0;
        if (t.status === 'inprogress' && t.timerStartedAt) {
          ms += Date.now() - new Date(t.timerStartedAt).getTime();
        }
      }
      return Math.max(0, ms);
    };

    setTotalMs(compute());
    const interval = setInterval(() => setTotalMs(compute()), 1000);
    return () => clearInterval(interval);
  }, [tasks]);

  const hours   = Math.floor(totalMs / 3600000);
  const minutes = Math.floor((totalMs % 3600000) / 60000);
  const seconds = Math.floor((totalMs % 60000) / 1000);
  const pad = (n) => String(n).padStart(2, '0');

  const timeStr = hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;

  const isActive = inProgressTasks.length > 0;

  return (
    <div className={`project-time-panel ${isActive ? 'project-time-panel-active' : ''}`}>
      <div className="project-time-panel-header">
        {isActive && <span className="project-time-dot" />}
        <span className="project-time-panel-icon">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
          </svg>
        </span>
        <span className="project-time-panel-label">Time Invested</span>
      </div>
      <div className="project-time-panel-clock">{timeStr}</div>
      {isActive && (
        <div className="project-time-panel-sub">
          {inProgressTasks.length} task{inProgressTasks.length > 1 ? 's' : ''} running
        </div>
      )}
      {!isActive && totalMs === 0 && (
        <div className="project-time-panel-sub">No time tracked yet</div>
      )}
    </div>
  );
}

// --- Sortable Task Card ---
function TaskCard({ task, onEdit, onDelete, onStatusChange, onTogglePrivacy, isMobile = false, isDragging = false }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging: isSelf } = useSortable({
    id: task._id,
    data: { type: 'task', task },
    disabled: isMobile,
  });

  const { totalMs } = useTaskTimer({
    timerStartedAt: task.timerStartedAt,
    totalTimeSpent: task.totalTimeSpent,
    status: task.status,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSelf ? 0.3 : 1,
  };

  const overdue = task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'done';
  const dueSoon = task.dueDate && isToday(new Date(task.dueDate)) && task.status !== 'done';
  const isInProgress = task.status === 'inprogress';
  const hasTime = isInProgress || (task.totalTimeSpent && task.totalTimeSpent > 0);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isMobile ? {} : attributes)}
      {...(isMobile ? {} : listeners)}
      className={`task-card ${isDragging ? 'dragging' : ''} ${isInProgress ? 'task-card-inprogress' : ''} ${isMobile ? 'is-mobile-card' : ''}`}
    >
      <div className="task-card-header" style={{ marginBottom: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span className={`badge badge-${task.priority}`}>{task.priority}</span>
          <button 
            className="btn-icon btn-sm" 
            style={{ padding: '2px 4px', fontSize: '0.85rem' }}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onTogglePrivacy && onTogglePrivacy(task); }}
            title={task.isPrivate ? "Private Task" : "Public Task"}
          >
            {task.isPrivate ? '🔒' : '🌐'}
          </button>
        </div>
        
        {/* On Mobile: Quick Status Select */}
        {isMobile && (
          <select
            className="task-mobile-status-select"
            value={task.status}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => e.stopPropagation()}
            onChange={(e) => { e.stopPropagation(); onStatusChange(task, e.target.value); }}
            title="Change task status"
          >
            <option value="todo">Todo</option>
            <option value="inprogress">In Progress</option>
            <option value="done">Done</option>
          </select>
        )}

        <div className="task-card-actions">
          <button
            className="btn-icon btn-sm"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onEdit(task); }}
            title="Edit task"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
          </button>
          <button
            className="btn-icon btn-sm"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); onDelete(task); }}
            title="Delete task"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
            </svg>
          </button>
        </div>
      </div>

      <h4 className="task-card-title">{task.title}</h4>
      {task.description && (
        <p className="task-card-desc">{task.description}</p>
      )}

      {task.assignees && task.assignees.length > 0 && (
        <div style={{ display: 'flex', gap: '0.35rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
          {task.assignees.map(u => {
            const isUserObj = u && typeof u === 'object';
            const name = isUserObj ? (u.name || 'Assignee') : 'Assignee';
            const avatar = isUserObj ? u.avatar : null;
            const initials = name !== 'Assignee' ? name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2) : '?';
            const keyId = isUserObj ? u._id : u;

            return (
              <div 
                key={keyId} 
                title={name}
                style={{
                  width: '24px', height: '24px', borderRadius: '50%', 
                  background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', 
                  fontSize: '0.65rem', fontWeight: 700, flexShrink: 0, overflow: 'hidden'
                }}
              >
                {avatar ? (
                  <img 
                    src={avatar} 
                    alt={name} 
                    style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                    onError={(e) => {
                      e.target.style.display = 'none';
                      if (e.target.parentNode) {
                        e.target.parentNode.innerText = initials;
                      }
                    }}
                  />
                ) : initials}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Enhanced Timer Display ─────────────────────────────────────────── */}
      {hasTime && (
        <div className={`task-timer-wrap ${isInProgress ? 'task-timer-wrap-running' : 'task-timer-wrap-paused'}`}>
          {isInProgress && (
            <div className="task-timer-header">
              <span className="task-timer-dot" />
              <span className="task-timer-status-text">LIVE TIMER</span>
            </div>
          )}
          <div className="task-timer-clock">
            {formatMsClock(totalMs)}
          </div>
          {!isInProgress && totalMs > 0 && (
            <div className="task-timer-total-label">time invested</div>
          )}
        </div>
      )}

      {task.dueDate && (
        <div
          className="task-card-due"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            color: overdue ? '#ef4444' : dueSoon ? '#f59e0b' : 'var(--text-muted)'
          }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
          </svg>
          {format(new Date(task.dueDate), 'MMM d, yyyy')}
          {overdue && ' • Overdue!'}
          {dueSoon && ' • Due today!'}
        </div>
      )}
    </div>
  );
}

// --- Kanban Column ---
function KanbanColumn({ column, tasks, onEdit, onDelete, onAddTask, onStatusChange, onTogglePrivacy, isMobile = false }) {
  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    disabled: isMobile,
  });

  const renderColIcon = (id) => {
    if (id === 'todo') {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"/><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
        </svg>
      );
    }
    if (id === 'inprogress') {
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
        </svg>
      );
    }
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>
      </svg>
    );
  };

  return (
    <div
      ref={setNodeRef}
      className={`kanban-column ${isOver ? 'column-is-over' : ''}`}
      data-status={column.id}
    >
      <div className="kanban-column-header">
        <div className="kanban-column-title" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ color: column.color, display: 'inline-flex' }}>{renderColIcon(column.id)}</span>
          <span>{column.label}</span>
          <span className="kanban-count">{tasks.length}</span>
        </div>
        <button
          className="btn-icon btn-sm"
          onClick={() => onAddTask(column.id)}
          title={`Add task to ${column.label}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
      </div>

      <div className="kanban-column-body">
        <SortableContext items={tasks.map((t) => t._id)} strategy={verticalListSortingStrategy} disabled={isMobile}>
          {tasks.map((task) => (
            <TaskCard key={task._id} task={task} onEdit={onEdit} onDelete={onDelete} onStatusChange={onStatusChange} onTogglePrivacy={onTogglePrivacy} isMobile={isMobile} />
          ))}
        </SortableContext>
        {tasks.length === 0 && (
          <div className="kanban-empty" onClick={() => onAddTask(column.id)}>
            <span>+</span>
            <p>Add a task</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Main ProjectDetail ---
export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const socketRef = useRef(null);

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [taskForm, setTaskForm] = useState(defaultTaskForm);
  const [formErrors, setFormErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activeTask, setActiveTask] = useState(null);
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 768 : false
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  );

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleQuickStatusChange = async (task, newStatus) => {
    if (task.status === newStatus) return;
    try {
      const res = await api.put(`/tasks/${task._id}`, { status: newStatus });
      setTasks((prev) => prev.map((t) => (t._id === task._id ? res.data.data : t)));
      socketRef.current?.emit('task-updated', { projectId: id, task: res.data.data });
      toast.success(`Task moved to ${COLUMNS.find((c) => c.id === newStatus)?.label || newStatus}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleTogglePrivacy = async (task) => {
    try {
      const res = await api.put(`/tasks/${task._id}`, { isPrivate: !task.isPrivate });
      setTasks((prev) => prev.map((t) => (t._id === task._id ? res.data.data : t)));
      socketRef.current?.emit('task-updated', { projectId: id, task: res.data.data });
      toast.success(`Task is now ${res.data.data.isPrivate ? 'Private' : 'Public'}`);
    } catch {
      toast.error('Failed to update privacy');
    }
  };


  useEffect(() => {
    loadProject();
    // Fetch team members to display in header
    api.get('/team').then((res) => setTeamMembers(res.data.data || [])).catch(() => {});
    // Socket.io
    socketRef.current = io('/', { path: '/socket.io' });
    socketRef.current.emit('join-project', id);
    socketRef.current.on('task-updated', (data) => {
      setTasks((prev) => prev.map((t) => t._id === data.task._id ? data.task : t));
    });
    socketRef.current.on('task-created', (data) => {
      setTasks((prev) => [...prev, data.task]);
    });
    socketRef.current.on('task-deleted', (data) => {
      setTasks((prev) => prev.filter((t) => t._id !== data.taskId));
    });
    return () => {
      socketRef.current?.emit('leave-project', id);
      socketRef.current?.disconnect();
    };
  }, [id]);

  const loadProject = async () => {
    try {
      const [projRes, tasksRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/tasks?project=${id}`),
      ]);
      setProject(projRes.data.data);
      setTasks(tasksRes.data.data);
    } catch (err) {
      if (err.response?.status === 404) {
        toast.error('Project not found');
        navigate('/projects');
      } else {
        toast.error('Failed to load project');
      }
    } finally {
      setLoading(false);
    }
  };

  const getColumnTasks = (status) => {
    return tasks
      .filter((t) => t.status === status)
      .filter((t) => !search || t.title.toLowerCase().includes(search.toLowerCase()))
      .filter((t) => !priorityFilter || t.priority === priorityFilter)
      .filter((t) => {
        if (!assigneeFilter) return true;
        if (assigneeFilter === 'unassigned') return !t.assignees || t.assignees.length === 0;
        return t.assignees?.some((a) => a._id === assigneeFilter);
      })
      .sort((a, b) => a.order - b.order);
  };

  const openCreateTask = (status = 'todo') => {
    setEditingTask(null);
    setTaskForm({ ...defaultTaskForm, status });
    setFormErrors({});
    setShowTaskModal(true);
  };

  const openEditTask = (task) => {
    setEditingTask(task);
    setTaskForm({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate ? task.dueDate.split('T')[0] : '',
      isPrivate: task.isPrivate,
    });
    setFormErrors({});
    setShowTaskModal(true);
  };

  const validateTask = () => {
    const e = {};
    if (!taskForm.title.trim()) e.title = 'Title is required';
    else if (taskForm.title.length > 200) e.title = 'Max 200 characters';
    return e;
  };

  const handleSaveTask = async () => {
    const errors = validateTask();
    if (Object.keys(errors).length) { setFormErrors(errors); return; }
    setSaving(true);
    try {
      if (editingTask) {
        const res = await api.put(`/tasks/${editingTask._id}`, taskForm);
        setTasks((prev) => prev.map((t) => t._id === editingTask._id ? res.data.data : t));
        socketRef.current?.emit('task-updated', { projectId: id, task: res.data.data });
        toast.success('Task updated!');
      } else {
        const res = await api.post('/tasks', { ...taskForm, project: id });
        setTasks((prev) => [...prev, res.data.data]);
        socketRef.current?.emit('task-created', { projectId: id, task: res.data.data });
        toast.success('Task created!');
      }
      setShowTaskModal(false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/tasks/${deleteTarget._id}`);
      setTasks((prev) => prev.filter((t) => t._id !== deleteTarget._id));
      socketRef.current?.emit('task-deleted', { projectId: id, taskId: deleteTarget._id });
      toast.success('Task deleted');
      setDeleteTarget(null);
    } catch {
      toast.error('Failed to delete task');
    }
  };

  // --- DnD Handlers ---
  const initialTasksRef = useRef(null);

  const findContainer = (id) => {
    if (!id) return null;
    if (COLUMNS.some((col) => col.id === id)) {
      return id;
    }
    const task = tasks.find((t) => t._id === id);
    return task ? task.status : null;
  };

  const collisionDetectionStrategy = useCallback((args) => {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) {
      return pointerCollisions;
    }
    const rectCollisions = rectIntersection(args);
    if (rectCollisions.length > 0) {
      return rectCollisions;
    }
    return closestCorners(args);
  }, []);

  const handleDragStart = ({ active }) => {
    initialTasksRef.current = [...tasks];
    const task = tasks.find((t) => t._id === active.id);
    setActiveTask(task || null);
  };

  const handleDragOver = ({ active, over }) => {
    if (!over) return;
    const activeId = active.id;
    const overId = over.id;
    if (activeId === overId) return;

    const activeContainer = findContainer(activeId);
    const overContainer = findContainer(overId);

    if (!activeContainer || !overContainer || activeContainer === overContainer) {
      return;
    }

    setTasks((prev) =>
      prev.map((t) => (t._id === activeId ? { ...t, status: overContainer } : t))
    );
  };

  const handleDragEnd = async ({ active, over }) => {
    setActiveTask(null);
    if (!over) {
      if (initialTasksRef.current) {
        setTasks(initialTasksRef.current);
      }
      initialTasksRef.current = null;
      return;
    }

    const activeId = active.id;
    const overId = over.id;

    const overContainer = findContainer(overId);
    if (!overContainer) {
      if (initialTasksRef.current) {
        setTasks(initialTasksRef.current);
      }
      initialTasksRef.current = null;
      return;
    }

    setTasks((prevTasks) => {
      const updated = prevTasks.map((t) =>
        t._id === activeId ? { ...t, status: overContainer } : t
      );

      const containerTasks = updated
        .filter((t) => t.status === overContainer)
        .sort((a, b) => a.order - b.order);

      const oldIndex = containerTasks.findIndex((t) => t._id === activeId);
      let newIndex = containerTasks.findIndex((t) => t._id === overId);

      let reorderedContainerTasks = containerTasks;

      if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
        reorderedContainerTasks = arrayMove(containerTasks, oldIndex, newIndex);
      }

      const containerTasksMap = new Map();
      COLUMNS.forEach((col) => {
        let colTasks;
        if (col.id === overContainer) {
          colTasks = reorderedContainerTasks;
        } else {
          colTasks = updated
            .filter((t) => t.status === col.id)
            .sort((a, b) => a.order - b.order);
        }
        colTasks.forEach((t, i) => {
          containerTasksMap.set(t._id, { ...t, status: col.id, order: i });
        });
      });

      const finalAllTasks = updated.map((t) => containerTasksMap.get(t._id) || t);

      const reorderPayload = Array.from(containerTasksMap.values()).map((t) => ({
        _id: t._id,
        status: t.status,
        order: t.order,
      }));

      api.put('/tasks/reorder/bulk', { tasks: reorderPayload })
        .then((res) => {
          if (res.data?.data) {
            const serverMap = new Map(res.data.data.map((t) => [t._id, t]));
            setTasks((curr) =>
              curr.map((t) => (serverMap.has(t._id) ? { ...t, ...serverMap.get(t._id) } : t))
            );
          }
        })
        .catch(() => {
          toast.error('Failed to save order');
          if (initialTasksRef.current) {
            setTasks(initialTasksRef.current);
          }
        })
        .finally(() => {
          initialTasksRef.current = null;
        });

      return finalAllTasks;
    });
  };

  const handleDragCancel = () => {
    setActiveTask(null);
    if (initialTasksRef.current) {
      setTasks(initialTasksRef.current);
    }
    initialTasksRef.current = null;
  };

  if (loading) {
    return <div className="page-container"><div className="loading-overlay"><div className="spinner spinner-lg" /></div></div>;
  }

  if (!project) return null;

  const completedCount = tasks.filter((t) => t.status === 'done').length;
  const completionPct = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="page-container animate-fadeIn">
      {/* Project header */}
      <div className="project-detail-header">
        <div className="project-detail-info">
          <Link to="/projects" className="back-link">← Projects</Link>
          <div className="flex items-center gap-3">
            <div className="project-detail-dot" style={{ background: project.color }} />
            <div>
              <h1 className="project-detail-title">{project.title}</h1>
              {project.description && (
                <p className="project-detail-desc">{project.description}</p>
              )}
            </div>
          </div>
          <div className="project-detail-stats">
            <span className="badge badge-active">{project.status}</span>
            <span className="text-sm text-muted">{tasks.length} tasks</span>
            <span className="text-sm" style={{ color: project.color }}>{completionPct}% complete</span>
            {/* Team member avatar stack */}
            {teamMembers.length > 0 && (
              <div className="project-members-stack">
                {teamMembers.slice(0, 5).map((m) => (
                  <div
                    key={m._id}
                    className="project-member-avatar"
                    title={m.name}
                    style={{ background: `hsl(${m._id.charCodeAt(0) * 37 % 360}, 60%, 55%)` }}
                  >
                    {m.avatar
                      ? <img src={m.avatar} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} />
                      : m.name?.[0]?.toUpperCase()
                    }
                  </div>
                ))}
                {teamMembers.length > 5 && (
                  <div className="project-member-avatar project-member-overflow">
                    +{teamMembers.length - 5}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ⏱ Project-level Time Panel */}
          <ProjectTimePanel tasks={tasks} />
        </div>

        <div className="project-detail-actions">
          {/* Search */}
          <div className="search-bar">
            <span>🔍</span>
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              id="task-search"
            />
          </div>
          {/* Priority filter */}
          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            id="priority-filter"
          >
            <option value="">All Priorities</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          {/* Assignee filter */}
          <select
            className="form-select"
            style={{ width: 'auto' }}
            value={assigneeFilter}
            onChange={(e) => setAssigneeFilter(e.target.value)}
          >
            <option value="">All Assignees</option>
            <option value="unassigned">Unassigned</option>
            {teamMembers.map(m => (
              <option key={m._id} value={m._id}>{m.name}</option>
            ))}
          </select>
          <button id="add-task-btn" className="btn btn-primary" onClick={() => openCreateTask()}>
            + Add Task
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="project-progress-bar-wrap">
        <div className="progress-bar" style={{ height: '8px' }}>
          <div
            className="progress-fill"
            style={{ width: `${completionPct}%`, background: project.color }}
          />
        </div>
      </div>

      {/* Kanban Board */}
      <DndContext
        sensors={isMobile ? [] : sensors}
        collisionDetection={collisionDetectionStrategy}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="kanban-board">
          {COLUMNS.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              tasks={getColumnTasks(col.id)}
              onEdit={openEditTask}
              onDelete={(task) => setDeleteTarget(task)}
              onAddTask={openCreateTask}
              onStatusChange={handleQuickStatusChange}
              onTogglePrivacy={handleTogglePrivacy}
              isMobile={isMobile}
            />
          ))}
        </div>


        <DragOverlay>
          {activeTask ? (
            <div className="task-card dragging-overlay">
              <div className="task-card-header">
                <span className={`badge badge-${activeTask.priority}`}>{activeTask.priority}</span>
              </div>
              <h4 className="task-card-title">{activeTask.title}</h4>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Task Modal */}
      <Modal
        isOpen={showTaskModal}
        onClose={() => setShowTaskModal(false)}
        title={editingTask ? 'Edit Task' : 'New Task'}
        footer={
          <>
            <button className="btn btn-secondary" onClick={() => setShowTaskModal(false)}>Cancel</button>
            <button
              id="save-task-btn"
              className="btn btn-primary"
              onClick={handleSaveTask}
              disabled={saving}
            >
              {saving ? <><div className="spinner spinner-sm" /> Saving...</> : editingTask ? 'Save Changes' : 'Create Task'}
            </button>
          </>
        }
      >
        <div className="form-group">
          <label className="form-label">Task Title *</label>
          <input
            id="task-title-input"
            type="text"
            className={`form-input ${formErrors.title ? 'error' : ''}`}
            placeholder="What needs to be done?"
            value={taskForm.title}
            onChange={(e) => { setTaskForm((p) => ({ ...p, title: e.target.value })); setFormErrors((p) => ({ ...p, title: '' })); }}
            autoFocus
          />
          {formErrors.title && <span className="form-error">{formErrors.title}</span>}
        </div>

        <div className="form-group">
          <label className="form-label">Description</label>
          <textarea
            className="form-textarea"
            placeholder="Optional details..."
            value={taskForm.description}
            onChange={(e) => setTaskForm((p) => ({ ...p, description: e.target.value }))}
          />
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Priority</label>
            <select
              className="form-select"
              value={taskForm.priority}
              onChange={(e) => setTaskForm((p) => ({ ...p, priority: e.target.value }))}
            >
              {PRIORITY_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              className="form-select"
              value={taskForm.status}
              onChange={(e) => setTaskForm((p) => ({ ...p, status: e.target.value }))}
            >
              <option value="todo">📋 Todo</option>
              <option value="inprogress">🚀 In Progress</option>
              <option value="done">✅ Done</option>
            </select>
          </div>
        </div>

        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">Due Date</label>
            <input
              type="date"
              className="form-input"
              value={taskForm.dueDate}
              onChange={(e) => setTaskForm((p) => ({ ...p, dueDate: e.target.value }))}
            />
          </div>
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '1.5rem' }}>
            <input
              type="checkbox"
              id="task-privacy-toggle"
              checked={taskForm.isPrivate}
              onChange={(e) => setTaskForm((p) => ({ ...p, isPrivate: e.target.checked }))}
            />
            <label htmlFor="task-privacy-toggle" className="form-label" style={{ margin: 0 }}>
              Private Task (Only visible to Assignees and Leader)
            </label>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteTask}
        title="Delete Task"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This action cannot be undone.`}
        confirmText="Yes, Delete"
      />
    </div>
  );
}
