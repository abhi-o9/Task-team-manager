import { create } from 'zustand';
import { api } from '../api/axios';
import toast from 'react-hot-toast';

export interface Project {
  id: string;
  name: string;
  description: string | null;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  ownerId: string;
  _count?: { tasks: number };
  members: ProjectMember[];
}

export interface ProjectMember {
  id: string;
  projectId: string;
  userId: string;
  role: 'MANAGER' | 'MEMBER';
  user: {
    id: string;
    name: string;
    email: string;
    avatarUrl: string | null;
    role: string;
  };
}

interface ProjectState {
  projects: Project[];
  currentProject: Project | null;
  isLoading: boolean;
  error: string | null;

  fetchProjects: () => Promise<void>;
  fetchProject: (id: string) => Promise<void>;
  createProject: (data: any) => Promise<void>;
  updateProject: (id: string, data: any) => Promise<void>;
  addMember: (projectId: string, data: { userId: string; role: string }) => Promise<void>;
  removeMember: (projectId: string, userId: string) => Promise<void>;
  updateMemberRole: (projectId: string, userId: string, role: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,

  fetchProjects: async () => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get('/projects');
      set({ projects: res.data.data });
    } catch (error: any) {
      const status = error.response?.status;
      if (status === 401) return; // Not logged in, silently ignore
      const msg = error.response?.data?.error?.message || 'Failed to load projects';
      set({ error: msg });
      toast.error(msg);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchProject: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const res = await api.get(`/projects/${id}`);
      set({ currentProject: res.data.data });
    } catch (error: any) {
      const status = error.response?.status;
      if (status === 401) return; // Not logged in, silently ignore
      const msg = error.response?.data?.error?.message || 'Failed to load project';
      set({ error: msg });
      toast.error(msg);
    } finally {
      set({ isLoading: false });
    }
  },

  createProject: async (data: any) => {
    set({ isLoading: true });
    try {
      const res = await api.post('/projects', data);
      set((state) => ({ projects: [res.data.data, ...state.projects] }));
      toast.success('Project created');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to create project');
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateProject: async (id: string, data: any) => {
    set({ isLoading: true });
    try {
      const res = await api.patch(`/projects/${id}`, data);
      set((state) => ({
        projects: state.projects.map((p) => (p.id === id ? { ...p, ...res.data.data } : p)),
        currentProject: state.currentProject?.id === id ? { ...state.currentProject, ...res.data.data } : state.currentProject
      }));
      toast.success('Project updated');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to update project');
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  addMember: async (projectId: string, data: { userId: string; role: string }) => {
    set({ isLoading: true });
    try {
      const res = await api.post(`/projects/${projectId}/members`, data);
      const newMember = res.data.data;
      set((state) => {
        if (state.currentProject?.id === projectId) {
          return {
            currentProject: {
              ...state.currentProject,
              members: [...state.currentProject.members, newMember]
            }
          };
        }
        return state;
      });
      toast.success('Member added');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to add member');
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  removeMember: async (projectId: string, userId: string) => {
    set({ isLoading: true });
    try {
      await api.delete(`/projects/${projectId}/members/${userId}`);
      set((state) => {
        if (state.currentProject?.id === projectId) {
          return {
            currentProject: {
              ...state.currentProject,
              members: state.currentProject.members.filter((m) => m.userId !== userId)
            }
          };
        }
        return state;
      });
      toast.success('Member removed');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to remove member');
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },

  updateMemberRole: async (projectId: string, userId: string, role: string) => {
    set({ isLoading: true });
    try {
      const res = await api.patch(`/projects/${projectId}/members/${userId}`, { role });
      const updatedMember = res.data.data;
      set((state) => {
        if (state.currentProject?.id === projectId) {
          return {
            currentProject: {
              ...state.currentProject,
              members: state.currentProject.members.map((m) =>
                m.userId === userId ? { ...m, ...updatedMember } : m
              )
            }
          };
        }
        return state;
      });
      toast.success('Member role updated');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to update member role');
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  deleteProject: async (id: string) => {
    set({ isLoading: true });
    try {
      await api.delete(`/projects/${id}/hard`);
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        currentProject: state.currentProject?.id === id ? null : state.currentProject
      }));
      toast.success('Project permanently deleted');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to delete project');
      throw error;
    } finally {
      set({ isLoading: false });
    }
  }
}));
