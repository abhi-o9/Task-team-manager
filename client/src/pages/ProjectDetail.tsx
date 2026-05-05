import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { useProjectStore } from '../stores/projectStore';
import { useTaskStore } from '../stores/taskStore';
import { useAuthStore } from '../stores/authStore';
import type { TaskStatus } from '../stores/taskStore';
import { DndContext, closestCorners, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Button } from '../components/ui/Button';
import { Plus, Settings, Calendar, User as UserIcon, MessageSquare, GripVertical, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import TaskDetailModal from './TaskDetailModal';

const COLUMN_COLORS = {
  TODO: 'bg-surface',
  IN_PROGRESS: 'bg-warning/5 border-warning/20',
  IN_REVIEW: 'bg-secondary/5 border-secondary/20',
  DONE: 'bg-success/5 border-success/20'
};

const COLUMN_LABELS = {
  TODO: 'To Do',
  IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review',
  DONE: 'Done'
};

function SortableTaskCard({ task, onClick, onDelete, canDelete }: { task: any, onClick: () => void, onDelete: () => void, canDelete: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: task.id, data: { task } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 100 : 1,
    opacity: isDragging ? 0.5 : 1,
  };

  const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && task.status !== 'DONE';

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`bg-base p-4 rounded-lg border shadow-sm hover:border-primary/50 transition-colors cursor-pointer ${isOverdue ? 'border-l-4 border-l-danger border-y-border border-r-border' : 'border-border'}`}
    >
      <div className="flex justify-between items-start mb-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-wider ${task.priority === 'URGENT' ? 'bg-danger/20 text-danger' :
            task.priority === 'HIGH' ? 'bg-warning/20 text-warning' :
              task.priority === 'MEDIUM' ? 'bg-primary/20 text-primary' :
                'bg-surface text-textMuted'
          }`}>
          {task.priority}
        </span>
        {/* Drag handle — only this area initiates drag */}
        <div className="flex items-center space-x-1 -mr-1 -mt-0.5">
          {canDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="text-textDisabled hover:text-danger p-0.5 rounded transition-colors"
              title="Delete task"
            >
              <Trash2 size={14} />
            </button>
          )}
          <div
            {...attributes}
            {...listeners}
            onClick={(e) => e.stopPropagation()}
            className="text-textDisabled hover:text-textMuted cursor-grab active:cursor-grabbing p-0.5"
          >
            <GripVertical size={14} />
          </div>
        </div>
      </div>
      <h4 className="text-sm font-medium text-white mb-3 line-clamp-2">{task.title}</h4>

      <div className="flex items-center justify-between text-xs text-textMuted mt-auto pt-3 border-t border-border">
        <div className="flex items-center space-x-3">
          {task.dueDate && (
            <div className={`flex items-center ${isOverdue ? 'text-danger font-medium' : ''}`}>
              <Calendar size={12} className="mr-1" />
              {format(new Date(task.dueDate), 'MMM d')}
            </div>
          )}
          {task._count?.comments > 0 && (
            <div className="flex items-center">
              <MessageSquare size={12} className="mr-1" />
              {task._count.comments}
            </div>
          )}
        </div>

        <div className="flex -space-x-2">
          {task.assignees && task.assignees.length > 0 ? (
            task.assignees.map((a: any, i: number) => (
              <div 
                key={a.id} 
                className="w-6 h-6 rounded-full bg-primary border-2 border-base flex items-center justify-center text-[10px] text-white font-bold" 
                title={a.name}
                style={{ zIndex: task.assignees.length - i }}
              >
                {a.name.charAt(0).toUpperCase()}
              </div>
            ))
          ) : (
            <div className="w-6 h-6 rounded-full bg-surface border border-border flex items-center justify-center text-textDisabled" title="Unassigned">
              <UserIcon size={12} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const taskId = searchParams.get('taskId');

  const { currentProject, fetchProject } = useProjectStore();
  const { tasks, fetchTasks, updateStatus, createTask, deleteTask } = useTaskStore();
  const { user } = useAuthStore();

  const [newTaskCol, setNewTaskCol] = useState<TaskStatus | null>(null);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  useEffect(() => {
    if (id) {
      fetchProject(id);
      fetchTasks(id);
    }
  }, [id, fetchProject, fetchTasks]);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const taskId = active.id as string;
    const activeTask = tasks.find(t => t.id === taskId);

    // Find column based on over.id. If dropped on a task, over.data.current.task.status
    let newStatus = over.id as TaskStatus;
    if (over.data.current?.task) {
      newStatus = over.data.current.task.status;
    }

    if (activeTask && activeTask.status !== newStatus && Object.keys(COLUMN_LABELS).includes(newStatus)) {
      const statuses = Object.keys(COLUMN_LABELS);
      const currentIndex = statuses.indexOf(activeTask.status);
      const newIndex = statuses.indexOf(newStatus);
      
      // Allow moving one step forward or any steps backward
      if (newIndex === currentIndex + 1 || newIndex <= currentIndex) {
        updateStatus(taskId, newStatus);
      } else {
        toast.error('Tasks must move through steps sequentially.');
      }
    }
  };

  const handleCreateTask = async (status: TaskStatus) => {
    if (!newTaskTitle.trim() || !id) {
      setNewTaskCol(null);
      return;
    }
    await createTask(id, { title: newTaskTitle, status, priority: 'MEDIUM' });
    setNewTaskTitle('');
    setNewTaskCol(null);
  };

  const handleDeleteTask = async (taskId: string) => {
    if (window.confirm('Delete this task?')) {
      await deleteTask(taskId);
    }
  };

  const canManage = user?.role === 'ADMIN' || user?.role === 'MANAGER' || currentProject?.ownerId === user?.id || 
    currentProject?.members.find(m => m.userId === user?.id)?.role === 'MANAGER';

  if (!currentProject) return <div className="p-8">Loading...</div>;

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement required before drag starts, allows click events to fire
      },
    })
  );

  return (
    <div className="flex flex-col h-full h-[calc(100vh-64px)] -m-6 p-6 overflow-hidden">
      <div className="flex items-center justify-between mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-display font-bold text-white">{currentProject.name}</h1>
          <p className="text-textMuted text-sm mt-1">{currentProject.description}</p>
        </div>
        <Button variant="secondary" onClick={() => navigate(`/projects/${id}/settings`)}>
          <Settings size={16} className="mr-2" /> Settings
        </Button>
      </div>

      <div className="flex-1 overflow-x-auto pb-4">
        <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={handleDragEnd}>
          <div className="flex space-x-6 h-full min-w-max">
            {(Object.keys(COLUMN_LABELS) as TaskStatus[]).map((status) => {
              const columnTasks = tasks.filter((t) => t.status === status);

              return (
                <div key={status} className={`w-80 flex flex-col rounded-xl border border-border ${COLUMN_COLORS[status]} overflow-hidden`}>
                  <div className="p-4 border-b border-border/50 flex items-center justify-between bg-surface/50">
                    <h3 className="font-bold text-sm text-textMain">{COLUMN_LABELS[status]}</h3>
                    <span className="bg-base px-2 py-0.5 rounded text-xs text-textMuted font-medium">{columnTasks.length}</span>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-3" id={status}>
                    <SortableContext items={columnTasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
                      {columnTasks.map((task) => (
                        <SortableTaskCard
                          key={task.id}
                          task={task}
                          onClick={() => setSearchParams({ taskId: task.id })}
                          onDelete={() => handleDeleteTask(task.id)}
                          canDelete={canManage}
                        />
                      ))}
                    </SortableContext>

                    {status === 'TODO' && (
                      newTaskCol === status ? (
                        <div className="bg-base p-3 rounded-lg border border-primary">
                          <input
                            autoFocus
                            type="text"
                            className="w-full bg-transparent border-none text-sm text-white focus:outline-none placeholder-textDisabled"
                            placeholder="Task title..."
                            value={newTaskTitle}
                            onChange={e => setNewTaskTitle(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') handleCreateTask(status);
                              if (e.key === 'Escape') setNewTaskCol(null);
                            }}
                            onBlur={() => handleCreateTask(status)}
                          />
                        </div>
                      ) : (
                        <button
                          onClick={() => setNewTaskCol(status)}
                          className="w-full py-2.5 flex items-center justify-center text-sm font-medium text-textMuted hover:text-primary hover:bg-primary/10 rounded-lg transition-colors border border-dashed border-transparent hover:border-primary/30"
                        >
                          <Plus size={16} className="mr-1" /> Add Task
                        </button>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DndContext>
      </div>

      {taskId && <TaskDetailModal taskId={taskId} onClose={() => setSearchParams({})} />}
    </div>
  );
}
