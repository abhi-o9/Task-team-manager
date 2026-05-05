import { useEffect, useState } from 'react';
import { useTaskStore } from '../stores/taskStore';
import toast from 'react-hot-toast';
import { useProjectStore } from '../stores/projectStore';
import { useAuthStore } from '../stores/authStore';
import { X, Calendar, User, Tag, Send, Clock, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
export default function TaskDetailModal({ taskId, onClose }: { taskId: string, onClose: () => void }) {
  const { currentTask, fetchTask, updateTask, deleteTask, addComment, isLoading } = useTaskStore();
  const { currentProject, fetchProject } = useProjectStore();
  const { user } = useAuthStore();
  const [commentBody, setCommentBody] = useState('');

  useEffect(() => {
    fetchTask(taskId);
  }, [taskId, fetchTask]);

  // Ensure project (and its members list) is loaded for the assignee dropdown
  useEffect(() => {
    if (currentTask?.projectId && currentProject?.id !== currentTask.projectId) {
      fetchProject(currentTask.projectId);
    }
  }, [currentTask?.projectId, currentProject?.id, fetchProject]);

  if (isLoading || !currentTask) {
    return (
      <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
        <div className="w-full max-w-2xl bg-surface h-full animate-pulse p-8" />
      </div>
    );
  }

  const handleUpdate = (field: string, value: any) => {
    if (field === 'status') {
      const statuses = ['TODO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'];
      const currentIndex = statuses.indexOf(currentTask.status);
      const newIndex = statuses.indexOf(value);

      if (newIndex > currentIndex + 1) {
        toast.error('Tasks must move through steps sequentially.');
        return; // Reject the update
      }
    }
    updateTask(taskId, { [field]: value });
  };

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentBody.trim()) return;
    await addComment(taskId, commentBody);
    setCommentBody('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-2xl bg-base h-full shadow-2xl flex flex-col border-l border-border transform transition-transform"
        onClick={e => e.stopPropagation()}
      >
        <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-surface">
          <div className="flex items-center space-x-4">
            <span className="text-textMuted text-sm font-mono">{currentProject?.name}</span>
          </div>
          <div className="flex items-center space-x-2">
            {(user?.role === 'ADMIN' || user?.role === 'MANAGER' || currentProject?.ownerId === user?.id ||
              currentProject?.members.find(m => m.userId === user?.id)?.role === 'MANAGER') && (
                <button
                  onClick={async () => {
                    if (window.confirm('Permanently delete this task? This cannot be undone.')) {
                      await deleteTask(taskId);
                      onClose();
                    }
                  }}
                  className="p-2 text-textMuted hover:text-danger rounded-md hover:bg-danger/10 transition-colors"
                  title="Delete task"
                >
                  <Trash2 size={18} />
                </button>
              )}
            <button onClick={onClose} className="p-2 text-textMuted hover:text-white rounded-md hover:bg-elevated transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto flex">
          {/* Left: Task Details */}
          <div className="flex-1 p-8 border-r border-border">
            <input
              type="text"
              value={currentTask.title}
              onChange={(e) => handleUpdate('title', e.target.value)}
              className="w-full text-2xl font-bold text-white bg-transparent border-none focus:outline-none focus:ring-0 mb-6"
            />

            <div className="space-y-6">
              {/* Properties */}
              <div className="grid grid-cols-[120px_1fr] gap-4 items-center text-sm">
                <div className="text-textMuted flex items-center mt-1"><User size={14} className="mr-2" /> Assignees</div>
                <div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {currentTask.assignees?.map((a: any) => (
                      <div key={a.id} className="flex items-center bg-primary/20 text-primary px-2 py-1 rounded-md text-xs font-medium">
                        <span className="mr-1">{a.name}</span>
                        <button
                          onClick={() => {
                            const newIds = (currentTask.assigneeIds || []).filter((id: string) => id !== a.id);
                            handleUpdate('assigneeIds', newIds);
                          }}
                          className="hover:text-white"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                  <select
                    className="w-full bg-surface border border-border rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-primary"
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        const newIds = [...new Set([...(currentTask.assigneeIds || []), e.target.value])];
                        handleUpdate('assigneeIds', newIds);
                      }
                    }}
                  >
                    <option value="">+ Add assignee...</option>
                    {currentProject?.members
                      .filter(m => m.role !== 'MANAGER' && !(currentTask.assigneeIds || []).includes(m.userId))
                      .map(m => (
                        <option key={m.userId} value={m.userId}>{m.user.name}</option>
                      ))}
                  </select>
                </div>

                <div className="text-textMuted flex items-center"><Clock size={14} className="mr-2" /> Status</div>
                <div>
                  <select
                    className="bg-surface border border-border rounded px-2 py-1 text-white focus:outline-none focus:border-primary"
                    value={currentTask.status}
                    onChange={(e) => handleUpdate('status', e.target.value)}
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="DONE">Done</option>
                  </select>
                </div>

                <div className="text-textMuted flex items-center"><Tag size={14} className="mr-2" /> Priority</div>
                <div>
                  <select
                    className="bg-surface border border-border rounded px-2 py-1 text-white focus:outline-none focus:border-primary"
                    value={currentTask.priority}
                    onChange={(e) => handleUpdate('priority', e.target.value)}
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div className="text-textMuted flex items-center"><Calendar size={14} className="mr-2" /> Due Date</div>
                <div>
                  <DatePicker
                    selected={currentTask.dueDate ? new Date(currentTask.dueDate) : null}
                    onChange={(date: Date | null) => handleUpdate('dueDate', date ? date.toISOString() : null)}
                    className="bg-surface border border-border rounded px-2 py-1 text-white focus:outline-none focus:border-primary w-full"
                    placeholderText="Select date"
                    dateFormat="MMM d, yyyy"
                    isClearable
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-sm font-bold text-white mb-2">Description</h4>
                <textarea
                  className="w-full bg-surface border border-border rounded-lg p-3 text-sm text-textMain min-h-[150px] focus:outline-none focus:border-primary resize-none"
                  placeholder="Add a more detailed description..."
                  value={currentTask.description || ''}
                  onChange={(e) => handleUpdate('description', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Right: Comments */}
          <div className="w-80 bg-surface flex flex-col">
            <div className="p-4 border-b border-border font-bold text-sm text-white">Activity</div>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {currentTask.comments?.map((comment: any) => (
                <div key={comment.id} className="flex space-x-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex-shrink-0 flex items-center justify-center text-xs font-bold text-white">
                    {comment.author.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="font-medium text-sm text-white">{comment.author.name}</span>
                      <span className="text-[10px] text-textMuted">{format(new Date(comment.createdAt), 'MMM d, h:mm a')}</span>
                    </div>
                    <p className="text-sm text-textMain bg-base p-2.5 rounded-lg rounded-tl-none border border-border">
                      {comment.body}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-border bg-base">
              <form onSubmit={handleAddComment} className="relative">
                <textarea
                  className="w-full bg-surface border border-border rounded-lg py-2 pl-3 pr-10 text-sm text-textMain focus:outline-none focus:border-primary resize-none h-20"
                  placeholder="Write a comment..."
                  value={commentBody}
                  onChange={(e) => setCommentBody(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleAddComment(e as any);
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={!commentBody.trim()}
                  className="absolute bottom-3 right-3 text-primary disabled:text-textDisabled hover:text-primary/80"
                >
                  <Send size={18} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
