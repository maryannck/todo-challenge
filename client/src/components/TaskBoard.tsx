import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Plus, Trash2, GripVertical, Check, Circle, Loader2, Search, X, Edit3 } from 'lucide-react';

export interface Task {
  id: string;
  title: string;
  description?: string | null;
  isCompleted: boolean;
  order: number;
}

export const TaskBoard: React.FC = () => {
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Detail Edit State
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await api.get('/tasks');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: { title: string; description?: string }) => api.post('/tasks', payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setNewTitle('');
      setNewDescription('');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, ...payload }: Partial<Task> & { id: string }) =>
      api.patch(`/tasks/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setSelectedTask(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      if (selectedTask?.id) setSelectedTask(null);
    },
  });

  const reorderMutation = useMutation({
    mutationFn: ({
      id,
      prevOrder,
      nextOrder,
    }: {
      id: string;
      prevOrder: number | null;
      nextOrder: number | null;
    }) => api.patch(`/tasks/${id}/reorder`, { prevOrder, nextOrder }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  // Client-side search filtering using declarative filter
  const filteredTasks = useMemo(() => {
    if (!searchQuery.trim()) return tasks;
    const q = searchQuery.toLowerCase();
    return tasks.filter(
      (t) =>
        t.title.toLowerCase().includes(q) ||
        (t.description && t.description.toLowerCase().includes(q))
    );
  }, [tasks, searchQuery]);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createMutation.mutate({
      title: newTitle.trim(),
      description: newDescription.trim() || undefined,
    });
  };

  const openDetail = (task: Task) => {
    setSelectedTask(task);
    setEditTitle(task.title);
    setEditDescription(task.description || '');
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTask || !editTitle.trim()) return;
    updateMutation.mutate({
      id: selectedTask.id,
      title: editTitle.trim(),
      description: editDescription.trim() || null,
    });
  };

  const handleDrop = (targetTaskId: string) => {
    if (!draggedTaskId || draggedTaskId === targetTaskId) return;

    const currentIdx = tasks.findIndex((t) => t.id === draggedTaskId);
    const targetIdx = tasks.findIndex((t) => t.id === targetTaskId);
    if (currentIdx === -1 || targetIdx === -1) return;

    const listWithoutDragged = tasks.filter((t) => t.id !== draggedTaskId);
    const newTargetIdx = listWithoutDragged.findIndex((t) => t.id === targetTaskId);

    let prevOrder: number | null = null;
    let nextOrder: number | null = null;

    if (currentIdx < targetIdx) {
      prevOrder = listWithoutDragged[newTargetIdx]?.order ?? null;
      nextOrder = listWithoutDragged[newTargetIdx + 1]?.order ?? null;
    } else {
      prevOrder = listWithoutDragged[newTargetIdx - 1]?.order ?? null;
      nextOrder = listWithoutDragged[newTargetIdx]?.order ?? null;
    }

    reorderMutation.mutate({ id: draggedTaskId, prevOrder, nextOrder });
    setDraggedTaskId(null);
  };

  return (
    <div className="max-w-3xl w-full mx-auto space-y-6">
      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search tasks..."
          className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Task Creation Form */}
      <form onSubmit={handleCreate} className="p-4 bg-slate-900 border border-slate-800 rounded-xl space-y-3">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Task title..."
          className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <input
          type="text"
          value={newDescription}
          onChange={(e) => setNewDescription(e.target.value)}
          placeholder="Description (optional)..."
          className="w-full px-3.5 py-2 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={createMutation.isPending || !newTitle.trim()}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium flex items-center gap-1.5 transition cursor-pointer"
          >
            {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add Task
          </button>
        </div>
      </form>

      {/* Task List */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading tasks...
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30 text-slate-400 text-sm">
          {searchQuery ? 'No tasks match your search.' : 'No tasks yet. Create one above to get started.'}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredTasks.map((task) => (
            <div
              key={task.id}
              draggable={!searchQuery}
              onDragStart={() => setDraggedTaskId(task.id)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(task.id)}
              className={`flex items-center justify-between p-3.5 bg-slate-900 border rounded-xl transition ${
                searchQuery ? '' : 'cursor-grab active:cursor-grabbing'
              } ${
                draggedTaskId === task.id
                  ? 'opacity-40 border-indigo-500'
                  : 'border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <GripVertical className={`w-4 h-4 shrink-0 ${searchQuery ? 'text-slate-800' : 'text-slate-600'}`} />
                <button
                  type="button"
                  onClick={() =>
                    updateMutation.mutate({ id: task.id, isCompleted: !task.isCompleted })
                  }
                  className="cursor-pointer text-slate-400 hover:text-indigo-400 transition shrink-0"
                >
                  {task.isCompleted ? (
                    <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/40">
                      <Check className="w-3 h-3" />
                    </div>
                  ) : (
                    <Circle className="w-5 h-5 text-slate-500" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => openDetail(task)}
                  className="flex flex-col text-left truncate flex-1 cursor-pointer"
                >
                  <span
                    className={`text-sm truncate ${
                      task.isCompleted ? 'line-through text-slate-500' : 'text-slate-200 hover:text-indigo-400'
                    }`}
                  >
                    {task.title}
                  </span>
                  {task.description && (
                    <span className="text-xs text-slate-500 truncate">{task.description}</span>
                  )}
                </button>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => openDetail(task)}
                  className="text-slate-500 hover:text-indigo-400 p-1.5 rounded-lg hover:bg-slate-800 transition cursor-pointer"
                  title="Edit details"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(task.id)}
                  className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition cursor-pointer"
                  title="Delete task"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task Detail / Edit Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h2 className="font-semibold text-slate-100 text-base">Task Details</h2>
              <button
                type="button"
                onClick={() => setSelectedTask(null)}
                className="text-slate-500 hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Title
                </label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  placeholder="Add detailed task notes or sub-steps..."
                  className="w-full px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-lg text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(selectedTask.id)}
                  className="px-3 py-2 text-rose-400 hover:bg-rose-500/10 rounded-lg text-sm font-medium transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedTask(null)}
                    className="px-4 py-2 border border-slate-800 text-slate-300 hover:bg-slate-800 rounded-lg text-sm font-medium transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateMutation.isPending || !editTitle.trim()}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {updateMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Save Changes
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};