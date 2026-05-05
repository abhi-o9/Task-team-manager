import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/axios';
import { useProjectStore } from '../stores/projectStore';
import { useAuthStore } from '../stores/authStore';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Trash2, UserPlus, Shield } from 'lucide-react';
import toast from 'react-hot-toast';

export default function ProjectSettings() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { currentProject, fetchProject, updateProject, addMember, removeMember, updateMemberRole, deleteProject } = useProjectStore();
  const { user } = useAuthStore();

  const [activeTab, setActiveTab] = useState('general');
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [newMemberUserId, setNewMemberUserId] = useState('');
  const [newMemberRole, setNewMemberRole] = useState<'MEMBER' | 'MANAGER'>('MEMBER');
  const [allUsers, setAllUsers] = useState<any[]>([]);

  const isAdminOrManager = user?.role === 'ADMIN' || user?.role === 'MANAGER' || currentProject?.ownerId === user?.id || 
    currentProject?.members.find(m => m.userId === user?.id)?.role === 'MANAGER';

  useEffect(() => {
    if (isAdminOrManager) {
      api.get('/users').then(res => {
        setAllUsers(res.data.data);
      }).catch(() => {});
    }
  }, [isAdminOrManager]);

  useEffect(() => {
    if (id) {
      fetchProject(id).then(() => {
        const proj = useProjectStore.getState().currentProject;
        if (proj) {
          setName(proj.name);
          setDesc(proj.description || '');
        }
      });
    }
  }, [id, fetchProject]);

  if (!currentProject) return <div className="p-8">Loading...</div>;

  const handleUpdateGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    await updateProject(id!, { name, description: desc });
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberUserId) return toast.error('Please select a user');
    
    // Automatically set role to MANAGER if the user is a system-wide MANAGER
    const selectedUser = allUsers.find(u => u.id === newMemberUserId);
    const roleToAssign = selectedUser?.role === 'MANAGER' ? 'MANAGER' : newMemberRole;

    await addMember(id!, { userId: newMemberUserId, role: roleToAssign });
    setNewMemberUserId('');
    setNewMemberRole('MEMBER');
  };

  const handleArchive = async () => {
    if (window.confirm('Are you sure you want to archive this project? This will hide it from the main dashboard.')) {
      await updateProject(id!, { status: 'ARCHIVED' });
      navigate('/projects');
    }
  };

  const handleDelete = async () => {
    if (window.confirm('PERMANENTLY DELETE PROJECT? This will delete all tasks and data. This action is IRREVERSIBLE.')) {
      await deleteProject(id!);
      navigate('/projects');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-display font-bold text-white">Project Settings</h1>
          <p className="text-textMuted mt-1">{currentProject.name}</p>
        </div>
        <Button variant="ghost" onClick={() => navigate(`/projects/${id}`)}>Back to Board</Button>
      </div>

      <div className="flex space-x-1 border-b border-border">
        {['general', 'members', 'danger'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab 
                ? tab === 'danger' ? 'border-danger text-danger' : 'border-primary text-primary'
                : 'border-transparent text-textMuted hover:text-white hover:border-border'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="bg-surface rounded-xl border border-border p-6 mt-6">
        {activeTab === 'general' && (
          <form onSubmit={handleUpdateGeneral} className="space-y-4 max-w-xl">
            <h2 className="text-xl font-bold text-white mb-4">General Details</h2>
            <Input
              label="Project Name"
              value={name}
              onChange={e => setName(e.target.value)}
              disabled={!isAdminOrManager}
            />
            <div>
              <label className="block text-sm font-medium text-textMain mb-1.5">Description</label>
              <textarea
                className="w-full bg-base border border-border rounded-lg p-3 text-sm text-textMain h-32 focus:border-primary focus:outline-none resize-none disabled:opacity-50"
                value={desc}
                onChange={e => setDesc(e.target.value)}
                disabled={!isAdminOrManager}
              />
            </div>
            {isAdminOrManager && (
              <Button type="submit">Save Changes</Button>
            )}
          </form>
        )}

        {activeTab === 'members' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Project Members</h2>
            </div>

            {isAdminOrManager && (
              <form onSubmit={handleAddMember} className="flex items-end space-x-3 mb-8 bg-base p-4 rounded-lg border border-border">
                <div className="flex-[2]">
                  <label className="block text-[10px] font-bold text-textMuted uppercase mb-1.5 ml-1">Select User</label>
                  <select
                    className="w-full bg-surface border border-border rounded-lg py-2 px-3 text-sm text-textMain focus:outline-none focus:border-primary"
                    value={newMemberUserId}
                    onChange={(e) => {
                      const uid = e.target.value;
                      setNewMemberUserId(uid);
                      const u = allUsers.find(user => user.id === uid);
                      if (u?.role === 'MANAGER') setNewMemberRole('MANAGER');
                    }}
                  >
                    <option value="">-- Select a user to add --</option>
                    {allUsers
                      .filter(u => u.status === 'APPROVED' && !currentProject.members.find(m => m.userId === u.id))
                      .map(u => (
                        <option key={u.id} value={u.id}>{u.name} ({u.email}) {u.role === 'MANAGER' ? '[MANAGER]' : ''}</option>
                      ))}
                  </select>
                </div>
                <div className="flex-1">
                  <label className="block text-[10px] font-bold text-textMuted uppercase mb-1.5 ml-1">Project Role</label>
                  <select
                    className="w-full bg-surface border border-border rounded-lg py-2 px-3 text-sm text-textMain focus:outline-none focus:border-primary disabled:opacity-50"
                    value={newMemberRole}
                    onChange={(e) => setNewMemberRole(e.target.value as any)}
                    disabled={allUsers.find(u => u.id === newMemberUserId)?.role === 'MANAGER'}
                  >
                    <option value="MEMBER">Member</option>
                    <option value="MANAGER">Manager</option>
                  </select>
                </div>
                <Button type="submit"><UserPlus size={16} className="mr-2"/> Add Member</Button>
              </form>
            )}

            <div className="space-y-3">
              {currentProject.members.map((member) => (
                <div key={member.id} className="flex items-center justify-between p-3 bg-base border border-border rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center font-bold text-white">
                      {member.user.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-white">{member.user.name} {currentProject.ownerId === member.userId && <span className="text-xs ml-2 px-1.5 py-0.5 bg-primary/20 text-primary rounded">Owner</span>}</p>
                      <p className="text-xs text-textMuted">{member.user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    {isAdminOrManager && currentProject.ownerId !== member.userId ? (
                      <select 
                        className="bg-surface border border-border rounded px-2 py-1 text-xs text-white focus:outline-none"
                        value={member.role}
                        onChange={(e) => updateMemberRole(id!, member.userId, e.target.value)}
                      >
                        <option value="MEMBER" disabled={member.user.role === 'MANAGER'}>Member</option>
                        <option value="MANAGER">Manager</option>
                      </select>
                    ) : (
                      <span className="text-xs font-medium text-textMuted">{member.role}</span>
                    )}

                    {isAdminOrManager && currentProject.ownerId !== member.userId && (
                      <button 
                        onClick={() => removeMember(id!, member.userId)}
                        className="text-textMuted hover:text-danger p-1"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'danger' && (
          <div className="max-w-xl space-y-8">
            <div>
              <h2 className="text-xl font-bold text-warning mb-4 flex items-center"><Shield size={20} className="mr-2"/> Archive Project</h2>
              <p className="text-sm text-textMuted mb-4">
                Archiving a project will hide it from the main dashboard and restrict further changes. 
              </p>
              <Button variant="secondary" disabled={!isAdminOrManager} onClick={handleArchive}>Archive Project</Button>
            </div>

            <div className="pt-8 border-t border-border">
              <h2 className="text-xl font-bold text-danger mb-4 flex items-center"><Trash2 size={20} className="mr-2"/> Delete Project</h2>
              <p className="text-sm text-textMuted mb-4">
                Permanently delete this project and all its tasks, members, and data. This action cannot be undone.
              </p>
              <Button variant="danger" disabled={!isAdminOrManager} onClick={handleDelete}>Delete Project Permanently</Button>
            </div>
            
            {!isAdminOrManager && <p className="text-xs text-textMuted mt-2">You must be an ADMIN or MANAGER to archive or delete projects.</p>}
          </div>
        )}
      </div>
    </div>
  );
}
