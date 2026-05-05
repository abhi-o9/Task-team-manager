import { useEffect, useState } from 'react';
import { useProjectStore } from '../stores/projectStore';
import { useAuthStore } from '../stores/authStore';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { FolderKanban, Plus, LayoutGrid, Trash2 } from 'lucide-react';
import { Input } from '../components/ui/Input';

export default function Projects() {
  const { projects, fetchProjects, isLoading, createProject, deleteProject } = useProjectStore();
  const { user } = useAuthStore();
  const canCreate = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await createProject({ name, description: desc });
    setShowModal(false);
    setName('');
    setDesc('');
  };

  const handleDeleteQuick = async (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('Permanently delete this project and ALL its data?')) {
      await deleteProject(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-display font-bold text-white">Projects</h1>
        {canCreate && (
          <Button onClick={() => setShowModal(true)}>
            <Plus size={18} className="mr-2" /> New Project
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="bg-surface h-48 rounded-xl border border-border animate-pulse" />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-surface rounded-xl border border-border p-12 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
            <FolderKanban size={32} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">No projects yet</h2>
          <p className="text-textMuted max-w-sm mb-6">
            {canCreate ? 'Get started by creating a new project.' : 'You have not been added to any projects yet. Contact your manager.'}
          </p>
          {canCreate && <Button onClick={() => setShowModal(true)}>Create your first project</Button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {projects.map(project => (
            <Link key={project.id} to={`/projects/${project.id}`} className="group bg-surface rounded-xl border border-border p-5 hover:border-primary/50 transition-all hover:shadow-[0_0_15px_rgba(79,142,247,0.1)] flex flex-col h-full">
              <div className="flex justify-between items-start mb-4">
                <div className="w-10 h-10 rounded-lg bg-secondary/10 flex items-center justify-center text-secondary">
                  <LayoutGrid size={20} />
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-md ${project.status === 'ACTIVE' ? 'bg-success/10 text-success' : 'bg-surface text-textMuted'}`}>
                    {project.status}
                  </span>
                  { (user?.role === 'ADMIN' || user?.role === 'MANAGER' || project.ownerId === user?.id) && (
                    <button 
                      onClick={(e) => handleDeleteQuick(e, project.id)}
                      className="p-1.5 text-textMuted hover:text-danger hover:bg-danger/10 rounded-md transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              
              <h3 className="text-lg font-bold text-white mb-1 group-hover:text-primary transition-colors">{project.name}</h3>
              <p className="text-sm text-textMuted line-clamp-2 mb-4 flex-1">{project.description || 'No description provided.'}</p>
              
              <div className="border-t border-border pt-4 flex items-center justify-between mt-auto">
                <div className="flex -space-x-2">
                  {project.members.slice(0, 3).map((member, i) => (
                    <div key={member.id} className="w-8 h-8 rounded-full border-2 border-surface bg-primary flex items-center justify-center text-xs font-bold text-white" style={{ zIndex: 10 - i }}>
                      {member.user.name.charAt(0).toUpperCase()}
                    </div>
                  ))}
                  {project.members.length > 3 && (
                    <div className="w-8 h-8 rounded-full border-2 border-surface bg-elevated flex items-center justify-center text-xs font-medium text-textMuted" style={{ zIndex: 0 }}>
                      +{project.members.length - 3}
                    </div>
                  )}
                </div>
                <div className="text-xs text-textMuted font-medium">
                  {project._count?.tasks || 0} tasks
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-border rounded-xl w-full max-w-md p-6 shadow-2xl">
            <h2 className="text-xl font-bold text-white mb-6">Create New Project</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <Input
                label="Project Name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g. Website Redesign"
                required
              />
              <div>
                <label className="block text-sm font-medium text-textMain mb-1.5">Description (Optional)</label>
                <textarea
                  className="block w-full bg-base border border-border rounded-md py-2 px-3 text-sm text-textMain placeholder-textDisabled focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary h-24 resize-none"
                  value={desc}
                  onChange={e => setDesc(e.target.value)}
                  placeholder="What is this project about?"
                />
              </div>
              <div className="flex justify-end space-x-3 pt-4">
                <Button type="button" variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit">Create Project</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
