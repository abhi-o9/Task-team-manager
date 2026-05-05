import { create } from 'zustand';
import { api } from '../api/axios';
import toast from 'react-hot-toast';

export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: Priority;
  dueDate: string | null;
  projectId: string;
  assigneeIds: string[];
  assigneeId: string | null;
  creatorId: string;
  createdAt: string;
  assignees?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  }[] | null;
  assignee?: {
    id: string;
    name: string;
    avatarUrl: string | null;
  } | null;
  creator?: {
    id: string;
    name: string;
  };
  comments?: Comment[];
  _count?: { comments: number };
}

export interface Comment {
  id: string;
  body: string;
  createdAt: string;
  author: {
    id: string;
    name: string;
    avatarUrl: string | null;
  };
}

interface TaskState {
  tasks: Task[];
  currentTask: Task | null;
  isLoading: boolean;
  filters: any;
  
  fetchTasks: (projectId: string) => Promise<void>;
  fetchTask: (id: string) => Promise<void>;
  createTask: (projectId: string, data: any) => Promise<void>;
  updateTask: (id: string, data: any) => Promise<void>;
  updateStatus: (id: string, status: TaskStatus) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  addComment: (taskId: string, body: string) => Promise<void>;
  setFilters: (filters: any) => void;
}

export const useTaskStore = create<TaskState>((set, get) => ({
  tasks: [],
  currentTask: null,
  isLoading: false,
  filters: {},

  setFilters: (filters: any) => {
    set({ filters: { ...get().filters, ...filters } });
  },

  fetchTasks: async (projectId: string) => {
    set({ isLoading: true });
    try {
      const queryParams = new URLSearchParams(get().filters).toString();
      const res = await api.get(`/projects/${projectId}/tasks?${queryParams}`);
      set({ tasks: res.data.data });
    } catch (error: any) {
      if (!error._isAuthError) toast.error('Failed to load tasks');
    } finally {
      set({ isLoading: false });
    }
  },

  fetchTask: async (id: string) => {
    set({ isLoading: true });
    try {
      const res = await api.get(`/tasks/${id}`);
      set({ currentTask: res.data.data });
    } catch (error: any) {
      if (!error._isAuthError) toast.error('Failed to load task details');
    } finally {
      set({ isLoading: false });
    }
  },

  createTask: async (projectId: string, data: any) => {
    set({ isLoading: true });
    try {
      const res = await api.post(`/projects/${projectId}/tasks`, data);
      set((state) => ({ tasks: [res.data.data, ...state.tasks] }));
      toast.success('Task created');
    } catch (error: any) {
      toast.error('Failed to create task');
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateTask: async (id: string, data: any) => {
    set({ isLoading: true });
    try {
      const res = await api.patch(`/tasks/${id}`, data);
      set((state) => ({
        tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...res.data.data } : t)),
        currentTask: state.currentTask?.id === id ? { ...state.currentTask, ...res.data.data } : state.currentTask
      }));
      toast.success('Task updated');
    } catch (error: any) {
      toast.error('Failed to update task');
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateStatus: async (id: string, status: TaskStatus) => {
    // Optimistic update
    const previousTasks = get().tasks;
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
      currentTask: state.currentTask?.id === id ? { ...state.currentTask, status } : state.currentTask
    }));

    try {
      await api.patch(`/tasks/${id}/status`, { status });
    } catch (error: any) {
      // Revert on failure
      set({ tasks: previousTasks });
      toast.error('Failed to update status');
    }
  },

  deleteTask: async (id: string) => {
    set({ isLoading: true });
    try {
      await api.delete(`/tasks/${id}`);
      set((state) => ({
        tasks: state.tasks.filter((t) => t.id !== id),
        currentTask: state.currentTask?.id === id ? null : state.currentTask
      }));
      toast.success('Task deleted');
    } catch (error: any) {
      toast.error('Failed to delete task');
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  addComment: async (taskId: string, body: string) => {
    try {
      const res = await api.post(`/tasks/${taskId}/comments`, { body });
      set((state) => {
        if (state.currentTask?.id === taskId) {
          return {
            currentTask: {
              ...state.currentTask,
              comments: [...(state.currentTask.comments || []), res.data.data]
            }
          };
        }
        return state;
      });
    } catch (error: any) {
      toast.error('Failed to add comment');
      throw error;
    }
  }
}));
