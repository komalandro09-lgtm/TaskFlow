import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWorkspace } from '../context/WorkspaceContext';
import { supabase } from '../supabaseClient';
import { 
  FileText, 
  Upload, 
  Download, 
  Trash2, 
  Image as ImageIcon,
  FolderOpen,
  FolderClosed,
  ChevronRight,
  ExternalLink
} from 'lucide-react';

const Files: React.FC = () => {
  const navigate = useNavigate();
  const { activeWorkspace, projects } = useWorkspace();
  const [attachments, setAttachments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tasksMap, setTasksMap] = useState<Record<string, any>>({});

  useEffect(() => {
    if (activeWorkspace) {
      loadWorkspaceFiles();
    }
  }, [activeWorkspace, projects]);

  const loadWorkspaceFiles = async () => {
    if (projects.length === 0) {
      setAttachments([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const projectIds = projects.map(p => p.id);
      
      // 1. Fetch all tasks inside these projects
      const { data: tasksData, error: tasksError } = await supabase
        .from('tasks')
        .select('id, title, project_id')
        .in('project_id', projectIds);

      let workspaceTasks = tasksData || [];
      if (tasksError) {
        const dbState = JSON.parse(localStorage.getItem('taskflow_mock_db') || '{}');
        workspaceTasks = (dbState.tasks || []).filter((t: any) => projectIds.includes(t.project_id));
      }

      // Build task mappings for easy resolution
      const tMap: Record<string, any> = {};
      workspaceTasks.forEach((t: any) => {
        tMap[t.id] = t;
      });
      setTasksMap(tMap);

      const taskIds = workspaceTasks.map((t: any) => t.id);
      
      if (taskIds.length === 0) {
        setAttachments([]);
        setLoading(false);
        return;
      }

      // 2. Fetch attachments
      const { data: attData, error: attError } = await supabase
        .from('attachments')
        .select('*')
        .in('task_id', taskIds);

      if (!attError && attData) {
        setAttachments(attData);
      } else {
        const dbState = JSON.parse(localStorage.getItem('taskflow_mock_db') || '{}');
        const localAtt = (dbState.attachments || []).filter((att: any) => taskIds.includes(att.task_id));
        setAttachments(localAtt);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAttachment = async (id: string) => {
    if (confirm('Are you sure you want to delete this file from the workspace?')) {
      const { error } = await supabase
        .from('attachments')
        .delete()
        .eq('id', id);

      if (!error) {
        setAttachments(prev => prev.filter(att => att.id !== id));
      } else {
        // Mock DB delete
        const dbState = JSON.parse(localStorage.getItem('taskflow_mock_db') || '{}');
        dbState.attachments = (dbState.attachments || []).filter((att: any) => att.id !== id);
        localStorage.setItem('taskflow_mock_db', JSON.stringify(dbState));
        setAttachments(prev => prev.filter(att => att.id !== id));
      }
    }
  };

  if (!activeWorkspace) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 max-w-md mx-auto text-center page-enter">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10 text-violet-500 dark:text-violet-400 mb-4 border border-violet-200/25">
          <FileText size={24} />
        </div>
        <h3 className="text-lg font-bold text-slate-900 dark:text-white">Workspace Required</h3>
        <p className="text-xs text-slate-500 mt-2 leading-relaxed">
          Please select or create a workspace first to view workspace files.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto page-enter">
      <div className="border-b border-violet-100 dark:border-violet-900/40 pb-5">
        <h2 className="text-2xl font-extrabold tracking-tight text-slate-950 dark:text-white md:text-3xl">File Repository</h2>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Review assets, mockups, design resources, and documents uploaded across tasks.</p>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center text-slate-500">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-500 border-t-transparent" />
            <p className="text-sm font-semibold">Loading repository files...</p>
          </div>
        </div>
      ) : attachments.length === 0 ? (
        <div className="rounded-3xl glass-card py-16 text-center animate-fade-in-up delay-100">
          <FolderClosed className="mx-auto text-violet-400 dark:text-violet-600 mb-3 animate-pulse" size={36} />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">File Directory Empty</h4>
          <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto">Upload documents or images under any project task's resource list to build your workspace library.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
          {attachments.map((file, idx) => {
            const isImage = file.file_type?.startsWith('image/');
            const sizeKb = Math.round(file.size / 1024) || 0;
            const connectedTask = tasksMap[file.task_id];
            const connectedProject = connectedTask ? projects.find(p => p.id === connectedTask.project_id) : null;
            
            const delayClass = idx === 0 ? 'delay-50' :
                              idx === 1 ? 'delay-100' :
                              idx === 2 ? 'delay-150' :
                              idx === 3 ? 'delay-200' :
                              idx === 4 ? 'delay-250' :
                              idx === 5 ? 'delay-300' :
                              idx === 6 ? 'delay-350' :
                              idx === 7 ? 'delay-400' : 'delay-500';

            return (
              <div 
                key={file.id} 
                className={`group hover-lift relative flex flex-col justify-between rounded-2xl p-4 glass-card animate-fade-in-up ${delayClass}`}
              >
                {/* Image or Icon Preview */}
                <div className="flex h-32 items-center justify-center rounded-xl bg-slate-50/40 dark:bg-slate-950/60 overflow-hidden relative border border-violet-100/50 dark:border-violet-900/40 shadow-inner">
                  {isImage && file.url !== '#' ? (
                    <img 
                      src={file.url} 
                      alt="" 
                      className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-300" 
                    />
                  ) : (
                    <div className="text-slate-400 dark:text-slate-650 flex flex-col items-center gap-1">
                      <FileText size={32} className="stroke-[1.5]" />
                      <span className="text-[8px] font-extrabold tracking-widest uppercase text-slate-400">
                        {file.name.split('.').pop() || 'File'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="mt-3 overflow-hidden">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className="text-[9px] text-slate-500 dark:text-slate-400 mt-0.5 font-bold uppercase">{sizeKb} KB • {file.file_type?.split('/')[1] || 'Document'}</p>
                  
                  {connectedTask && (
                    <div 
                      onClick={() => navigate(`/project/${connectedTask.project_id}?task=${connectedTask.id}`)}
                      className="mt-3 flex items-center justify-between gap-1 text-[9px] font-bold text-violet-600 dark:text-violet-400 hover:text-violet-750 dark:hover:text-violet-300 cursor-pointer border-t border-violet-50 dark:border-violet-900/20 pt-2.5"
                    >
                      <span className="truncate">Task: {connectedTask.title}</span>
                      <ExternalLink size={8} className="shrink-0" />
                    </div>
                  )}
                </div>

                {/* Hover overlay actions */}
                <div className="absolute right-3 top-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-all duration-200 transform translate-y-[-4px] group-hover:translate-y-0">
                  {file.url !== '#' && (
                    <a
                      href={file.url}
                      download={file.name}
                      className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 dark:bg-slate-900/90 text-slate-500 dark:text-slate-400 border border-violet-100 dark:border-violet-900/40 hover:bg-violet-500 hover:text-white dark:hover:bg-violet-500 shadow-md transition-all active:scale-90"
                      title="Download File"
                    >
                      <Download size={12} />
                    </a>
                  )}
                  <button
                    onClick={() => handleDeleteAttachment(file.id)}
                    className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/90 dark:bg-slate-900/90 text-slate-400 hover:text-white border border-violet-100 dark:border-violet-900/40 hover:bg-rose-500 hover:border-rose-500 shadow-md transition-all active:scale-90"
                    title="Delete File"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Files;
