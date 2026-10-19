import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { Plus, Trash2, GripVertical, Check, Circle, Loader2 } from 'lucide-react';

export interface Task {
  id: string;
  title: string;
  description?: string;
  isCompleted: boolean;
  order: number;
}

export const TaskBoard: React.FC = () => {
  const queryClient = useQueryClient();
  const [newTitle, setNewTitle] = useState('');
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);

  // 1. Fetch tasks
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ['tasks'],
    queryFn: async () => {
      const res = await api.get('/tasks');
      return res.data;
    },
  });

  // 2. Create task mutation
  const createMutation = useMutation({
    mutationFn: (title: string) => api.post('/tasks', { title }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setNewTitle('');
    },
  });

  // 3. Toggle completed mutation
  const toggleMutation = useMutation({
    mutationFn: ({ id, isCompleted }: { id: string; isCompleted: boolean }) =>
      api.patch(`/tasks/${id}`, { isCompleted }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  // 4. Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/tasks/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['tasks'] }),
  });

  // 5. O(1) Reorder mutation
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

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    createMutation.mutate(newTitle.trim());
  };

  // Drag and drop handlers
  const handleDragStart = (id: string) => {
    setDraggedTaskId(id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetTaskId: string) => {
    if (!draggedTaskId || draggedTaskId === targetTaskId) return;

    const currentIdx = tasks.findIndex((t) => t.id === draggedTaskId);
    const targetIdx = tasks.findIndex((t) => t.id === targetTaskId);
    if (currentIdx === -1 || targetIdx === -1) return;

    // Filter out dragged task to evaluate neighbors around target slot
    const listWithoutDragged = tasks.filter((t) => t.id !== draggedTaskId);
    const newTargetIdx = listWithoutDragged.findIndex((t) => t.id === targetTaskId);

    let prevOrder: number | null = null;
    let nextOrder: number | null = null;

    if (currentIdx < targetIdx) {
      // Moving downwards: place after target item
      prevOrder = listWithoutDragged[newTargetIdx]?.order ?? null;
      nextOrder = listWithoutDragged[newTargetIdx + 1]?.order ?? null;
    } else {
      // Moving upwards: place before target item
      prevOrder = listWithoutDragged[newTargetIdx - 1]?.order ?? null;
      nextOrder = listWithoutDragged[newTargetIdx]?.order ?? null;
    }

    reorderMutation.mutate({
      id: draggedTaskId,
      prevOrder,
      nextOrder,
    });

    setDraggedTaskId(null);
  };

  return (
    <div className="max-w-2xl w-full mx-auto space-y-6">
      {/* Create Task Form */}
      <form onSubmit={handleCreate} className="flex gap-2">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          placeholder="Add a new task..."
          className="flex-1 px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
        />
        <button
          type="submit"
          disabled={createMutation.isPending || !newTitle.trim()}
          className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-sm font-medium flex items-center gap-2 transition cursor-pointer"
        >
          {createMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Add Task
        </button>
      </form>

      {/* Task List */}
      {isLoading ? (
        <div className="flex items-center justify-center p-12 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading tasks...
        </div>
      ) : tasks.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-800 rounded-2xl bg-slate-900/30 text-slate-400 text-sm">
          No tasks yet. Create one above to get started.
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div
              key={task.id}
              draggable
              onDragStart={() => handleDragStart(task.id)}
              onDragOver={handleDragOver}
              onDrop={() => handleDrop(task.id)}
              className={`flex items-center justify-between p-3.5 bg-slate-900 border rounded-xl transition cursor-grab active:cursor-grabbing ${
                draggedTaskId === task.id
                  ? 'opacity-40 border-indigo-500'
                  : 'border-slate-800/80 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <GripVertical className="w-4 h-4 text-slate-600 shrink-0" />
                <button
                  type="button"
                  onClick={() =>
                    toggleMutation.mutate({ id: task.id, isCompleted: !task.isCompleted })
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
                <span
                  className={`text-sm truncate select-none ${
                    task.isCompleted ? 'line-through text-slate-500' : 'text-slate-200'
                  }`}
                >
                  {task.title}
                </span>
              </div>

              <button
                type="button"
                onClick={() => deleteMutation.mutate(task.id)}
                className="text-slate-500 hover:text-rose-400 p-1.5 rounded-lg hover:bg-rose-500/10 transition cursor-pointer shrink-0"
                title="Delete task"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
